// import fs from "fs/promises";
// import fsSync from "fs";
// import path from "path";
// import crypto from "crypto";
// import { fileURLToPath } from "url";

// import Parser from "rss-parser";
// import slugify from "slugify";
// import OpenAI from "openai";
// import dotenv from "dotenv";
// import pLimit from "p-limit";

// import { selectFeedItems } from "./lib/selectFeedItems.mjs";
// import { logger } from "./lib/logger.mjs";
// import { validateConfig } from "./lib/configValidator.mjs";
// import { RateLimiter } from "./lib/rateLimiter.mjs";
// import { buildPerspectivePrompt } from "./lib/promptBuilder.mjs";

// import {
//   generateBlogPost as formatBlogPost,
//   calculateReadTime,
// } from "../templates/cleanBlogTemplate.mjs";

// /* -------------------- ENV + PATH -------------------- */

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// dotenv.config({ path: path.join(__dirname, "../.env") });

// const parser = new Parser();
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// /* -------------------- MODE -------------------- */

// // const TEST_MODE = true;
// const TEST_MODE = false;

// /* -------------------- CONFIG -------------------- */

// const CONFIG = {
//   OUTPUT_DIR: path.join(__dirname, "../stageArea/drafts"),
//   FEEDS_CONFIG_PATH: path.join(__dirname, "../feeds.json"),

//   MAX_CONCURRENT_REQUESTS: 3,
//   OPENAI_RATE_LIMIT: 3,
//   MAX_RETRIES: 3,
//   RETRY_DELAY: 2000,

//   MODEL: "gpt-4o-mini",

//   // MAX_TOKENS: TEST_MODE ? 400 : 2500,
//   MAX_TOKENS: TEST_MODE ? 1000 : 2500,

//   // MAX_FEED_ITEMS: TEST_MODE ? 1 : 5,
//   MAX_TOTAL_POSTS: 1, // Stop after first successful post
// };

// /* -------------------- LIMITERS -------------------- */

// const openaiLimiter = new RateLimiter(CONFIG.OPENAI_RATE_LIMIT, 60000);
// const limit = pLimit(CONFIG.MAX_CONCURRENT_REQUESTS);

// /* -------------------- REGISTRY (DEDUP) -------------------- */

// const REGISTRY_PATH = path.join(__dirname, "../stageArea/processed.json");

// async function loadRegistry() {
//   try {
//     const data = await fs.readFile(REGISTRY_PATH, "utf8");
//     return new Set(JSON.parse(data));
//   } catch {
//     return new Set();
//   }
// }

// async function saveRegistry(registry) {
//   await fs.writeFile(REGISTRY_PATH, JSON.stringify([...registry], null, 2));
// }

// function fingerprintItem(item) {
//   return crypto
//     .createHash("sha256")
//     .update(item.link || item.title)
//     .digest("hex");
// }

// /* -------------------- UTIL -------------------- */

// const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// async function withRetry(fn) {
//   let lastError;
//   for (let i = 1; i <= CONFIG.MAX_RETRIES; i++) {
//     try {
//       return await fn();
//     } catch (err) {
//       lastError = err;
//       if (i < CONFIG.MAX_RETRIES) {
//         const delay = CONFIG.RETRY_DELAY * Math.pow(2, i - 1);
//         logger.warn(`Retry ${i} failed. Waiting ${delay}ms`);
//         await sleep(delay);
//       }
//     }
//   }
//   throw lastError;
// }

// /* -------------------- GENERATION -------------------- */

// async function generateBlogPost(item, matchedKeywords, topicName) {
//   const prompt = buildPerspectivePrompt({
//     item,
//     topicName,
//     matchedKeywords,
//     testMode: TEST_MODE,
//   });

//   await openaiLimiter.wait();

//   const response = await withRetry(() =>
//     openai.chat.completions.create({
//       model: CONFIG.MODEL,
//       temperature: 0.6,
//       max_tokens: CONFIG.MAX_TOKENS,
//       messages: [
//         {
//           role: "system",
//           content: TEST_MODE
//             ? "You generate short technical test output."
//             : "You are a senior engineer writing rigorous technical briefings.",
//         },
//         { role: "user", content: prompt },
//       ],
//     }),
//   );

//   const aiContent = response.choices[0].message.content;

//   return formatBlogPost({
//     title: item.title,
//     slug: slugify(item.title, { lower: true, strict: true }),
//     date: new Date().toISOString(),
//     tags: matchedKeywords.slice(0, 4),
//     authors: ["francis"],
//     content: aiContent,
//     sourceUrl: item.link,
//     excerpt: item.contentSnippet?.slice(0, 150),
//     readTime: calculateReadTime(aiContent),
//   });
// }

// /* -------------------- PROCESS ITEM -------------------- */

// async function processFeedItem(item, matchedKeywords, topicName, registry) {
//   const fingerprint = fingerprintItem(item);

//   if (registry.has(fingerprint)) {
//     logger.info(`⏭️  Skipping used item: ${item.title}`);
//     return { status: "skipped" };
//   }

//   const slug = slugify(item.title, { lower: true, strict: true });
//   const filename = `${new Date().toISOString()}-${slug}.mdx`;

//   logger.info(`✍️  Generating ${filename}`);

//   const content = await generateBlogPost(item, matchedKeywords, topicName);

//   await fs.writeFile(path.join(CONFIG.OUTPUT_DIR, filename), content, "utf8");

//   registry.add(fingerprint);
//   await saveRegistry(registry);

//   logger.success(`✅ Created ${filename}`);

//   return { status: "success", filename };
// }

// /* -------------------- PROCESS FEED -------------------- */

// // async function processFeed(feedUrl, topic, registry) {
// //   const feed = await withRetry(() => parser.parseURL(feedUrl));

// //   const selected = selectFeedItems(feed.items, topic, {
// //     maxItems: CONFIG.MAX_FEED_ITEMS,
// //     minKeywordMatches: 2,
// //     minScore: 3,
// //   });

// //   return Promise.all(
// //     selected.map(({ item, matchedKeywords }) =>
// //       limit(() => processFeedItem(item, matchedKeywords, topic.name, registry)),
// //     ),
// //   );
// // }
// //
// //
// async function processFeed(feedUrl, topic, registry) {
//   logger.info(`📡 Fetching feed: ${feedUrl}`);

//   const feed = await withRetry(() => parser.parseURL(feedUrl));

//   // 🔒 REMOVE already-processed items FIRST
//   const freshItems = feed.items.filter((item) => {
//     const fp = fingerprintItem(item);
//     return !registry.has(fp);
//   });

//   if (freshItems.length === 0) {
//     logger.info("⏭️  No new items in feed");
//     return [];
//   }

//   // 🎯 Now select from ONLY fresh items
//   const selected = selectFeedItems(freshItems, topic, {
//     maxItems: CONFIG.MAX_FEED_ITEMS,
//     minKeywordMatches: 2,
//     minScore: 3,
//   });

//   return Promise.all(
//     selected.map(({ item, matchedKeywords }) =>
//       limit(() => processFeedItem(item, matchedKeywords, topic.name, registry)),
//     ),
//   );
// }

// /* -------------------- RUN -------------------- */

// async function run() {
//   logger.info(`🚀 ScafBlog Generator ${TEST_MODE ? "(TEST MODE)" : "(PROD)"}`);

//   if (!fsSync.existsSync(CONFIG.OUTPUT_DIR)) {
//     await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
//   }

//   const registry = await loadRegistry();

//   const feedsConfig = JSON.parse(
//     await fs.readFile(CONFIG.FEEDS_CONFIG_PATH, "utf8"),
//   );

//   validateConfig(feedsConfig);

//   for (const topic of feedsConfig.topics) {
//     logger.info(`📚 Topic: ${topic.name}`);
//     for (const feedUrl of topic.feeds) {
//       await processFeed(feedUrl, topic, registry);
//     }
//   }

//   logger.success("🎉 Generation complete");
// }

// run();

// import fs from "fs/promises";
// import fsSync from "fs";
// import path from "path";
// import crypto from "crypto";
// import { fileURLToPath } from "url";

// import Parser from "rss-parser";
// import slugify from "slugify";
// import OpenAI from "openai";
// import dotenv from "dotenv";
// import pLimit from "p-limit";

// import { selectFeedItems } from "./lib/selectFeedItems.mjs";
// import { logger } from "./lib/logger.mjs";
// import { validateConfig } from "./lib/configValidator.mjs";
// import { RateLimiter } from "./lib/rateLimiter.mjs";
// import { buildPerspectivePrompt } from "./lib/promptBuilder.mjs";

// import {
//   generateBlogPost as formatBlogPost,
//   calculateReadTime,
// } from "../templates/cleanBlogTemplate.mjs";

// /* -------------------- ENV + PATH -------------------- */

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// dotenv.config({ path: path.join(__dirname, "../.env") });

// const parser = new Parser();
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// /* -------------------- MODE -------------------- */

// // const TEST_MODE = true;
// const TEST_MODE = false;

// /* -------------------- CONFIG -------------------- */

// const CONFIG = {
//   OUTPUT_DIR: path.join(__dirname, "../stageArea/drafts"),
//   FEEDS_CONFIG_PATH: path.join(__dirname, "../feeds.json"),

//   MAX_CONCURRENT_REQUESTS: 3,
//   OPENAI_RATE_LIMIT: 3,
//   MAX_RETRIES: 3,
//   RETRY_DELAY: 2000,

//   MODEL: "gpt-4o-mini",

//   MAX_TOKENS: TEST_MODE ? 1000 : 2500,

//   MAX_TOTAL_POSTS: 1,
// };

// /* -------------------- LIMITERS -------------------- */

// const openaiLimiter = new RateLimiter(CONFIG.OPENAI_RATE_LIMIT, 60000);
// const limit = pLimit(CONFIG.MAX_CONCURRENT_REQUESTS);

// /* -------------------- REGISTRY (DEDUP) -------------------- */

// const REGISTRY_PATH = path.join(__dirname, "../stageArea/processed.json");

// async function loadRegistry() {
//   try {
//     const data = await fs.readFile(REGISTRY_PATH, "utf8");
//     return new Set(JSON.parse(data));
//   } catch {
//     return new Set();
//   }
// }

// async function saveRegistry(registry) {
//   await fs.writeFile(REGISTRY_PATH, JSON.stringify([...registry], null, 2));
// }

// function fingerprintItem(item) {
//   return crypto
//     .createHash("sha256")
//     .update(item.link || item.title)
//     .digest("hex");
// }

// /* -------------------- UTIL -------------------- */

// const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// async function withRetry(fn) {
//   let lastError;
//   for (let i = 1; i <= CONFIG.MAX_RETRIES; i++) {
//     try {
//       return await fn();
//     } catch (err) {
//       lastError = err;
//       if (i < CONFIG.MAX_RETRIES) {
//         const delay = CONFIG.RETRY_DELAY * Math.pow(2, i - 1);
//         logger.warn(`Retry ${i} failed. Waiting ${delay}ms`);
//         await sleep(delay);
//       }
//     }
//   }
//   throw lastError;
// }

// /* -------------------- PREVIEW MODE -------------------- */

// async function previewFeeds() {
//   logger.info("👀 PREVIEW MODE — No generation will occur\n");

//   const feedsConfig = JSON.parse(
//     await fs.readFile(CONFIG.FEEDS_CONFIG_PATH, "utf8"),
//   );
//   validateConfig(feedsConfig);

//   const registry = await loadRegistry();

//   for (const topic of feedsConfig.topics) {
//     logger.info(`\n📚 Topic: ${topic.name}`);
//     logger.info(`   Keywords: ${topic.keywords.join(", ")}\n`);

//     for (const feedUrl of topic.feeds) {
//       logger.info(`📡 Feed: ${feedUrl}`);

//       try {
//         const feed = await withRetry(() => parser.parseURL(feedUrl));

//         const freshItems = feed.items.filter(
//           (item) => !registry.has(fingerprintItem(item)),
//         );

//         if (freshItems.length === 0) {
//           logger.warn("   ⏭️  No new items (all previously processed)\n");
//           continue;
//         }

//         const selected = selectFeedItems(freshItems, topic, {
//           maxItems: 10,
//           minKeywordMatches: 1,
//           minScore: 2,
//         });

//         if (!selected.length) {
//           logger.warn("   No matching items for keywords\n");
//           continue;
//         }

//         logger.info(`   Found ${selected.length} matching articles:\n`);

//         selected.forEach((s, i) => {
//           console.log(`   ${i + 1}. ${s.item.title}`);
//           console.log(`      🔗 ${s.item.link}`);
//           console.log(`      🏷️  ${s.matchedKeywords.join(", ")}`);
//           console.log(`      📅 ${s.item.pubDate || "No date"}\n`);
//         });
//       } catch (err) {
//         logger.error(`   Failed to fetch feed: ${err.message}\n`);
//       }
//     }
//   }

//   logger.success("\n✅ Preview complete — run without --preview to generate");
// }

// /* -------------------- GENERATION -------------------- */

// async function generateBlogPost(item, matchedKeywords, topicName) {
//   const prompt = buildPerspectivePrompt({
//     item,
//     topicName,
//     matchedKeywords,
//     testMode: TEST_MODE,
//   });

//   await openaiLimiter.wait();

//   const response = await withRetry(() =>
//     openai.chat.completions.create({
//       model: CONFIG.MODEL,
//       temperature: 0.6,
//       max_tokens: CONFIG.MAX_TOKENS,
//       messages: [
//         {
//           role: "system",
//           content: TEST_MODE
//             ? "You generate short technical test output."
//             : "You are a senior engineer writing rigorous technical briefings.",
//         },
//         { role: "user", content: prompt },
//       ],
//     }),
//   );

//   const aiContent = response.choices[0].message.content;

//   return formatBlogPost({
//     title: item.title,
//     slug: slugify(item.title, { lower: true, strict: true }),
//     date: new Date().toISOString(),
//     tags: matchedKeywords.slice(0, 4),
//     authors: ["francis"],
//     content: aiContent,
//     sourceUrl: item.link,
//     excerpt: item.contentSnippet?.slice(0, 150),
//     readTime: calculateReadTime(aiContent),
//   });
// }

// /* -------------------- PROCESS ITEM -------------------- */

// async function processFeedItem(item, matchedKeywords, topicName, registry) {
//   const fingerprint = fingerprintItem(item);

//   if (registry.has(fingerprint)) {
//     logger.info(`⏭️  Skipping used item: ${item.title}`);
//     return { status: "skipped" };
//   }

//   const slug = slugify(item.title, { lower: true, strict: true });
//   const filename = `${new Date().toISOString()}-${slug}.mdx`;

//   logger.info(`✍️  Generating ${filename}`);

//   const content = await generateBlogPost(item, matchedKeywords, topicName);

//   await fs.writeFile(path.join(CONFIG.OUTPUT_DIR, filename), content, "utf8");

//   registry.add(fingerprint);
//   await saveRegistry(registry);

//   logger.success(`✅ Created ${filename}`);

//   return { status: "success", filename };
// }

// /* -------------------- PROCESS FEED -------------------- */

// async function processFeed(feedUrl, topic, registry) {
//   logger.info(`📡 Fetching feed: ${feedUrl}`);

//   const feed = await withRetry(() => parser.parseURL(feedUrl));

//   const freshItems = feed.items.filter((item) => {
//     const fp = fingerprintItem(item);
//     return !registry.has(fp);
//   });

//   if (freshItems.length === 0) {
//     logger.info("⏭️  No new items in feed");
//     return [];
//   }

//   const selected = selectFeedItems(freshItems, topic, {
//     maxItems: CONFIG.MAX_FEED_ITEMS,
//     minKeywordMatches: 2,
//     minScore: 3,
//   });

//   return Promise.all(
//     selected.map(({ item, matchedKeywords }) =>
//       limit(() => processFeedItem(item, matchedKeywords, topic.name, registry)),
//     ),
//   );
// }

// /* -------------------- RUN -------------------- */

// async function run() {
//   // Check for --preview flag
//   if (process.argv.includes("--preview")) {
//     return previewFeeds();
//   }

//   logger.info(`🚀 ScafBlog Generator ${TEST_MODE ? "(TEST MODE)" : "(PROD)"}`);

//   if (!fsSync.existsSync(CONFIG.OUTPUT_DIR)) {
//     await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
//   }

//   const registry = await loadRegistry();

//   const feedsConfig = JSON.parse(
//     await fs.readFile(CONFIG.FEEDS_CONFIG_PATH, "utf8"),
//   );

//   validateConfig(feedsConfig);

//   for (const topic of feedsConfig.topics) {
//     logger.info(`📚 Topic: ${topic.name}`);
//     for (const feedUrl of topic.feeds) {
//       await processFeed(feedUrl, topic, registry);
//     }
//   }

//   logger.success("🎉 Generation complete");
// }

// run();

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import Parser from "rss-parser";
import slugify from "slugify";
import OpenAI from "openai";
import dotenv from "dotenv";
import pLimit from "p-limit";
import inquirer from "inquirer";

import { selectFeedItems } from "./lib/selectFeedItems.mjs";
import { logger } from "./lib/logger.mjs";
import { validateConfig } from "./lib/configValidator.mjs";
import { RateLimiter } from "./lib/rateLimiter.mjs";
import { buildPerspectivePrompt } from "./lib/promptBuilder.mjs";
import { buildCustomTopicPrompt } from "./lib/custompromptBuilder.mjs";

import {
  generateBlogPost as formatBlogPost,
  calculateReadTime,
} from "../templates/cleanBlogTemplate.mjs";

/* -------------------- ENV + PATH -------------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const parser = new Parser();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* -------------------- MODE -------------------- */

const TEST_MODE = false;

/* -------------------- CONFIG -------------------- */

const CONFIG = {
  OUTPUT_DIR: path.join(__dirname, "../stageArea/drafts"),
  FEEDS_CONFIG_PATH: path.join(__dirname, "../feeds.json"),

  MAX_CONCURRENT_REQUESTS: 3,
  OPENAI_RATE_LIMIT: 3,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,

  MODEL: "gpt-4o-mini",
  MAX_TOKENS: TEST_MODE ? 1000 : 2500,
  MAX_TOTAL_POSTS: 1,
};

/* -------------------- LIMITERS -------------------- */

const openaiLimiter = new RateLimiter(CONFIG.OPENAI_RATE_LIMIT, 60000);
const limit = pLimit(CONFIG.MAX_CONCURRENT_REQUESTS);

/* -------------------- REGISTRY (DEDUP) -------------------- */

const REGISTRY_PATH = path.join(__dirname, "../stageArea/processed.json");

async function loadRegistry() {
  try {
    const data = await fs.readFile(REGISTRY_PATH, "utf8");
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

async function saveRegistry(registry) {
  await fs.writeFile(REGISTRY_PATH, JSON.stringify([...registry], null, 2));
}

function fingerprintItem(item) {
  return crypto
    .createHash("sha256")
    .update(item.link || item.title)
    .digest("hex");
}

/* -------------------- UTIL -------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn) {
  let lastError;
  for (let i = 1; i <= CONFIG.MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < CONFIG.MAX_RETRIES) {
        const delay = CONFIG.RETRY_DELAY * Math.pow(2, i - 1);
        logger.warn(`Retry ${i} failed. Waiting ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

/* -------------------- GENERATION -------------------- */

// async function generateBlogPost(item, matchedKeywords, topicName) {
//   const prompt = buildPerspectivePrompt({
//     item,
//     topicName,
//     matchedKeywords,
//     testMode: TEST_MODE,
//   });

//   await openaiLimiter.wait();

//   const response = await withRetry(() =>
//     openai.chat.completions.create({
//       model: CONFIG.MODEL,
//       temperature: 0.6,
//       max_tokens: CONFIG.MAX_TOKENS,
//       messages: [
//         {
//           role: "system",
//           content: TEST_MODE
//             ? "You generate short technical test output."
//             : "You are a senior engineer writing rigorous technical briefings.",
//         },
//         { role: "user", content: prompt },
//       ],
//     }),
//   );

//   const aiContent = response.choices[0].message.content;

//   return formatBlogPost({
//     title: item.title,
//     slug: slugify(item.title, { lower: true, strict: true }),
//     date: new Date().toISOString(),
//     tags: matchedKeywords.slice(0, 4),
//     authors: ["francis"],
//     content: aiContent,
//     sourceUrl: item.link,
//     excerpt: item.contentSnippet?.slice(0, 150),
//     readTime: calculateReadTime(aiContent),
//   });
// }
//
//
async function generateBlogPost(item, matchedKeywords, topicName) {
  const prompt = buildPerspectivePrompt({
    item,
    topicName,
    matchedKeywords,
    testMode: TEST_MODE,
  });

  await openaiLimiter.wait();

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: CONFIG.MODEL,
      temperature: 0.6,
      max_tokens: CONFIG.MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: TEST_MODE
            ? "You generate short technical test output."
            : "You are a senior engineer writing rigorous technical briefings.",
        },
        { role: "user", content: prompt },
      ],
    }),
  );

  const aiContent = response.choices[0].message.content;

  // Extract title from first line (# Title), use original as fallback
  const lines = aiContent.split("\n").filter((line) => line.trim());
  let generatedTitle = item.title; // fallback
  let contentWithoutTitle = aiContent;

  if (lines[0]?.startsWith("#")) {
    generatedTitle = lines[0].replace(/^#\s*/, "").trim();
    contentWithoutTitle = lines.slice(1).join("\n").trim();
  }

  return formatBlogPost({
    title: generatedTitle,
    slug: slugify(generatedTitle, { lower: true, strict: true }),
    date: new Date().toISOString(),
    tags: matchedKeywords.slice(0, 4),
    authors: ["francis"],
    content: contentWithoutTitle,
    sourceUrl: item.link,
    excerpt: item.contentSnippet?.slice(0, 150),
    readTime: calculateReadTime(contentWithoutTitle),
  });
}

/* -------------------- INTERACTIVE MODE -------------------- */

async function interactiveMode() {
  logger.info("🎯 Interactive Mode\n");

  if (!fsSync.existsSync(CONFIG.OUTPUT_DIR)) {
    await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  const feedsConfig = JSON.parse(
    await fs.readFile(CONFIG.FEEDS_CONFIG_PATH, "utf8"),
  );
  validateConfig(feedsConfig);

  const registry = await loadRegistry();

  /* STEP 1 — SELECT TOPIC */

  // const { topicIndex } = await inquirer.prompt([
  //   {
  //     type: "list",
  //     name: "topicIndex",
  //     message: "Select a topic:",
  //     choices: feedsConfig.topics.map((t, i) => ({
  //       name: `${t.name} (${t.feeds.length} feeds, ${t.keywords.length} keywords)`,
  //       value: i,
  //     })),
  //   },
  // ]);

  // const topic = feedsConfig.topics[topicIndex];
  // logger.info(`📚 Topic: ${topic.name}\n`);
  //
  //
  /* STEP 1 — SELECT TOPIC */

  const choices = feedsConfig.topics.map((t, i) => ({
    name: `${t.name} (${t.feeds.length} feeds, ${t.keywords.length} keywords)`,
    value: i,
  }));

  choices.push({
    name: "⌨️  Type my own topic",
    value: "custom",
  });

  const { topicIndex } = await inquirer.prompt([
    {
      type: "list",
      name: "topicIndex",
      message: "Select a topic or type your own:",
      choices,
    },
  ]);

  // if (topicIndex === "custom") {
  //   const { customName, customKeywords } = await inquirer.prompt([
  //     {
  //       type: "input",
  //       name: "customName",
  //       message: "What topic are you interested in?",
  //     },
  //     {
  //       type: "input",
  //       name: "customKeywords",
  //       message: "Enter keywords to search for (comma-separated):",
  //       validate: (input) =>
  //         input.trim().length > 0 || "Please enter at least one keyword",
  //     },
  //   ]);

  //   const allFeeds = [...new Set(feedsConfig.topics.flatMap((t) => t.feeds))];

  //   topic = {
  //     name: customName,
  //     keywords: customKeywords.split(",").map((k) => k.trim().toLowerCase()),
  //     feeds: allFeeds,
  //   };
  // } else {
  //   topic = feedsConfig.topics[topicIndex];
  // }

  // logger.info(`\n📚 Topic: ${topic.name}`);
  // logger.info(`🏷️  Keywords: ${topic.keywords.join(", ")}\n`);
  //
  //

  // CUSTOM TOPIC — generate directly without feeds
  if (topicIndex === "custom") {
    const { title, description, keywords } = await inquirer.prompt([
      {
        type: "input",
        name: "title",
        message: "Blog post title:",
        validate: (input) => input.trim().length > 0 || "Please enter a title",
      },
      {
        type: "input",
        name: "description",
        message: "What should this post be about? (describe in detail):",
        validate: (input) =>
          input.trim().length > 0 || "Please enter a description",
      },
      {
        type: "input",
        name: "keywords",
        message: "Tags/keywords (comma-separated):",
        default: "tech",
      },
    ]);

    const tags = keywords.split(",").map((k) => k.trim().toLowerCase());

    console.log("\n📄 Your Blog Post:");
    console.log(`   Title: ${title}`);
    console.log(`   About: ${description}`);
    console.log(`   Tags: ${tags.join(", ")}`);
    console.log(
      `   Estimated cost: ~$${((CONFIG.MAX_TOKENS / 1000) * 0.00015).toFixed(4)}\n`,
    );

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Generate this blog post?",
        default: true,
      },
    ]);

    if (!confirm) {
      logger.info("❌ Cancelled.");
      return;
    }

    const slug = slugify(title, { lower: true, strict: true });
    const filename = `${new Date().toISOString()}-${slug}.mdx`;

    logger.info(`\n✍️  Generating ${filename}...`);

    // Use the custom prompt builder
    const prompt = buildCustomTopicPrompt({
      title,
      description,
      keywords: tags,
      testMode: TEST_MODE,
    });

    await openaiLimiter.wait();

    const response = await withRetry(() =>
      openai.chat.completions.create({
        model: CONFIG.MODEL,
        temperature: 0.6,
        max_tokens: CONFIG.MAX_TOKENS,
        messages: [
          {
            role: "system",
            content: TEST_MODE
              ? "You generate short technical test output."
              : "You are a senior engineer writing rigorous technical briefings.",
          },
          { role: "user", content: prompt },
        ],
      }),
    );

    const aiContent = response.choices[0].message.content;

    const content = formatBlogPost({
      title,
      slug,
      // date: new Date().toISOString(),
      date: new Date().toISOString(),
      tags: tags.slice(0, 4),
      authors: ["francis"],
      content: aiContent,
      sourceUrl: null,
      excerpt: description.slice(0, 150),
      readTime: calculateReadTime(aiContent),
    });

    await fs.writeFile(path.join(CONFIG.OUTPUT_DIR, filename), content, "utf8");

    logger.success(`\n🎉 Created: ${filename}`);
    logger.info(`📂 Location: ${path.join(CONFIG.OUTPUT_DIR, filename)}`);
    return; // Exit here — don't continue to feed-based flow
  }

  // PREDEFINED TOPIC — use feeds
  // const topic = feedsConfig.topics[topicIndex];
  const topic = feedsConfig.topics[topicIndex];
  logger.info(`\n📚 Topic: ${topic.name}`);
  logger.info(`🏷️  Keywords: ${topic.keywords.join(", ")}\n`);
  /* STEP 2 — FETCH ALL FEEDS FOR TOPIC */

  logger.info("📡 Fetching feeds...");

  let allItems = [];
  for (const feedUrl of topic.feeds) {
    try {
      const feed = await withRetry(() => parser.parseURL(feedUrl));
      allItems.push(...feed.items);
    } catch (err) {
      logger.warn(`Failed to fetch ${feedUrl}: ${err.message}`);
    }
  }

  /* STEP 3 — FILTER OUT PROCESSED ITEMS */

  const freshItems = allItems.filter(
    (item) => !registry.has(fingerprintItem(item)),
  );

  if (!freshItems.length) {
    logger.warn("No new articles available. All have been processed.");
    return;
  }

  /* STEP 4 — SCORE AND RANK */

  const scored = selectFeedItems(freshItems, topic, {
    maxItems: 20,
    minKeywordMatches: 1,
    minScore: 2,
  });

  if (!scored.length) {
    logger.warn("No articles matched your keywords.");
    return;
  }

  /* STEP 5 — SELECT ARTICLE */

  const { articleIndex } = await inquirer.prompt([
    {
      type: "list",
      name: "articleIndex",
      message: `Select an article (${scored.length} available):`,
      pageSize: 15,
      choices: scored.map((s, i) => ({
        name: `${s.item.title}\n      🏷️  ${s.matchedKeywords.join(", ")}  |  📅 ${s.item.pubDate || "No date"}`,
        value: i,
      })),
    },
  ]);

  const selected = scored[articleIndex];

  /* STEP 6 — CONFIRM */

  console.log("\n📄 Selected Article:");
  console.log(`   Title: ${selected.item.title}`);
  console.log(`   Link: ${selected.item.link}`);
  console.log(`   Keywords: ${selected.matchedKeywords.join(", ")}`);
  console.log(
    `   Estimated cost: ~$${((CONFIG.MAX_TOKENS / 1000) * 0.00015).toFixed(4)}\n`,
  );

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Generate blog post from this article?",
      default: true,
    },
  ]);

  if (!confirm) {
    logger.info("❌ Cancelled.");
    return;
  }

  /* STEP 7 — GENERATE */

  const slug = slugify(selected.item.title, { lower: true, strict: true });
  const filename = `${new Date().toISOString()}-${slug}.mdx`;

  logger.info(`\n✍️  Generating ${filename}...`);

  const content = await generateBlogPost(
    selected.item,
    selected.matchedKeywords,
    topic.name,
  );

  await fs.writeFile(path.join(CONFIG.OUTPUT_DIR, filename), content, "utf8");

  registry.add(fingerprintItem(selected.item));
  await saveRegistry(registry);

  logger.success(`\n🎉 Created: ${filename}`);
  logger.info(`📂 Location: ${path.join(CONFIG.OUTPUT_DIR, filename)}`);
}

/* -------------------- PREVIEW MODE -------------------- */

async function previewFeeds() {
  logger.info("👀 PREVIEW MODE — No generation will occur\n");

  const feedsConfig = JSON.parse(
    await fs.readFile(CONFIG.FEEDS_CONFIG_PATH, "utf8"),
  );
  validateConfig(feedsConfig);

  const registry = await loadRegistry();

  for (const topic of feedsConfig.topics) {
    logger.info(`\n📚 Topic: ${topic.name}`);
    logger.info(`   Keywords: ${topic.keywords.join(", ")}\n`);

    for (const feedUrl of topic.feeds) {
      logger.info(`📡 Feed: ${feedUrl}`);

      try {
        const feed = await withRetry(() => parser.parseURL(feedUrl));

        const freshItems = feed.items.filter(
          (item) => !registry.has(fingerprintItem(item)),
        );

        if (freshItems.length === 0) {
          logger.warn("   ⏭️  No new items (all previously processed)\n");
          continue;
        }

        const selected = selectFeedItems(freshItems, topic, {
          maxItems: 10,
          minKeywordMatches: 1,
          minScore: 2,
        });

        if (!selected.length) {
          logger.warn("   No matching items for keywords\n");
          continue;
        }

        logger.info(`   Found ${selected.length} matching articles:\n`);

        selected.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s.item.title}`);
          console.log(`      🔗 ${s.item.link}`);
          console.log(`      🏷️  ${s.matchedKeywords.join(", ")}`);
          console.log(`      📅 ${s.item.pubDate || "No date"}\n`);
        });
      } catch (err) {
        logger.error(`   Failed to fetch feed: ${err.message}\n`);
      }
    }
  }

  logger.success("\n✅ Preview complete");
}

/* -------------------- AUTO MODE (ORIGINAL) -------------------- */

async function autoMode() {
  logger.info(`🚀 ScafBlog Generator ${TEST_MODE ? "(TEST MODE)" : "(PROD)"}`);

  if (!fsSync.existsSync(CONFIG.OUTPUT_DIR)) {
    await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  const registry = await loadRegistry();

  const feedsConfig = JSON.parse(
    await fs.readFile(CONFIG.FEEDS_CONFIG_PATH, "utf8"),
  );

  validateConfig(feedsConfig);

  for (const topic of feedsConfig.topics) {
    logger.info(`📚 Topic: ${topic.name}`);
    for (const feedUrl of topic.feeds) {
      logger.info(`📡 Fetching feed: ${feedUrl}`);

      const feed = await withRetry(() => parser.parseURL(feedUrl));

      const freshItems = feed.items.filter((item) => {
        const fp = fingerprintItem(item);
        return !registry.has(fp);
      });

      if (freshItems.length === 0) {
        logger.info("⏭️  No new items in feed");
        continue;
      }

      const selected = selectFeedItems(freshItems, topic, {
        maxItems: CONFIG.MAX_FEED_ITEMS,
        minKeywordMatches: 2,
        minScore: 3,
      });

      for (const { item, matchedKeywords } of selected) {
        const fingerprint = fingerprintItem(item);

        if (registry.has(fingerprint)) {
          logger.info(`⏭️  Skipping: ${item.title}`);
          continue;
        }

        const slug = slugify(item.title, { lower: true, strict: true });
        const filename = `${new Date().toISOString()}-${slug}.mdx`;

        logger.info(`✍️  Generating ${filename}`);

        const content = await generateBlogPost(
          item,
          matchedKeywords,
          topic.name,
        );

        await fs.writeFile(
          path.join(CONFIG.OUTPUT_DIR, filename),
          content,
          "utf8",
        );

        registry.add(fingerprint);
        await saveRegistry(registry);

        logger.success(`✅ Created ${filename}`);
      }
    }
  }

  logger.success("🎉 Generation complete");
}

/* -------------------- RUN -------------------- */

async function run() {
  const args = process.argv.slice(2);

  if (args.includes("--preview")) {
    return previewFeeds();
  }

  if (args.includes("--interactive") || args.includes("-i")) {
    return interactiveMode();
  }

  // Default: auto mode
  return autoMode();
}

run().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
