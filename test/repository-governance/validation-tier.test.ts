import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createTierPlan, prepareSharedExactPackage, runTierPlan } from "../../scripts/release/validation-tier.mjs";

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
    expect(plan.exactPackagePreparation).toEqual({
      id: "exact-package-preparation",
      count: 1,
      policy: "npm-global-ignore-scripts-prefer-offline-v1",
      consumers: ["package-startup", "package-contracts"],
    });
    const invocations = plan.vitest!.invocations;
    expect(invocations.find(invocation => invocation.id === "vitest-full-without-isolated")?.arguments)
      .toEqual(expect.arrayContaining(["--exclude", "test/foundation/release/update-performance.integration.test.ts", "--exclude", "test/foundation/release/package-surface.test.ts", "test/foundation/release/package-install.integration.test.ts", "--exclude", "test/repository-governance/validation-impact.test.ts"]));
    expect(invocations.filter(invocation => invocation.evidence?.executionClass === "resource-sensitive")
      .flatMap(invocation => invocation.arguments)).toEqual(expect.arrayContaining(["test/repository-governance/validation-impact.test.ts", "--no-file-parallelism", "--testTimeout=30000"]));
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
    expect(invocations.findIndex(invocation => invocation.id === "vitest-package-startup"))
      .toBeLessThan(invocations.findIndex(invocation => invocation.id === "vitest-package-contracts"));
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
    expect(plan.exactPackagePreparation).toBeNull();
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
        id: "vitest-fast-resource-sensitive",
        arguments: ["vitest", "run", "test/foundation/release/release-gc.test.ts", "--no-file-parallelism", "--testTimeout=30000"],
        scopes: ["pr-selected-resource"],
        evidence: expect.objectContaining({ retries: 0, fileParallelism: false, timeoutMs: 30000, timeoutSource: "explicit" }),
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
    expect(smoke.vitest?.invocations.filter(invocation => invocation.evidence?.executionClass === "resource-sensitive")).toHaveLength(1);
    expect(smoke.vitest?.invocations.find(invocation => invocation.id === "vitest-fast-resource-sensitive")?.evidence?.testFiles).toHaveLength(21);
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

  it("prepares one shared install, runs startup first, verifies every handoff, and cleans once", async () => {
    const plan = await createTierPlan(["package-install"]);
    const calls: string[] = [];
    const consumers: string[] = [];
    let preparations = 0;
    let cleanups = 0;
    const result = await runTierPlan({ ...plan, commands: [] }, {
      env: { VALIDATION_CANDIDATE_TARBALL: "candidate.tgz" },
      stdio: "pipe",
      prepareExactPackageInstallation: async () => { preparations += 1; return fakePreparation(plan.exactPackagePreparation!.consumers); },
      exactPackagePreparationEnvironment: () => ({ VALIDATION_EXACT_PACKAGE_PREPARATION: "runner" }),
      verifyExactPackagePreparation: async ({ consumer }: any) => { consumers.push(consumer); return {}; },
      cleanupExactPackagePreparation: async () => { cleanups += 1; return { status: "deferred", durationMs: 3, error: null }; },
      executeCommand: async (command, environment) => {
        calls.push(command.id);
        expect(environment.VALIDATION_EXACT_PACKAGE_PREPARATION).toBe("runner");
        expect(environment.NODE_COMPILE_CACHE).toBeUndefined();
        expect(environment.VALIDATION_EXACT_PACKAGE_CONSUMER).toBe(command.id === "vitest-package-startup" ? "package-startup" : "package-contracts");
        return { id: command.id, command: command.id, exitCode: 0, durationMs: 7 };
      },
    });
    expect(result.passed).toBe(true);
    expect(preparations).toBe(1);
    expect(cleanups).toBe(1);
    expect(calls).toEqual(["vitest-package-startup", "vitest-package-contracts"]);
    expect(consumers).toEqual(["package-startup", "package-startup", "package-contracts", "package-contracts"]);
    expect(result.exactPackagePreparation).toMatchObject({ count: 1, consumers: ["package-startup", "package-contracts"], cleanup: { status: "deferred" } });
    expect(result.outcomes.filter(outcome => outcome.id === "exact-package-preparation")).toHaveLength(1);
  });

  it("keeps full-suite ownership labels from activating preparation outside dedicated consumers", async () => {
    const plan = await createTierPlan(["full-release"]);
    let preparations = 0;
    const handedOff: string[] = [];
    const result = await runTierPlan({ ...plan, commands: [] }, {
      env: { VALIDATION_CANDIDATE_TARBALL: "candidate.tgz" },
      prepareExactPackageInstallation: async () => { preparations += 1; return fakePreparation(plan.exactPackagePreparation!.consumers); },
      exactPackagePreparationEnvironment: () => ({ VALIDATION_EXACT_PACKAGE_PREPARATION: "runner" }),
      verifyExactPackagePreparation: async () => ({}),
      cleanupExactPackagePreparation: async () => ({ status: "passed", durationMs: 1, error: null }),
      executeCommand: async (command, environment) => {
        if (environment.VALIDATION_EXACT_PACKAGE_PREPARATION) handedOff.push(command.id);
        return { id: command.id, command: command.id, exitCode: 0, durationMs: 1 };
      },
    });
    expect(result.passed).toBe(true);
    expect(preparations).toBe(1);
    expect(handedOff).toEqual(["vitest-package-startup", "vitest-package-contracts"]);
  });

  it("prepares the shared install once and hands it off without running the plan", async () => {
    const plan = await createTierPlan(["package-install"]);
    const verified: string[] = [];
    let preparations = 0;
    const handoff = await prepareSharedExactPackage(plan, {
      env: {
        VALIDATION_BUILD_READY: "1",
        VALIDATION_BUILD_RECEIPT: "fixture-build.json",
        VALIDATION_CANDIDATE_TARBALL: "candidate.tgz",
        VALIDATION_PACKAGE_RECEIPT: "candidate.receipt.json",
      },
      verifyBuildReceipt: async () => { verified.push("build"); return {}; },
      verifyPackageReceipt: async () => { verified.push("package"); return {}; },
      prepareExactPackageInstallation: async () => { preparations += 1; return fakePreparation(plan.exactPackagePreparation!.consumers); },
      exactPackagePreparationEnvironment: () => ({ VALIDATION_EXACT_PACKAGE_PREPARATION: "runner" }),
    });
    expect(verified).toEqual(["build", "package"]);
    expect(preparations).toBe(1);
    expect(handoff).toMatchObject({
      schema: "a1-exact-package-handoff-v1",
      consumers: ["package-startup", "package-contracts"],
      durationMs: 5,
      handoffEnvironment: { VALIDATION_EXACT_PACKAGE_PREPARATION: "runner" },
    });
    expect(handoff.receipt.receiptId).toBe("a".repeat(64));
  });

  it("refuses to prepare without a planned consumer, a verified build, or an exact candidate", async () => {
    const packaged = await createTierPlan(["package-install"]);
    const unpackaged = await createTierPlan(["typecheck", "fast"]);
    await expect(prepareSharedExactPackage(unpackaged, { env: { VALIDATION_BUILD_READY: "1" } }))
      .rejects.toThrow(/exact-package preparation plan is invalid/);
    await expect(prepareSharedExactPackage(packaged, { env: { VALIDATION_BUILD_READY: "0" } }))
      .rejects.toThrow(/verified install-time build/);
    await expect(prepareSharedExactPackage(packaged, {
      env: { VALIDATION_BUILD_READY: "1", VALIDATION_CANDIDATE_TARBALL: "" },
      verifyBuildReceipt: async () => ({}),
    })).rejects.toThrow(/exact candidate tarball/);
  });

  it("verifies a shared preparation handoff instead of installing a second time", async () => {
    const plan = await createTierPlan(["package-install"]);
    const calls: string[] = [];
    const consumers: string[] = [];
    let preparations = 0;
    let cleanups = 0;
    const prepared = fakePreparation(plan.exactPackagePreparation!.consumers);
    const result = await runTierPlan({ ...plan, commands: [] }, {
      env: { VALIDATION_CANDIDATE_TARBALL: "candidate.tgz" },
      exactPackageHandoff: "handoff.json",
      readExactPackageHandoff: async () => ({
        schema: "a1-exact-package-handoff-v1",
        consumers: plan.exactPackagePreparation!.consumers,
        durationMs: 5,
        handoffEnvironment: { VALIDATION_EXACT_PACKAGE_PREPARATION: "runner" },
      }),
      prepareExactPackageInstallation: async () => { preparations += 1; return prepared; },
      verifyExactPackagePreparation: async ({ consumer }: any) => { consumers.push(consumer); return prepared; },
      cleanupExactPackagePreparation: async () => { cleanups += 1; return { status: "passed", durationMs: 2, error: null }; },
      executeCommand: async (command, environment) => {
        calls.push(command.id);
        expect(environment.VALIDATION_EXACT_PACKAGE_PREPARATION).toBe("runner");
        return { id: command.id, command: command.id, exitCode: 0, durationMs: 4 };
      },
    });
    expect(result.passed).toBe(true);
    expect(preparations).toBe(0);
    expect(cleanups).toBe(1);
    expect(calls).toEqual(["vitest-package-startup", "vitest-package-contracts"]);
    expect(consumers).toEqual(["package-startup", "package-startup", "package-startup", "package-contracts", "package-contracts"]);
    expect(result.outcomes[0]).toMatchObject({
      id: "exact-package-preparation",
      skipped: "verified-shared-preparation",
      exitCode: 0,
      durationMs: 5,
      scopes: ["package-startup", "package-contracts"],
    });
    expect(result.exactPackagePreparation).toMatchObject({ count: 1, cleanup: { status: "passed" } });
  });

  it("rejects a contradictory or unverifiable handoff without installing again", async () => {
    const plan = await createTierPlan(["package-install"]);
    const contradictory = await runTierPlan({ ...plan, commands: [] }, {
      env: { VALIDATION_CANDIDATE_TARBALL: "candidate.tgz" },
      exactPackageHandoff: "handoff.json",
      readExactPackageHandoff: async () => ({
        schema: "a1-exact-package-handoff-v1",
        consumers: ["package-contracts"],
        handoffEnvironment: { VALIDATION_EXACT_PACKAGE_PREPARATION: "runner" },
      }),
      prepareExactPackageInstallation: async () => { throw new Error("must not install"); },
      executeCommand: async () => { throw new Error("must not execute"); },
    });
    expect(contradictory.passed).toBe(false);
    expect(contradictory.outcomes).toEqual([expect.objectContaining({
      id: "exact-package-preparation", exitCode: 1, preparation: "handoff-rejected",
    })]);

    const unverifiable = await runTierPlan({ ...plan, commands: [] }, {
      env: { VALIDATION_CANDIDATE_TARBALL: "candidate.tgz" },
      exactPackageHandoff: "handoff.json",
      readExactPackageHandoff: async () => ({
        schema: "a1-exact-package-handoff-v1",
        consumers: plan.exactPackagePreparation!.consumers,
        handoffEnvironment: { VALIDATION_EXACT_PACKAGE_PREPARATION: "runner" },
      }),
      verifyExactPackagePreparation: async () => { throw new Error("installed bytes changed after preparation"); },
      prepareExactPackageInstallation: async () => { throw new Error("must not install"); },
      cleanupExactPackagePreparation: async () => { throw new Error("must not clean an unverified root"); },
      executeCommand: async () => { throw new Error("must not execute"); },
    });
    expect(unverifiable.passed).toBe(false);
    expect(unverifiable.outcomes[0]).toMatchObject({ id: "exact-package-preparation", exitCode: 1, preparation: "handoff-rejected" });
    expect(unverifiable.outcomes[0]?.evidence).toMatchObject({ count: 0, reason: expect.stringContaining("installed bytes changed after preparation") });
  });

  it("blocks all dependent owners when preparation fails", async () => {
    const plan = await createTierPlan(["package-install"]);
    const calls: string[] = [];
    const failure: any = new Error("install failed");
    failure.cleanup = { status: "passed", error: null };
    const result = await runTierPlan({ ...plan, commands: [] }, {
      env: { VALIDATION_CANDIDATE_TARBALL: "candidate.tgz" },
      prepareExactPackageInstallation: async () => { throw failure; },
      executeCommand: async command => { calls.push(command.id); return { id: command.id, command: command.id, exitCode: 0, durationMs: 1 }; },
    });
    expect(result.passed).toBe(false);
    expect(calls).toEqual([]);
    expect(result.outcomes).toEqual([expect.objectContaining({ id: "exact-package-preparation", exitCode: 1, scopes: ["package-startup", "package-contracts"] })]);
  });

  it("rejects contradictory shared-preparation consumer identity", async () => {
    const plan = await createTierPlan(["package-install"]);
    const calls: string[] = [];
    const contradictory = fakePreparation(["package-contracts"]);
    const result = await runTierPlan({ ...plan, commands: [] }, {
      env: { VALIDATION_CANDIDATE_TARBALL: "candidate.tgz" },
      prepareExactPackageInstallation: async () => contradictory,
      exactPackagePreparationEnvironment: () => ({}),
      cleanupExactPackagePreparation: async () => ({ status: "passed", durationMs: 1, error: null }),
      executeCommand: async command => { calls.push(command.id); return { id: command.id, command: command.id, exitCode: 0, durationMs: 1 }; },
    });
    expect(result.passed).toBe(false);
    expect(calls).toEqual([]);
    expect(result.outcomes).toEqual([expect.objectContaining({ id: "exact-package-preparation", exitCode: 1 })]);
  });

  it("detects mutation before a later owner and preserves an earlier owner failure over cleanup failure", async () => {
    const plan = await createTierPlan(["package-install"]);
    let verifications = 0;
    const calls: string[] = [];
    const mutated = await runTierPlan({ ...plan, commands: [] }, {
      env: { VALIDATION_CANDIDATE_TARBALL: "candidate.tgz" },
      prepareExactPackageInstallation: async () => fakePreparation(plan.exactPackagePreparation!.consumers),
      exactPackagePreparationEnvironment: () => ({}),
      verifyExactPackagePreparation: async () => { if (++verifications === 3) throw new Error("mutated"); return {}; },
      cleanupExactPackagePreparation: async () => ({ status: "passed", durationMs: 1, error: null }),
      executeCommand: async command => { calls.push(command.id); return { id: command.id, command: command.id, exitCode: 0, durationMs: 1 }; },
    });
    expect(mutated.passed).toBe(false);
    expect(calls).toEqual(["vitest-package-startup"]);
    expect(mutated.outcomes.at(-1)).toMatchObject({ id: "vitest-package-contracts", exitCode: 1, preparation: "identity-rejected" });

    const ownerFailure = await runTierPlan({ ...plan, commands: [] }, {
      env: { VALIDATION_CANDIDATE_TARBALL: "candidate.tgz" },
      prepareExactPackageInstallation: async () => fakePreparation(plan.exactPackagePreparation!.consumers),
      exactPackagePreparationEnvironment: () => ({}),
      verifyExactPackagePreparation: async () => ({}),
      cleanupExactPackagePreparation: async () => ({ status: "failed", durationMs: 1, error: "locked" }),
      executeCommand: async command => ({ id: command.id, command: command.id, exitCode: 9, durationMs: 2 }),
    });
    expect(ownerFailure.passed).toBe(false);
    expect(ownerFailure.outcomes.find(outcome => outcome.id === "vitest-package-startup")).toMatchObject({ exitCode: 9 });
    expect(ownerFailure.exactPackagePreparation).toMatchObject({ cleanup: { status: "failed", error: "locked" } });
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

function fakePreparation(consumers: string[]) {
  return {
    root: "fixture-root",
    prefix: "fixture-prefix",
    packageRoot: "fixture-package",
    receiptPath: "fixture-receipt",
    durationMs: 5,
    receipt: {
      receiptId: "a".repeat(64),
      candidate: { sha256: "b".repeat(64), name: "@fixture/app", version: "1.0.0" },
      lane: { platform: process.platform, architecture: process.arch, nodeVersion: process.version, runId: "local", runAttempt: "1" },
      install: { policy: "npm-global-ignore-scripts-prefer-offline-v1", prefix: "fixture-prefix", installedIdentity: { sha256: "c".repeat(64) } },
      preparation: { count: 1, durationMs: 5, proxySynchronizations: 1 },
      consumers,
    },
  };
}
