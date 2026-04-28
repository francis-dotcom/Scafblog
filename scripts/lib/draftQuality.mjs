import fs from "fs/promises";
import path from "path";

export function extractTitleAndBody(markdown, fallbackTitle = "Untitled Draft") {
  const text = String(markdown || "").trim();
  const lines = text.split("\n");

  if (lines[0]?.startsWith("# ")) {
    return {
      title: lines[0].replace(/^#\s+/, "").trim() || fallbackTitle,
      body: lines.slice(1).join("\n").trim(),
    };
  }

  return {
    title: fallbackTitle,
    body: text,
  };
}

export function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeTokens(text) {
  const stopwords = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "how", "in", "into", "is", "it", "of", "on", "or", "that", "the",
    "to", "via", "what", "when", "why", "with",
  ]);

  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !stopwords.has(token));
}

function jaccardSimilarity(left, right) {
  const leftSet = new Set(normalizeTokens(left));
  const rightSet = new Set(normalizeTokens(right));

  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function countHypePhrases(text) {
  const patterns = [
    /\bgame[\s-]?changer\b/gi,
    /\brevolutionary\b/gi,
    /\bultimate guide\b/gi,
    /\bworld[\s-]?class\b/gi,
    /\bcutting[\s-]?edge\b/gi,
    /\bbreakthrough\b/gi,
    /\bunleash\b/gi,
    /\bseamless\b/gi,
    /\btransform your\b/gi,
    /\bmust-have\b/gi,
  ];

  return patterns.reduce((count, pattern) => {
    const matches = String(text || "").match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function hasLowSignalTitlePattern(title) {
  return /(^best\b|^top\b|^ultimate\b|^complete guide\b|part\s*\d+\b|step-by-step guide\b)/i.test(
    String(title || ""),
  );
}

function buildSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractDomain(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSourceText(sourceUrl) {
  if (!sourceUrl) return { ok: false, sourceText: "", status: null };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(sourceUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "ScafblogValidator/1.0",
        accept: "text/html,application/xhtml+xml",
      },
    });

    const contentType = res.headers.get("content-type") || "";
    const text = contentType.includes("text/html")
      ? stripHtml(await res.text())
      : "";

    return {
      ok: res.ok,
      sourceText: text.slice(0, 12000),
      status: res.status,
    };
  } catch {
    return { ok: false, sourceText: "", status: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function loadExistingBlogCorpus(blogDir) {
  try {
    const files = await fs.readdir(blogDir);
    const mdxFiles = files.filter((file) => file.endsWith(".mdx"));
    const contents = await Promise.all(
      mdxFiles.map(async (file) => ({
        file,
        text: await fs.readFile(path.join(blogDir, file), "utf8"),
      })),
    );
    return contents;
  } catch {
    return [];
  }
}

function maxCorpusSimilarity(title, body, corpus) {
  let maxTitleSimilarity = 0;
  let maxBodySimilarity = 0;
  let closestFile = null;

  for (const entry of corpus) {
    const titleSimilarity = jaccardSimilarity(title, entry.text);
    const bodySimilarity = jaccardSimilarity(body, entry.text.slice(0, 6000));

    if (bodySimilarity > maxBodySimilarity) {
      maxBodySimilarity = bodySimilarity;
      maxTitleSimilarity = titleSimilarity;
      closestFile = entry.file;
    }
  }

  return {
    maxTitleSimilarity,
    maxBodySimilarity,
    closestFile,
  };
}

function containsBannedTopic(text) {
  return /\b(casino|sportsbook|gambling|porn|onlyfans|adult content|betting tips|crypto pump)\b/i.test(
    String(text || ""),
  );
}

function hasUnsafeClaims(text, topicName) {
  const basePatterns = [
    /\bguaranteed returns?\b/i,
    /\bcan't fail\b/i,
    /\brisk[- ]free\b/i,
    /\b100%\s*(secure|safe|guaranteed)\b/i,
    /\bnot legal advice\b/i,
  ];

  const securityPatterns =
    topicName === "Cybersecurity"
      ? [/\bunhackable\b/i, /\bimpossible to breach\b/i, /\bcomplete security\b/i]
      : [];

  return [...basePatterns, ...securityPatterns].some((pattern) =>
    pattern.test(String(text || "")),
  );
}

function descriptionFromExcerpt(excerpt, body) {
  return String(excerpt || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 170) || String(body || "").replace(/[#*`]/g, "").trim().slice(0, 170);
}

function titleContainsTag(title, tags) {
  const lowerTitle = String(title || "").toLowerCase();
  return (tags || []).some((tag) => lowerTitle.includes(String(tag || "").toLowerCase()));
}

function titleBodySimilarityToSource(title, body, sourceTitle, sourceSummary, sourceText) {
  return {
    titleSourceSimilarity: sourceTitle ? jaccardSimilarity(title, sourceTitle) : 0,
    bodySummarySimilarity: sourceSummary ? jaccardSimilarity(body, sourceSummary) : 0,
    bodySourceTextSimilarity: sourceText ? jaccardSimilarity(body, sourceText) : 0,
  };
}

export async function validateDraft({
  title,
  body,
  sourceTitle = "",
  sourceSummary = "",
  sourceUrl = "",
  minimumWords = 900,
  requireSource = true,
  topicName = "",
  tags = [],
  excerpt = "",
  blogDir = "",
  imageMode = "none",
  photoCredit = "",
  layoutVariant = "analysis",
}) {
  const wordCount = countWords(body);
  const themeLabels = (body.match(/^###\s+/gm) || []).length;
  const titleMatchesSource =
    sourceTitle &&
    title.trim().toLowerCase() === String(sourceTitle).trim().toLowerCase();

  const titleLength = String(title || "").trim().length;
  const description = descriptionFromExcerpt(excerpt, body);
  const descriptionLength = description.length;
  const slug = buildSlug(title);
  const sourceUrlIsHttps = !requireSource
    ? true
    : (() => {
        try {
          const url = new URL(sourceUrl);
          return url.protocol === "https:";
        } catch {
          return false;
        }
      })();
  const sourceDomain = extractDomain(sourceUrl);
  const trustedSourceDomains = new Set([
    "hnrss.org",
    "techcrunch.com",
    "dev.to",
    "github.blog",
    "openai.com",
    "blog.google",
    "wired.com",
    "anthropic.com",
    "news.crunchbase.com",
    "a16z.com",
    "engineering.fb.com",
    "netflixtechblog.com",
    "aws.amazon.com",
    "thehackernews.com",
    "krebsonsecurity.com",
    "schneier.com",
    "blog.cloudflare.com",
    "microsoft.com",
    "unit42.paloaltonetworks.com",
    "portswigger.net",
  ]);

  const sourceFetch = requireSource ? await fetchSourceText(sourceUrl) : { ok: true, sourceText: "", status: null };
  const corpus = blogDir ? await loadExistingBlogCorpus(blogDir) : [];
  const corpusSimilarity = maxCorpusSimilarity(title, body, corpus);
  const sourceSimilarity = titleBodySimilarityToSource(
    title,
    body,
    sourceTitle,
    sourceSummary,
    sourceFetch.sourceText,
  );
  const hypePhraseCount = countHypePhrases(`${title}\n${body}`);

  const checks = {
    hasTitle: Boolean(title.trim()),
    titleIsOriginal: !titleMatchesSource,
    hasSourceUrl: requireSource ? Boolean(sourceUrl) : true,
    sourceUrlIsHttps,
    sourceDomainTrusted: requireSource ? trustedSourceDomains.has(sourceDomain) : true,
    linkIntegrity: requireSource ? Boolean(sourceFetch.ok) : true,
    minimumWordCount: wordCount >= minimumWords,
    hasThemeLabels: themeLabels >= 5,
    seoTitleLength: titleLength >= 45 && titleLength <= 110,
    avoidsLowSignalTitlePatterns: !hasLowSignalTitlePattern(title),
    titleLowSourceOverlap: sourceSimilarity.titleSourceSimilarity < 0.75,
    controlledBrandTone: hypePhraseCount <= 2,
    plagiarismSafeSummary: sourceSimilarity.bodySummarySimilarity < 0.68,
    plagiarismSafeSourceText: sourceSimilarity.bodySourceTextSimilarity < 0.72,
    notRedundantWithCorpus: corpusSimilarity.maxBodySimilarity < 0.78,
    noBannedTopics: !containsBannedTopic(`${title}\n${body}\n${sourceTitle}`),
    metadataHasTags: Array.isArray(tags) && tags.length >= 3 && tags.length <= 8,
    metadataHasSlug: slug.length >= 12,
    metadataDescriptionLength: descriptionLength >= 120 && descriptionLength <= 180,
    seoKeywordInTitleOrTags: titleContainsTag(title, tags) || (tags || []).length > 0,
    unsafeClaimsControlled: !hasUnsafeClaims(`${title}\n${body}`, topicName),
    sourceImageHasCredit:
      imageMode !== "source" ||
      (String(photoCredit || "").trim().length >= 3 &&
        !/^(original source|source|unknown)$/i.test(String(photoCredit || "").trim())),
    generatedImageMarked:
      imageMode !== "generated" ||
      /scafblog automation|ai-generated|generated/i.test(String(photoCredit || "")),
    validLayoutVariant: [
      "analysis",
      "briefing",
      "deep-dive",
      "playbook",
      "dossier",
      "timeline",
      "magazine",
      "report",
      "notebook",
      "field-guide",
    ].includes(layoutVariant),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passedChecks / Object.keys(checks).length) * 100);

  return {
    checks,
    score,
    passed: passedChecks === Object.keys(checks).length,
    stats: {
      wordCount,
      themeLabels,
      titleLength,
      descriptionLength,
      sourceDomain,
      sourceStatus: sourceFetch.status,
      titleSourceSimilarity: Number(sourceSimilarity.titleSourceSimilarity.toFixed(2)),
      bodySummarySimilarity: Number(sourceSimilarity.bodySummarySimilarity.toFixed(2)),
      bodySourceTextSimilarity: Number(sourceSimilarity.bodySourceTextSimilarity.toFixed(2)),
      corpusSimilarity: Number(corpusSimilarity.maxBodySimilarity.toFixed(2)),
      closestCorpusFile: corpusSimilarity.closestFile,
      hypePhraseCount,
      slugLength: slug.length,
    },
  };
}

export function combineReadiness(localScore, reviewerScore) {
  const combined = Math.round(localScore * 0.35 + reviewerScore * 0.65);
  return {
    combined,
    publishReady: combined >= 80,
  };
}
