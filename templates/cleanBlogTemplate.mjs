/**
 * Clean Blog Template
 * Inspired by Writing Blog theme, optimized for Docusaurus
 */

function generateBlogPost({
  title,
  slug,
  date,
  tags,
  authors = ["francis"],
  content,
  sourceUrl,
  excerpt = null,
  featuredImage = null,
  readTime = "5 min read",
}) {
  // Calculate excerpt if not provided
  const description =
    excerpt || content.substring(0, 155).replace(/[#*`]/g, "");

  return `---
slug: ${slug}
title: "${title}"
authors: [${authors.join(", ")}]
tags: [${tags.join(", ")}]
date: ${date}
description: "${description}..."
image: ${featuredImage || "/img/blog/default-post.jpg"}
---

<!--truncate-->

import SocialShare from "@site/src/components/SocialShare";
import GiscusComments from "@site/src/components/GiscusComments";
import Newsletter from "@site/src/components/Newsletter";

${featuredImage ? `![${title}](${featuredImage})` : ""}

${content}

---

## 📌 About This Article

Enjoyed this article? Share your thoughts in the comments below. Found it useful? Subscribe for weekly technical deep-dives.

**Source:** [Read the original discussion](${sourceUrl})

---

<SocialShare title="${title}" slug="${slug}" />

---

## 💬 Join the Conversation

Have thoughts on this? Questions or insights to share?

> 💡 **Note:** Sign in with GitHub to leave a comment. It's free and takes 10 seconds.

<GiscusComments />

---

<Newsletter
  title="🚀 Stay Updated"
  description="Get weekly insights on technology and innovation delivered to your inbox"
  buttonText="Subscribe"
  theme="secondary"
/>
`;
}

function calculateReadTime(content) {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

export { generateBlogPost, calculateReadTime };
