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

  const checks = {
    hasTitle: Boolean(title.trim()),
    titleIsOriginal: !titleMatchesSource,
    hasSourceUrl: requireSource ? Boolean(sourceUrl) : true,
    minimumWordCount: wordCount >= minimumWords,
    hasThemeLabels: themeLabels >= 5,
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
