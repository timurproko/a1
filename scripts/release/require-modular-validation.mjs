import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateDevelopmentValidationTiming } from "./development-validation-timing.mjs";
import { assertIntegrationSelection } from "./integration-selection.mjs";
import { assertValidationOutcomeAuthority } from "./validation-outcome.mjs";

/** Resolve current-attempt results plus same-run successful evidence from jobs GitHub did not rerun. */
export function requireModularValidation({ impact, owners, outcomes, envelopes = [], modularResult, head, runId, runAttempt }) {
  if (!impact || impact.head !== head || impact.selectionId === undefined) throw new Error("modular validation impact is stale or missing");
  const ownership = { schema: "a1-integration-ownership-v2", owners: owners.map(({ id, cadence, scopes, targets }) => ({ id, cadence, scopes, targets })) };
  const selection = assertIntegrationSelection(impact.integration?.selection, { base: impact.base, head, ownership, exemption: impact.integration?.selection?.exemption });
  const exempt = selection.mode === "exempt";
  const expectedResult = exempt ? "skipped" : "success";
  if (modularResult !== expectedResult) throw new Error(`modular validation must be ${expectedResult}, received ${modularResult ?? "missing"}`);
  if (!Number.isSafeInteger(runAttempt) || runAttempt < 1) throw new Error("modular validation attempt is invalid");
  if (!Array.isArray(outcomes) || outcomes.length > 128 || !Array.isArray(envelopes) || envelopes.length > 256) throw new Error("modular validation evidence population is invalid or unbounded");

  const evidence = outcomes.map(outcome => {
    if (typeof outcome?.passed !== "boolean" || !Array.isArray(outcome.outcomes)
      || outcome.outcomes.some(gate => !gate || !Number.isInteger(gate.exitCode) || !Number.isSafeInteger(gate.durationMs) || gate.durationMs < 0
        || !Array.isArray(gate.scopes) || gate.scopes.length === 0 || gate.scopes.length > 64
        || gate.scopes.some(scope => !/^[a-z][a-z0-9-]{0,79}$/u.test(scope)) || new Set(gate.scopes).size !== gate.scopes.length)) {
      throw new Error("modular validation outcome contains a malformed gate");
    }
    const successful = outcome.passed && outcome.outcomes.every(gate => gate.exitCode === 0);
    if (outcome.passed !== successful) throw new Error("modular validation outcome contradicts its gates");
    const authority = assertValidationOutcomeAuthority(outcome.authority);
    if (authority.head !== head || authority.runId !== runId || authority.runAttempt > runAttempt || authority.selectionId !== impact.selectionId) {
      throw new Error("modular validation outcome authority is stale");
    }
    return { outcome, authority, key: targetKey(authority), successful };
  });
  const envelopeEvidence = envelopes.map(assertEnvelope).map(envelope => {
    if (envelope.head !== head || envelope.runId !== runId || envelope.runAttempt > runAttempt || envelope.selectionId !== impact.selectionId) {
      throw new Error("modular validation envelope authority is stale");
    }
    return { envelope, key: targetKey(envelope) };
  });
  uniqueAttemptKeys(evidence.map(item => `${item.key}:${item.authority.runAttempt}`), "duplicate modular validation outcome authority");
  uniqueAttemptKeys(envelopeEvidence.map(item => `${item.key}:${item.envelope.runAttempt}`), "duplicate modular validation envelope authority");
  if (exempt && (evidence.length > 0 || envelopeEvidence.some(item => item.envelope.active === "true"))) throw new Error("exempt validation unexpectedly produced modular evidence");

  const expected = [];
  if (!exempt) {
    expected.push({ owner: "pr-core", job: "core", platform: "win32", architecture: "x64", node: 24,
      scopes: ["typecheck", "architecture", "pr-core-tests", "pr-selected-tests"] });
    if (impact.prCore.resourceTests.length > 0) expected.push({ owner: "pr-resource", job: "resource", platform: "win32", architecture: "x64", node: 24,
      scopes: ["pr-selected-resource"] });
  }
  for (const decision of selection.owners) for (const target of decision.targets) {
    const descriptor = { owner: decision.owner, job: groupFor(decision.owner, target.platform), platform: target.platform,
      architecture: target.architecture, node: target.node, scopes: decision.scopes };
    if (decision.selected) expected.push(descriptor);
    else if (evidence.some(({ authority }) => matchesOwnerTarget(authority, descriptor))) throw new Error(`excluded owner produced unexpected evidence: ${decision.owner}`);
  }

  const used = [], reused = [];
  for (const descriptor of expected) {
    const key = `${descriptor.job}:${descriptor.platform}:${descriptor.architecture}:${descriptor.node}`;
    const currentEnvelope = envelopeEvidence.find(item => item.key === key && item.envelope.runAttempt === runAttempt)?.envelope;
    if (currentEnvelope && (currentEnvelope.status !== "success" || currentEnvelope.active !== "true")) {
      throw new Error(`current-attempt modular job did not succeed: ${key}`);
    }
    const candidates = evidence.filter(({ authority, successful }) => successful && matchesOwner(authority, descriptor)
      && (!currentEnvelope || authority.runAttempt === runAttempt)).sort((left, right) => right.authority.runAttempt - left.authority.runAttempt);
    if (candidates.length === 0) throw new Error(`required modular outcome missing: ${descriptor.owner}/${descriptor.platform}/node${descriptor.node}`);
    const chosen = candidates[0];
    if (candidates.some(candidate => candidate.authority.runAttempt === chosen.authority.runAttempt && candidate !== chosen)) {
      throw new Error(`required modular outcome duplicated: ${descriptor.owner}/${descriptor.platform}/node${descriptor.node}`);
    }
    if (!currentEnvelope) {
      const priorEnvelope = envelopeEvidence.find(item => item.key === key && item.envelope.runAttempt === chosen.authority.runAttempt)?.envelope;
      if (!priorEnvelope || priorEnvelope.status !== "success" || priorEnvelope.active !== "true") throw new Error(`reused modular outcome lacks successful attempt envelope: ${key}`);
      if (!reused.some(item => item.job === key)) reused.push({ job: key, attempt: chosen.authority.runAttempt });
    }
    if (!used.some(item => item.key === chosen.key)) used.push(chosen);
  }
  const attempts = used.map(item => ({ job: item.key, attempt: item.authority.runAttempt, reused: item.authority.runAttempt < runAttempt }));
  return { mode: selection.mode, selectionId: impact.selectionId,
    selectedOwners: selection.owners.filter(owner => owner.selected).map(owner => owner.owner),
    deferredOwners: selection.owners.filter(owner => owner.cadence === "exhaustive" && !owner.selected).map(owner => owner.owner),
    evidenceCount: used.length, attempts, reused };
}

export function selectModularEvidenceFiles(entries) {
  if (!Array.isArray(entries) || entries.length > 256) throw new Error("modular outcome artifact directory is invalid or unbounded");
  const outcomes = [], envelopes = [];
  for (const entry of entries) {
    if (entry.isDirectory?.()) {
      if (!["package", "phases", "receipts"].includes(entry.name)) throw new Error("modular outcome artifact directory contains an unknown directory");
    } else if (entry.isFile?.()) {
      if (!/^(?:(?:outcome-|job-envelope-).+-attempt-\d+|startup-node(?:22|24)-performance)\.json$/u.test(entry.name)) throw new Error("modular outcome artifact directory contains an unknown file");
      if (entry.name.startsWith("outcome-")) outcomes.push(entry.name);
      if (entry.name.startsWith("job-envelope-")) envelopes.push(entry.name);
    } else throw new Error("modular outcome artifact directory contains an unsupported entry");
  }
  return { outcomes, envelopes };
}
export function selectModularOutcomeFiles(entries) { return selectModularEvidenceFiles(entries).outcomes; }

function assertEnvelope(value) {
  if (!value || value.schema !== "a1-validation-job-envelope-v2" || !/^[0-9a-f]{40}$/u.test(value.head ?? "")
    || !/^\d{1,24}$/u.test(value.runId ?? "") || !Number.isSafeInteger(value.runAttempt) || value.runAttempt < 1
    || !/^[0-9a-f]{64}$/u.test(value.selectionId ?? "") || !/^[a-z][a-z0-9-]{0,79}$/u.test(value.job ?? "")
    || !["win32", "linux", "darwin"].includes(value.platform) || !["x64", "arm64"].includes(value.architecture) || ![22, 24].includes(value.node)
    || !["success", "failure", "cancelled", "skipped"].includes(value.status) || !["true", "false"].includes(value.active)) {
    throw new Error("modular validation envelope is malformed");
  }
  return value;
}
function targetKey(value) { return `${value.job}:${value.platform}:${value.architecture}:${value.node}`; }
function uniqueAttemptKeys(keys, message) { if (new Set(keys).size !== keys.length) throw new Error(message); }
function matchesOwnerTarget(authority, expected) {
  return authority.job === expected.job && authority.platform === expected.platform && authority.architecture === expected.architecture && authority.node === expected.node
    && authority.owners.includes(expected.owner);
}
function matchesOwner(authority, expected) {
  return matchesOwnerTarget(authority, expected) && expected.scopes.every(scope => authority.selected.includes(scope));
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
  const aggregateStartedAt = Date.now();
  const impact = JSON.parse(await readFile(resolve(process.env.VALIDATION_IMPACT ?? ".artifacts/validation/impact.json"), "utf8"));
  const registry = JSON.parse(await readFile(resolve("config/integration-owners.json"), "utf8"));
  const directory = resolve(process.env.VALIDATION_OUTCOMES_DIR ?? ".artifacts/validation/outcomes");
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => error?.code === "ENOENT" ? [] : Promise.reject(error));
  const files = selectModularEvidenceFiles(entries);
  const load = async file => readFile(resolve(directory, file), "utf8").then(source => {
    if (Buffer.byteLength(source) > 2 * 1024 * 1024) throw new Error("modular outcome artifact exceeds bound");
    return JSON.parse(source);
  });
  const [outcomes, envelopes] = await Promise.all([Promise.all(files.outcomes.map(load)), Promise.all(files.envelopes.map(load))]);
  const result = requireModularValidation({ impact, owners: registry.owners, outcomes, envelopes, modularResult: process.env.VALIDATION_MODULAR_RESULT,
    head: process.env.VALIDATION_HEAD, runId: process.env.GITHUB_RUN_ID, runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT) });
  const acceptedAttempts = new Map(result.attempts.map(item => [item.job, item]));
  const jobs = outcomes.filter(outcome => acceptedAttempts.get(targetKey(outcome.authority))?.attempt === outcome.authority.runAttempt)
    .map(outcome => ({ job: outcome.authority.job, platform: outcome.authority.platform, architecture: outcome.authority.architecture, node: outcome.authority.node,
      attempt: outcome.authority.runAttempt, reused: acceptedAttempts.get(targetKey(outcome.authority))?.reused === true,
      setupMs: Math.max(0, outcome.startedAt - outcome.authority.jobStartedAt), gateMs: Math.max(0, outcome.completedAt - outcome.startedAt),
      runnerMs: Math.max(0, outcome.completedAt - outcome.authority.jobStartedAt), invocations: outcome.outcomes.length, cacheState: outcome.authority.cacheState,
      scopeDurations: outcome.outcomes.flatMap(gate => gate.scopes.filter(scope => !scope.endsWith("-prerequisite"))
        .map(scope => ({ id: gate.id, scope, durationMs: gate.durationMs }))) }));
  const aggregateProcessingMs = Math.max(0, Date.now() - aggregateStartedAt);
  const timing = evaluateDevelopmentValidationTiming({ jobs, aggregateProcessingMs });
  const report = { schema: "a1-development-validation-aggregate-v3", ...result, head: impact.head, runId: process.env.GITHUB_RUN_ID,
    runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT), classifierMs: impact.timing.classifierMs, ...timing,
    availableQueueMs: null, availableQueueReason: "GitHub job availability timestamp is not exposed inside the runner", jobs };
  const output = resolve(process.env.VALIDATION_AGGREGATE_OUTPUT ?? ".artifacts/validation/aggregate.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report)}\n`);
}
