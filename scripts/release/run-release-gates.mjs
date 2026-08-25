import { mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";
import { createTierPlan, loadValidationSuites, runTierPlan } from "./validation-tier.mjs";

const identity = JSON.parse(await readFile(resolve("src/product-identity.json"), "utf8"));
const suites = await loadValidationSuites();
const startedAt = new Date().toISOString();

export const MANDATORY_RELEASE_GATES = Object.freeze(Object.entries(suites.releaseContracts).map(([id, owner]) => Object.freeze({ id, owner })));

let result;
let failure;
try {
  const plan = await createTierPlan(["full-release"]);
  result = await runTierPlan(plan);
  if (!result.passed) {
    const outcome = result.outcomes.find(candidate => candidate.exitCode !== 0);
    failure = { gate: outcome?.id ?? "unknown", command: outcome?.command ?? "unknown", exitCode: outcome?.exitCode ?? 1 };
  }
} catch (error) {
  failure = { gate: "validation-orchestration", command: "node scripts/release/run-validation-tier.mjs full-release", exitCode: 1, message: error instanceof Error ? error.message : String(error) };
}

const verdictDirectory = resolve(".artifacts", "release-verdicts");
await mkdir(verdictDirectory, { recursive: true });
const verdictPath = resolve(verdictDirectory, `${platform()}-${arch()}.json`);
await writeFile(verdictPath, JSON.stringify({
  schema: identity.evidence.previewPlatformVerdictSchema,
  platform: platform(), architecture: arch(), osRelease: release(),
  runnerLabel: process.env[identity.environment.releaseRunnerLabel] ?? null,
  startedAt, completedAt: new Date().toISOString(), passed: failure === undefined,
  channel: "next", certificationStatus: "uncertified-development-preview", terminalCapability: "transparent",
  physicalHostCertification: "deferred", crossPlatformCertification: "deferred", stableReleaseEligible: false,
  requiredGates: MANDATORY_RELEASE_GATES.map(gate => gate.id),
  gateOwners: Object.fromEntries(MANDATORY_RELEASE_GATES.map(gate => [gate.id, gate.owner])),
  outcomes: result?.outcomes ?? [],
  ...(failure ? { failure } : {}),
}, null, 2));
process.stdout.write(`Release verdict: ${verdictPath}\n`);
process.exit(failure ? 1 : 0);
