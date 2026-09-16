import { readFile, readdir } from "node:fs/promises";
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
      "fast-remainder",
      "fast-resource-sensitive",
      "documentation-full",
      "naming-full",
      "rendering-stability",
      "dist-integration",
      "launch-integration",
      "pi-engine-conformance",
      "release-update",
      "update-performance",
      "structured-runtime-integration",
      "package-smoke",
      "package-contracts",
      "package-startup",
      "image-compatibility",
      "history-compatibility",
      "unix-containment",
      "dependency-policy",
      "update-predecessor",
    ]);
    expect(plan.vitest?.mode).toBe("full-deduplicated");
    const invocations = plan.vitest!.invocations;
    expect(invocations.find(invocation => invocation.id === "vitest-full-without-isolated")?.arguments)
      .toEqual(expect.arrayContaining(["--exclude", "test/foundation/release/update-performance.integration.test.ts", "--exclude", "test/foundation/release/package-surface.test.ts", "test/foundation/release/package-install.integration.test.ts", "--exclude", "test/repository-governance/validation-impact.test.ts"]));
    expect(invocations.filter(invocation => invocation.id.startsWith("vitest-fast-resource-sensitive-"))
      .flatMap(invocation => invocation.arguments)).toEqual(expect.arrayContaining(["test/repository-governance/validation-impact.test.ts", "--no-file-parallelism"]));
    expect(invocations.find(invocation => invocation.id === "vitest-isolated-timing")?.arguments)
      .toEqual(expect.arrayContaining(["test/foundation/release/update-performance.integration.test.ts", "--no-file-parallelism"]));
    expect(invocations.find(invocation => invocation.id === "vitest-package-smoke-1")?.arguments)
      .toEqual(["vitest", "run", "test/foundation/release/package-surface.test.ts", "--no-file-parallelism", "--testTimeout=120000"]);
    expect(invocations.find(invocation => invocation.id === "vitest-package-smoke-2")?.arguments)
      .toEqual(["vitest", "run", "test/foundation/release/session-resume.integration.test.ts", "--no-file-parallelism", "--testTimeout=120000"]);
    expect(invocations.find(invocation => invocation.id === "vitest-isolated-suites")?.arguments)
      .toEqual(expect.arrayContaining(["test/integrations/pi/tui-runtime/rendering-budgets.test.ts", "test/integrations/pi/tui-runtime/rendering-producer.test.ts", "--no-file-parallelism", "--testTimeout=600000"]));
    expect(invocations.find(invocation => invocation.id === "vitest-package-contracts")?.arguments)
      .toEqual(expect.arrayContaining(["test/foundation/release/package-install.integration.test.ts", "--no-file-parallelism"]));
    expect(invocations.find(invocation => invocation.id === "vitest-package-startup")?.arguments)
      .toEqual(expect.arrayContaining(["test/foundation/release/package-startup.integration.test.ts", "--no-file-parallelism"]));
    expect(plan.requiresBuild).toBe(true);
    expect(plan.commands.map(command => command.id)).toEqual([
      "candidate-build",
      "candidate-pack",
      "typecheck",
      "architecture",
      "code-documentation-full",
      "internal-naming-full",
      "candidate-engine-conformance-report",
      "deprecated-dependencies",
    ]);
    expect(new Set(plan.commands.map(command => command.id)).size).toBe(plan.commands.length);
    expect(Object.keys(plan.releaseContracts ?? {})).toHaveLength(11);
  });

  it("authenticates the build required by emitted-code fast coverage without packaging", async () => {
    const plan = await createTierPlan(["typecheck", "fast"]);
    expect(plan.requiresBuild).toBe(true);
    expect(plan.consumesPackage).toBe(false);
    expect(plan.commands.map(command => command.id)).toEqual(["candidate-build", "typecheck"]);
    expect(plan.vitest?.mode).toBe("fast-and-explicit");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("--exclude");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("test/foundation/release/package-surface.test.ts");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("test/foundation/release/package-install.integration.test.ts");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("test/integrations/pi/tui-runtime/rendering-budgets.test.ts");
    expect(plan.vitest?.invocations[0]?.arguments).toContain("test/integrations/pi/tui-runtime/input-responsiveness-budgets.test.ts");
  });

  it("plans the bounded PR core and dynamic affected tests without redefining fast", async () => {
    const selected = await createTierPlan(["typecheck", "architecture", "pr-core-tests", "pr-selected-tests"], process.cwd(), {
      additionalTests: ["test/cli/capabilities.test.ts", "test/features/workspace/capabilities.test.ts"],
    });
    expect(selected.selected).toEqual(["typecheck", "architecture", "pr-core-tests", "pr-selected-tests"]);
    expect(selected.vitest?.invocations).toEqual([
      expect.objectContaining({ id: "vitest-explicit-pr-core-tests", scopes: ["pr-core-tests"], arguments: expect.arrayContaining(["test/cli/capabilities.test.ts"]) }),
      expect.objectContaining({ id: "vitest-explicit-pr-selected-tests", scopes: ["pr-selected-tests"], arguments: expect.arrayContaining(["test/features/workspace/capabilities.test.ts"]) }),
    ]);
    expect(selected.vitest?.invocations.flatMap(invocation => invocation.arguments).filter(value => value === "test/cli/capabilities.test.ts")).toHaveLength(1);
    const resource = await createTierPlan(["pr-selected-resource"], process.cwd(), {
      additionalTests: ["test/foundation/release/release-gc.test.ts"],
    });
    expect(resource.vitest?.invocations).toEqual([
      expect.objectContaining({
        id: "vitest-fast-resource-sensitive-1",
        arguments: ["vitest", "run", "test/foundation/release/release-gc.test.ts", "--no-file-parallelism"],
        evidence: expect.objectContaining({ retries: 0, fileParallelism: false }),
      }),
    ]);
    const completeFast = await createTierPlan(["fast"]);
    expect(completeFast.selected).toEqual(["fast-remainder", "fast-resource-sensitive"]);
  });

  it("partitions conservative explicit tests below portable command limits without hiding failures", async () => {
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8"));
    const excluded = new Set([
      ...suites.scopes["fast-remainder"].exclude,
      ...suites.scopes["fast-resource-sensitive"].tests,
    ]);
    const tests = (await readdir("test", { recursive: true }))
      .map(path => `test/${path.replaceAll("\\", "/")}`)
      .filter(path => path.endsWith(".test.ts") && !excluded.has(path))
      .sort();
    const plan = await createTierPlan(["pr-core-tests", "pr-selected-tests"], process.cwd(), { additionalTests: tests });
    const invocations = plan.vitest!.invocations.filter(invocation => invocation.id.startsWith("vitest-explicit"));
    expect(invocations.length).toBeGreaterThan(1);
    expect(invocations.every(invocation => `npx ${invocation.arguments.join(" ")}`.length <= 6_000)).toBe(true);
    const plannedTests = invocations.flatMap(invocation => invocation.arguments.filter(argument => argument.endsWith(".test.ts")));
    expect(plannedTests.sort()).toEqual(tests);
    expect(new Set(plannedTests).size).toBe(plannedTests.length);

    const calls: string[] = [];
    const result = await runTierPlan({ ...plan, commands: [] }, {
      env: { VALIDATION_SELECTION_JSON: JSON.stringify(plan.selected), VALIDATION_TESTS_JSON: JSON.stringify(tests) },
      stdio: "pipe",
      executeCommand: async (command, environment) => {
        expect(environment).not.toHaveProperty("VALIDATION_SELECTION_JSON");
        expect(environment).not.toHaveProperty("VALIDATION_TESTS_JSON");
        calls.push(command.id);
        return { id: command.id, command: command.id, exitCode: calls.length === 2 ? 1 : 0, durationMs: 1 };
      },
    });
    expect(result.passed).toBe(false);
    expect(calls).toEqual(invocations.slice(0, 2).map(invocation => invocation.id));
  });

  it("serializes smoke and full rendering evidence outside the fast worker pool", async () => {
    const smoke = await createTierPlan(["fast", "rendering-smoke"]);
    expect(smoke.vitest?.invocations[0]).toEqual(expect.objectContaining({ id: "vitest-fast" }));
    expect(smoke.vitest?.invocations.filter(invocation => invocation.id.startsWith("vitest-fast-resource-sensitive-"))).toHaveLength(21);
    expect(smoke.vitest?.invocations.at(-1)).toEqual(expect.objectContaining({
      id: "vitest-isolated-suites",
      arguments: expect.arrayContaining([
        "test/integrations/pi/tui-runtime/rendering-smoke.test.ts",
        "test/integrations/pi/tui-runtime/input-responsiveness-smoke.test.ts",
        "--no-file-parallelism",
        "--testTimeout=600000",
      ]),
    }));
    expect(smoke.structuralEvidence).toEqual({
      "rendering-smoke": { workloadCaptures: 6, deliberateRepeatCaptures: 0, matrixProducerLaunches: 19, protocolProducerLaunches: 0, totalProducerLaunches: 19 },
    });
    const full = await createTierPlan(["rendering-stability"]);
    expect(full.vitest?.invocations[0]?.arguments).toEqual(expect.arrayContaining([
      "test/integrations/pi/tui-runtime/rendering-budgets.test.ts",
      "test/integrations/pi/tui-runtime/rendering-producer.test.ts",
      "test/integrations/pi/tui-runtime/input-responsiveness-budgets.test.ts",
      "test/integrations/pi/tui-runtime/input-producer.test.ts",
    ]));
    expect(full.structuralEvidence).toEqual({
      "rendering-stability": { workloadCaptures: 16, deliberateRepeatCaptures: 0, matrixProducerLaunches: 55, protocolProducerLaunches: 10, totalProducerLaunches: 65 },
    });
  });

  it("keeps changed documentation out of ordinary plans and full review exactly once", async () => {
    const fast = await createTierPlan(["fast"]);
    const changed = await createTierPlan(["documentation-changed"]);
    const full = await createTierPlan(["full-release"]);
    expect(fast.commands.map(command => command.id)).toEqual(["candidate-build"]);
    expect(changed.commands.map(command => command.id)).toEqual(["code-documentation-changed"]);
    expect(full.commands.filter(command => command.id === "code-documentation-full")).toHaveLength(1);
  });

  it("builds once for multiple build-dependent integration scopes", async () => {
    const plan = await createTierPlan(["launch-integration", "pi-engine-conformance"]);
    expect(plan.commands.filter(command => command.id === "candidate-build")).toHaveLength(1);
    expect(plan.vitest).toMatchObject({
      mode: "explicit",
      invocations: [
        { scopes: ["launch-integration"], arguments: expect.arrayContaining(["test/features/launch/exact-pi-entry.integration.test.ts"]) },
        { scopes: ["pi-engine-conformance"], arguments: expect.arrayContaining(["test/integrations/pi/engine/conformance.test.ts"]) },
      ],
    });
  });

  it("records separate scope durations while sharing prerequisite preparation", async () => {
    const plan = await createTierPlan(["launch-integration", "structured-runtime-integration"]);
    expect(plan.commands.filter(command => command.id === "candidate-build")).toHaveLength(1);
    const result = await runTierPlan({ ...plan, commands: [] }, {
      stdio: "pipe",
      executeCommand: async command => ({ id: command.id, command: command.id, exitCode: 0, durationMs: command.id.includes("launch") ? 11 : 7 }),
    });
    expect(result.outcomes).toEqual([
      expect.objectContaining({ scopes: ["launch-integration"], durationMs: 11 }),
      expect.objectContaining({ scopes: ["structured-runtime-integration"], durationMs: 7 }),
    ]);
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
    }, {
      env: { VALIDATION_BUILD_READY: "1", VALIDATION_BUILD_RECEIPT: "build.json", VALIDATION_CANDIDATE_TARBALL: "accepted.tgz", VALIDATION_PACKAGE_RECEIPT: "package.json" },
      stdio: "pipe",
      verifyBuildReceipt: async () => ({}),
      verifyPackageReceipt: async () => ({}),
      executeCommand: async () => { throw new Error("verified prerequisites must not spawn"); },
    });
    expect(result.passed).toBe(true);
    expect(result.outcomes).toEqual([
      expect.objectContaining({ id: "candidate-build", durationMs: 0, skipped: "verified-existing-build" }),
      expect.objectContaining({ id: "candidate-pack", durationMs: 0, skipped: "verified-exact-package" }),
    ]);
  });

  it.each(["missing", "incompatible"])("prepares instead of trusting %s prerequisite receipts", async kind => {
    const calls: string[] = [];
    const result = await runTierPlan({
      schema: "a1-validation-plan-v1", requested: ["fixture"], selected: ["fixture"], requiresBuild: true, consumesPackage: true,
      candidateTarball: ".artifacts/validation/package/candidate.tgz",
      commands: [
        { id: "candidate-build", executable: "npm", arguments: ["run", "build"], owners: ["fixture"] },
        { id: "candidate-pack", executable: "node", arguments: ["scripts/release/prepare-validation-package.mjs"], owners: ["fixture"] },
      ], vitest: null,
    }, {
      env: kind === "missing" ? { VALIDATION_BUILD_READY: "0", VALIDATION_CANDIDATE_TARBALL: "" }
        : { VALIDATION_BUILD_READY: "1", VALIDATION_CANDIDATE_TARBALL: "stale.tgz" },
      executeCommand: async command => { calls.push(command.id); return { id: command.id, command: command.id, exitCode: 0, durationMs: 1 }; },
      verifyBuildReceipt: async () => { throw new Error("tampered"); },
      verifyPackageReceipt: async () => { throw new Error("tampered"); },
      recordBuildReceipt: async () => ({}),
    });
    expect(result.passed).toBe(true);
    expect(calls).toEqual(["candidate-build", "candidate-pack"]);
    expect(result.outcomes.map(outcome => outcome.preparation)).toEqual(kind === "missing"
      ? [undefined, undefined]
      : ["receipt-missing-or-incompatible", "receipt-missing-or-incompatible"]);
  });

  it("reuses one workflow-owned full documentation review", async () => {
    const result = await runTierPlan({
      schema: "a1-validation-plan-v1",
      requested: ["documentation-full"],
      selected: ["documentation-full"],
      requiresBuild: false,
      consumesPackage: false,
      candidateTarball: "unused.tgz",
      commands: [{ id: "code-documentation-full", executable: "node", arguments: ["missing.mjs"], owners: ["documentation-full"] }],
      vitest: null,
    }, { env: { VALIDATION_DOCUMENTATION_FULL_READY: "1" }, stdio: "pipe" });
    expect(result).toMatchObject({ passed: true, outcomes: [{ id: "code-documentation-full", durationMs: 0, skipped: "existing-full-documentation-review" }] });
  });

  it("rejects unknown selections", async () => {
    await expect(createTierPlan(["not-a-suite"])).rejects.toThrow("unknown validation tier or scope");
  });
});
