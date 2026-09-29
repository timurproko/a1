import { describe, expect, it } from "vitest";
import { bindFullLane, bindFullShard, fullContext, mergeFullShards, SHARDED_FULL_LANES, type FullShardRecord, type FullShardResult } from "../../scripts/release/full-regression-evidence.mjs";
import { FULL_SHARDS } from "../../scripts/release/regression-triage-report.mjs";
import {
  createFullRegressionShardPlan,
  createTierPlan,
  FULL_REGRESSION_SHARDS,
  fullRegressionPlanDigest,
  partitionFullRegressionPlan,
  RESOURCE_SENSITIVE_TIMEOUT_MS,
  type FullRegressionPartition,
  type ValidationPlan,
} from "../../scripts/release/validation-tier.mjs";

const head = "a".repeat(40);
const lane = "windows-2025-node24";
const context = () => fullContext({ FULL_SOURCE: head, FULL_BASE: "b".repeat(40), FULL_PR: "630", FULL_SELECTION: "c".repeat(64), GITHUB_RUN_ID: "4242", GITHUB_RUN_ATTEMPT: "1" });

async function canonical() {
  const plan = await createTierPlan(["full-release"]);
  return { plan, partition: partitionFullRegressionPlan(plan) };
}

/** A successful shard result carrying exactly the work its shard plan owns. */
function shardResult(plan: ValidationPlan, shard: string, startedAt: number): FullShardResult {
  const shardPlan = createFullRegressionShardPlan(plan, shard);
  const identity = shardPlan.fullShard;
  const ids = [...identity.prerequisites, ...identity.assigned.commands, ...identity.assigned.preparation, ...identity.assigned.invocations];
  const scopes = (id: string) => plan.commands.find(command => command.id === id)?.owners
    ?? plan.vitest!.invocations.find(invocation => invocation.id === id)?.scopes ?? plan.exactPackagePreparation!.consumers;
  return {
    schema: "a1-validation-outcomes-v1", passed: true, startedAt, completedAt: startedAt + 1000, requested: ["full-release"], selected: plan.selected,
    exactPackagePreparation: identity.assigned.preparation.length ? { schema: "a1-exact-package-preparation-evidence-v1", count: 1 } : null,
    outcomes: ids.map(id => ({ id, exitCode: 0, durationMs: 10, scopes: scopes(id) })),
    fullShard: identity,
  };
}

function records(plan: ValidationPlan, runtime = lane): FullShardRecord[] {
  return FULL_REGRESSION_SHARDS.map((shard, index) => bindFullShard(context(), runtime, shard, shardResult(plan, shard, 10_000 + index * 100)));
}

describe("complete-regression shard partition", () => {
  it("assigns every canonical command and invocation to exactly one shard", async () => {
    const { plan, partition } = await canonical();
    expect(Object.keys(partition.shards)).toEqual([...FULL_REGRESSION_SHARDS]);
    expect(FULL_SHARDS).toEqual(FULL_REGRESSION_SHARDS);
    const owned = Object.values(partition.shards).flatMap(work => [...work.commands, ...work.preparation, ...work.invocations]);
    expect(new Set(owned).size).toBe(owned.length);
    const canonicalWork = [...plan.commands.map(command => command.id), plan.exactPackagePreparation!.id, ...plan.vitest!.invocations.map(invocation => invocation.id)];
    expect([...partition.prerequisites, ...owned].sort()).toEqual([...canonicalWork].sort());
    expect(partition.order).toEqual(canonicalWork);
    expect(partition.prerequisites).toEqual(["candidate-build"]);
    expect(partition.shards.core.invocations).toEqual(["vitest-full-without-isolated"]);
    expect(partition.shards.rendering.invocations).toEqual(["vitest-isolated-suites"]);
    expect(partition.shards.resource.invocations.every(id => id.startsWith("vitest-fast-resource-sensitive"))).toBe(true);
    expect(partition.shards.package).toMatchObject({ commands: ["candidate-pack"], preparation: ["exact-package-preparation"] });
    expect(partition.shards.package.invocations).toEqual(expect.arrayContaining(["vitest-isolated-timing", "vitest-package-startup", "vitest-package-contracts", "vitest-update-predecessor"]));
  });

  it("keeps shard invocations byte-identical and their serial contracts intact", async () => {
    const { plan } = await canonical();
    const union = FULL_REGRESSION_SHARDS.flatMap(shard => createFullRegressionShardPlan(plan, shard).vitest!.invocations);
    expect([...union].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...plan.vitest!.invocations].sort((a, b) => a.id.localeCompare(b.id)));
    const resource = createFullRegressionShardPlan(plan, "resource");
    for (const invocation of resource.vitest!.invocations) {
      expect(invocation.arguments).toEqual(expect.arrayContaining(["--no-file-parallelism", `--testTimeout=${RESOURCE_SENSITIVE_TIMEOUT_MS}`]));
      expect(invocation.evidence).toMatchObject({ executionClass: "resource-sensitive", fileParallelism: false, retries: 0 });
    }
    expect(createFullRegressionShardPlan(plan, "rendering").vitest!.invocations[0]!.arguments).toContain("--no-file-parallelism");
    const packaged = createFullRegressionShardPlan(plan, "package");
    const ids = packaged.vitest!.invocations.map(invocation => invocation.id);
    expect(ids.indexOf("vitest-package-startup")).toBeLessThan(ids.indexOf("vitest-package-contracts"));
    expect(packaged.exactPackagePreparation).toEqual(plan.exactPackagePreparation);
    expect(packaged.commands.map(command => command.id)).toEqual(["candidate-build", "candidate-pack"]);
    for (const shard of ["core", "resource", "rendering"]) {
      const shardPlan = createFullRegressionShardPlan(plan, shard);
      expect(shardPlan.exactPackagePreparation, shard).toBeNull();
      expect(shardPlan.consumesPackage, shard).toBe(false);
      expect(shardPlan.commands.map(command => command.id), shard).not.toContain("candidate-pack");
      expect(shardPlan.fullShard.planDigest).toBe(fullRegressionPlanDigest(plan));
    }
  });

  it("rejects unknown, duplicate, or unshardable canonical work", async () => {
    const { plan } = await canonical();
    const invocations = plan.vitest!.invocations;
    expect(() => partitionFullRegressionPlan({ ...plan, vitest: { ...plan.vitest!, invocations: [...invocations, { id: "vitest-new-owner", scopes: ["x"], arguments: [] }] } })).toThrow(/no shard/);
    expect(() => partitionFullRegressionPlan({ ...plan, commands: [...plan.commands, { id: "new-gate", executable: "npm", arguments: [], owners: ["x"] }] })).toThrow(/no shard/);
    expect(() => partitionFullRegressionPlan({ ...plan, vitest: { ...plan.vitest!, invocations: [...invocations, invocations[0]!] } })).toThrow(/duplicate/);
    expect(() => partitionFullRegressionPlan({ ...plan, vitest: { ...plan.vitest!, invocations: invocations.filter(invocation => invocation.id !== "vitest-isolated-suites") } })).toThrow(/rendering/);
    const fast = await createTierPlan(["fast"]);
    expect(() => partitionFullRegressionPlan(fast)).toThrow(/canonical full-release/);
    expect(() => createFullRegressionShardPlan(plan, "linux")).toThrow(/unknown/);
  });

  it("changes the canonical digest when owned work changes but not when the candidate path does", async () => {
    const { plan } = await canonical();
    expect(fullRegressionPlanDigest({ ...plan, candidateTarball: "/elsewhere/candidate.tgz" })).toBe(fullRegressionPlanDigest(plan));
    const [first, ...rest] = plan.vitest!.invocations;
    expect(fullRegressionPlanDigest({ ...plan, vitest: { ...plan.vitest!, invocations: [{ ...first!, arguments: [...first!.arguments, "--retry=1"] }, ...rest] } }))
      .not.toBe(fullRegressionPlanDigest(plan));
  });
});

describe("complete-regression shard merging", () => {
  it("reconstructs one canonical lane result that binds to the unchanged four-lane envelope", async () => {
    const { plan, partition } = await canonical();
    const merged = mergeFullShards(context(), lane, partition, records(plan).reverse());
    expect(merged.outcomes.map(outcome => outcome.id)).toEqual(partition.order);
    expect(merged.outcomes.find(outcome => outcome.id === "candidate-build")?.shard).toBe("core");
    expect(merged.outcomes.find(outcome => outcome.id === "vitest-update-predecessor")?.shard).toBe("package");
    expect(merged.fullShards).toMatchObject({ planDigest: partition.planDigest, elapsedMs: 1300, runnerMs: 4000 });
    expect(merged.fullShards.shards.map(shard => shard.id)).toEqual([...FULL_REGRESSION_SHARDS]);
    expect(merged.selected).toEqual(plan.selected);
    expect(bindFullLane(context(), lane, merged)).toMatchObject({ schema: "a1-full-regression-lane-v1", lane });
    expect(mergeFullShards(context(), lane, partition, records(plan))).toEqual(merged);
  });

  it.each([
    ["missing", (value: FullShardRecord[]) => value.slice(1), /missing complete-regression shards: core/],
    ["duplicate", (value: FullShardRecord[]) => [...value, value[0]!], /duplicate/],
    ["stale run", (value: FullShardRecord[]) => [{ ...value[0]!, runId: "4241" }, ...value.slice(1)], /stale complete-regression shard runId/],
    ["stale attempt", (value: FullShardRecord[]) => [{ ...value[0]!, runAttempt: 2 }, ...value.slice(1)], /stale/],
    ["stale head", (value: FullShardRecord[]) => [{ ...value[0]!, head: "d".repeat(40) }, ...value.slice(1)], /stale/],
    ["cross-runtime", (value: FullShardRecord[]) => [{ ...value[0]!, lane: "windows-2025-node22" }, ...value.slice(1)], /unexpected/],
    ["unexpected shard", (value: FullShardRecord[]) => [...value, { ...value[0]!, shard: "linux" }], /unexpected/],
    ["malformed record", (value: FullShardRecord[]) => [{ ...value[0]!, schema: "other" }, ...value.slice(1)], /unexpected/],
    ["wrong plan", (value: FullShardRecord[]) => [{ ...value[0]!, result: { ...value[0]!.result, fullShard: { ...value[0]!.result.fullShard, planDigest: "e".repeat(64) } } }, ...value.slice(1)], /another plan/],
    ["reassigned work", (value: FullShardRecord[]) => [{ ...value[0]!, result: { ...value[0]!.result, fullShard: { ...value[0]!.result.fullShard, assigned: { commands: [], preparation: [], invocations: ["vitest-full-without-isolated"] } } } }, ...value.slice(1)], /another plan/],
    ["failed", (value: FullShardRecord[]) => [{ ...value[0]!, result: { ...value[0]!.result, passed: false } }, ...value.slice(1)], /did not succeed/],
    ["cancelled owner", (value: FullShardRecord[]) => [{ ...value[0]!, result: { ...value[0]!.result, outcomes: value[0]!.result.outcomes.map((outcome, index) => index === 1 ? { ...outcome, exitCode: 1 } : outcome) } }, ...value.slice(1)], /did not succeed/],
    ["omitted work", (value: FullShardRecord[]) => [{ ...value[0]!, result: { ...value[0]!.result, outcomes: value[0]!.result.outcomes.slice(0, -1) } }, ...value.slice(1)], /omits, duplicates, or adds/],
    ["duplicated work", (value: FullShardRecord[]) => [{ ...value[0]!, result: { ...value[0]!.result, outcomes: [...value[0]!.result.outcomes.slice(0, -1), value[0]!.result.outcomes[0]!] } }, ...value.slice(1)], /omits, duplicates, or adds/],
    ["foreign work", (value: FullShardRecord[]) => [{ ...value[0]!, result: { ...value[0]!.result, outcomes: [...value[0]!.result.outcomes.slice(0, -1), { id: "vitest-isolated-suites", exitCode: 0, scopes: [] }] } }, ...value.slice(1)], /omits, duplicates, or adds/],
  ] as const)("rejects %s shard evidence without producing a lane", async (_label, mutate, error) => {
    const { plan, partition } = await canonical();
    expect(() => mergeFullShards(context(), lane, partition, mutate(records(plan)))).toThrow(error);
  });

  it("refuses to shard or bind lanes that are not Windows runtimes", async () => {
    const { plan, partition } = await canonical();
    expect(SHARDED_FULL_LANES).toEqual(["windows-2025-node24", "windows-2025-node22"]);
    expect(() => mergeFullShards(context(), "ubuntu-24.04-node24", partition, records(plan))).toThrow(/not sharded/);
    expect(() => bindFullShard(context(), "macos-15-node24", "core", shardResult(plan, "core", 1))).toThrow(/not sharded/);
    expect(() => bindFullShard(context(), lane, "resource", shardResult(plan, "core", 1))).toThrow(/malformed/);
    const { fullShard: _identity, ...unsharded } = shardResult(plan, "core", 1);
    expect(() => bindFullShard(context(), lane, "core", unsharded as FullShardResult)).toThrow(/malformed/);
  });

  it("rejects a merge against a partition derived from a different canonical plan", async () => {
    const { plan, partition } = await canonical();
    const other: FullRegressionPartition = { ...partition, planDigest: "f".repeat(64) };
    expect(() => mergeFullShards(context(), lane, other, records(plan))).toThrow(/another plan/);
  });
});
