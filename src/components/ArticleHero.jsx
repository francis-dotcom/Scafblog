import React from "react";
import clsx from "clsx";
import styles from "./ArticleHero.module.css";

function buildAccentItems({ topicName, tags, imageMode, sourceUrl, readTime }) {
  const host = sourceUrl
    ? (() => {
        try {
          return new URL(sourceUrl).hostname.replace(/^www\./, "");
        } catch {
          return null;
        }
      })()
    : null;

  return [
    { label: "Topic", value: topicName || "Scafblog" },
    { label: "Mode", value: imageMode === "generated" ? "AI cover" : imageMode === "source" ? "Source visual" : "Text-first" },
    { label: "Read", value: readTime || "Technical brief" },
    { label: "Signal", value: host || (tags?.[0] || "analysis") },
  ];
}

export default function ArticleHero({
  title,
  topicName,
  excerpt,
  tags = [],
  featuredImage = null,
  photoCredit = null,
  creditSourceUrl = null,
  readTime = "5 min read",
  sourceUrl = null,
  imageMode = "none",
  layoutVariant = "signal",
}) {
  const variant = ["signal", "spotlight", "grid", "minimal"].includes(layoutVariant)
    ? layoutVariant
    : "signal";
  const accentItems = buildAccentItems({
    topicName,
    tags,
    imageMode,
    sourceUrl,
    readTime,
  });

  return (
    <section className={clsx(styles.hero, styles[variant])}>
      <div className={styles.topline}>
        <div className={styles.kicker}>{topicName || "Scafblog"}</div>
        <div className={styles.meta}>
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className={styles.chip}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.copy}>
          <h1 className={styles.headline}>{title}</h1>
          {excerpt ? <p className={styles.summary}>{excerpt}</p> : null}

          {variant !== "minimal" ? (
            <div className={styles.accentBlock}>
              {accentItems.map((item) => (
                <div key={item.label} className={styles.accentCard}>
                  <span className={styles.accentLabel}>{item.label}</span>
                  <span className={styles.accentValue}>{item.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {featuredImage ? (
          <div className={styles.visualWrap}>
            <img className={styles.visual} src={featuredImage} alt={title} />
            {photoCredit ? (
              <div className={styles.photoCredit}>
                Photo credit:{" "}
                {creditSourceUrl ? (
                  <a href={creditSourceUrl} target="_blank" rel="noreferrer">
                    {photoCredit}
                  </a>
                ) : (
                  photoCredit
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
