import { describe, expect, it } from "vitest";
import { createTierPlan, runTierPlan } from "../../scripts/validation-tier.mjs";

describe("validation tier planning", () => {
  it("deduplicates the complete release suite into one broad Vitest invocation", async () => {
    const plan = await createTierPlan(["full-release"]);
    expect(plan.selected).toEqual([
      "invariants",
      "fast",
      "launch-integration",
      "pi-engine-conformance",
      "release-update",
      "structured-runtime-integration",
      "package-smoke",
      "package-install",
      "dependency-policy",
    ]);
    expect(plan.vitest).toMatchObject({
      mode: "full-deduplicated",
      invocations: [
        { id: "vitest-full-without-package", arguments: expect.arrayContaining(["--exclude", "test/foundation/release/package-surface.test.ts", "test/foundation/release/package-install.integration.test.ts"]) },
        { id: "vitest-package-smoke", arguments: expect.arrayContaining(["test/foundation/release/package-surface.test.ts", "--no-file-parallelism"]) },
        { id: "vitest-package-install", arguments: expect.arrayContaining(["test/foundation/release/package-install.integration.test.ts", "--no-file-parallelism"]) },
      ],
    });
    expect(plan.requiresBuild).toBe(true);
    expect(plan.commands.map(command => command.id)).toEqual([
      "candidate-build",
      "candidate-pack",
      "typecheck",
      "architecture",
      "customization-ready",
      "candidate-engine-conformance-report",
      "deprecated-dependencies",
    ]);
    expect(new Set(plan.commands.map(command => command.id)).size).toBe(plan.commands.length);
    expect(Object.keys(plan.releaseContracts ?? {})).toHaveLength(8);
  });

  it("builds ordinary fast validation once without package installation", async () => {
    const plan = await createTierPlan(["invariants", "fast"]);
    expect(plan.requiresBuild).toBe(true);
    expect(plan.commands.map(command => command.id)).toEqual(["candidate-build", "typecheck", "architecture", "customization-ready"]);
    expect(plan.vitest?.mode).toBe("fast-and-explicit");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("--exclude");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("test/foundation/release/package-surface.test.ts");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("test/foundation/release/package-install.integration.test.ts");
  });

  it("builds once for multiple build-dependent integration scopes", async () => {
    const plan = await createTierPlan(["launch-integration", "pi-engine-conformance"]);
    expect(plan.commands.filter(command => command.id === "candidate-build")).toHaveLength(1);
    expect(plan.vitest).toMatchObject({
      mode: "explicit",
      invocations: [{
        arguments: expect.arrayContaining([
          "test/features/launch/exact-pi-entry.integration.test.ts",
          "test/foundation/pi-engine-adapter/conformance.test.ts",
        ]),
      }],
    });
  });

  it("reuses an explicit install-time build without spawning another build", async () => {
    const result = await runTierPlan({
      schema: "a1-validation-plan-v1",
      requested: ["fixture"],
      selected: ["fixture"],
      requiresBuild: true,
      consumesPackage: false,
      candidateTarball: "unused.tgz",
      commands: [{ id: "candidate-build", executable: "npm", arguments: ["run", "build"], owners: ["fixture"] }],
      vitest: null,
    }, { env: { VALIDATION_BUILD_READY: "1" }, stdio: "pipe" });
    expect(result.passed).toBe(true);
    expect(result.outcomes).toEqual([
      expect.objectContaining({ id: "candidate-build", durationMs: 0, skipped: "existing-explicit-build" }),
    ]);
  });

  it("rejects unknown selections", async () => {
    await expect(createTierPlan(["not-a-suite"])).rejects.toThrow("unknown validation tier or scope");
  });
});
