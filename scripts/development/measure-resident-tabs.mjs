#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";

const budgets = Object.freeze({
  warmCreateMs: 250,
  reattachPaintMs: 300,
  reattachInputMs: 400,
  inputToProcessMs: 16,
  outputToPresentMs: 33,
});

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)];
}

export function summarizeResidentTabMeasurements(samples, directStartupBudgetMs) {
  const coldBudget = directStartupBudgetMs + 800;
  const definitions = { coldLaunchMs: coldBudget, ...budgets };
  const measurements = Object.fromEntries(Object.entries(definitions).map(([metric, budgetMs]) => {
    const values = samples.map(sample => sample[metric]).filter(value => Number.isFinite(value) && value >= 0);
    const p95Ms = percentile(values, 0.95);
    return [metric, { samples: values.length, p95Ms, budgetMs, passed: p95Ms !== null && p95Ms <= budgetMs }];
  }));
  return { platform: `${process.platform}-${process.arch}`, directStartupBudgetMs, measurements };
}

async function main() {
  const fileIndex = process.argv.indexOf("--samples");
  const budgetIndex = process.argv.indexOf("--direct-startup-budget-ms");
  if (fileIndex < 0 || !process.argv[fileIndex + 1]) {
    console.error("usage: node scripts/development/measure-resident-tabs.mjs --samples measurements.json --direct-startup-budget-ms N");
    process.exitCode = 2;
    return;
  }
  const directStartupBudgetMs = Number(budgetIndex >= 0 ? process.argv[budgetIndex + 1] : NaN);
  if (!Number.isFinite(directStartupBudgetMs) || directStartupBudgetMs < 0) throw new Error("a non-negative direct startup budget is required");
  const parsed = JSON.parse(await readFile(process.argv[fileIndex + 1], "utf8"));
  if (!Array.isArray(parsed)) throw new Error("measurement input must be a JSON array");
  const summary = summarizeResidentTabMeasurements(parsed, directStartupBudgetMs);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (Object.values(summary.measurements).some(result => !result.passed)) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("measure-resident-tabs.mjs")) await main();
