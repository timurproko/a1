import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
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

  it("gives each owner its own fresh exact candidate installation", async () => {
    const [contracts, startup, fixture] = await Promise.all([
      readFile("test/foundation/release/package-install.integration.test.ts", "utf8"),
      readFile("test/foundation/release/package-startup.integration.test.ts", "utf8"),
      readFile("test/foundation/release/package-install-fixture.ts", "utf8"),
    ]);
    expect(contracts).toContain('installExactCandidate(phases, "a1-package-install-")');
    expect(startup).toContain('installExactCandidate(phases, "a1-package-startup-")');
    expect(contracts).toContain("cleanupExactCandidate(phases, root)");
    expect(startup).toContain("cleanupExactCandidate(phases, root)");
    expect(fixture).toContain('["install", "--global", "--prefix", prefix, candidate.path, "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline"]');
    expect(fixture).toContain('"--prefer-offline"');
    expect(fixture).not.toContain('"--offline"');
    expect(fixture).toContain("mkdtemp");
    expect(fixture).not.toMatch(/reuse|restore|certif/i);
  });

  it("preserves Defender, both profiles, all three launch kinds, budgets, warmup, and workload sizes", async () => {
    const [contracts, startup] = await Promise.all([
      readFile("test/foundation/release/package-install.integration.test.ts", "utf8"),
      readFile("test/foundation/release/package-startup.integration.test.ts", "utf8"),
    ]);
    expect(startup).toContain('await phases.run("defender-prerequisite", () => expectWindowsDefenderProtection())');
    expect(startup).toContain('(Get-MpComputerStatus).RealTimeProtectionEnabled');
    expect(startup).toContain('for (const profileId of ["a1", "pi"] as const)');
    for (const kind of ["post-update", "no-live-supervisor", "warm"]) {
      expect(startup.match(new RegExp(`assertStartupPerformanceBudget\\(\\{ profileId, launchKind: "${kind}"`, "g")), kind).toHaveLength(1);
      expect(startup).toContain(`recordStartupMeasurement(profileId, "${kind}"`);
    }
    expect(startup).toContain('phases.run("startup-declared-warmup"');
    expect(startup).toContain("validationComplete.fileReadOperations - validationStart.fileReadOperations");
    expect(startup).toContain("const deadline = Date.now() + 15_000");
    expect(startup).toContain("automaticRetries: 0");
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
    expect(complete.vitest!.invocations).toEqual([...contracts.vitest!.invocations, ...startup.vitest!.invocations]);
    expect(full.vitest!.invocations).toEqual(expect.arrayContaining([...complete.vitest!.invocations]));
    for (const plan of [contracts, startup]) {
      expect(plan.requiresBuild).toBe(true);
      expect(plan.consumesPackage).toBe(true);
      expect(plan.vitest!.invocations[0]!.arguments).toContain("--no-file-parallelism");
      expect(plan.vitest!.invocations[0]!.arguments).toContain("--testTimeout=600000");
    }
  });

  it("runs fresh startup before the temporarily colocated non-timing owner and retains both outcomes", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const steps = workflow.jobs.startup.steps as Array<{ name?: string; run?: string; env?: Record<string, string>; with?: { path?: string } }>;
    const timing = steps.findIndex(step => step.name === "Validate first-attempt exact-package startup budget");
    const contracts = steps.findIndex(step => step.name === "Validate exact-package identity, layers, recovery, and cleanup");
    expect(timing).toBeGreaterThan(-1);
    expect(contracts).toBeGreaterThan(timing);
    expect(steps[timing]!.run).toContain("package-startup");
    expect(steps[contracts]!.run).toContain("package-contracts");
    expect(steps[contracts]!.env).toMatchObject({ VALIDATION_BUILD_READY: "1", VALIDATION_CANDIDATE_TARBALL: "${{ github.workspace }}/.artifacts/validation/package/candidate.tgz" });
    const upload = steps.find(step => step.name === "Upload startup budget evidence")!;
    expect(upload.with?.path).toContain("package-contracts-node${{ matrix.node }}.json");
  });
});
