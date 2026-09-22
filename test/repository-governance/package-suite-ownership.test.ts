import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { DEVELOPMENT_VALIDATION_MATRIX } from "../../scripts/release/validation-matrix.mjs";
import { createTierPlan } from "../../scripts/release/validation-tier.mjs";

const nonTimingScenarios = [
  "installs only the authoritative a1 command and package identity",
  "restores the platform launcher set when exact-package replacement is cancelled",
  "keeps the exact packaged recovery guardian alive after updater loss",
  "materializes the published minimal inventory into one reusable dependency layer",
  "drains a production-shaped historical backlog through the exact packaged private worker",
  "leaves durable scheduled evidence when the exact private entry cannot import its runtime",
];
const startupScenario = "gates post-update, no-live-supervisor, and warm startup for both exact packaged profiles";

describe("exact-package startup and non-timing ownership", () => {
  it("retains all seven scenarios under exactly one successor file", async () => {
    const [contracts, startup] = await Promise.all([
      readFile("test/foundation/release/package-install.integration.test.ts", "utf8"),
      readFile("test/foundation/release/package-startup.integration.test.ts", "utf8"),
    ]);
    for (const title of nonTimingScenarios) {
      expect(contracts, title).toContain(`it("${title}"`);
      expect(startup, title).not.toContain(title);
    }
    expect(startup).toContain(`it.runIf(process.platform === "win32")("${startupScenario}"`);
    expect(contracts).not.toContain(startupScenario);
    expect((contracts + startup).match(/^\s*it(?:\.runIf\([^\n]+\))?\(/gmu)).toHaveLength(7);
  });

  it("gives each owner fresh mutable state while sharing only verified installed bytes", async () => {
    const [contracts, startup, fixture] = await Promise.all([
      readFile("test/foundation/release/package-install.integration.test.ts", "utf8"),
      readFile("test/foundation/release/package-startup.integration.test.ts", "utf8"),
      readFile("test/foundation/release/package-install-fixture.ts", "utf8"),
    ]);
    expect(contracts).toContain('installExactCandidate(phases, "a1-package-install-")');
    expect(startup).toContain('installExactCandidate(phases, "a1-package-startup-")');
    expect(contracts).toContain("cleanupExactCandidate(phases, root)");
    expect(startup).toContain("cleanupExactCandidate(phases, root)");
    expect(fixture).toContain("verifyExactPackagePreparation({ candidatePath: candidate.path })");
    expect(fixture).toContain("installArguments(prefix, candidate.path)");
    expect(fixture).toContain("mkdtemp");
    expect(fixture).toContain("sharedPreparation: true");
    expect(fixture).toContain("sharedPreparation: false");
    expect(fixture).toContain("handoff is incomplete or contradictory");
  });

  it("preserves Defender, both profiles, all three launch kinds, budgets, warmup, and workload sizes", async () => {
    const [contracts, startup] = await Promise.all([
      readFile("test/foundation/release/package-install.integration.test.ts", "utf8"),
      readFile("test/foundation/release/package-startup.integration.test.ts", "utf8"),
    ]);
    expect(startup).toContain('await phases.run("defender-prerequisite", () => expectWindowsDefenderProtection())');
    expect(startup).toContain('(Get-MpComputerStatus).RealTimeProtectionEnabled');
    expect(startup).toContain("const { developmentComparison } = cliCapabilities(candidate.manifest.version)");
    expect(startup).toContain('const profiles = developmentComparison ? (["a1", "pi"] as const) : (["a1"] as const)');
    expect(startup).toContain("for (const profileId of profiles)");
    expect(startup).toContain('expect(refused, "stable a1 pi must exit quietly without launching").toEqual({ exitCode: 0, stdout: "", stderr: "", traced: false })');
    for (const kind of ["post-update", "no-live-supervisor", "warm"]) {
      expect(startup.match(new RegExp(`gateStartupBudget\\(\\{ profileId, launchKind: "${kind}"`, "g")), kind).toHaveLength(1);
      expect(startup).toContain(`recordStartupMeasurement(profileId, "${kind}"`);
    }
    expect(startup).toContain('phases.run("startup-cold-state"');
    expect(startup).toContain("delete environment.NODE_COMPILE_CACHE");
    expect(startup).toContain('phases.run("startup-declared-warmup"');
    expect(startup).toContain("validationComplete.fileReadOperations - validationStart.fileReadOperations");
    expect(startup).toContain("const deadline = Date.now() + 15_000");
    expect(startup).toContain("automaticRetries: 0");
    expect(startup).toContain('process.env.STARTUP_BUDGET_ENFORCEMENT === "record" ? "record" : "fail"');
    expect(startup).toContain("evaluateStartupPerformanceBudget(evidence)");
    expect(startup).toContain('if (enforcement === "fail") throw new Error(message)');
    expect(startup).toContain("expect(startupMeasurements.length).toBe(profiles.length * 3)");
    expect(startup).toContain("enforcement,");
    expect(startup).toContain("budgetViolations,");
    expect(contracts).toContain("createPackagedCleanupBacklog(dataDir, 42, 128)");
  });

  it("keeps atomic plans separate and the public package composition complete", async () => {
    const [contracts, startup, complete, full] = await Promise.all([
      createTierPlan(["package-contracts"]), createTierPlan(["package-startup"]), createTierPlan(["package-install"]), createTierPlan(["full-release"]),
    ]);
    expect(contracts.selected).toEqual(["package-contracts"]);
    expect(startup.selected).toEqual(["package-startup"]);
    expect(complete.selected).toEqual(["package-contracts", "package-startup"]);
    expect(contracts.vitest!.invocations).toEqual([expect.objectContaining({ id: "vitest-package-contracts", arguments: expect.arrayContaining(["test/foundation/release/package-install.integration.test.ts"]) })]);
    expect(startup.vitest!.invocations).toEqual([expect.objectContaining({ id: "vitest-package-startup", arguments: expect.arrayContaining(["test/foundation/release/package-startup.integration.test.ts"]) })]);
    expect(complete.vitest!.invocations).toEqual([...startup.vitest!.invocations, ...contracts.vitest!.invocations]);
    expect(full.vitest!.invocations).toEqual(expect.arrayContaining([...complete.vitest!.invocations]));
    expect(contracts.exactPackagePreparation).toMatchObject({ count: 1, consumers: ["package-contracts"] });
    expect(startup.exactPackagePreparation).toMatchObject({ count: 1, consumers: ["package-startup"] });
    expect(complete.exactPackagePreparation).toMatchObject({ count: 1, consumers: ["package-startup", "package-contracts"] });
    for (const plan of [contracts, startup]) {
      expect(plan.requiresBuild).toBe(true);
      expect(plan.consumesPackage).toBe(true);
      expect(plan.vitest!.invocations[0]!.arguments).toContain("--no-file-parallelism");
      expect(plan.vitest!.invocations[0]!.arguments).toContain("--testTimeout=600000");
    }
  });

  it("schedules startup and non-timing package owners on separate fresh Node 22 runners", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const entries = DEVELOPMENT_VALIDATION_MATRIX as ReadonlyArray<{ group: string; os: string; platform: string; node: number; defender: boolean }>;
    expect(entries.filter(entry => ["startup", "package"].includes(entry.group))).toEqual([
      expect.objectContaining({ group: "package", os: "windows-2025", platform: "win32", node: 22, defender: false }),
      expect.objectContaining({ group: "startup", os: "windows-2025", platform: "win32", node: 22, defender: true }),
    ]);
    const run = workflow.jobs.modular.steps.find((step: { name?: string }) => step.name === "Run exact selected scopes");
    expect(run.env).toMatchObject({ VALIDATION_SELECTION_JSON: "${{ steps.job-selection.outputs.scopes_json }}", VALIDATION_BUILD_READY: "${{ matrix.build && '1' || '0' }}" });
    expect(run.run).toContain("outcome-${{ matrix.group }}-${{ matrix.platform }}-node${{ matrix.node }}-attempt-${{ github.run_attempt }}.json");
  });
});
