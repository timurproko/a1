import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { createTierPlan, FULL_REGRESSION_SHARDS, partitionFullRegressionPlan } from "../../scripts/release/validation-tier.mjs";
import { publicationValidationMatrix } from "../../scripts/release/publication-validation-matrix.mjs";

describe("complete regression automation", () => {
  it("runs on its own nightly schedule and on explicit demand, apart from publication", async () => {
    const [regression, release] = await Promise.all([
      readFile(".github/workflows/full-regression.yml", "utf8"),
      readFile(".github/workflows/publish.yml", "utf8"),
    ]);
    expect(regression).toContain("workflow_dispatch:");
    expect(regression).toContain("cron: '47 2 * * *'");
    expect(release).toContain('cron: "17 3 * * *"');
    expect(release).toContain('selected=\'["full-release"]\'');
  });

  it("builds once per runner and packs once per runtime before the complete deduplicated suite", async () => {
    const text = await readFile(".github/workflows/full-regression-shared.yml", "utf8");
    const workflow = parse(text);
    expect(text.match(/check-code-documentation\.mjs --mode full/g)).toHaveLength(1);
    for (const name of ["full-regression", "windows-shard"]) {
      const job = workflow.jobs[name];
      expect(job.steps.filter((step: { run?: string }) => step.run === "npm ci"), name).toHaveLength(1);
      expect(job.steps.filter((step: { run?: string }) => step.run === "node scripts/release/prepare-validation-package.mjs"), name).toHaveLength(1);
      const run = job.steps.find((step: { name: string }) => step.name.startsWith("Run complete non-physical validation"));
      expect(run.env.VALIDATION_SELECTION_JSON).toBe('["full-release"]');
      expect(run.env.VALIDATION_BUILD_READY).toBe("1");
      expect(run.env.VALIDATION_DOCUMENTATION_FULL_READY).toBe("1");
      expect(run.env.VALIDATION_CANDIDATE_TARBALL).toBe("${{ github.workspace }}/.artifacts/validation/package/candidate.tgz");
      expect(run.run).toContain("--result .artifacts/validation/full-regression.json");
    }
    // Invariant: only the package shard packs and prepares the exact installation for its runtime.
    const shard = workflow.jobs["windows-shard"];
    for (const name of ["Pack exact regression candidate once", "Prepare the exact package", "Enable Defender real-time protection for startup acceptance"]) {
      expect(shard.steps.find((step: { name: string }) => step.name === name).if, name).toBe("matrix.shard == 'package'");
    }
    expect(text.match(/--prepare-exact-package/g)).toHaveLength(2);
    expect(workflow.jobs["windows-lane"].steps.some((step: { run?: string }) => step.run === "npm ci")).toBe(false);
  });

  it("schedules all four shards for both Windows runtimes and keeps Linux and macOS whole", async () => {
    const workflow = parse(await readFile(".github/workflows/full-regression-shared.yml", "utf8"));
    const shard = workflow.jobs["windows-shard"];
    expect(shard.strategy.matrix).toEqual({ os: ["windows-2025"], node: [24, 22], shard: [...FULL_REGRESSION_SHARDS] });
    expect(shard.strategy["fail-fast"]).toBe(false);
    expect(shard["timeout-minutes"]).toBe(40);
    expect(shard.needs).toBe("documentation");
    const run = shard.steps.find((step: { name: string }) => step.name === "Run complete non-physical validation shard");
    expect(run.env.FULL_SHARD).toBe("${{ matrix.shard }}");
    expect(run.run).toContain('--full-shard "$FULL_SHARD"');
    expect(run.run).toContain('if [ "$FULL_SHARD" = package ]; then args+=(--exact-package-handoff .artifacts/validation/exact-package-handoff.json); fi');
    const upload = shard.steps.find((step: { uses?: string }) => step.uses?.startsWith("actions/upload-artifact"));
    expect(upload.if).toBe("always()");
    expect(upload.with.name).toBe("full-regression-${{ inputs.source }}-${{ github.run_id }}-${{ github.run_attempt }}-${{ matrix.os }}-node${{ matrix.node }}-${{ matrix.shard }}");
    expect(upload.with.path).toContain(".artifacts/validation/full-shards/*.json");
    expect(shard.steps.find((step: { name: string }) => step.name === "Bind shard evidence").run).toBe("node scripts/release/full-regression-evidence.mjs --record-shard");
    const lane = workflow.jobs["windows-lane"];
    expect(lane.needs).toBe("windows-shard");
    expect(lane.if).toBe("always()");
    expect(lane.strategy.matrix).toEqual({ os: ["windows-2025"], node: [24, 22] });
    const download = lane.steps.find((step: { uses?: string }) => step.uses?.startsWith("actions/download-artifact"));
    expect(download.with.pattern).toBe("full-regression-${{ inputs.source }}-${{ github.run_id }}-${{ github.run_attempt }}-${{ matrix.os }}-node${{ matrix.node }}-*");
    const merge = lane.steps.findIndex((step: { run?: string }) => step.run === "node scripts/release/full-regression-evidence.mjs --merge-shards");
    const bind = lane.steps.findIndex((step: { run?: string }) => step.run === "node scripts/release/full-regression-evidence.mjs --record");
    expect(merge).toBeGreaterThan(0);
    expect(bind).toBeGreaterThan(merge);
    expect(lane.steps[merge].if).toBeUndefined();
    expect(lane.steps[bind].if).toBeUndefined();
    // Invariant: upload-artifact roots each archive at its paths' common ancestor, and the required job
    // collects only `*/full-lanes/*.json`, so every lane-bearing upload must keep that directory.
    for (const job of Object.values(workflow.jobs) as { steps?: { uses?: string; with?: { path?: string } }[] }[]) {
      for (const step of job.steps ?? []) {
        if (!step.uses?.startsWith("actions/upload-artifact") || !step.with?.path?.includes("full-lanes/")) continue;
        const paths = step.with.path.split("\n").map(path => path.trim()).filter(Boolean);
        const segments = paths.map(path => path.split("/").slice(0, -1));
        const common = segments[0]!.findIndex((segment, index) => segments.some(other => other[index] !== segment));
        const root = segments[0]!.slice(0, common === -1 ? undefined : common).join("/");
        expect(`${root}/`, step.with.path).not.toMatch(/full-lanes\/$/);
      }
    }
    expect(workflow.jobs["full-regression"].strategy.matrix.include).toEqual([{ os: "ubuntu-24.04", node: 24 }, { os: "macos-15", node: 24 }]);
    expect(workflow.jobs.required.needs).toEqual(["documentation", "windows-shard", "windows-lane", "full-regression"]);
    const requireStep = workflow.jobs.required.steps.find((step: { name?: string }) => step.name === "Require every exact-run native lane");
    for (const job of ["documentation", "windows-shard", "windows-lane", "full-regression"]) expect(requireStep.env.FULL_JOBS_RESULT).toContain(`needs.${job}.result`);
    expect(JSON.stringify(workflow)).not.toMatch(/continue-on-error|--retry/);
  });

  it("retains both Windows runtimes outside development previews, Defender, and exact-package gates outside PR startup", async () => {
    const release = parse(await readFile(".github/workflows/publish.yml", "utf8"));
    const regression = parse(await readFile(".github/workflows/full-regression-shared.yml", "utf8"));
    const wrapper = parse(await readFile(".github/workflows/full-regression.yml", "utf8"));
    const releaseJob = release.jobs.validate;
    const fullJob = regression.jobs["windows-shard"];
    const lanes = (matrix: { include: { os: string; node: number }[] }) => matrix.include.map(({ os, node }) => `${os}:${node}`).sort();
    const windows = fullJob.strategy.matrix.node.map((node: number) => `windows-2025:${node}`);
    expect([...lanes(regression.jobs["full-regression"].strategy.matrix), ...windows].sort()).toEqual(["macos-15:24", "ubuntu-24.04:24", "windows-2025:22", "windows-2025:24"]);
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
      expect(job.steps[defender].if).toBe(job === fullJob ? "matrix.shard == 'package'" : "runner.os == 'Windows'");
      expect(job.steps[defender].run).toContain("Set-MpPreference -DisableRealtimeMonitoring $false");
      expect(job.steps[defender].run).toContain('throw "Windows Defender real-time protection could not be enabled"');
      const install = job.steps.findIndex((step: { run: string }) => step.run === "npm ci");
      const prepare = job.steps.findIndex((step: { name: string }) => step.name === "Prepare the exact package");
      const consume = job.steps.findIndex((step: { name: string }) => ["Validate the exact package", "Run complete non-physical validation shard"].includes(step.name));
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
    const fullStep = fullJob.steps.find((step: { name: string }) => step.name === "Run complete non-physical validation shard");
    expect(fullStep.if).toBeUndefined();
    expect(fullStep.env.VALIDATION_SELECTION_JSON).toBe('["full-release"]');
    expect(fullStep.env.VALIDATION_CANDIDATE_TARBALL).toBe("${{ github.workspace }}/.artifacts/validation/package/candidate.tgz");
    expect(fullStep.env.STARTUP_BUDGET_ENFORCEMENT).toBe("record");
    expect(fullStep.env.STARTUP_PERFORMANCE_RESULT).toBe(".artifacts/validation/startup-${{ matrix.os }}-node${{ matrix.node }}.json");
    expect(packageStep.env.STARTUP_BUDGET_ENFORCEMENT).toBe("${{ needs.plan.outputs.channel == 'latest' && 'fail' || 'record' }}");
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
    const resourceArguments = invocations.filter(invocation => invocation.evidence?.executionClass === "resource-sensitive")
      .flatMap(invocation => invocation.arguments);
    expect(resourceArguments).toContain("test/features/prompt-history/store.test.ts");
    const promptConcurrency = "test/features/prompt-history/concurrency.integration.test.ts";
    expect(exclusions).toContain(promptConcurrency);
    expect(resourceArguments.filter(argument => argument === promptConcurrency)).toHaveLength(1);
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
    // Rationale: the exhaustive owner runs once as its own package-shard invocation instead of in the ordinary remainder.
    expect(exclusions).toContain("test/foundation/release/update-predecessor.integration.test.ts");
    const predecessor = plan.vitest!.invocations.filter(invocation => invocation.id !== "vitest-full-without-isolated"
      && invocation.arguments.includes("test/foundation/release/update-predecessor.integration.test.ts"));
    expect(predecessor).toEqual([{ id: "vitest-update-predecessor", scopes: ["update-predecessor"], arguments: ["vitest", "run", "test/foundation/release/update-predecessor.integration.test.ts", "--testTimeout=30000"] }]);
    expect(partitionFullRegressionPlan(plan).shards.package.invocations).toContain("vitest-update-predecessor");
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
    expect(workflow).toContain("permissions:\n  actions: read\n  contents: read");
    expect(workflow).not.toMatch(/id-token:\s*write|npm publish|environment:\s*npm-/);
  });
});
