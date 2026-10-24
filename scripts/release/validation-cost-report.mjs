import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { loadValidationOwnership } from "./validation-ownership.mjs";

const MAX_JOBS = 512;
const MAX_LOG_BYTES = 32 * 1024 * 1024;
const MAX_TESTS = 2048;

/** Observational only: neither inventory nor old-run timings grant validation authority. */
export function createValidationCostReport({ sourceHead, ledger, run = null, log = "" }) {
  if (!/^[a-f0-9]{40}$/u.test(sourceHead ?? "") || !Array.isArray(ledger) || ledger.length > MAX_TESTS
    || typeof log !== "string" || Buffer.byteLength(log) > MAX_LOG_BYTES) throw new Error("invalid validation cost inputs");
  const inventory = Object.create(null);
  const seen = new Set();
  for (const entry of ledger) {
    if (!/^test\/[a-zA-Z0-9_./-]+\.test\.ts$/u.test(entry.test ?? "") || entry.test.includes("..")
      || seen.has(entry.test) || !/^[a-z0-9-]+$/u.test(entry.owner ?? "")) throw new Error("invalid or duplicate cost inventory entry");
    seen.add(entry.test);
    const row = inventory[entry.owner] ??= { files: 0, ordinary: 0, resourceSensitive: 0, integration: 0 };
    row.files += 1;
    row[entry.fastOwner === "fast-remainder" ? "ordinary" : entry.fastOwner === "fast-resource-sensitive" ? "resourceSensitive" : "integration"] += 1;
  }
  if (run && (!/^[a-f0-9]{40}$/u.test(run.headSha ?? "") || !Array.isArray(run.jobs) || run.jobs.length > MAX_JOBS)) {
    throw new Error("invalid observed run context");
  }
  const jobs = (run?.jobs ?? []).filter(job => job.conclusion !== "skipped").map(job => {
    if (!job || !Array.isArray(job.steps ?? []) || (job.steps ?? []).length > 256) throw new Error("invalid observed job steps");
    const steps = (job.steps ?? []).filter(step => step.conclusion !== "skipped").map(step => ({
      // Security: retain bounded labels/timings, never command output or environment values.
      name: label(step.name), durationMs: interval(step.startedAt, step.completedAt),
    }));
    return { name: label(job.name), conclusion: label(job.conclusion), durationMs: interval(job.startedAt, job.completedAt), steps };
  });
  const fileTimings = parseFileTimings(log);
  const complete = jobs.every(job => job.durationMs !== null);
  const starts = (run?.jobs ?? []).filter(job => job.conclusion !== "skipped").map(job => timestamp(job.startedAt));
  const ends = (run?.jobs ?? []).filter(job => job.conclusion !== "skipped").map(job => timestamp(job.completedAt));
  return {
    schema: "a1-validation-cost-report-v1", authority: "observational-only", sourceHead,
    inventory: { files: ledger.length, owners: inventory, entries: ledger.map(entry => ({ test: entry.test, owner: entry.owner,
      execution: entry.fastOwner === "fast-remainder" ? "ordinary" : entry.fastOwner === "fast-resource-sensitive" ? "resource-sensitive" : "integration" })) },
    observation: run ? { head: run.headSha, sameSource: run.headSha === sourceHead, jobs,
      workflowElapsedMs: interval(run.createdAt, run.updatedAt),
      runnerSumMs: complete ? jobs.reduce((sum, job) => sum + job.durationMs, 0) : null,
      longestJobMs: complete && jobs.length ? Math.max(...jobs.map(job => job.durationMs)) : null,
      // This span includes inter-job scheduling/dependencies; it is not a claimed DAG critical path.
      runnerSpanMs: starts.length && [...starts, ...ends].every(value => value !== null) && Math.max(...ends) >= Math.min(...starts)
        ? Math.max(...ends) - Math.min(...starts) : null,
      queueMs: null, criticalPathMs: null,
    } : null,
    fileTimings,
    limitations: ["Job wall time includes setup and cleanup; step timings retain their own labels.",
      "Queue time and DAG critical path require additional Actions metadata and are unavailable here.",
      "File timings are observations from the supplied log, not passing current-source evidence.",
      "Durations from different files or concurrent jobs must not be added as elapsed savings."],
  };
}

function parseFileTimings(log) {
  const clean = log.replace(/\x1b\[[0-9;]*m/gu, "").replace(/\^\[\[[0-9;]*m/gu, "");
  const timings = [];
  for (const line of clean.split("\n")) {
    const match = /(?:✓|✔|PASS)\s+(test\/[a-zA-Z0-9_./-]+\.test\.ts)\s+\(([^)]{1,100})\)\s+(\d+(?:\.\d+)?)(ms|s)\b/u.exec(line);
    if (!match || match[1].includes("..")) continue;
    const durationMs = Number(match[3]) * (match[4] === "s" ? 1000 : 1);
    if (!Number.isFinite(durationMs)) throw new Error("invalid file duration");
    timings.push({ file: match[1], durationMs });
    if (timings.length > MAX_TESTS * 8) throw new Error("unbounded file timing observations");
  }
  return timings.sort((left, right) => right.durationMs - left.durationMs);
}
function timestamp(value) { const result = Date.parse(value); return Number.isFinite(result) && result > 0 ? result : null; }
function interval(start, end) { const a = timestamp(start), b = timestamp(end); return a !== null && b !== null && b >= a ? b - a : null; }
function label(value) { return typeof value === "string" ? value.replace(/[\r\n\x00-\x1f]/gu, " ").slice(0, 200) : "unavailable"; }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
  const authority = await loadValidationOwnership();
  const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const run = value("--run") ? JSON.parse(await readFile(resolve(value("--run")), "utf8")) : null;
  const log = value("--log") ? await readFile(resolve(value("--log")), "utf8") : "";
  const report = createValidationCostReport({ sourceHead, ledger: authority.ledger, run, log });
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (value("--output")) { const path = resolve(value("--output")); await mkdir(dirname(path), { recursive: true }); await writeFile(path, text); }
  else process.stdout.write(text);
}
