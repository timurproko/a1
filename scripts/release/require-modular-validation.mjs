import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertIntegrationSelection } from "./integration-selection.mjs";
import { assertValidationOutcomeAuthority } from "./validation-outcome.mjs";

/** Fail closed over selected jobs, authorized skips, and exact-head outcome evidence. */
export function requireModularValidation({ impact, owners, outcomes, modularResult, head, runId, runAttempt }) {
  if (!impact || impact.head !== head) throw new Error("modular validation impact is stale or missing");
  const ownership = { schema: "a1-integration-ownership-v1", owners: owners.map(({ id, scopes, targets, development }) => ({ id, scopes, targets, development })) };
  const selection = assertIntegrationSelection(impact.integration?.selection, { base: impact.base, head, ownership, exemption: impact.integration?.selection?.exemption });
  const exempt = selection.mode === "exempt";
  const expectedResult = exempt ? "skipped" : "success";
  if (modularResult !== expectedResult) throw new Error(`modular validation must be ${expectedResult}, received ${modularResult ?? "missing"}`);
  const selectedOwners = new Set(selection.owners.filter(owner => owner.selected).map(owner => owner.owner));
  if (!Array.isArray(outcomes) || outcomes.length > 32) throw new Error("modular validation outcome population is invalid or unbounded");
  const evidence = outcomes.map(outcome => {
    if (!outcome?.passed || !Array.isArray(outcome.outcomes) || outcome.outcomes.some(gate => gate.exitCode !== 0)) throw new Error("modular validation outcome contains a failed or malformed gate");
    const authority = assertValidationOutcomeAuthority(outcome.authority);
    if (authority.head !== head || authority.runId !== runId || authority.runAttempt !== runAttempt || authority.selectionId !== selection.selectionId) {
      throw new Error("modular validation outcome authority is stale");
    }
    return { outcome, authority };
  });
  const keys = evidence.map(({ authority }) => `${authority.job}:${authority.platform}:${authority.architecture}:${authority.node}`);
  if (new Set(keys).size !== keys.length) throw new Error("duplicate modular validation outcome authority");
  if (exempt && evidence.length > 0) throw new Error("exempt validation unexpectedly produced modular evidence");
  if (!exempt) {
    requireEvidence(evidence, { owner: "fast-remainder", job: "fast", platform: "win32", architecture: "x64", node: 24, scopes: ["typecheck", "architecture", "fast-remainder", "dist-integration"] });
    requireEvidence(evidence, { owner: "fast-resource-sensitive", job: "resource", platform: "win32", architecture: "x64", node: 24, scopes: ["fast-resource-sensitive"] });
  }
  for (const decision of selection.owners) {
    for (const target of decision.targets) {
      const matches = evidence.filter(({ authority }) => authority.owners.includes(decision.owner) && authority.platform === target.platform && authority.architecture === target.architecture && authority.node === target.node);
      if (!decision.selected) {
        if (matches.length > 0) throw new Error(`excluded owner produced unexpected evidence: ${decision.owner}`);
        continue;
      }
      requireEvidence(evidence, { owner: decision.owner, job: groupFor(decision.owner, target.platform), platform: target.platform, architecture: target.architecture, node: target.node, scopes: decision.scopes });
    }
  }
  return { mode: selection.mode, selectionId: selection.selectionId, selectedOwners: [...selectedOwners], evidenceCount: evidence.length };
}

function requireEvidence(evidence, expected) {
  const matches = evidence.filter(({ authority }) => authority.job === expected.job && authority.platform === expected.platform && authority.architecture === expected.architecture && authority.node === expected.node
    && authority.owners.includes(expected.owner) && expected.scopes.every(scope => authority.selected.includes(scope)));
  if (matches.length !== 1) throw new Error(`required modular outcome missing or duplicated: ${expected.owner}/${expected.platform}/node${expected.node}`);
}
function groupFor(owner, platform) {
  if (owner === "pi-release-resume") return "pi";
  if (["launch-integration", "update-performance", "structured-runtime", "update-predecessor"].includes(owner)) return "promoted";
  if (owner === "package-contracts") return "package";
  if (owner === "startup") return "startup";
  if (["image-compatibility", "history-compatibility"].includes(owner)) return platform === "win32" ? "compatibility" : "containment";
  if (owner === "unix-containment") return "containment";
  throw new Error(`unknown modular owner: ${owner}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const impact = JSON.parse(await readFile(resolve(process.env.VALIDATION_IMPACT ?? ".artifacts/validation/impact.json"), "utf8"));
  const registry = JSON.parse(await readFile(resolve("config/integration-owners.json"), "utf8"));
  const owners = registry.owners;
  const directory = resolve(process.env.VALIDATION_OUTCOMES_DIR ?? ".artifacts/validation/outcomes");
  const files = await readdir(directory).catch(error => error?.code === "ENOENT" ? [] : Promise.reject(error));
  if (files.length > 64 || files.some(file => !file.endsWith(".json"))) throw new Error("modular outcome artifact directory is invalid or unbounded");
  const outcomeFiles = files.filter(file => file.startsWith("outcome-"));
  const outcomes = await Promise.all(outcomeFiles.map(file => readFile(resolve(directory, file), "utf8").then(source => {
    if (Buffer.byteLength(source) > 2 * 1024 * 1024) throw new Error("modular outcome artifact exceeds bound");
    return JSON.parse(source);
  })));
  const result = requireModularValidation({ impact, owners, outcomes, modularResult: process.env.VALIDATION_MODULAR_RESULT, head: process.env.VALIDATION_HEAD,
    runId: process.env.GITHUB_RUN_ID, runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT) });
  const jobs = outcomes.map(outcome => ({ job: outcome.authority.job, platform: outcome.authority.platform, architecture: outcome.authority.architecture, node: outcome.authority.node,
    setupMs: Math.max(0, outcome.startedAt - outcome.authority.jobStartedAt), gateMs: Math.max(0, outcome.completedAt - outcome.startedAt),
    runnerMs: Math.max(0, outcome.completedAt - outcome.authority.jobStartedAt), invocations: outcome.outcomes.length,
    cacheState: outcome.authority.cacheState }));
  const report = { schema: "a1-development-validation-aggregate-v1", ...result, head: impact.head, runId: process.env.GITHUB_RUN_ID,
    runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT), classifierMs: impact.timing.classifierMs,
    criticalPathMs: jobs.reduce((maximum, job) => Math.max(maximum, job.runnerMs), 0), runnerMs: jobs.reduce((total, job) => total + job.runnerMs, 0),
    availableQueueMs: null, availableQueueReason: "GitHub job availability timestamp is not exposed inside the runner", jobs };
  const output = resolve(process.env.VALIDATION_AGGREGATE_OUTPUT ?? ".artifacts/validation/aggregate.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report)}\n`);
}
