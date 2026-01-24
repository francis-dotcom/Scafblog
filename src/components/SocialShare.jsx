import React from "react";

export default function SocialShare({ title, slug }) {
  const baseUrl = "https://scafblog.com";
  const url = `${baseUrl}/blog/${slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    hackernews: `https://news.ycombinator.com/submitlink?u=${encodedUrl}&t=${encodedTitle}`,
  };

  return (
    <div className="social-share">
      <h3>📢 Share this article</h3>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer">
          🐦 Twitter
        </a>
        <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer">
          💼 LinkedIn
        </a>
        <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer">
          📘 Facebook
        </a>
        <a href={shareLinks.reddit} target="_blank" rel="noopener noreferrer">
          🔴 Reddit
        </a>
        <a
          href={shareLinks.hackernews}
          target="_blank"
          rel="noopener noreferrer"
        >
          🟠 HN
        </a>
      </div>
    </div>
  );
}
