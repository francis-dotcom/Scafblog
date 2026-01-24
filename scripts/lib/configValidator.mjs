/**
 * Validate feeds.json configuration file
 */

export function validateConfig(config) {
  const errors = [];

  if (!config) {
    errors.push("Configuration is null or undefined");
    return { valid: false, errors };
  }

  if (!Array.isArray(config.topics)) {
    errors.push("Configuration must have a 'topics' array");
    return { valid: false, errors };
  }

  if (config.topics.length === 0) {
    errors.push("Configuration must have at least one topic");
    return { valid: false, errors };
  }

  config.topics.forEach((topic, index) => {
    const topicPath = `topics[${index}]`;

    if (!topic.name) {
      errors.push(`${topicPath}: 'name' is required`);
    }

    if (!Array.isArray(topic.keywords)) {
      errors.push(`${topicPath}: 'keywords' must be an array`);
    } else if (topic.keywords.length === 0) {
      errors.push(`${topicPath}: 'keywords' array cannot be empty`);
    }

    if (!Array.isArray(topic.feeds)) {
      errors.push(`${topicPath}: 'feeds' must be an array`);
    } else if (topic.feeds.length === 0) {
      errors.push(`${topicPath}: 'feeds' array cannot be empty`);
    } else {
      topic.feeds.forEach((feed, fIdx) => {
        if (typeof feed !== "string" || !isValidUrl(feed)) {
          errors.push(
            `${topicPath}.feeds[${fIdx}]: '${feed}' is not a valid URL`,
          );
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
