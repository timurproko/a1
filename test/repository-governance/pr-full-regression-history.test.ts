import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { selectFromRepository, type RegressionPull } from "../../scripts/release/pr-full-regression.mjs";

it("retains erased repair scaffolds and distinguishes root version changes from dependency changes using complete Git history", () => {
  const repo = mkdtempSync(join(tmpdir(), "a1-full-regression-history-"));
  const git = (...args: string[]) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", timeout: 10000, windowsHide: true }).trim();
  try {
    git("init", "--quiet");
    git("config", "user.email", "fixture@example.test");
    git("config", "user.name", "Fixture");
    git("config", "commit.gpgsign", "false");
    writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0", dependencies: { fixture: "1.0.0" } }));
    git("add", "."); git("commit", "--quiet", "-m", "base");
    const base = git("rev-parse", "HEAD");
    const pull = (): RegressionPull => ({ number: 1, state: "open", draft: false, labels: [], body: "", head: { sha: git("rev-parse", "HEAD"), ref: "feature/renamed" }, base: { sha: base, ref: "develop" } });
    writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.1", dependencies: { fixture: "1.0.0" } }));
    git("add", "."); git("commit", "--quiet", "-m", "root version");
    expect(selectFromRepository(repo, pull())).toMatchObject({ selected: false, reasons: ["version-only"] });
    writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.1", dependencies: { fixture: "2.0.0" } }));
    git("add", "."); git("commit", "--quiet", "-m", "dependency impact");
    expect(selectFromRepository(repo, pull()).reasons).toContain("release-impact");
    const scaffold = join(repo, "openspec", "changes", "fix-nightly-regression-2026-09-22");
    mkdirSync(scaffold, { recursive: true }); writeFileSync(join(scaffold, "proposal.md"), "repair evidence");
    git("add", "."); git("commit", "--quiet", "-m", "repair association");
    rmSync(scaffold, { recursive: true });
    git("add", "-A"); git("commit", "--quiet", "-m", "removed display association");
    expect(selectFromRepository(repo, pull()).reasons).toContain("nightly-repair");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}, 30000);
