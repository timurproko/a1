import { createCandidateEvidence } from "./candidate-evidence.mjs";

export function createPlatformVerdict(input) {
  validatePlatform(input.platform);
  validateCommon(input);
  if (!Array.isArray(input.outcomes) || input.outcomes.length === 0) throw new Error("platform outcomes are missing");
  const failed = input.outcomes.find(outcome => outcome.exitCode !== 0);
  return {
    schema: "a1-stable-automated-platform-verdict-v1",
    platform: input.platform,
    passed: failed === undefined,
    source: { commit: input.commit, tree: input.tree },
    package: { name: input.packageName, version: input.version, integrity: input.integrity, shasum: input.shasum },
    outcomes: input.outcomes,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    ...(failed ? { failure: { gate: failed.id, exitCode: failed.exitCode } } : {}),
  };
}

export function createPhysicalVerdict(input) {
  validatePlatform(input.platform);
  validateCommon(input);
  if (input.isolatedWorker !== true) throw new Error("physical verdict requires a verified isolated worker");
  if (!Array.isArray(input.outcomes) || input.outcomes.length === 0 || input.outcomes.some(outcome => outcome.exitCode !== 0)) throw new Error("physical probe outcomes are missing or failed");
  return {
    schema: "a1-stable-physical-platform-verdict-v1",
    platform: input.platform,
    passed: true,
    isolatedWorker: true,
    source: { commit: input.commit, tree: input.tree },
    package: { name: input.packageName, version: input.version, integrity: input.integrity, shasum: input.shasum },
    outcomes: input.outcomes,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
}

export function verifyAutomatedVerdicts(verdicts, expected) {
  return verifyVerdictSet(verdicts, "a1-stable-automated-platform-verdict-v1", expected, "automated");
}

export function verifyStableVerdicts(input) {
  const automated = verifyAutomatedVerdicts(input.automated, input.expected);
  const physical = verifyVerdictSet(input.physical, "a1-stable-physical-platform-verdict-v1", input.expected, "physical");
  return { automated, physical };
}

export async function createCertifiedStableEvidence(input) {
  const verified = verifyStableVerdicts(input);
  const outcomes = [
    ...verified.automated.map(verdict => ({ id: `automated-${verdict.platform}`, exitCode: 0, durationMs: Number(verdict.durationMs ?? 0) })),
    ...verified.physical.map(verdict => ({ id: `physical-${verdict.platform}`, exitCode: 0, durationMs: Number(verdict.durationMs ?? 0) })),
  ];
  return await createCandidateEvidence({
    tarballPath: input.tarballPath,
    commit: input.expected.commit,
    tree: input.expected.tree,
    channel: "latest",
    selected: ["full-release"],
    outcomes,
    runner: input.runner,
    certification: { class: "stable-candidate", physical: "certified", crossPlatform: "certified", stableEligible: true },
    createdAt: input.createdAt,
  });
}

function verifyVerdictSet(verdicts, schema, expected, kind) {
  if (!Array.isArray(verdicts)) throw new Error(`${kind} platform verdicts are missing`);
  const byPlatform = new Map();
  for (const verdict of verdicts) {
    if (verdict?.schema !== schema) throw new Error(`${kind} verdict schema is invalid`);
    validatePlatform(verdict.platform);
    if (byPlatform.has(verdict.platform)) throw new Error(`${kind} verdict is duplicated for ${verdict.platform}`);
    if (verdict.passed !== true) throw new Error(`${kind} verdict failed for ${verdict.platform}`);
    if (kind === "physical" && verdict.isolatedWorker !== true) throw new Error(`physical verdict is not isolated for ${verdict.platform}`);
    for (const [field, actual] of [
      ["commit", verdict.source?.commit], ["tree", verdict.source?.tree], ["package name", verdict.package?.name],
      ["version", verdict.package?.version], ["integrity", verdict.package?.integrity], ["shasum", verdict.package?.shasum],
    ]) {
      const key = field === "package name" ? "packageName" : field;
      if (actual !== expected[key]) throw new Error(`${kind} ${field} differs for ${verdict.platform}`);
    }
    byPlatform.set(verdict.platform, verdict);
  }
  const required = ["win32", "linux", "darwin"];
  const missing = required.filter(platform => !byPlatform.has(platform));
  if (missing.length > 0) throw new Error(`${kind} platform verdicts are missing: ${missing.join(", ")}`);
  return required.map(platform => byPlatform.get(platform));
}

function validateCommon(input) {
  for (const [name, value] of Object.entries({ commit: input.commit, tree: input.tree, packageName: input.packageName, version: input.version, integrity: input.integrity, shasum: input.shasum })) {
    if (!value) throw new Error(`platform ${name} is missing`);
  }
}

function validatePlatform(platform) {
  if (!["win32", "linux", "darwin"].includes(platform)) throw new Error(`unsupported certification platform: ${platform}`);
}
