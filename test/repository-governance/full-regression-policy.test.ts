import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { createTierPlan } from "../../scripts/release/validation-tier.mjs";

describe("complete regression automation", () => {
  it("remains available on explicit demand while nightly ownership lives with publication", async () => {
    const [regression, release] = await Promise.all([
      readFile(".github/workflows/full-regression.yml", "utf8"),
      readFile(".github/workflows/release.yml", "utf8"),
    ]);
    expect(regression).toContain("workflow_dispatch:");
    expect(regression).not.toContain("schedule:");
    expect(release).toContain('cron: "17 3 * * *"');
    expect(release).toContain('selected=\'["full-release"]\'');
  });

  it("builds and packs once before the complete deduplicated suite", async () => {
    const workflow = await readFile(".github/workflows/full-regression.yml", "utf8");
    expect(workflow.match(/run: npm ci/g)).toHaveLength(2);
    expect(workflow.match(/check-code-documentation\.mjs --mode full/g)).toHaveLength(1);
    expect(workflow).toContain('VALIDATION_DOCUMENTATION_FULL_READY: "1"');
    expect(workflow.match(/run: node scripts\/release\/prepare-validation-package\.mjs/g)).toHaveLength(1);
    expect(workflow).toContain("VALIDATION_SELECTION_JSON: '[\"full-release\"]'");
    expect(workflow).toContain('VALIDATION_BUILD_READY: "1"');
    expect(workflow).toContain("VALIDATION_CANDIDATE_TARBALL:");
    expect(workflow).toContain("node scripts/release/run-validation-tier.mjs --result .artifacts/validation/full-regression.json");
  });

  it("retains both Windows runtimes, Defender, and exact-package gates outside PR startup", async () => {
    const release = parse(await readFile(".github/workflows/release.yml", "utf8"));
    const regression = parse(await readFile(".github/workflows/full-regression.yml", "utf8"));
    const releaseJob = release.jobs.validate;
    const fullJob = regression.jobs["full-regression"];
    for (const job of [releaseJob, fullJob]) {
      const matrix = job.strategy.matrix.include as { os: string; node: number }[];
      expect(matrix.map(({ os, node }) => `${os}:${node}`).sort()).toEqual([
        "macos-15:24", "ubuntu-24.04:24", "windows-2025:22", "windows-2025:24",
      ]);
      expect(job.strategy["fail-fast"]).toBe(false);
      expect(job["continue-on-error"]).toBeUndefined();
      const defender = job.steps.findIndex((step: { name: string }) => step.name === "Enable Defender real-time protection for startup acceptance");
      expect(defender).toBeGreaterThanOrEqual(0);
      expect(job.steps[defender].if).toBe("runner.os == 'Windows'");
      expect(job.steps[defender].run).toContain("Set-MpPreference -DisableRealtimeMonitoring $false");
      expect(job.steps[defender].run).toContain('throw "Windows Defender real-time protection could not be enabled"');
      expect(defender).toBeLessThan(job.steps.findIndex((step: { run: string }) => step.run === "npm ci"));
      expect(JSON.stringify(job)).not.toMatch(/continue-on-error|--retry/);
    }
    expect(release.on.schedule).toEqual([{ cron: "17 3 * * *" }]);
    expect(regression.on).toEqual({ workflow_dispatch: null });
    const selection = releaseJob.steps.find((step: { id: string }) => step.id === "selection");
    expect(selection.env.MODE).toBe("${{ needs.plan.outputs.mode }}");
    expect(selection.run).toContain('if [ "$MODE" = "develop" ]; then');
    expect(selection.run).toContain("selected='[\"package-smoke\",\"package-install\"]'");
    expect(selection.run).toContain("selected='[\"full-release\"]'");
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
      "test/integrations/pi/session-ui/image-preparation.test.ts",
      "test/integrations/pi/session-ui/image-worker-package.test.ts",
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
    expect(invocations.filter(invocation => invocation.id.startsWith("vitest-fast-resource-sensitive-"))
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
    const workflow = await readFile(".github/workflows/full-regression.yml", "utf8");
    expect(workflow).toContain("Report gate ownership and timing");
    expect(workflow).toContain("Owned gate");
    expect(workflow).toContain("outcome.exitCode");
    expect(workflow).toContain("full-regression-${{ github.sha }}-${{ github.run_id }}-${{ github.run_attempt }}");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).not.toMatch(/id-token:\s*write|npm publish|environment:\s*npm-/);
  });
});
