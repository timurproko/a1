import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { createTierPlan } from "../../scripts/release/validation-tier.mjs";
import { publicationValidationMatrix } from "../../scripts/release/publication-validation-matrix.mjs";

describe("complete regression automation", () => {
  it("runs on its own nightly schedule and on explicit demand, apart from publication", async () => {
    const [regression, release] = await Promise.all([
      readFile(".github/workflows/full-regression.yml", "utf8"),
      readFile(".github/workflows/release.yml", "utf8"),
    ]);
    expect(regression).toContain("workflow_dispatch:");
    expect(regression).toContain("cron: '47 2 * * *'");
    expect(release).toContain('cron: "17 3 * * *"');
    expect(release).toContain('selected=\'["full-release"]\'');
  });

  it("builds and packs once before the complete deduplicated suite", async () => {
    const workflow = await readFile(".github/workflows/full-regression-shared.yml", "utf8");
    expect(workflow.match(/run: npm ci/g)).toHaveLength(2);
    expect(workflow.match(/check-code-documentation\.mjs --mode full/g)).toHaveLength(1);
    expect(workflow).toContain('VALIDATION_DOCUMENTATION_FULL_READY: "1"');
    expect(workflow.match(/run: node scripts\/release\/prepare-validation-package\.mjs/g)).toHaveLength(1);
    expect(workflow).toContain("VALIDATION_SELECTION_JSON: '[\"full-release\"]'");
    expect(workflow).toContain('VALIDATION_BUILD_READY: "1"');
    expect(workflow).toContain("VALIDATION_CANDIDATE_TARBALL:");
    expect(workflow.split("node scripts/release/run-validation-tier.mjs")).toHaveLength(3);
    expect(workflow).toContain("--prepare-exact-package");
    expect(workflow).toContain("--result .artifacts/validation/full-regression.json");
  });

  it("retains both Windows runtimes outside development previews, Defender, and exact-package gates outside PR startup", async () => {
    const release = parse(await readFile(".github/workflows/release.yml", "utf8"));
    const regression = parse(await readFile(".github/workflows/full-regression-shared.yml", "utf8"));
    const wrapper = parse(await readFile(".github/workflows/full-regression.yml", "utf8"));
    const releaseJob = release.jobs.validate;
    const fullJob = regression.jobs["full-regression"];
    const lanes = (matrix: { include: { os: string; node: number }[] }) => matrix.include.map(({ os, node }) => `${os}:${node}`).sort();
    expect(lanes(fullJob.strategy.matrix)).toEqual(["macos-15:24", "ubuntu-24.04:24", "windows-2025:22", "windows-2025:24"]);
    expect(releaseJob.strategy.matrix).toBe("${{ fromJson(needs.plan.outputs.validate_matrix) }}");
    expect(release.jobs.plan.outputs.validate_matrix).toBe("${{ steps.lanes.outputs.validate_matrix }}");
    const lanesStep = release.jobs.plan.steps.find((step: { id: string }) => step.id === "lanes");
    expect(lanesStep.env.MODE).toBe("${{ needs.source.outputs.mode }}");
    expect(lanesStep.run).toContain('node scripts/release/publication-validation-matrix.mjs --mode "$MODE"');
    for (const mode of ["nightly", "stable"]) {
      expect(lanes(publicationValidationMatrix(mode))).toEqual(["macos-15:24", "ubuntu-24.04:24", "windows-2025:22", "windows-2025:24"]);
    }
    expect(lanes(publicationValidationMatrix("develop"))).toEqual(["macos-15:24", "ubuntu-24.04:24", "windows-2025:24"]);
    expect(() => publicationValidationMatrix("preview")).toThrow(/unknown publication mode/);
    const guardianCache = release.jobs.guardians.steps.find((step: { name: string }) => step.name === "Cache process guardian build");
    expect(guardianCache.uses).toBe("Swatinem/rust-cache@6323deb102c322ba6fcbdcafc7e3dddab59af2b6");
    expect(guardianCache.with).toEqual({ workspaces: "native/process-guardian" });
    expect(release.jobs.guardians.steps.indexOf(guardianCache)).toBeLessThan(release.jobs.guardians.steps.findIndex((step: { run: string }) => step.run === "npm run build:process-guardian"));
    for (const job of [releaseJob, fullJob]) {
      expect(job.strategy["fail-fast"]).toBe(false);
      expect(job["continue-on-error"]).toBeUndefined();
      const defender = job.steps.findIndex((step: { name: string }) => step.name === "Enable Defender real-time protection for startup acceptance");
      expect(defender).toBeGreaterThanOrEqual(0);
      expect(job.steps[defender].if).toBe("runner.os == 'Windows'");
      expect(job.steps[defender].run).toContain("Set-MpPreference -DisableRealtimeMonitoring $false");
      expect(job.steps[defender].run).toContain('throw "Windows Defender real-time protection could not be enabled"');
      const install = job.steps.findIndex((step: { run: string }) => step.run === "npm ci");
      const prepare = job.steps.findIndex((step: { name: string }) => step.name === "Prepare the exact package");
      const consume = job.steps.findIndex((step: { name: string }) => ["Validate the exact package", "Run complete non-physical validation"].includes(step.name));
      expect(install).toBeGreaterThanOrEqual(0);
      expect(prepare).toBeGreaterThan(install);
      expect(defender).toBeGreaterThan(prepare);
      expect(defender).toBeLessThan(consume);
      expect(job.steps[prepare].run).toContain("--prepare-exact-package");
      expect(job.steps[prepare].run).toContain("--handoff .artifacts/validation/exact-package-handoff.json");
      expect(job.steps[consume].run).toContain("--exact-package-handoff .artifacts/validation/exact-package-handoff.json");
      expect(JSON.stringify(job)).not.toMatch(/continue-on-error|--retry/);
    }
    expect(release.on.schedule).toEqual([{ cron: "17 3 * * *" }]);
    expect(wrapper.on).toEqual({ schedule: [{ cron: "47 2 * * *" }], workflow_dispatch: null });
    expect(wrapper.jobs.complete.uses).toBe("./.github/workflows/full-regression-shared.yml");
    expect(wrapper.jobs.complete.with.source).toBe("${{ github.sha }}");
    const selection = releaseJob.steps.find((step: { id: string }) => step.id === "selection");
    expect(selection.env.MODE).toBe("${{ needs.plan.outputs.mode }}");
    expect(selection.run).toContain('if [ "$MODE" = "develop" ]; then');
    expect(selection.run).toContain("selected='[\"package-smoke\",\"package-install\"]'");
    expect(selection.run).toContain("selected='[\"full-release\"]'");
    const bindStep = releaseJob.steps.find((step: { name: string }) => step.name === "Bind downloaded package to this validation job");
    expect(bindStep.run).toContain("--build-receipt .artifacts/validation/receipts/build.json");
    const packageStep = releaseJob.steps.find((step: { name: string }) => step.name === "Validate the exact package");
    expect(packageStep.if).toBeUndefined();
    expect(packageStep.env.VALIDATION_SELECTION_JSON).toBe("${{ steps.selection.outputs.selected }}");
    expect(packageStep.env.VALIDATION_CANDIDATE_TARBALL).toBe("${{ github.workspace }}/.artifacts/release/candidate.tgz");
    expect(release.jobs.publish.needs).toContain("validate");
    expect(release.jobs.publish.if).toContain("needs.validate.result == 'success'");
    const fullStep = fullJob.steps.find((step: { name: string }) => step.name === "Run complete non-physical validation");
    expect(fullStep.if).toBeUndefined();
    expect(fullStep.env.VALIDATION_SELECTION_JSON).toBe('["full-release"]');
    expect(fullStep.env.VALIDATION_CANDIDATE_TARBALL).toBe("${{ github.workspace }}/.artifacts/validation/package/candidate.tgz");
    expect(fullStep.env.STARTUP_BUDGET_ENFORCEMENT).toBe("record");
    expect(fullStep.env.STARTUP_PERFORMANCE_RESULT).toBe(".artifacts/validation/startup-${{ matrix.os }}-node${{ matrix.node }}.json");
    expect(packageStep.env.STARTUP_BUDGET_ENFORCEMENT).toBe("${{ needs.plan.outputs.mode == 'stable' && 'fail' || 'record' }}");
  });

  it("keeps every deferred startup, image, and history test in the actual full plan exactly once", async () => {
    const plan = await createTierPlan(["full-release"]);
    expect(plan.selected).toEqual(expect.arrayContaining(["fast-remainder", "fast-resource-sensitive", "dist-integration", "package-contracts", "package-startup", "image-compatibility", "history-compatibility", "unix-containment"]));
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
    expect(plan.exactPackagePreparation).toMatchObject({ count: 1, consumers: ["package-startup", "package-contracts"] });
    expect(invocations.filter(invocation => invocation.evidence?.executionClass === "resource-sensitive")
      .flatMap(invocation => invocation.arguments)).toContain("test/features/prompt-history/store.test.ts");
  });

  it("retains the unchanged three-release predecessor oracle in complete validation", async () => {
    const [suites, source] = await Promise.all([
      readFile("config/validation-suites.json", "utf8").then(JSON.parse),
      readFile("test/foundation/release/update-predecessor.integration.test.ts", "utf8"),
    ]);
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
    expect(exclusions).not.toContain("test/foundation/release/update-predecessor.integration.test.ts");
    expect(source).toContain('UPDATE_PREDECESSOR_COUNT ?? "3"');
    expect(source).toContain("fixture.phase(900_000");
    expect(source).toContain("fixture.phase(1_800_000");
    expect(source).not.toMatch(/retry|cache/i);
  });

  it("reports owned failures and timings without publication authority", async () => {
    const workflow = await readFile(".github/workflows/full-regression-shared.yml", "utf8");
    expect(workflow).toContain("Report gate ownership and timing");
    expect(workflow).toContain("Owned gate");
    expect(workflow).toContain("outcome.exitCode");
    expect(workflow).toContain("full-regression-${{ inputs.source }}-${{ github.run_id }}-${{ github.run_attempt }}");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).not.toMatch(/id-token:\s*write|npm publish|environment:\s*npm-/);
  });
});
