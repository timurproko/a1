import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createPhysicalVerdict } from "./stable-certification.mjs";

const outcomes = await readJson(required("--outcomes"));
const candidate = await readJson(required("--candidate"));
const [pack] = await readJson(required("--pack-result"));
const output = resolve(required("--output"));
const verdict = createPhysicalVerdict({
  platform: required("--platform"),
  commit: candidate.commit,
  tree: candidate.tree,
  packageName: candidate.packageName,
  version: candidate.version,
  integrity: pack.integrity,
  shasum: pack.shasum,
  outcomes: outcomes.outcomes,
  isolatedWorker: process.env.PHYSICAL_WORKER_ISOLATED === "true",
});
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(verdict, null, 2)}\n`);
process.stdout.write(`Physical platform verdict: ${output}\n`);

async function readJson(path) { return JSON.parse(await readFile(resolve(path), "utf8")); }
function required(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`missing required argument ${name}`);
  return value;
}
