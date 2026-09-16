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
    expect(runbook).toContain("| Windows Node 22 | Required for applicable changes | Retained | Retained |");
    expect(runbook).toContain("| Windows Node 24 | Not scheduled | Retained | Retained |");
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
    expect(runbook).toContain("real published-history incompatibility to reach `develop` before nightly detects it");
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
    expect(runbook).toContain("A push of the stable version does not publish");
  });

  it("enables Defender before accepted Windows exact-package startup gates", async () => {
    for (const path of [".github/workflows/release.yml", ".github/workflows/full-regression.yml"]) {
      const workflow = await readFile(path, "utf8");
      expect(workflow).toContain("Set-MpPreference -DisableRealtimeMonitoring $false");
      expect(workflow).toContain("Get-MpComputerStatus).RealTimeProtectionEnabled");
      const protection = workflow.indexOf("Enable Defender real-time protection for startup acceptance");
      expect(protection).toBeGreaterThanOrEqual(0);
      expect(protection).toBeLessThan(workflow.indexOf("run: npm ci", protection));
    }
  });
});
