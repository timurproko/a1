import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

// Rationale: a baseline entry that names a deleted file approves or covers nothing, so the check that
// reads it passes for the wrong reason; matching recorded strings by shape rather than by field name
// keeps a new baseline field from escaping the gate.
const RECORDED_SOURCE_PATH = /^(?:src|test|scripts|bin)\/[^\s"]+\.(?:ts|js|mjs|mts|cts)$/;

export async function inspectBaselinePaths(root, baselineDirectory = "config/baselines") {
  const directory = resolve(root, baselineDirectory);
  let names;
  try {
    names = (await readdir(directory)).filter(name => name.endsWith(".json")).sort();
  } catch {
    return [`${baselineDirectory}: baseline directory is missing`];
  }
  const errors = [];
  for (const name of names) {
    const label = `${baselineDirectory}/${name}`;
    let document;
    try {
      document = JSON.parse(await readFile(resolve(directory, name), "utf8"));
    } catch (error) {
      errors.push(`${label}: not valid JSON (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    for (const path of recordedSourcePaths(document)) {
      if (!await exists(resolve(root, path))) errors.push(`${label}: records missing path ${path}`);
    }
  }
  return errors;
}

export function recordedSourcePaths(value, found = new Set()) {
  if (typeof value === "string") {
    if (RECORDED_SOURCE_PATH.test(value)) found.add(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) recordedSourcePaths(entry, found);
  } else if (value && typeof value === "object") {
    for (const entry of Object.values(value)) recordedSourcePaths(entry, found);
  }
  return [...found].sort();
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
