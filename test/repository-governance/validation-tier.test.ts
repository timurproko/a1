import { describe, expect, it } from "vitest";
import { createTierPlan, runTierPlan } from "../../scripts/release/validation-tier.mjs";

describe("validation tier planning", () => {
  it("keeps planning validation free of builds and runtime tests", async () => {
    const plan = await createTierPlan(["planning"]);
    expect(plan.selected).toEqual(["planning"]);
    expect(plan.requiresBuild).toBe(false);
    expect(plan.consumesPackage).toBe(false);
    expect(plan.vitest).toBeNull();
    expect(plan.commands).toEqual([
      expect.objectContaining({
        id: "openspec-strict",
        executable: "npx",
        arguments: ["--yes", "@fission-ai/openspec@1.8.0", "validate", "--all", "--strict", "--no-interactive"],
      }),
    ]);
  });

  it("deduplicates the complete release suite while isolating timing and package gates", async () => {
    const plan = await createTierPlan(["full-release"]);
    expect(plan.selected).toEqual([
      "typecheck",
      "architecture",
      "fast",
      "dist-integration",
      "launch-integration",
      "pi-engine-conformance",
      "release-update",
      "update-performance",
      "structured-runtime-integration",
      "package-smoke",
      "package-install",
      "dependency-policy",
    ]);
    expect(plan.vitest).toMatchObject({
      mode: "full-deduplicated",
      invocations: [
        { id: "vitest-full-without-isolated", arguments: expect.arrayContaining(["--exclude", "test/foundation/release/update-performance.integration.test.ts", "--exclude", "test/foundation/release/package-surface.test.ts", "test/foundation/release/package-install.integration.test.ts"]) },
        { id: "vitest-isolated-timing", arguments: expect.arrayContaining(["test/foundation/release/update-performance.integration.test.ts", "test/foundation/release/package-surface.test.ts", "--no-file-parallelism"]) },
        { id: "vitest-package-install", arguments: expect.arrayContaining(["test/foundation/release/package-install.integration.test.ts", "--no-file-parallelism"]) },
      ],
    });
    expect(plan.requiresBuild).toBe(true);
    expect(plan.commands.map(command => command.id)).toEqual([
      "candidate-build",
      "candidate-pack",
      "typecheck",
      "architecture",
      "code-documentation",
      "candidate-engine-conformance-report",
      "deprecated-dependencies",
    ]);
    expect(new Set(plan.commands.map(command => command.id)).size).toBe(plan.commands.length);
    expect(Object.keys(plan.releaseContracts ?? {})).toHaveLength(8);
  });

  it("runs ordinary fast validation without any build or package installation", async () => {
    const plan = await createTierPlan(["typecheck", "fast"]);
    expect(plan.requiresBuild).toBe(false);
    expect(plan.commands.map(command => command.id)).toEqual(["typecheck", "code-documentation"]);
    expect(plan.vitest?.mode).toBe("fast-and-explicit");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("--exclude");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("test/foundation/release/package-surface.test.ts");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("test/foundation/release/package-install.integration.test.ts");
  });

  it("inherits code documentation in full release exactly once", async () => {
    const fast = await createTierPlan(["fast"]);
    const full = await createTierPlan(["full-release"]);
    expect(fast.commands.filter(command => command.id === "code-documentation")).toHaveLength(1);
    expect(full.commands.filter(command => command.id === "code-documentation")).toHaveLength(1);
  });

  it("builds once for multiple build-dependent integration scopes", async () => {
    const plan = await createTierPlan(["launch-integration", "pi-engine-conformance"]);
    expect(plan.commands.filter(command => command.id === "candidate-build")).toHaveLength(1);
    expect(plan.vitest).toMatchObject({
      mode: "explicit",
      invocations: [{
        arguments: expect.arrayContaining([
          "test/features/launch/exact-pi-entry.integration.test.ts",
          "test/integrations/pi/engine/conformance.test.ts",
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
      consumesPackage: true,
      candidateTarball: "accepted.tgz",
      commands: [
        { id: "candidate-build", executable: "npm", arguments: ["run", "build"], owners: ["fixture"] },
        { id: "candidate-pack", executable: "node", arguments: ["scripts/release/prepare-validation-package.mjs"], owners: ["fixture"] },
      ],
      vitest: null,
    }, { env: { VALIDATION_BUILD_READY: "1", VALIDATION_CANDIDATE_TARBALL: "accepted.tgz" }, stdio: "pipe" });
    expect(result.passed).toBe(true);
    expect(result.outcomes).toEqual([
      expect.objectContaining({ id: "candidate-build", durationMs: 0, skipped: "existing-explicit-build" }),
      expect.objectContaining({ id: "candidate-pack", durationMs: 0, skipped: "existing-exact-package" }),
    ]);
  });

  it("rejects unknown selections", async () => {
    await expect(createTierPlan(["not-a-suite"])).rejects.toThrow("unknown validation tier or scope");
  });
});
