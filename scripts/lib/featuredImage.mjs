import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absoluteUrl(candidate, baseUrl) {
  if (!candidate || typeof candidate !== "string") {
    return null;
  }

  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractHtmlImageUrls(html, baseUrl) {
  if (!html || typeof html !== "string") {
    return [];
  }

  const matches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
  return matches
    .map((match) => absoluteUrl(decodeHtml(match[1]), baseUrl))
    .filter(Boolean);
}

function extractMetaImage(html, baseUrl) {
  if (!html || typeof html !== "string") {
    return null;
  }

  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return absoluteUrl(decodeHtml(match[1]), baseUrl);
    }
  }

  return null;
}

function sanitizeCandidates(candidates) {
  return [...new Set(candidates.filter((value) => typeof value === "string" && /^https?:\/\//i.test(value)))];
}

function extractMetaValue(html, patterns, baseUrl = null) {
  if (!html || typeof html !== "string") {
    return null;
  }

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const value = decodeHtml(match[1]).trim();
      return baseUrl ? absoluteUrl(value, baseUrl) : value;
    }
  }

  return null;
}

function extractPhotoCredit(html) {
  return extractMetaValue(html, [
    /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:site["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']author["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:author["']/i,
  ]);
}

function deriveCreditLabel(url, item, htmlCredit = "") {
  if (htmlCredit) {
    return htmlCredit;
  }

  const creator =
    item?.creator ||
    item?.author ||
    item?.["dc:creator"] ||
    item?.["media:credit"] ||
    "";

  if (typeof creator === "string" && creator.trim()) {
    return creator.trim();
  }

  try {
    const hostname = new URL(url || item?.link || "").hostname.replace(/^www\./, "");
    return hostname || "Original source";
  } catch {
    return "Original source";
  }
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTitle(title, maxLineLength = 26) {
  const words = String(title || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function paletteForTopic(topicName = "") {
  const value = topicName.toLowerCase();
  if (value.includes("cyber")) {
    return { start: "#081c15", end: "#1b4332", accent: "#95d5b2", accent2: "#52b788" };
  }
  if (value.includes("startup")) {
    return { start: "#231942", end: "#5e548e", accent: "#f2e9e4", accent2: "#c9ada7" };
  }
  return { start: "#0b132b", end: "#1c2541", accent: "#5bc0be", accent2: "#c6f1e7" };
}

export async function createGeneratedCover({ title, topicName, slug, staticDir, styleBrief = "" }) {
  const palette = paletteForTopic(topicName);
  const lines = wrapTitle(title);
  const subtitle = escapeXml((styleBrief || topicName || "Scafblog").slice(0, 64));
  const assetDir = path.join(staticDir, "img/blog/generated");
  const filename = `${slug}-cover.svg`;
  const absolutePath = path.join(assetDir, filename);
  const textYStart = 232;
  const lineHeight = 62;

  const titleLines = lines
    .map(
      (line, index) =>
        `<text x="72" y="${textYStart + index * lineHeight}" font-family="Georgia, serif" font-size="48" font-weight="700" fill="#ffffff">${escapeXml(line)}</text>`,
    )
    .join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.start}" />
      <stop offset="100%" stop-color="${palette.end}" />
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)" />
  <circle cx="1310" cy="210" r="190" fill="${palette.accent}" fill-opacity="0.12" />
  <circle cx="1455" cy="115" r="68" fill="${palette.accent2}" fill-opacity="0.28" />
  <path d="M0 730 C280 650 420 790 680 720 C900 660 1100 530 1600 665 L1600 900 L0 900 Z" fill="${palette.accent}" fill-opacity="0.16" />
  <rect x="72" y="118" width="230" height="8" rx="4" fill="${palette.accent}" />
  <text x="72" y="170" font-family="Arial, sans-serif" font-size="22" letter-spacing="3" fill="${palette.accent2}">SCAFBLOG</text>
  ${titleLines}
  <text x="72" y="760" font-family="Arial, sans-serif" font-size="24" fill="${palette.accent2}">${subtitle}</text>
  <text x="72" y="812" font-family="Arial, sans-serif" font-size="18" fill="#d9e2ec">Generated cover illustration</text>
</svg>`;

  await fs.mkdir(assetDir, { recursive: true });
  await fs.writeFile(absolutePath, svg, "utf8");

  return {
    featuredImage: `/img/blog/generated/${filename}`,
    imageSource: "generated",
    originalUrl: null,
    photoCredit: "Scafblog automation",
    creditSourceUrl: null,
    downloaded: true,
  };
}

function pickExtension(url, contentType = "") {
  const normalizedContentType = contentType.toLowerCase();

  if (normalizedContentType.includes("png")) return ".png";
  if (normalizedContentType.includes("webp")) return ".webp";
  if (normalizedContentType.includes("gif")) return ".gif";
  if (normalizedContentType.includes("svg")) return ".svg";

  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  } catch {}

  return ".jpg";
}

function buildAssetName(slug, url, extension) {
  const digest = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  return `${slug}-${digest}${extension}`;
}

function extractItemImageCandidates(item) {
  const directCandidates = [
    item?.enclosure?.url,
    item?.enclosure?.link,
    item?.image?.url,
    item?.image?.href,
    item?.thumbnail,
    item?.["media:thumbnail"]?.url,
    item?.["media:content"]?.url,
  ];

  const htmlCandidates = [
    ...extractHtmlImageUrls(item?.content, item?.link),
    ...extractHtmlImageUrls(item?.["content:encoded"], item?.link),
    ...extractHtmlImageUrls(item?.contentSnippet, item?.link),
  ];

  return sanitizeCandidates([
    ...directCandidates.map((value) => absoluteUrl(value, item?.link)),
    ...htmlCandidates,
  ]);
}

function isGenericPlatformCardImage(url = "") {
  const value = String(url || "");
  if (!value) return false;

  const patterns = [
    /media\d*\.dev\.to\/dynamic\/image/i,
    /dev-to-uploads\.s3\.amazonaws\.com\/uploads\/articles\//i,
    /\/social_previews?\//i,
    /\/opengraph-images?\//i,
    /\/og-image/i,
  ];

  return patterns.some((pattern) => pattern.test(value));
}

export async function resolveFeaturedImage({ item, slug, staticDir }) {
  const candidates = extractItemImageCandidates(item);
  let selectedUrl = candidates[0] || null;
  let selectedSource = selectedUrl ? "feed" : null;
  let creditSourceUrl = item?.link || selectedUrl || null;
  let photoCredit = deriveCreditLabel(selectedUrl, item);

  if (!selectedUrl && item?.link) {
    try {
      const response = await fetch(item.link, {
        headers: {
          "user-agent": "ScafblogBot/1.0 (+https://scafblog.com)",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (response.ok) {
        const html = await response.text();
        selectedUrl =
          extractMetaImage(html, item.link) ||
          extractHtmlImageUrls(html, item.link)[0] ||
          null;
        photoCredit = deriveCreditLabel(selectedUrl || item.link, item, extractPhotoCredit(html));
        creditSourceUrl = item.link;
        if (selectedUrl) {
          selectedSource = "source_page";
        }
      }
    } catch {}
  }

  if (selectedUrl && !photoCredit) {
    photoCredit = deriveCreditLabel(selectedUrl, item);
  }

  if (selectedUrl && isGenericPlatformCardImage(selectedUrl)) {
    return {
      featuredImage: null,
      imageSource: "rejected_generic_platform_card",
      originalUrl: selectedUrl,
      photoCredit: null,
      creditSourceUrl: item?.link || null,
      downloaded: false,
      rejectedGenericCard: true,
    };
  }

  if (!selectedUrl) {
    return {
      featuredImage: null,
      imageSource: null,
      originalUrl: null,
      photoCredit: null,
      creditSourceUrl: null,
      downloaded: false,
      rejectedGenericCard: false,
    };
  }

  try {
    const response = await fetch(selectedUrl, {
      headers: {
        "user-agent": "ScafblogBot/1.0 (+https://scafblog.com)",
        accept: "image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Image request failed: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const extension = pickExtension(selectedUrl, contentType);
    const assetDir = path.join(staticDir, "img/blog/generated");
    const filename = buildAssetName(slug, selectedUrl, extension);
    const absolutePath = path.join(assetDir, filename);

    await fs.mkdir(assetDir, { recursive: true });
    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(absolutePath, bytes);

    return {
      featuredImage: `/img/blog/generated/${filename}`,
      imageSource: selectedSource,
      originalUrl: selectedUrl,
      photoCredit,
      creditSourceUrl,
      downloaded: true,
      rejectedGenericCard: false,
    };
  } catch {
    return {
      featuredImage: selectedUrl,
      imageSource: selectedSource,
      originalUrl: selectedUrl,
      photoCredit,
      creditSourceUrl,
      downloaded: false,
      rejectedGenericCard: false,
    };
  }
}
