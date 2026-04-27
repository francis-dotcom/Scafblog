import fs from "fs/promises";

async function readJson(filepath, fallback) {
  try {
    const raw = await fs.readFile(filepath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function appendRunTracker(filepath, entry) {
  const current = await readJson(filepath, { runs: [] });
  current.runs = Array.isArray(current.runs) ? current.runs : [];
  current.runs.push(entry);
  await fs.writeFile(filepath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
}

export async function appendAgentEvent(filepath, event) {
  const current = await readJson(filepath, { events: [] });
  current.events = Array.isArray(current.events) ? current.events : [];
  current.events.push(event);
  await fs.writeFile(filepath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
}
