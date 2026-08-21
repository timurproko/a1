import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createTierPlan, runTierPlan } from "./validation-tier.mjs";

const requested = selectionFromEnvironment() ?? positionalArguments();
if (requested.length === 0) throw new Error("usage: node scripts/run-validation-tier.mjs <tier-or-scope> [...] or set VALIDATION_SELECTION_JSON");
const plan = await createTierPlan(requested);

if (process.argv.includes("--plan")) {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
} else {
  const result = await runTierPlan(plan);
  const summary = { passed: result.passed, durationMs: result.completedAt - result.startedAt, outcomes: result.outcomes };
  const resultPath = valueAfter("--result");
  if (resultPath) {
    await mkdir(dirname(resolve(resultPath)), { recursive: true });
    await writeFile(resolve(resultPath), `${JSON.stringify({ ...result, requested, selected: plan.selected }, null, 2)}\n`);
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

function positionalArguments() {
  const values = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];
    if (value === "--result") { index += 1; continue; }
    if (!value.startsWith("--")) values.push(value);
  }
  return values;
}

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
