import React from "react";
import clsx from "clsx";
import ArticleHero from "./ArticleHero";
import styles from "./ArticleLayout.module.css";

const HERO_VARIANT_MAP = {
  analysis: "signal",
  briefing: "spotlight",
  "deep-dive": "grid",
  playbook: "minimal",
  dossier: "signal",
  timeline: "spotlight",
  magazine: "spotlight",
  report: "grid",
  notebook: "minimal",
  "field-guide": "grid",
};

const VARIANTS = [
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
];

function hostFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function MetaCard({ title, value, href = null, children = null }) {
  return (
    <div className={styles.metaCard}>
      <span className={styles.metaTitle}>{title}</span>
      <div className={styles.metaValue}>
        {children ||
          (href ? (
            <a href={href} target="_blank" rel="noreferrer">
              {value}
            </a>
          ) : (
            value
          ))}
      </div>
    </div>
  );
}

export default function ArticleLayout({
  title,
  topicName = "Scafblog",
  excerpt = "",
  tags = [],
  featuredImage = null,
  photoCredit = null,
  creditSourceUrl = null,
  readTime = "5 min read",
  sourceUrl = null,
  imageMode = "none",
  layoutVariant = "analysis",
  children,
}) {
  const variant = VARIANTS.includes(layoutVariant) ? layoutVariant : "analysis";
  const sourceHost = hostFromUrl(sourceUrl);
  const heroVariant = HERO_VARIANT_MAP[variant] || "signal";
  const allTags = tags.slice(0, 6);

  const hero = (
    <ArticleHero
      title={title}
      topicName={topicName}
      excerpt={excerpt}
      tags={tags}
      featuredImage={featuredImage}
      photoCredit={photoCredit}
      creditSourceUrl={creditSourceUrl}
      readTime={readTime}
      sourceUrl={sourceUrl}
      imageMode={imageMode}
      layoutVariant={heroVariant}
    />
  );

  const tagBlock = (
    <div className={styles.tagList}>
      {allTags.map((tag) => (
        <span className={styles.tag} key={tag}>
          {tag}
        </span>
      ))}
    </div>
  );

  if (variant === "briefing") {
    return (
      <section className={clsx(styles.shell, styles.briefing)}>
        {hero}
        <div className={styles.frame}>
          <div className={styles.metaStrip}>
            <MetaCard title="Read time" value={readTime} />
            <MetaCard title="Source" value={sourceHost || "Internal brief"} href={sourceUrl} />
            <MetaCard title="Tags" children={tagBlock} />
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Executive summary</span>
            <p className={styles.summaryText}>{excerpt}</p>
          </div>
          <div className={clsx(styles.content, styles.prose)}>{children}</div>
        </div>
      </section>
    );
  }

  if (variant === "deep-dive") {
    return (
      <section className={clsx(styles.shell, styles.deepDive)}>
        {hero}
        <div className={styles.frame}>
          <div className={clsx(styles.content, styles.prose)}>{children}</div>
          <aside className={styles.metaRail}>
            <MetaCard title="Topic" value={topicName} />
            <MetaCard title="Read time" value={readTime} />
            <MetaCard title="Source" value={sourceHost || "Internal brief"} href={sourceUrl} />
            <MetaCard title="Index" children={tagBlock} />
          </aside>
        </div>
      </section>
    );
  }

  if (variant === "playbook") {
    return (
      <section className={clsx(styles.shell, styles.playbook)}>
        {hero}
        <div className={styles.frame}>
          <aside className={styles.metaRail}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Quick brief</span>
              <p className={styles.summaryText}>{excerpt}</p>
            </div>
            <MetaCard title="Use this for" value={topicName} />
            <MetaCard title="Estimated read" value={readTime} />
            <MetaCard title="Key signals" children={tagBlock} />
          </aside>
          <div className={clsx(styles.content, styles.prose)}>{children}</div>
        </div>
      </section>
    );
  }

  if (variant === "dossier") {
    return (
      <section className={clsx(styles.shell, styles.dossier)}>
        {hero}
        <div className={styles.frame}>
          <div className={styles.metaStrip}>
            <MetaCard title="Dossier" value={topicName} />
            <MetaCard title="Read time" value={readTime} />
            <MetaCard title="Source" value={sourceHost || "Internal brief"} href={sourceUrl} />
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Case file</span>
            <p className={styles.summaryText}>{excerpt}</p>
          </div>
          <div className={clsx(styles.content, styles.prose, styles.panelProse)}>{children}</div>
        </div>
      </section>
    );
  }

  if (variant === "timeline") {
    return (
      <section className={clsx(styles.shell, styles.timeline)}>
        {hero}
        <div className={styles.frame}>
          <aside className={styles.metaRail}>
            <MetaCard title="Sequence" value="Event flow" />
            <MetaCard title="Source" value={sourceHost || "Internal brief"} href={sourceUrl} />
            <MetaCard title="Markers" children={tagBlock} />
          </aside>
          <div className={clsx(styles.content, styles.prose, styles.timelineProse)}>{children}</div>
        </div>
      </section>
    );
  }

  if (variant === "magazine") {
    return (
      <section className={clsx(styles.shell, styles.magazine)}>
        {hero}
        <div className={styles.frame}>
          <div className={styles.summaryLead}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Lead</span>
              <p className={styles.summaryText}>{excerpt}</p>
            </div>
            <div className={styles.metaCard}>
              <span className={styles.metaTitle}>Signals</span>
              {tagBlock}
            </div>
          </div>
          <div className={clsx(styles.content, styles.prose, styles.wideProse)}>{children}</div>
        </div>
      </section>
    );
  }

  if (variant === "report") {
    return (
      <section className={clsx(styles.shell, styles.report)}>
        {hero}
        <div className={styles.frame}>
          <div className={styles.reportHeader}>
            <MetaCard title="Report type" value={topicName} />
            <MetaCard title="Duration" value={readTime} />
            <MetaCard title="Reference" value={sourceHost || "Internal brief"} href={sourceUrl} />
            <MetaCard title="Keywords" children={tagBlock} />
          </div>
          <div className={clsx(styles.content, styles.prose, styles.panelProse)}>{children}</div>
        </div>
      </section>
    );
  }

  if (variant === "notebook") {
    return (
      <section className={clsx(styles.shell, styles.notebook)}>
        {hero}
        <div className={styles.frame}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Notebook summary</span>
            <p className={styles.summaryText}>{excerpt}</p>
          </div>
          <div className={clsx(styles.content, styles.prose, styles.notebookProse)}>{children}</div>
        </div>
      </section>
    );
  }

  if (variant === "field-guide") {
    return (
      <section className={clsx(styles.shell, styles.fieldGuide)}>
        {hero}
        <div className={styles.frame}>
          <aside className={styles.metaRail}>
            <MetaCard title="Field" value={topicName} />
            <MetaCard title="Read time" value={readTime} />
            <MetaCard title="Checklist" children={tagBlock} />
          </aside>
          <div className={clsx(styles.content, styles.prose, styles.guideProse)}>{children}</div>
        </div>
      </section>
    );
  }

  return (
    <section className={clsx(styles.shell, styles.analysis)}>
      {hero}
      <div className={styles.frame}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Why this matters</span>
          <p className={styles.summaryText}>{excerpt}</p>
        </div>
        <div className={clsx(styles.content, styles.prose)}>{children}</div>
      </div>
    </section>
  );
}
