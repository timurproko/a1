import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createTierPlan, prepareSharedExactPackage, runTierPlan } from "./validation-tier.mjs";
import { validationOutcomeAuthority } from "./validation-outcome.mjs";

const requested = selectionFromEnvironment() ?? positionalArguments();
if (requested.length === 0) throw new Error("usage: node scripts/release/run-validation-tier.mjs <tier-or-scope> [...] or set VALIDATION_SELECTION_JSON");
const additionalTests = testsFromEnvironment();
const plan = await createTierPlan(requested, process.cwd(), { additionalTests });

if (process.argv.includes("--prepare-exact-package")) {
  const handoffPath = valueAfter("--handoff");
  if (!handoffPath) throw new Error("usage: node scripts/release/run-validation-tier.mjs --prepare-exact-package --handoff <path>");
  const handoff = await prepareSharedExactPackage(plan);
  await mkdir(dirname(resolve(handoffPath)), { recursive: true });
  await writeFile(resolve(handoffPath), `${JSON.stringify(handoff, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ prepared: 1, consumers: handoff.consumers, durationMs: handoff.durationMs, phases: handoff.receipt.preparation.phases }, null, 2)}\n`);
} else if (process.argv.includes("--plan")) {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
} else {
  const result = await runTierPlan(plan, { exactPackageHandoff: valueAfter("--exact-package-handoff") });
  const summary = { passed: result.passed, durationMs: result.completedAt - result.startedAt, outcomes: result.outcomes };
  const resultPath = valueAfter("--result");
  if (resultPath) {
    await mkdir(dirname(resolve(resultPath)), { recursive: true });
    const authority = validationOutcomeAuthority(process.env, requested, plan.selected);
    await writeFile(resolve(resultPath), `${JSON.stringify({ ...result, requested, selected: plan.selected, structuralEvidence: plan.structuralEvidence, authority }, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = result.passed ? 0 : 1;
}

function selectionFromEnvironment() {
  if (!process.env.VALIDATION_SELECTION_JSON) return null;
  const value = JSON.parse(process.env.VALIDATION_SELECTION_JSON);
  if (!Array.isArray(value) || value.some(entry => typeof entry !== "string")) throw new Error("VALIDATION_SELECTION_JSON must be a JSON string array");
  return value;
}

function testsFromEnvironment() {
  if (!process.env.VALIDATION_TESTS_JSON) return [];
  const value = JSON.parse(process.env.VALIDATION_TESTS_JSON);
  if (!Array.isArray(value) || value.some(entry => typeof entry !== "string")) throw new Error("VALIDATION_TESTS_JSON must be a JSON string array");
  return value;
}

function positionalArguments() {
  const valued = new Set(["--result", "--handoff", "--exact-package-handoff"]);
  const values = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];
    if (valued.has(value)) { index += 1; continue; }
    if (!value.startsWith("--")) values.push(value);
  }
  return values;
}

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
