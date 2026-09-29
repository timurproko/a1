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

/** Windows runtimes whose complete coverage runs as parallel hosted-runner shards. */
export const SHARDED_FULL_LANES = Object.freeze(["windows-2025-node24", "windows-2025-node22"]);
const SHARD_SCHEMA = "a1-full-regression-shard-v1";
const SHARD_RECORD_SCHEMA = "a1-full-regression-shard-record-v1";

/** Bind one shard result, passed or failed, to the exact caller and runtime; success is judged only by the merge. */
export function bindFullShard(context, lane, shard, result) {
  if (!SHARDED_FULL_LANES.includes(lane)) throw new Error("complete-regression lane is not sharded");
  if (result?.schema !== "a1-validation-outcomes-v1" || result.fullShard?.schema !== SHARD_SCHEMA || result.fullShard.id !== shard
    || !/^[0-9a-f]{64}$/u.test(result.fullShard.planDigest ?? "") || !Array.isArray(result.outcomes)) throw new Error("malformed complete-regression shard result");
  return { schema: SHARD_RECORD_SCHEMA, ...context, lane, shard, result };
}

/**
 * Reconstruct one complete lane result from every expected shard of the canonical partition. Each shard
 * must be current, successful, and report exactly its assigned work; any gap rejects the whole lane.
 */
export function mergeFullShards(context, lane, partition, records) {
  if (!SHARDED_FULL_LANES.includes(lane)) throw new Error("complete-regression lane is not sharded");
  const expected = Object.keys(partition.shards);
  const byShard = new Map();
  for (const record of records) {
    if (record?.schema !== SHARD_RECORD_SCHEMA || record.lane !== lane || !expected.includes(record.shard)) throw new Error("unexpected complete-regression shard evidence");
    if (byShard.has(record.shard)) throw new Error(`duplicate complete-regression shard: ${record.shard}`);
    for (const [key, value] of Object.entries(context)) if (record[key] !== value) throw new Error(`stale complete-regression shard ${key}`);
    byShard.set(record.shard, record);
  }
  const missing = expected.filter(shard => !byShard.has(shard));
  if (missing.length) throw new Error(`missing complete-regression shards: ${missing.join(", ")}`);

  const owned = new Map();
  const prerequisites = new Map();
  const shards = [];
  for (const shard of expected) {
    const { result } = byShard.get(shard);
    const identity = result.fullShard;
    if (result.schema !== "a1-validation-outcomes-v1" || identity?.schema !== SHARD_SCHEMA || identity.id !== shard) throw new Error(`malformed complete-regression shard: ${shard}`);
    if (identity.planDigest !== partition.planDigest || JSON.stringify(identity.assigned) !== JSON.stringify(partition.shards[shard])
      || JSON.stringify(identity.prerequisites) !== JSON.stringify(partition.prerequisites)) throw new Error(`complete-regression shard ${shard} belongs to another plan`);
    if (result.passed !== true || !Array.isArray(result.outcomes) || result.outcomes.some(outcome => outcome.exitCode !== 0)) throw new Error(`complete-regression shard ${shard} did not succeed`);
    const assigned = [...partition.shards[shard].commands, ...partition.shards[shard].preparation, ...partition.shards[shard].invocations];
    const required = [...partition.prerequisites, ...assigned];
    const ids = result.outcomes.map(outcome => outcome.id);
    if (ids.length !== required.length || new Set(ids).size !== ids.length || required.some(id => !ids.includes(id))) {
      throw new Error(`complete-regression shard ${shard} omits, duplicates, or adds work`);
    }
    for (const outcome of result.outcomes) {
      if (partition.prerequisites.includes(outcome.id)) {
        if (!prerequisites.has(outcome.id)) prerequisites.set(outcome.id, { ...outcome, shard });
      } else owned.set(outcome.id, { ...outcome, shard });
    }
    shards.push({ id: shard, startedAt: result.startedAt, completedAt: result.completedAt, durationMs: result.completedAt - result.startedAt, work: assigned });
  }
  const outcomes = partition.order.map(id => owned.get(id) ?? prerequisites.get(id));
  if (outcomes.some(outcome => outcome === undefined) || owned.size + prerequisites.size !== partition.order.length) throw new Error("complete-regression shards do not cover the canonical plan");
  const startedAt = Math.min(...shards.map(shard => shard.startedAt));
  const completedAt = Math.max(...shards.map(shard => shard.completedAt));
  if (!Number.isSafeInteger(startedAt) || !Number.isSafeInteger(completedAt)) throw new Error("complete-regression shard timing is malformed");
  return {
    schema: "a1-validation-outcomes-v1",
    passed: true,
    startedAt,
    completedAt,
    exactPackagePreparation: byShard.get("package")?.result.exactPackagePreparation ?? null,
    outcomes,
    requested: ["full-release"],
    selected: partition.selected,
    structuralEvidence: partition.structuralEvidence,
    authority: null,
    fullShards: {
      schema: "a1-full-regression-shard-merge-v1",
      planDigest: partition.planDigest,
      elapsedMs: completedAt - startedAt,
      runnerMs: shards.reduce((total, shard) => total + shard.durationMs, 0),
      shards,
    },
  };
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
  } else if (process.argv.includes("--record-shard")) {
    const result = JSON.parse(readFileSync(".artifacts/validation/full-regression.json", "utf8"));
    const record = bindFullShard(context, process.env.FULL_LANE, process.env.FULL_SHARD, result);
    mkdirSync(".artifacts/validation/full-shards", { recursive: true });
    writeFileSync(`.artifacts/validation/full-shards/${record.lane}-${record.shard}.json`, `${JSON.stringify(record, null, 2)}\n`);
  } else if (process.argv.includes("--merge-shards")) {
    // Rationale: only the merge needs the canonical plan, so the aggregate job stays free of installed dependencies.
    const { createTierPlan, partitionFullRegressionPlan } = await import("./validation-tier.mjs");
    const partition = partitionFullRegressionPlan(await createTierPlan(["full-release"]));
    const shardDirectory = ".artifacts/validation/full-shards";
    const records = readdirSync(shardDirectory).filter(name => name.endsWith(".json")).map(name => JSON.parse(readFileSync(`${shardDirectory}/${name}`, "utf8")));
    const merged = mergeFullShards(context, process.env.FULL_LANE, partition, records);
    writeFileSync(".artifacts/validation/full-regression.json", `${JSON.stringify(merged, null, 2)}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      const seconds = value => (value / 1000).toFixed(1);
      const rows = merged.fullShards.shards.map(shard => `| ${shard.id} | ${seconds(shard.durationMs)} | ${shard.work.map(id => `\`${id}\``).join(", ")} |`);
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, [`## Windows shards (${process.env.FULL_LANE})`, "",
        `Elapsed across overlapping shards: **${seconds(merged.fullShards.elapsedMs)}s**; summed shard time: ${seconds(merged.fullShards.runnerMs)}s.`, "",
        "| Shard | Seconds | Owned work |", "| --- | ---: | --- |", ...rows, ""].join("\n"));
    }
  } else {
    const records = readdirSync(directory).filter(name => name.endsWith(".json")).map(name => JSON.parse(readFileSync(`${directory}/${name}`, "utf8")));
    const result = requireFullLanes(context, records, process.env.FULL_JOBS_RESULT);
    writeFileSync(".artifacts/validation/full-regression-aggregate.json", `${JSON.stringify(result, null, 2)}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Complete regression required\nHead: \`${context.head}\`\nSelection: \`${context.selectionId}\`\nAll four exact-run lanes passed.\n`);
  }
}
