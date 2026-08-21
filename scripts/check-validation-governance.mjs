import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { matchesImpactPattern } from "./validation-impact.mjs";

const repository = resolve(process.cwd());
const [impact, suites, selectorSource] = await Promise.all([
  readJson(resolve(repository, "config", "validation-impact.json")),
  readJson(resolve(repository, "config", "validation-suites.json")),
  readFile(resolve(repository, "scripts", "select-validation-impact.mjs"), "utf8"),
]);
const errors = [];
const declaredSelections = new Set([...Object.keys(suites.tiers ?? {}), ...Object.keys(suites.scopes ?? {})]);

for (const selection of [...impact.mandatory, ...(impact.planningOnly?.selected ?? []), ...impact.rules.flatMap(rule => rule.scopes ?? [])]) {
  if (!declaredSelections.has(selection)) errors.push(`impact policy references unknown validation selection: ${selection}`);
}

if (JSON.stringify(impact.planningOnly?.patterns) !== JSON.stringify(["openspec/**"])) {
  errors.push("planning-only validation must be limited to openspec/**");
}
if (impact.planningOnly?.selected?.length !== 1 || impact.planningOnly.selected[0] !== "planning") {
  errors.push("planning-only changes must select only the planning tier");
}
if ((impact.planningOnly?.selected ?? []).some(selection => impact.mandatory.includes(selection) || selection === "full-release")) {
  errors.push("planning-only validation must not include runtime or full-release tiers");
}

for (const rule of impact.rules) {
  if (!rule.id || !rule.owner || !Array.isArray(rule.patterns) || rule.patterns.length === 0 || !Array.isArray(rule.scopes)) {
    errors.push(`impact rule is not explainable: ${JSON.stringify(rule)}`);
  }
}

const liveFiles = [
  ...await walk(resolve(repository, "src")),
  ...await walk(resolve(repository, "test")),
].map(path => relative(repository, path).split(sep).join("/"));
for (const path of liveFiles) {
  if (!impact.rules.some(rule => rule.patterns.some(pattern => matchesImpactPattern(pattern, path)))) {
    errors.push(`live path has no validation impact owner: ${path}`);
  }
}

const commandOwners = new Map();
for (const [owner, definition] of [...Object.entries(suites.tiers ?? {}), ...Object.entries(suites.scopes ?? {})]) {
  for (const command of definition.commands ?? []) {
    if (commandOwners.has(command.id)) errors.push(`validation command id has duplicate owners: ${command.id} (${commandOwners.get(command.id)}, ${owner})`);
    else commandOwners.set(command.id, owner);
  }
}

for (const forbidden of ["--skip-validation", "--exclude-scope", "--suppress", "--no-mandatory"]) {
  if (selectorSource.includes(forbidden)) errors.push(`selector exposes suppressive override: ${forbidden}`);
}

if (errors.length > 0) {
  process.stderr.write(`Validation governance failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`Validation governance OK: ${liveFiles.length} live paths, ${impact.rules.length} impact rules, ${commandOwners.size} unique commands\n`);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if ([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".json"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}
