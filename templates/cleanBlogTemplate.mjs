/**
 * Clean Blog Template
 * Inspired by Writing Blog theme, optimized for Docusaurus
 */

function generateBlogPost({
  title,
  slug,
  date,
  topicName = "Scafblog",
  tags,
  authors = ["francis"],
  content,
  sourceUrl,
  excerpt = null,
  featuredImage = null,
  photoCredit = null,
  creditSourceUrl = null,
  imageMode = "none",
  layoutVariant = "analysis",
  readTime = "5 min read",
}) {
  const escapeAttribute = (value) =>
    String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, "&quot;");
  // Calculate excerpt if not provided
  const description =
    excerpt || content.substring(0, 155).replace(/[#*`]/g, "");
  const imageFrontmatter = featuredImage ? `image: ${featuredImage}\n` : "";

  return `---
slug: ${slug}
title: "${title}"
authors: [${authors.join(", ")}]
tags: [${tags.join(", ")}]
date: ${date}
description: "${description}..."
${imageFrontmatter}---
 
<!--truncate-->
 
import ArticleLayout from "@site/src/components/ArticleLayout";
import SocialShare from "@site/src/components/SocialShare";
import GiscusComments from "@site/src/components/GiscusComments";
import Newsletter from "@site/src/components/Newsletter";

<ArticleLayout
  title="${escapeAttribute(title)}"
  topicName="${escapeAttribute(topicName)}"
  excerpt="${escapeAttribute(description)}"
  tags={[${tags.map((tag) => `"${tag}"`).join(", ")}]}
  featuredImage={${featuredImage ? `"${featuredImage}"` : "null"}}
  photoCredit={${photoCredit ? `"${escapeAttribute(photoCredit)}"` : "null"}}
  creditSourceUrl={${creditSourceUrl ? `"${creditSourceUrl}"` : "null"}}
  readTime="${escapeAttribute(readTime)}"
  sourceUrl={${sourceUrl ? `"${sourceUrl}"` : "null"}}
  imageMode="${imageMode}"
  layoutVariant="${layoutVariant}"
>

${content}

</ArticleLayout>

---

## 📌 About This Article

Enjoyed this article? Share your thoughts in the comments below. Found it useful? Subscribe for weekly technical deep-dives.

${sourceUrl ? `**Source:** [Read the original discussion](${sourceUrl})` : "This article was generated from an internal Scafblog topic brief."}

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
