import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { verifyAutomatedVerdicts } from "./stable-certification.mjs";

const directory = resolve(required("--directory"));
const candidate = await findJson(value => value.schema === "a1-stable-candidate-identity-v1", "stable candidate identity");
const [pack] = await findJson(value => Array.isArray(value) && value[0]?.integrity, "npm pack result");
const verdicts = await findAll(value => value.schema === "a1-stable-automated-platform-verdict-v1");
const expected = { commit: candidate.commit, tree: candidate.tree, packageName: candidate.packageName, version: candidate.version, integrity: pack.integrity, shasum: pack.shasum };
const accepted = verifyAutomatedVerdicts(verdicts, expected);
const output = resolve(required("--output"));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ schema: "a1-stable-automated-certification-v1", passed: true, expected, platforms: accepted.map(verdict => verdict.platform), stableEligible: false, physical: "required" }, null, 2)}\n`);
process.stdout.write(`Automated stable certification: ${output}\n`);

async function findJson(predicate, name) {
  const matches = await findAll(predicate);
  if (matches.length !== 1) throw new Error(`expected exactly one ${name}, found ${matches.length}`);
  return matches;
}
async function findAll(predicate) {
  const values = [];
  for (const path of await walk(directory)) {
    if (!path.endsWith(".json")) continue;
    try { const value = JSON.parse(await readFile(path, "utf8")); if (predicate(value)) values.push(value); }
    catch (error) { if (error instanceof SyntaxError) continue; throw error; }
  }
  return values;
}
async function walk(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path);
  }
  return files;
}
function required(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`missing required argument ${name}`);
  return value;
}
