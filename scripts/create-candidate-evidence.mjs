import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createCandidateEvidence, verifyCandidateEvidence } from "./candidate-evidence.mjs";

const tarballPath = required("--tarball");
const impact = JSON.parse(await readFile(resolve(required("--impact")), "utf8"));
const outcomes = JSON.parse(await readFile(resolve(required("--outcomes")), "utf8"));
const output = resolve(required("--output"));
const evidence = await createCandidateEvidence({
  tarballPath: resolve(tarballPath),
  commit: required("--commit"),
  tree: required("--tree"),
  channel: required("--channel"),
  selected: impact.selected,
  outcomes: outcomes.outcomes,
  runner: {
    workflow: process.env.GITHUB_WORKFLOW ?? "local-candidate-dry-run",
    runId: process.env.GITHUB_RUN_ID ?? "local",
    attempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 1),
    label: process.env.RUNNER_NAME ?? "local",
  },
});
await verifyCandidateEvidence(evidence, { tarballPath: resolve(tarballPath), commit: evidence.source.commit, tree: evidence.source.tree, channel: evidence.channel });
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`Candidate evidence: ${output}\n`);

function required(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`missing required argument ${name}`);
  return value;
}
