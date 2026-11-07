import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createTierPlan, partitionFullRegressionPlan } from "../../scripts/release/validation-tier.mjs";

describe("complete regression plan", () => {
  it("keeps every deferred startup, image, and history test in the actual full plan exactly once", async () => {
    const plan = await createTierPlan(["full-release"]);
    expect(plan.selected).toEqual(expect.arrayContaining(["fast-remainder", "fast-resource-sensitive", "dist-integration", "package-contracts", "package-startup", "image-compatibility", "history-compatibility", "unix-release"]));
    expect(plan.consumesPackage).toBe(true);
    const invocations = plan.vitest!.invocations;
    const remainder = invocations.find(invocation => invocation.id === "vitest-full-without-isolated")!;
    expect(remainder).toBeDefined();
    expect(remainder.arguments.slice(0, 2)).toEqual(["vitest", "run"]);
    const exclusions = remainder.arguments.filter((_argument, index, args) => args[index - 1] === "--exclude");
    const deferred = [
      "test/foundation/release/package-install.integration.test.ts",
      "test/app/session-shell/image-preparation.test.ts",
      "test/app/session-shell/image-worker-package.test.ts",
      ...(await readdir("test/features/prompt-history")).filter(name => name.endsWith(".test.ts")).map(name => `test/features/prompt-history/${name}`),
    ];
    expect(deferred).toContain("test/features/prompt-history/store.test.ts");
    expect(deferred).toContain("test/features/prompt-history/worker-package.test.ts");
    for (const path of deferred) {
      const explicit = invocations.filter(invocation => invocation !== remainder
        && invocation.arguments.some((argument, index, args) => argument === path && args[index - 1] !== "--exclude"));
      expect(Number(!exclusions.includes(path)) + explicit.length, path).toBe(1);
    }
    expect(invocations.find(invocation => invocation.id === "vitest-package-contracts")?.arguments).toEqual([
      "vitest", "run", "test/foundation/release/package-install.integration.test.ts", "--no-file-parallelism", "--testTimeout=600000",
    ]);
    expect(invocations.find(invocation => invocation.id === "vitest-package-startup")?.arguments).toEqual([
      "vitest", "run", "test/foundation/release/package-startup.integration.test.ts", "--no-file-parallelism", "--testTimeout=600000",
    ]);
    expect(invocations.findIndex(invocation => invocation.id === "vitest-package-startup"))
      .toBeLessThan(invocations.findIndex(invocation => invocation.id === "vitest-package-contracts"));
    expect(plan.exactPackagePreparation).toMatchObject({ count: 1, consumers: ["package-startup", "package-contracts", "update-predecessor"] });
    const resourceArguments = invocations.filter(invocation => invocation.evidence?.executionClass === "resource-sensitive")
      .flatMap(invocation => invocation.arguments);
    expect(resourceArguments).toContain("test/features/prompt-history/store.test.ts");
    const promptConcurrency = "test/features/prompt-history/concurrency.integration.test.ts";
    expect(exclusions).toContain(promptConcurrency);
    expect(resourceArguments.filter(argument => argument === promptConcurrency)).toHaveLength(1);
  });

  it("runs the three-release predecessor oracle once, in its own shard", async () => {
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8"));
    expect(suites.tiers["full-release"].includes).toContain("update-predecessor");
    expect(suites.scopes["update-predecessor"]).toMatchObject({
      requiresBuild: true,
      consumesPackage: true,
      tests: ["test/foundation/release/update-predecessor.integration.test.ts"],
    });
    const plan = await createTierPlan(["full-release"]);
    expect(plan.selected).toContain("update-predecessor");
    const fullArguments = plan.vitest!.invocations.find(invocation => invocation.id === "vitest-full-without-isolated")!.arguments;
    const exclusions = fullArguments.filter((_argument, index) => fullArguments[index - 1] === "--exclude");
    // Rationale: the exhaustive owner runs once as its own predecessor-shard invocation instead of in the ordinary remainder.
    expect(exclusions).toContain("test/foundation/release/update-predecessor.integration.test.ts");
    const predecessor = plan.vitest!.invocations.filter(invocation => invocation.id !== "vitest-full-without-isolated"
      && invocation.arguments.includes("test/foundation/release/update-predecessor.integration.test.ts"));
    expect(predecessor).toEqual([{ id: "vitest-update-predecessor", scopes: ["update-predecessor"], arguments: ["vitest", "run", "test/foundation/release/update-predecessor.integration.test.ts", "--testTimeout=30000"] }]);
    const partition = partitionFullRegressionPlan(plan);
    expect(partition.shards.predecessor.invocations).toEqual(["vitest-update-predecessor"]);
    expect(partition.shards.package.invocations).not.toContain("vitest-update-predecessor");
  });
});
