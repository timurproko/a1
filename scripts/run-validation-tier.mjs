import { createTierPlan, runTierPlan } from "./validation-tier.mjs";

const requested = process.argv.slice(2).filter(argument => !argument.startsWith("--"));
if (requested.length === 0) throw new Error("usage: node scripts/run-validation-tier.mjs <tier-or-scope> [...]");
const plan = await createTierPlan(requested);

if (process.argv.includes("--plan")) {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
} else {
  const result = await runTierPlan(plan);
  process.stdout.write(`${JSON.stringify({ passed: result.passed, durationMs: result.completedAt - result.startedAt, outcomes: result.outcomes }, null, 2)}\n`);
  process.exitCode = result.passed ? 0 : 1;
}
