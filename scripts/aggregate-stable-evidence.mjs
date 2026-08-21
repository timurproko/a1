import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createCertifiedStableEvidence } from "./stable-certification.mjs";

const candidateDirectory = resolve(required("--candidate-directory"));
const physicalDirectory = resolve(required("--physical-directory"));
const candidate = await findJson(candidateDirectory, value => value.schema === "a1-stable-candidate-identity-v1", "stable candidate identity");
const [pack] = await findJson(candidateDirectory, value => Array.isArray(value) && value[0]?.integrity, "npm pack result");
const automated = await findAllJson(candidateDirectory, value => value.schema === "a1-stable-automated-platform-verdict-v1");
const physical = await findAllJson(physicalDirectory, value => value.schema === "a1-stable-physical-platform-verdict-v1");
const tarballPath = await findFile(candidateDirectory, "candidate.tgz");
const expected = {
  commit: candidate.commit,
  tree: candidate.tree,
  packageName: candidate.packageName,
  version: candidate.version,
  integrity: pack.integrity,
  shasum: pack.shasum,
};
const evidence = await createCertifiedStableEvidence({
  automated,
  physical,
  expected,
  tarballPath,
  runner: {
    workflow: process.env.GITHUB_WORKFLOW ?? "local-stable-certification",
    runId: process.env.GITHUB_RUN_ID ?? "local",
    attempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 1),
    label: process.env.RUNNER_NAME ?? "local",
  },
});
const output = resolve(required("--output"));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`Certified stable evidence: ${output}\n`);

async function findJson(root, predicate, name) {
  const matches = await findAllJson(root, predicate);
  if (matches.length !== 1) throw new Error(`expected exactly one ${name}, found ${matches.length}`);
  return matches[0];
}
async function findAllJson(root, predicate) {
  const matches = [];
  for (const path of await walk(root)) {
    if (!path.endsWith(".json")) continue;
    try { const value = JSON.parse(await readFile(path, "utf8")); if (predicate(value)) matches.push(value); }
    catch (error) { if (error instanceof SyntaxError) continue; throw error; }
  }
  return matches;
}
async function findFile(root, name) {
  const matches = (await walk(root)).filter(path => path.endsWith(`/${name}`) || path.endsWith(`\\${name}`));
  if (matches.length !== 1) throw new Error(`expected exactly one ${name}, found ${matches.length}`);
  return matches[0];
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
