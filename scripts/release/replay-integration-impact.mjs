import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { collectCommitChanges } from "./validation-impact.mjs";
import { classifyIntegrationImpact, exemptIntegrationImpact } from "./integration-impact.mjs";
import { loadIntegrationOwners } from "./integration-owners.mjs";
import { createRevisionDependencyReader } from "./revision-dependencies.mjs";

const exec = promisify(execFile);
const repository = resolve(valueAfter("--root") ?? process.cwd());
const output = resolve(repository, valueAfter("--output") ?? ".artifacts/validation/integration-impact-replay.json");
const head = (await exec("git", ["rev-parse", "HEAD^{commit}"], { cwd: repository, encoding: "utf8" })).stdout.trim();
const reader = createRevisionDependencyReader(repository);
const current = await reader.read(head);
const policy = JSON.parse(await readFile(resolve(repository, "config/integration-dependencies.json"), "utf8"));
const owners = await loadIntegrationOwners(repository);
const fixtureBase = fixtureId(`${head}:base`), fixtureHead = fixtureId(`${head}:head`);
const base = { ...current, revision: fixtureBase }, next = { ...current, revision: fixtureHead };
const scenarios = [
  scenario("unrelated-governance", [{ status: "M", path: "scripts/governance/check-package-identity.mjs" }]),
  scenario("startup-source", [{ status: "M", path: "src/foundation/release/bootstrap.ts" }]),
  scenario("image-source", [{ status: "M", path: "src/integrations/pi/session-ui/image-worker.ts" }]),
  scenario("history-source", [{ status: "M", path: "src/features/prompt-history/worker.ts" }]),
  scenario("native-input", [{ status: "M", path: "native/process-guardian/src/main.rs" }]),
  scenario("validation-policy", [{ status: "M", path: "config/integration-owners.json" }]),
  scenario("unknown-operational", [{ status: "A", path: "scripts/unknown-operation.mjs" }]),
];
const exemptions = ["docs-only", "version-only"].map(exemption => ({ exemption, selection: exemptIntegrationImpact({ base: fixtureBase, head: fixtureHead, owners, exemption }).selection }));
const historical = [];
for (const [label, actualHead, comparison] of [
  ["pr-398", "5079baf8b5469ec05e3f81de28e776802c3ae9c6", "d5d7c1b100158e9d0efdb44f0490ced2ee4ea266"],
  ["pr-400", "fd7f1258a4c8814f0215259cb5f072b228ff3a6c", "d5d7c1b100158e9d0efdb44f0490ced2ee4ea266"],
  ["baseline-34883033336", "47d2adbe26e7d13ad1b98ecafccedcc92209d75e", "d5d7c1b100158e9d0efdb44f0490ced2ee4ea266"],
]) {
  const actualBase = (await exec("git", ["merge-base", comparison, actualHead], { cwd: repository, encoding: "utf8" })).stdout.trim();
  const changes = await collectCommitChanges(repository, actualBase, actualHead);
  historical.push({ label, kind: "historical-path-replay-against-current-reviewed-graph", actualBase, actualHead,
    changes: changes.length, samplePaths: [...new Set(changes.flatMap(change => [change.oldPath, change.path]).filter(Boolean))].sort().slice(0, 32),
    result: summarize(classifyIntegrationImpact({ base, head: next, changes, owners, basePolicy: policy })) });
}
const workflow = await readFile(resolve(repository, ".github/workflows/ci.yml"), "utf8");
const report = {
  schema: "a1-integration-impact-replay-v1", sourceHead: head, graphFixture: { base: fixtureBase, head: fixtureHead, contentRevision: head },
  generatorState: "working tree with uncommitted classifier/replay implementation on sourceHead",
  interpretation: "Synthetic changes and historical path populations replayed against one current immutable reviewed graph. Historical entries are not claims that this future classifier ran on those old heads. Conservative selections are retained rather than discarded.",
  readerStats: reader.stats, scenarios, exemptions, historical,
  workflowControls: { draftSuppression: workflow.includes("github.event.pull_request.draft == false"),
    docsExemption: workflow.includes("needs.changes.outputs.docs-only != 'true'"), versionExemption: workflow.includes("needs.changes.outputs.version-only != 'true'"),
    selectionEnabledForSkips: false },
};
assertReplay(report);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`Integration replay: ${output}\n`);

function scenario(label, changes) {
  return { label, changes, result: summarize(classifyIntegrationImpact({ base, head: next, changes, owners, basePolicy: policy })) };
}
function summarize(result) {
  return { selection: result.selection, fallback: result.fallback,
    dependency: result.dependency && { stats: result.dependency.stats, owners: result.dependency.owners.map(owner => ({
      owner: owner.owner, matches: owner.matches.slice(0, 8), invalidators: owner.invalidators, issueCodes: [...new Set(owner.issues.map(issue => issue.code))].sort(),
    })) } };
}
function selected(entry) { return entry.result.selection.owners.filter(owner => owner.selected).map(owner => owner.owner); }
function assertReplay(report) {
  const byLabel = Object.fromEntries(report.scenarios.map(entry => [entry.label, entry]));
  if (selected(byLabel["unrelated-governance"]).length !== 0) throw new Error("unrelated governance selected integration");
  for (const [label, owner] of [["startup-source", "startup"], ["image-source", "image-compatibility"], ["history-source", "history-compatibility"]]) {
    const decision = byLabel[label].result.selection.owners.find(candidate => candidate.owner === owner);
    if (!decision?.selected || !decision.reasons.some(reason => reason.code === "reachable")) throw new Error(`${label} lost reachable owner reason`);
  }
  for (const label of ["native-input", "validation-policy"]) if (!byLabel[label].result.selection.owners.every(owner => owner.selected && owner.reasons.some(reason => reason.code === "invalidator"))) throw new Error(`${label} is not conservative`);
  if (!byLabel["unknown-operational"].result.selection.owners.every(owner => owner.selected) || byLabel["unknown-operational"].result.fallback === null) throw new Error("unknown input did not fall back");
  if (!report.exemptions.every(entry => entry.selection.owners.every(owner => !owner.selected && owner.reasons[0]?.code === entry.exemption))) throw new Error("exemption replay failed");
  if (!report.workflowControls.draftSuppression || !report.workflowControls.docsExemption || !report.workflowControls.versionExemption || report.workflowControls.selectionEnabledForSkips) throw new Error("workflow controls drifted");
}
function fixtureId(source) { return createHash("sha1").update(source).digest("hex"); }
function valueAfter(name) { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; }
