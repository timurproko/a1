import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createPlatformVerdict } from "./stable-certification.mjs";

const outcomes = await readJson(required("--outcomes"));
const candidate = await readJson(required("--candidate"));
const [pack] = await readJson(required("--pack-result"));
const output = resolve(required("--output"));
const verdict = createPlatformVerdict({
  platform: required("--platform"),
  commit: candidate.commit,
  tree: candidate.tree,
  packageName: candidate.packageName,
  version: candidate.version,
  integrity: pack.integrity,
  shasum: pack.shasum,
  outcomes: outcomes.outcomes,
});
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(verdict, null, 2)}\n`);
if (!verdict.passed) process.exitCode = 1;
else process.stdout.write(`Platform verdict: ${output}\n`);

async function readJson(path) { return JSON.parse(await readFile(resolve(path), "utf8")); }
function required(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`missing required argument ${name}`);
  return value;
}
