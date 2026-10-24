import { describe, expect, it } from "vitest";
import { createTierPlan, createFullRegressionShardPlan, FULL_REGRESSION_SHARDS } from "../../scripts/release/validation-tier.mjs";
import { loadValidationOwnership } from "../../scripts/release/validation-ownership.mjs";
import { STREAM_RENDERING_WORKLOADS } from "../support/rendering/streaming-workloads.js";
import { CONTENT_RENDERING_WORKLOADS } from "../support/rendering/content-workloads.js";
import { INPUT_RESPONSIVENESS_WORKLOADS } from "../support/input-responsiveness/input-workloads.js";

const replacements = new Map([
  ["test/integrations/pi/tui-runtime/rendering-smoke.test.ts", [
    "test/integrations/pi/tui-runtime/rendering-budgets.test.ts",
    "test/integrations/pi/tui-runtime/content-producer.test.ts",
    "test/integrations/pi/tui-runtime/rendering-smoke-contract.test.ts",
  ]],
  ["test/integrations/pi/tui-runtime/input-responsiveness-smoke.test.ts", [
    "test/integrations/pi/tui-runtime/input-responsiveness-budgets.test.ts",
  ]],
]);

function assignedFiles(arguments_: string[], tests: string[]): string[] {
  const excluded = new Set(arguments_.flatMap((value, index) => arguments_[index - 1] === "--exclude" ? [value] : []));
  const explicit = arguments_.filter((value, index) => value.endsWith(".test.ts") && arguments_[index - 1] !== "--exclude");
  return explicit.length ? explicit : tests.filter(test => !excluded.has(test));
}

describe("coverage-preserving validation efficiency", () => {
  it("assigns every retained file exactly once in full regression or names its executed equivalent contracts", async () => {
    const authority = await loadValidationOwnership();
    const plan = await createTierPlan(["full-release"]);
    const counts = new Map<string, number>();
    for (const invocation of plan.vitest!.invocations) for (const file of assignedFiles(invocation.arguments, authority.tests)) {
      counts.set(file, (counts.get(file) ?? 0) + 1);
    }
    expect([...counts.keys()].filter(file => !authority.tests.includes(file))).toEqual([]);
    for (const test of authority.tests) {
      if (replacements.has(test)) {
        expect(counts.get(test) ?? 0, test).toBe(0);
        for (const replacement of replacements.get(test)!) expect(counts.get(replacement), replacement).toBe(1);
      } else expect(counts.get(test), test).toBe(1);
    }
  });

  it("keeps full workload coverage and derives structural launch counts from the retained matrices", async () => {
    const full = await createTierPlan(["full-release"]);
    const streams = STREAM_RENDERING_WORKLOADS.length;
    const content = CONTENT_RENDERING_WORKLOADS.length;
    const input = INPUT_RESPONSIVENESS_WORKLOADS.length;
    const matrixProducerLaunches = streams * 3 * 2 + content * 2 + 3;
    expect(full.structuralEvidence!["rendering-stability"]).toEqual({
      workloadCaptures: streams + content + input, deliberateRepeatCaptures: 0,
      matrixProducerLaunches, protocolProducerLaunches: 10, totalProducerLaunches: matrixProducerLaunches + 10,
    });
    expect(input).toBe(6);
    expect(streams).toBe(11);
  });

  it("retains standalone smoke and every resource-sensitive file in one serial shard", async () => {
    const authority = await loadValidationOwnership();
    const smoke = await createTierPlan(["rendering-smoke"]);
    const smokeFiles = assignedFiles(smoke.vitest!.invocations[0]!.arguments, authority.tests);
    expect(smokeFiles.sort()).toEqual([...replacements.keys()].sort());
    const full = await createTierPlan(["full-release"]);
    const sensitive = authority.ledger.filter((entry: any) => entry.fastOwner === "fast-resource-sensitive").map((entry: any) => entry.test).sort();
    const resource = createFullRegressionShardPlan(full, "resource");
    expect(resource.vitest!.invocations).toHaveLength(1);
    expect(resource.vitest!.invocations[0]!.arguments).toEqual(expect.arrayContaining(["--no-file-parallelism", "--testTimeout=30000"]));
    expect(assignedFiles(resource.vitest!.invocations[0]!.arguments, authority.tests).sort()).toEqual(sensitive);
    for (const shard of FULL_REGRESSION_SHARDS.filter(id => id !== "resource")) {
      const files = createFullRegressionShardPlan(full, shard).vitest!.invocations.flatMap(invocation => assignedFiles(invocation.arguments, authority.tests));
      expect(files.filter(file => sensitive.includes(file))).toEqual([]);
    }
  });
});
