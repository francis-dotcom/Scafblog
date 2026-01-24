import fs from "fs/promises";
import path from "path";

const REGISTRY_PATH = path.resolve(
  process.cwd(),
  "stageArea/processedFeeds.json",
);

export async function loadRegistry() {
  try {
    const data = await fs.readFile(REGISTRY_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function saveRegistry(registry) {
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
}

export function hasProcessed(registry, feedUrl, item) {
  const id = item.guid || item.link || item.title;
  return registry?.[feedUrl]?.includes(id);
}

export function markProcessed(registry, feedUrl, item) {
  const id = item.guid || item.link || item.title;
  if (!registry[feedUrl]) registry[feedUrl] = [];
  registry[feedUrl].push(id);
}
