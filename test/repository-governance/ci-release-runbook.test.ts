import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("CI and release operations runbook", () => {
  it("documents the required check and references live workflow files", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).toContain("`Development validation required`");
    const references = [...runbook.matchAll(/`(\.github\/workflows\/[^`]+\.yml)`/g)].map(match => match[1]!);
    expect(references.length).toBeGreaterThanOrEqual(2);
    await Promise.all(references.map(path => access(path)));
  });

  it("distinguishes the single-runtime PR startup gate from retained Node 24 full validation", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).toContain("| Windows Node 22 | Required for applicable changes | Not scheduled | Retained | Retained |");
    expect(runbook).toContain("| Windows Node 24 | Not scheduled | Retained | Retained | Retained |");
    expect(runbook).toContain("scripts/release/publication-validation-matrix.mjs");
    expect(runbook).not.toMatch(/within five seconds|within three seconds/);
    expect(runbook).toContain("gh workflow run full-regression.yml --ref <branch-or-tag>");
    expect(runbook).toContain("a Node-24-specific regression can reach `develop` before nightly catches it");
    expect(runbook).toContain("nightly failure still blocks its publication");
    expect(runbook).toContain("a failed budget remains failed and is never retried");
  });

  it("documents bounded PR cadence, exhaustive predecessor deferral, and latency targets", async () => {
    const [runbook, validation] = await Promise.all([
      readFile("docs/ci-release-runbook.md", "utf8"),
      readFile("docs/validation.md", "utf8"),
    ]);
    for (const source of [runbook, validation]) {
      expect(source).toContain("pull-request");
      expect(source).toContain("exhaustive");
      expect(source).toContain("update-predecessor");
    }
    expect(runbook).toContain("at most eight minutes");
    expect(runbook).toContain("five minutes for one PR-required scope");
    expect(validation).toContain("eight-minute critical-path and five-minute individual-scope targets");
    expect(runbook).toContain("real published-history incompatibility or update slowdown to reach `develop` before the next exhaustive run detects it");
    expect(runbook).toContain("runs every night at `02:47 UTC`");
    expect(runbook).toContain("`update-performance` is exhaustive");
    expect(runbook).toContain("Full regression");
    expect(validation).toContain("change its cadence from `exhaustive` to `pull-request`");
  });

  it("keeps the exact-bytes safety rules", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).toContain("Never upload locally rebuilt bytes");
    expect(runbook).toContain("Never route around validation by rebuilding inside a publisher");
    expect(runbook).toContain("Never move a release tag");
  });

  it("says how each channel is published", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).toContain("npm run develop");
    expect(runbook).toContain("03:17 UTC");
    expect(runbook).toContain("npm run release --");
    expect(runbook).toContain("explicitly dispatches");
    expect(runbook).toContain("A push of the stable version does\nnot publish");
    expect(runbook).toContain("the stable version is never committed to `develop`");
  });

  it("records startup budgets on every scheduled and preview channel and enforces them on stable publication only", async () => {
    const [release, regression, development] = await Promise.all([
      readFile(".github/workflows/release.yml", "utf8"),
      readFile(".github/workflows/full-regression.yml", "utf8"),
      readFile(".github/workflows/ci.yml", "utf8"),
    ]);
    expect(release).toContain("STARTUP_BUDGET_ENFORCEMENT: ${{ needs.plan.outputs.mode == 'stable' && 'fail' || 'record' }}");
    expect(release).toContain("STARTUP_PERFORMANCE_RESULT: .artifacts/validation/startup-${{ matrix.platform }}.json");
    expect(release).toContain("Summarize first-attempt startup measurements");
    expect(regression).toContain("STARTUP_BUDGET_ENFORCEMENT: record");
    expect(regression).toContain("STARTUP_PERFORMANCE_RESULT: .artifacts/validation/startup-${{ matrix.os }}-node${{ matrix.node }}.json");
    expect(regression).toContain(".artifacts/validation/startup-*.json");
    expect(regression).toContain("Summarize first-attempt startup measurements");
    expect(regression).not.toContain("STARTUP_BUDGET_ENFORCEMENT: fail");
    expect(development).toContain("STARTUP_BUDGET_ENFORCEMENT: record");
    const triage = await readFile(".github/workflows/nightly-regression-triage.yml", "utf8");
    expect(triage).toContain("github.event.workflow_run.conclusion != 'cancelled'");
  });

  it("enables Defender after installation and before accepted Windows exact-package startup gates", async () => {
    for (const path of [".github/workflows/release.yml", ".github/workflows/full-regression.yml"]) {
      const workflow = await readFile(path, "utf8");
      expect(workflow).toContain("Set-MpPreference -DisableRealtimeMonitoring $false");
      expect(workflow).toContain("Get-MpComputerStatus).RealTimeProtectionEnabled");
      const protection = workflow.indexOf("Enable Defender real-time protection for startup acceptance");
      const prepare = workflow.indexOf("Prepare the exact package");
      const consume = workflow.indexOf("--exact-package-handoff .artifacts/validation/exact-package-handoff.json");
      expect(prepare).toBeGreaterThanOrEqual(0);
      expect(protection).toBeGreaterThan(prepare);
      expect(consume).toBeGreaterThan(protection);
      expect(workflow.indexOf("run: npm ci")).toBeLessThan(prepare);
    }
  });
});
