/**
 * Enhanced feed item selection with scoring and relevance ranking
 */

function calculateRelevanceScore(item, keywords) {
  const title = String(item?.title || "").toLowerCase();
  const snippet = String(item?.contentSnippet || "").toLowerCase();
  const content = String(item?.content || "").toLowerCase();

  let score = 0;
  const matchedKeywords = new Set();

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase().trim();

    if (title.includes(normalizedKeyword)) {
      score += 3;
      matchedKeywords.add(keyword);
    }

    if (snippet.includes(normalizedKeyword)) {
      score += 2;
      matchedKeywords.add(keyword);
    }

    if (content.includes(normalizedKeyword)) {
      score += 1;
      matchedKeywords.add(keyword);
    }
  }

  return {
    score,
    matchedKeywords: Array.from(matchedKeywords),
  };
}

export function selectFeedItems(items, topic, options = {}) {
  const { maxItems = 1, minKeywordMatches = 2, minScore = 3 } = options;

  const keywords = (topic.keywords || [])
    .map((k) => String(k).toLowerCase().trim())
    .filter(Boolean);

  if (keywords.length === 0) {
    return [];
  }

  const scoredItems = [];

  for (const item of items || []) {
    if (!item || !item.title) continue;

    const { score, matchedKeywords } = calculateRelevanceScore(item, keywords);

    if (matchedKeywords.length < minKeywordMatches) continue;
    if (score < minScore) continue;

    scoredItems.push({
      item,
      matchedKeywords,
      score,
    });
  }

  return scoredItems.sort((a, b) => b.score - a.score).slice(0, maxItems);
}
