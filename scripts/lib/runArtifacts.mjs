import fs from "fs/promises";
import path from "path";

function safeSegment(value) {
  return String(value || "run")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "run";
}

export async function createRunArtifacts(baseDir, label) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runId = `${timestamp}-${safeSegment(label)}`;
  const runDir = path.join(baseDir, runId);

  await fs.mkdir(runDir, { recursive: true });

  return { runId, runDir, timestamp };
}

export async function writeJsonArtifact(runDir, filename, data) {
  const filepath = path.join(runDir, filename);
  await fs.writeFile(filepath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return filepath;
}

export async function writeTextArtifact(runDir, filename, text) {
  const filepath = path.join(runDir, filename);
  await fs.writeFile(filepath, text, "utf8");
  return filepath;
}

export async function saveLastRun(baseDir, payload) {
  const filepath = path.join(baseDir, "last-run.json");
  await fs.mkdir(baseDir, { recursive: true });
  await fs.writeFile(filepath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filepath;
}

export async function loadLastRun(baseDir) {
  const filepath = path.join(baseDir, "last-run.json");

  try {
    const raw = await fs.readFile(filepath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
