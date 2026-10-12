import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const rootIndex = process.argv.indexOf("--root");
const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : new URL("../..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const allowed = new Set([
  "src/integrations/pi/engine/runtime-integration.ts",
  "src/integrations/pi/engine/session-selection.ts",
  "src/integrations/pi/engine/workflow-contexts.ts",
]);
const guardedOwners = new Set([
  "src/integrations/pi/engine/runtime-integration.ts",
  "src/integrations/pi/engine/session-selection.ts",
  "src/integrations/pi/engine/workflow-contexts.ts",
]);
const calls = /\bSessionManager\s*\.\s*(?:create|open|forkFrom|continueRecent)\s*\(/g;

async function walk(path) {
  const output = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) output.push(...await walk(child));
    else if ([".ts", ".js", ".mjs"].includes(extname(entry.name))) output.push(child);
  }
  return output;
}

export function inspectSessionWriterGuard(sources) {
  const errors = [];
  for (const [path, source] of Object.entries(sources)) {
    if (!calls.test(source)) continue;
    calls.lastIndex = 0;
    if (!allowed.has(path)) errors.push(`${path}: constructs a Pi session writer outside a guarded owner`);
  }
  for (const path of guardedOwners) {
    const source = sources[path];
    if (source !== undefined && !/foundation\/session-writer-lock\/index\.js/.test(source)) {
      errors.push(`${path}: guarded owner does not import the session-writer lock`);
    }
  }
  return errors;
}

const sources = {};
for (const directory of [resolve(root, "src"), resolve(root, "bin")]) {
  for (const file of await walk(directory)) {
    sources[relative(root, file).split(sep).join("/")] = await readFile(file, "utf8");
  }
}
const errors = inspectSessionWriterGuard(sources);
if (errors.length) {
  console.error(`Session writer guard check failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Session writer guard OK");
}
