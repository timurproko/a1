import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { verifyCandidateEvidence } from "./candidate-evidence.mjs";
import { createStablePublicationPlan } from "./stable-candidate.mjs";

const evidence = JSON.parse(await readFile(resolve(required("--evidence")), "utf8"));
const tarballPath = resolve(required("--tarball"));
const commit = required("--commit");
const tree = required("--tree");
const tag = required("--tag");
await verifyCandidateEvidence(evidence, { tarballPath, commit, tree, version: evidence.package.version, channel: "latest", requireStable: true });
const plan = createStablePublicationPlan(evidence, {
  commit,
  tree,
  tag,
  registryStatus: valueAfter("--registry-status") ?? "unpublished",
  tarballPath,
});
const output = valueAfter("--output");
if (output) await writeFile(resolve(output), `${JSON.stringify(plan, null, 2)}\n`);
else process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);

function required(name) {
  const value = valueAfter(name);
  if (!value) throw new Error(`missing required argument ${name}`);
  return value;
}
function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
