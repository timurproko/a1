import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadValidationOwnership, selectValidationOwnership } from "./validation-ownership.mjs";

const output = resolve(valueAfter("--output") ?? ".artifacts/validation/selection-replay.json");
const authority = await loadValidationOwnership();
const fixtures = [
  ["unrelated-governance", "scripts/governance/check-architecture.mjs"],
  ["ui-rendering", "src/ui/components/transcript-viewport.ts"],
  ["launch-startup", "src/features/launch/runtime-selection.ts"],
  ["release-package-update", "src/foundation/release/bootstrap.ts"],
  ["pi", "src/integrations/pi/engine/agent-engine.ts"],
  ["native-containment", "native/process-guardian/src/main.rs"],
  ["image-history", "src/features/prompt-history/service.ts"],
  ["shared-support", "test/support/shared-fixture.ts"],
  ["validation-authority", "config/validation-ownership.json"],
  ["unknown-operational", "scripts/unknown-operation"],
];
const scenarios = fixtures.map(([id, path]) => {
  const selection = selectValidationOwnership({ authority, changes: [{ status: "M", path }] });
  return {
    id, path, mode: selection.mode,
    selectedOwners: selection.owners.filter(owner => owner.selected).map(owner => owner.owner),
    integrationOwners: selection.integrationOwners,
    tests: { regular: selection.tests.length, resourceSensitive: selection.resourceTests.length,
      digest: digest([...selection.tests, ...selection.resourceTests]) },
    reasons: selection.owners.filter(owner => owner.selected).map(owner => ({ owner: owner.owner, reasons: owner.reasons })),
  };
});
const report = { schema: "a1-validation-selection-replay-v1", policyId: authority.policyId, retainedTests: authority.tests.length, scenarios };
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ output, policyId: report.policyId, scenarios: scenarios.length })}\n`);
function digest(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function valueAfter(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
