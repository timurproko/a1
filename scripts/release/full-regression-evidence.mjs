/** Bind complete-regression lane outcomes to one exact caller, source, selection, run, and attempt. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FULL_LANES = Object.freeze(["windows-2025-node24", "windows-2025-node22", "ubuntu-24.04-node24", "macos-15-node24"]);
const SHA = /^[0-9a-f]{40}$/u;

/** Standalone callers derive a fixed full-suite identity; PR callers carry the trusted selector's digest. */
export function fullContext(environment) {
  const head = environment.FULL_SOURCE;
  const base = environment.FULL_BASE || head;
  const pr = Number(environment.FULL_PR || 0);
  const selectionId = environment.FULL_SELECTION || createHash("sha256").update(JSON.stringify({ head, base, pr, suite: "full-release" })).digest("hex");
  const value = { head, base, pr, selectionId, runId: environment.GITHUB_RUN_ID, runAttempt: Number(environment.GITHUB_RUN_ATTEMPT) };
  if (!SHA.test(head ?? "") || !SHA.test(base) || !Number.isSafeInteger(pr) || pr < 0 || !/^[0-9a-f]{64}$/u.test(selectionId)
    || !/^\d{1,24}$/u.test(value.runId ?? "") || !Number.isSafeInteger(value.runAttempt) || value.runAttempt < 1) throw new Error("invalid complete-regression context");
  return value;
}

function requireTier(result) {
  if (result?.schema !== "a1-validation-outcomes-v1" || result.passed !== true || JSON.stringify(result.requested) !== '["full-release"]'
    || !Array.isArray(result.selected) || !Array.isArray(result.outcomes) || !result.outcomes.length
    || result.outcomes.some(outcome => outcome.exitCode !== 0)) throw new Error("complete-regression tier did not succeed");
  for (const scope of ["update-predecessor", "update-performance", "package-startup", "package-contracts", "typecheck", "architecture", "fast-remainder", "fast-resource-sensitive"]) {
    if (!result.selected.includes(scope)) throw new Error(`complete-regression scope missing: ${scope}`);
  }
  for (const scope of result.selected) {
    if (!result.outcomes.some(outcome => outcome.scopes?.includes(scope))) throw new Error(`complete-regression outcome missing: ${scope}`);
  }
}

/** No lane envelope is produced for failed/incomplete tiers, so missing evidence is never a successful skip. */
export function bindFullLane(context, lane, result) {
  if (!FULL_LANES.includes(lane)) throw new Error("unknown complete-regression lane");
  requireTier(result);
  return { schema: "a1-full-regression-lane-v1", ...context, lane, result };
}

/** Require every retained lane exactly once, with no previous-head or previous-attempt substitution. */
export function requireFullLanes(context, records, jobsResult) {
  if (jobsResult !== "success" || records.length !== FULL_LANES.length) throw new Error("complete-regression jobs or evidence are incomplete");
  const lanes = new Set();
  for (const record of records) {
    if (record?.schema !== "a1-full-regression-lane-v1" || !FULL_LANES.includes(record.lane) || lanes.has(record.lane)) throw new Error("invalid or duplicate complete-regression lane");
    for (const [key, expected] of Object.entries(context)) if (record[key] !== expected) throw new Error(`stale complete-regression ${key}`);
    requireTier(record.result);
    lanes.add(record.lane);
  }
  return { schema: "a1-full-regression-aggregate-v1", ...context, passed: true, lanes: [...lanes].sort() };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const context = fullContext(process.env);
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", timeout: 10000 }).trim();
  if (head !== context.head) throw new Error("complete regression checked out the wrong source");
  const directory = ".artifacts/validation/full-lanes";
  mkdirSync(directory, { recursive: true });
  if (process.argv.includes("--record")) {
    const result = JSON.parse(readFileSync(".artifacts/validation/full-regression.json", "utf8"));
    const record = bindFullLane(context, process.env.FULL_LANE, result);
    writeFileSync(`${directory}/${record.lane}.json`, `${JSON.stringify(record, null, 2)}\n`);
  } else {
    const records = readdirSync(directory).filter(name => name.endsWith(".json")).map(name => JSON.parse(readFileSync(`${directory}/${name}`, "utf8")));
    const result = requireFullLanes(context, records, process.env.FULL_JOBS_RESULT);
    writeFileSync(".artifacts/validation/full-regression-aggregate.json", `${JSON.stringify(result, null, 2)}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Complete regression required\nHead: \`${context.head}\`\nSelection: \`${context.selectionId}\`\nAll four exact-run lanes passed.\n`);
  }
}
