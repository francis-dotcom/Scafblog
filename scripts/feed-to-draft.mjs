import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import Parser from "rss-parser";
import slugify from "slugify";
import OpenAI from "openai";
import dotenv from "dotenv";
import inquirer from "inquirer";

import { selectFeedItems } from "./lib/selectFeedItems.mjs";
import { logger } from "./lib/logger.mjs";
import { validateConfig } from "./lib/configValidator.mjs";
import { RateLimiter } from "./lib/rateLimiter.mjs";
import {
  createAgentRegistry,
  ensureJsonFile,
  executeWorkflow,
  runAgent,
} from "./lib/agentRuntime.mjs";
import { appendAgentEvent, appendRunTracker } from "./lib/localTracker.mjs";
import {
  createRunArtifacts,
  loadLastRun,
  saveLastRun,
  writeJsonArtifact,
  writeTextArtifact,
} from "./lib/runArtifacts.mjs";
import {
  extractTitleAndBody,
  validateDraft,
  combineReadiness,
} from "./lib/draftQuality.mjs";
import {
  buildPlannerPrompt,
  buildDraftAgentPrompt,
  buildReviewerPrompt,
  buildRevisionPrompt,
} from "./lib/orchestratorPrompts.mjs";

import {
  generateBlogPost as formatBlogPost,
  calculateReadTime,
} from "../templates/cleanBlogTemplate.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const parser = new Parser();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CONFIG = {
  FEEDS_CONFIG_PATH: path.join(__dirname, "../feeds.json"),
  OUTPUT_DIR:
    process.env.DIRECT_PUBLISH === "true"
      ? path.join(__dirname, "../blog")
      : path.join(__dirname, "../stageArea/drafts"),
  RUNS_DIR: path.join(__dirname, "../stageArea/runs"),
  REGISTRY_PATH: path.join(__dirname, "../stageArea/processed.json"),
  LOCAL_TRACKER_PATH: path.join(__dirname, "../orchestration-state.local.json"),
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  FALLBACK_MODEL: process.env.OPENAI_FALLBACK_MODEL || "",
  PLANNER_MODEL: process.env.PLANNER_MODEL || "",
  WRITER_MODEL: process.env.WRITER_MODEL || "",
  REVIEWER_MODEL: process.env.REVIEWER_MODEL || "",
  REVISION_MODEL: process.env.REVISION_MODEL || "",
  MAX_TOKENS: Number(process.env.OPENAI_MAX_TOKENS || 2600),
  OPENAI_RATE_LIMIT: Number(process.env.OPENAI_RATE_LIMIT || 3),
  MAX_TOTAL_POSTS: Number(process.env.MAX_TOTAL_POSTS || 1),
  REVIEW_THRESHOLD: Number(process.env.REVIEW_THRESHOLD || 80),
  MIN_WORDS: Number(process.env.MIN_WORDS || 900),
  MAX_CANDIDATES_PER_TOPIC: Number(process.env.MAX_CANDIDATES_PER_TOPIC || 8),
  MAX_REVISION_CYCLES: Number(process.env.MAX_REVISION_CYCLES || 2),
};

const openaiLimiter = new RateLimiter(CONFIG.OPENAI_RATE_LIMIT, 60000);

function ensureOpenAiConfigured() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required in scafblog/.env");
  }
}

function fingerprintItem(item) {
  return crypto
    .createHash("sha256")
    .update(item.link || item.guid || item.title)
    .digest("hex");
}

async function loadRegistry() {
  try {
    const data = await fs.readFile(CONFIG.REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(data);

    return new Map(
      parsed.map((entry) =>
        typeof entry === "string"
          ? [entry, { hash: entry }]
          : [entry.hash, entry],
      ),
    );
  } catch {
    return new Map();
  }
}

async function saveRegistry(registry) {
  await fs.mkdir(path.dirname(CONFIG.REGISTRY_PATH), { recursive: true });
  await fs.writeFile(
    CONFIG.REGISTRY_PATH,
    `${JSON.stringify([...registry.values()], null, 2)}\n`,
    "utf8",
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(fn) {
  let lastError;

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < CONFIG.MAX_RETRIES) {
        const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
        logger.warn(`Retry ${attempt} failed. Waiting ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

function buildModelChain(preferredModel) {
  return [...new Set([preferredModel, CONFIG.MODEL, CONFIG.FALLBACK_MODEL].filter(Boolean))];
}

async function createCompletionWithFallback({ models, payload }) {
  let lastError;

  for (const model of models) {
    try {
      return await withRetry(() =>
        openai.chat.completions.create({
          model,
          ...payload,
        }),
      );
    } catch (error) {
      lastError = error;
      logger.warn(`Model ${model} failed, trying next fallback if available`);
    }
  }

  throw lastError;
}

async function callTextAgent(system, user, modelPreference = "") {
  await openaiLimiter.wait();

  const response = await createCompletionWithFallback({
    models: buildModelChain(modelPreference),
    payload: {
      temperature: 0.45,
      max_tokens: CONFIG.MAX_TOKENS,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

async function callJsonAgent(system, user, modelPreference = "") {
  await openaiLimiter.wait();

  const response = await createCompletionWithFallback({
    models: buildModelChain(modelPreference),
    payload: {
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
  });

  const raw = response.choices[0]?.message?.content?.trim() || "{}";

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Agent returned invalid JSON: ${error.message}`);
  }
}

async function loadFeedsConfig() {
  const raw = await fs.readFile(CONFIG.FEEDS_CONFIG_PATH, "utf8");
  const config = JSON.parse(raw);
  const result = validateConfig(config);

  if (!result.valid) {
    throw new Error(`Invalid feeds.json:\n- ${result.errors.join("\n- ")}`);
  }

  return config;
}

async function fetchTopicCandidates(topic, registry) {
  const allItems = [];
  const feedResults = await Promise.allSettled(
    topic.feeds.map(async (feedUrl) => {
      logger.info(`📡 Fetching feed: ${feedUrl}`);
      const feed = await withRetry(() => parser.parseURL(feedUrl));
      return { feedUrl, items: feed.items || [] };
    }),
  );

  for (const result of feedResults) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value.items);
    } else {
      logger.warn(`Failed to fetch feed: ${result.reason?.message || result.reason}`);
    }
  }

  const freshItems = allItems.filter((item) => !registry.has(fingerprintItem(item)));

  const selected = selectFeedItems(freshItems, topic, {
    maxItems: CONFIG.MAX_CANDIDATES_PER_TOPIC,
    minKeywordMatches: 2,
    minScore: 3,
  });

  return selected;
}

async function packageArticle({
  title,
  body,
  tags,
  sourceUrl,
  excerpt,
  outputDir,
  runDir,
}) {
  const slug = slugify(title, { lower: true, strict: true });
  const filename = `${new Date().toISOString()}-${slug}.mdx`;
  const finalMdx = formatBlogPost({
    title,
    slug,
    date: new Date().toISOString(),
    tags: (tags || []).slice(0, 4),
    authors: ["francis"],
    content: body,
    sourceUrl,
    excerpt,
    readTime: calculateReadTime(body),
  });

  await fs.mkdir(outputDir, { recursive: true });
  const finalPath = path.join(outputDir, filename);
  await fs.writeFile(finalPath, finalMdx, "utf8");
  await writeTextArtifact(runDir, "06-final.mdx", finalMdx);

  return { filename, finalPath, slug };
}

const AGENT_REGISTRY = createAgentRegistry([
  {
    id: "topic_planner",
    label: "Topic Planner",
    stage: "planning",
    summarize(output) {
      return {
        proposedTitle: output?.proposed_title || null,
        tags: output?.tags || [],
      };
    },
    async run({ runtime, input }) {
      const plan = await callJsonAgent(
        "You are a senior editorial planner. Return only valid JSON.",
        buildPlannerPrompt({
          topicName: input.topicName,
          keywords: input.matchedKeywords,
          item: input.item,
          customTopic: input.customTopic,
        }),
        CONFIG.PLANNER_MODEL,
      );
      await writeJsonArtifact(input.runDir, "02-plan.json", plan);
      return plan;
    },
  },
  {
    id: "draft_writer",
    label: "Draft Writer",
    stage: "drafting",
    summarize(output) {
      return { characters: String(output || "").length };
    },
    async run({ input }) {
      const markdown = await callTextAgent(
        "You are a rigorous technical writer. Produce publication-ready markdown only.",
        buildDraftAgentPrompt({
          item: input.item,
          topicName: input.topicName,
          matchedKeywords: input.matchedKeywords,
          plan: input.plan,
          customTopic: input.customTopic,
        }),
        CONFIG.WRITER_MODEL,
      );
      await writeTextArtifact(input.runDir, "03-draft.md", markdown);
      return markdown;
    },
  },
  {
    id: "quality_reviewer",
    label: "Quality Reviewer",
    stage: "review",
    summarize(output) {
      return {
        overallScore: Number(output?.overall_score || 0),
        mustRevise: Boolean(output?.must_revise),
      };
    },
    async run({ input }) {
      const review = await callJsonAgent(
        "You are a strict editor. Return only valid JSON.",
        buildReviewerPrompt({
          title: input.title,
          body: input.body,
          plan: input.plan,
          item: input.item,
          customTopic: input.customTopic,
        }),
        CONFIG.REVIEWER_MODEL,
      );
      await writeJsonArtifact(input.runDir, input.filename, review);
      return review;
    },
  },
  {
    id: "revision_agent",
    label: "Revision Agent",
    stage: "revision",
    summarize(output) {
      return { characters: String(output || "").length };
    },
    async run({ input }) {
      const revised = await callTextAgent(
        "You are an expert revision agent. Return markdown only.",
        buildRevisionPrompt({
          title: input.title,
          body: input.body,
          review: input.review,
          plan: input.plan,
        }),
        CONFIG.REVISION_MODEL,
      );
      await writeTextArtifact(input.runDir, "05-revised.md", revised);
      return revised;
    },
  },
  {
    id: "publish_validator",
    label: "Publish Validator",
    stage: "validation",
    summarize(output) {
      return {
        publishReady: Boolean(output?.readiness?.publishReady),
        combined: Number(output?.readiness?.combined || 0),
      };
    },
    async run({ input }) {
      const localValidation = validateDraft({
        title: input.title,
        body: input.body,
        sourceTitle: input.item?.title || "",
        sourceUrl: input.item?.link || "",
        minimumWords: CONFIG.MIN_WORDS,
        requireSource: input.requireSource,
      });
      const readiness = combineReadiness(
        localValidation.score,
        Number(input.review.overall_score || 0),
      );
      const payload = { localValidation, readiness };
      await writeJsonArtifact(input.runDir, "06-validation.json", payload);
      return payload;
    },
  },
  {
    id: "publisher",
    label: "Publisher",
    stage: "publishing",
    summarize(output) {
      return {
        filename: output?.filename || null,
        finalPath: output?.finalPath || null,
      };
    },
    async run({ input }) {
      const packaged = await packageArticle({
        title: input.title,
        body: input.body,
        tags: input.tags,
        sourceUrl: input.item?.link || null,
        excerpt: input.item?.contentSnippet || input.customTopic?.description || "",
        outputDir: input.outputDir,
        runDir: input.runDir,
      });
      return packaged;
    },
  },
]);

async function orchestrateCandidate({
  topicName,
  matchedKeywords,
  item,
  customTopic = null,
  outputDir = CONFIG.OUTPUT_DIR,
  requireSource = true,
}) {
  const label = customTopic ? customTopic.title : item.title;
  const { runId, runDir } = await createRunArtifacts(CONFIG.RUNS_DIR, label);
  await ensureJsonFile(CONFIG.LOCAL_TRACKER_PATH, { runs: [], events: [] });

  const sourcePayload = customTopic
    ? { customTopic, matchedKeywords, topicName }
    : {
        topicName,
        matchedKeywords,
        source: {
          title: item.title,
          link: item.link || null,
          summary: item.contentSnippet || null,
          publishedAt: item.pubDate || null,
        },
      };

  await writeJsonArtifact(runDir, "01-source.json", sourcePayload);
  const runtime = {
    registry: AGENT_REGISTRY,
    logger,
    events: [],
    async trackEvent(event) {
      await appendAgentEvent(CONFIG.LOCAL_TRACKER_PATH, {
        runId,
        ...event,
      });
    },
  };

  const baseState = await executeWorkflow(
    runtime,
    [
      {
        agentId: "topic_planner",
        input(context) {
          return context;
        },
        assign(context, output) {
          return { ...context, plan: output };
        },
      },
      {
        agentId: "draft_writer",
        input(context) {
          return {
            ...context,
            plan: context.plan,
          };
        },
        assign(context, output) {
          const parsed = extractTitleAndBody(
            output,
            context.plan.proposed_title ||
              context.customTopic?.title ||
              context.item?.title ||
              "Untitled Draft",
          );
          return { ...context, draftMarkdown: output, ...parsed };
        },
      },
    ],
    {
      topicName,
      matchedKeywords,
      item,
      customTopic,
      runDir,
    },
  );
  let workflowState = { ...baseState, revisionCycle: 0 };

  workflowState.review = await runAgent(runtime, "quality_reviewer", {
    ...workflowState,
    filename: "04-review.json",
  });

  while (
    workflowState.revisionCycle < CONFIG.MAX_REVISION_CYCLES &&
    (Number(workflowState.review?.overall_score || 0) < CONFIG.REVIEW_THRESHOLD ||
      workflowState.review?.must_revise)
  ) {
    const revisedMarkdown = await runAgent(runtime, "revision_agent", {
      title: workflowState.title,
      body: workflowState.body,
      review: workflowState.review,
      plan: workflowState.plan,
      runDir: workflowState.runDir,
    });

    const parsed = extractTitleAndBody(revisedMarkdown, workflowState.title);
    workflowState = {
      ...workflowState,
      revisedMarkdown,
      revisionCycle: workflowState.revisionCycle + 1,
      ...parsed,
    };

    workflowState.review = await runAgent(runtime, "quality_reviewer", {
      ...workflowState,
      filename: `05b-review-after-revision-${workflowState.revisionCycle}.json`,
    });
  }

  const validation = await runAgent(runtime, "publish_validator", {
    ...workflowState,
    requireSource,
  });

  workflowState = {
    ...workflowState,
    localValidation: validation.localValidation,
    readiness: validation.readiness,
  };

  if (
    workflowState.readiness?.publishReady &&
    workflowState.review?.publish_ready !== false
  ) {
    workflowState.packaged = await runAgent(runtime, "publisher", {
      ...workflowState,
      tags: workflowState.plan.tags || workflowState.matchedKeywords,
      outputDir,
    });
  }

  const summary = {
    runId,
    title: workflowState.title,
    topicName,
    sourceTitle: item?.title || customTopic?.title || null,
    sourceUrl: item?.link || null,
    reviewerScore: Number(workflowState.review.overall_score || 0),
    localValidation: workflowState.localValidation,
    readiness: workflowState.readiness,
    tags: workflowState.plan.tags || matchedKeywords,
    publishDecision:
      workflowState.readiness.publishReady &&
      workflowState.review.publish_ready !== false,
    outputDir,
    agentEvents: runtime.events,
  };

  await writeJsonArtifact(runDir, "07-summary.json", summary);
  await saveLastRun(CONFIG.RUNS_DIR, summary);
  await appendRunTracker(CONFIG.LOCAL_TRACKER_PATH, summary);

  if (!summary.publishDecision) {
    logger.warn(`Draft failed publish gate: ${workflowState.title}`);
    return { ...summary, finalPath: null };
  }

  const finalSummary = {
    ...summary,
    ...workflowState.packaged,
  };

  await writeJsonArtifact(runDir, "07-summary.json", finalSummary);
  await saveLastRun(CONFIG.RUNS_DIR, finalSummary);

  return finalSummary;
}

async function previewFeeds() {
  const registry = await loadRegistry();
  const feedsConfig = await loadFeedsConfig();

  logger.info("👀 Previewing ranked candidates\n");

  for (const topic of feedsConfig.topics) {
    const candidates = await fetchTopicCandidates(topic, registry);
    logger.info(`\n📚 Topic: ${topic.name}`);

    if (!candidates.length) {
      logger.warn("   No new matching candidates");
      continue;
    }

    candidates.forEach((candidate, index) => {
      console.log(
        `   ${index + 1}. ${candidate.item.title}\n      score=${candidate.score} keywords=${candidate.matchedKeywords.join(", ")}\n      ${candidate.item.link}\n`,
      );
    });
  }
}

async function interactiveMode() {
  ensureOpenAiConfigured();
  await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });

  const feedsConfig = await loadFeedsConfig();
  const registry = await loadRegistry();

  const choices = feedsConfig.topics.map((topic, index) => ({
    name: `${topic.name} (${topic.feeds.length} feeds)`,
    value: index,
  }));

  choices.push({
    name: "Custom topic",
    value: "custom",
  });

  const { topicChoice } = await inquirer.prompt([
    {
      type: "list",
      name: "topicChoice",
      message: "Choose an orchestration mode:",
      choices,
    },
  ]);

  if (topicChoice === "custom") {
    const customTopic = await inquirer.prompt([
      {
        type: "input",
        name: "title",
        message: "Article title:",
        validate: (value) => value.trim().length > 0 || "Title is required",
      },
      {
        type: "input",
        name: "description",
        message: "Article description:",
        validate: (value) => value.trim().length > 0 || "Description is required",
      },
      {
        type: "input",
        name: "keywords",
        message: "Keywords (comma-separated):",
        default: "ai, systems, engineering",
      },
    ]);

    const matchedKeywords = customTopic.keywords
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const result = await orchestrateCandidate({
      topicName: "Custom topic",
      matchedKeywords,
      item: null,
      customTopic,
      requireSource: false,
    });

    if (result.finalPath) {
      logger.success(`✅ Published draft: ${result.finalPath}`);
    }

    return;
  }

  const topic = feedsConfig.topics[topicChoice];
  const candidates = await fetchTopicCandidates(topic, registry);

  if (!candidates.length) {
    logger.warn("No fresh candidates found.");
    return;
  }

  const { candidateIndex } = await inquirer.prompt([
    {
      type: "list",
      name: "candidateIndex",
      message: `Choose a source for ${topic.name}:`,
      pageSize: 12,
      choices: candidates.map((candidate, index) => ({
        name: `${candidate.item.title} [score=${candidate.score}]`,
        value: index,
      })),
    },
  ]);

  const candidate = candidates[candidateIndex];
  const result = await orchestrateCandidate({
    topicName: topic.name,
    matchedKeywords: candidate.matchedKeywords,
    item: candidate.item,
  });

  if (result.finalPath) {
    const hash = fingerprintItem(candidate.item);
    registry.set(hash, {
      hash,
      url: candidate.item.link || null,
      title: candidate.item.title || null,
      processedAt: new Date().toISOString(),
    });
    await saveRegistry(registry);
    logger.success(`✅ Published draft: ${result.finalPath}`);
  }
}

async function autoMode() {
  ensureOpenAiConfigured();
  await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });

  const feedsConfig = await loadFeedsConfig();
  const registry = await loadRegistry();
  let publishedCount = 0;

  logger.info("🚀 Running orchestrated publishing flow");

  for (const topic of feedsConfig.topics) {
    if (publishedCount >= CONFIG.MAX_TOTAL_POSTS) {
      break;
    }

    logger.info(`\n📚 Topic: ${topic.name}`);
    const candidates = await fetchTopicCandidates(topic, registry);

    if (!candidates.length) {
      logger.info("No fresh candidates for this topic.");
      continue;
    }

    const candidate = candidates[0];

    const result = await orchestrateCandidate({
      topicName: topic.name,
      matchedKeywords: candidate.matchedKeywords,
      item: candidate.item,
    });

    if (!result.finalPath) {
      logger.warn(`Skipped publish for ${candidate.item.title}`);
      continue;
    }

    const hash = fingerprintItem(candidate.item);
    registry.set(hash, {
      hash,
      url: candidate.item.link || null,
      title: candidate.item.title || null,
      processedAt: new Date().toISOString(),
    });
    await saveRegistry(registry);

    publishedCount += 1;
    logger.success(`✅ Published ${result.filename}`);
  }

  if (publishedCount === 0) {
    logger.warn("No article passed the publish gate.");
  }
}

async function reviewLastRun() {
  const lastRun = await loadLastRun(CONFIG.RUNS_DIR);

  if (!lastRun) {
    logger.warn("No previous run found.");
    return;
  }

  console.log(JSON.stringify(lastRun, null, 2));
}

async function run() {
  const args = process.argv.slice(2);

  if (args.includes("--preview")) {
    return previewFeeds();
  }

  if (args.includes("--interactive") || args.includes("-i")) {
    return interactiveMode();
  }

  if (args.includes("--review-last")) {
    return reviewLastRun();
  }

  return autoMode();
}

run().catch((error) => {
  logger.error(error.message);
  process.exit(1);
});
