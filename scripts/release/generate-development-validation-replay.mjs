import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { evaluateDevelopmentValidationTiming } from "./development-validation-timing.mjs";
import { selectIntegrationImpact } from "./integration-impact.mjs";
import { loadIntegrationOwners } from "./integration-owners.mjs";
import { loadValidationOwnership, selectValidationOwnership } from "./validation-ownership.mjs";

const output = resolve(valueAfter("--output") ?? ".artifacts/validation/development-validation-replay.json");
const validation = await loadValidationOwnership();
const integrationOwners = await loadIntegrationOwners();
const baseId = "a".repeat(40), headId = "b".repeat(40);
const fixtures = [
  { id: "conservative-invalidator", path: ".github/workflows/ci.yml" },
  { id: "ordinary-release-update", path: "src/foundation/release/bootstrap.ts" },
  { id: "direct-exhaustive-test", path: "test/foundation/release/update-predecessor.integration.test.ts" },
];
const scenarios = fixtures.map(({ id, path }) => {
  const changes = [{ status: "M", path }];
  const coreSelection = selectValidationOwnership({ authority: validation, changes });
  const { selection, fallback } = selectIntegrationImpact({ baseId, headId, changes, owners: integrationOwners, coreSelection });
  return {
    id,
    path,
    mode: selection.mode,
    fallback,
    selectedPullRequestOwners: selection.owners.filter(owner => owner.selected).map(owner => owner.owner),
    deferredExhaustiveOwners: selection.owners.filter(owner => owner.cadence === "exhaustive" && !owner.selected)
      .map(owner => ({ owner: owner.owner, reasons: owner.reasons })),
    focusedPredecessorTests: [...coreSelection.tests, ...coreSelection.resourceTests].filter(test => test.includes("predecessor")),
  };
});
const timing = {
  recordedPr429: evaluateDevelopmentValidationTiming({
    aggregateProcessingMs: 10_000,
    jobs: [
      { job: "promoted", runnerMs: 959_000, scopeDurations: [{ id: "vitest-predecessor", scope: "update-predecessor", durationMs: 834_568 }] },
      { job: "startup", runnerMs: 398_000, scopeDurations: [{ id: "vitest-startup", scope: "package-startup", durationMs: 274_000 }] },
    ],
  }),
  cadenceFilteredReplay: evaluateDevelopmentValidationTiming({
    aggregateProcessingMs: 10_000,
    jobs: [
      { job: "promoted", runnerMs: 100_000, scopeDurations: [
        { id: "vitest-launch", scope: "launch-integration", durationMs: 3_000 },
        { id: "vitest-update-performance", scope: "update-performance", durationMs: 20_955 },
      ] },
      { job: "startup", runnerMs: 398_000, scopeDurations: [{ id: "vitest-startup", scope: "package-startup", durationMs: 274_000 }] },
    ],
  }),
};
const report = {
  schema: "a1-development-validation-replay-v1",
  classification: "recorded-pr429-structural-replay-not-hosted-acceptance",
  targets: { criticalPathMs: 480_000, scopeMs: 300_000 },
  scenarios,
  timing,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ output, scenarios: scenarios.length, recordedTargets: timing.recordedPr429.targets, replayTargets: timing.cadenceFilteredReplay.targets })}\n`);

function valueAfter(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
