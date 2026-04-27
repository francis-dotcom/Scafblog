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
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "into",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "via",
    "what",
    "when",
    "why",
    "with",
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

export function validateDraft({
  title,
  body,
  sourceTitle = "",
  sourceUrl = "",
  minimumWords = 900,
  requireSource = true,
}) {
  const wordCount = countWords(body);
  const themeLabels = (body.match(/^###\s+/gm) || []).length;
  const titleMatchesSource =
    sourceTitle &&
    title.trim().toLowerCase() === String(sourceTitle).trim().toLowerCase();
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
  const titleLength = String(title || "").trim().length;
  const titleSimilarity = sourceTitle ? jaccardSimilarity(title, sourceTitle) : 0;
  const hypePhraseCount = countHypePhrases(`${title}\n${body}`);

  const checks = {
    hasTitle: Boolean(title.trim()),
    titleIsOriginal: !titleMatchesSource,
    hasSourceUrl: requireSource ? Boolean(sourceUrl) : true,
    sourceUrlIsHttps,
    minimumWordCount: wordCount >= minimumWords,
    hasThemeLabels: themeLabels >= 5,
    seoTitleLength: titleLength >= 45 && titleLength <= 110,
    avoidsLowSignalTitlePatterns: !hasLowSignalTitlePattern(title),
    titleLowSourceOverlap: titleSimilarity < 0.75,
    controlledBrandTone: hypePhraseCount <= 2,
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
      titleSimilarity: Number(titleSimilarity.toFixed(2)),
      hypePhraseCount,
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
