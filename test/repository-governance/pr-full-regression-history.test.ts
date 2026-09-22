import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { selectFromRepository, type RegressionPull } from "../../scripts/release/pr-full-regression.mjs";

it("preserves generated repair provenance across OpenSpec finalization and keeps ordinary dependency changes bounded", () => {
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
    const body = '```openspec-implementation\n{"version":3,"change":"fix-nightly-regression-2026-09-22"}\n```';
    const pull = (bot = true): RegressionPull => ({ number: 1, state: "open", draft: false, labels: [], body,
      user: bot ? { login: "openspec-ci[bot]", id: 329165293, type: "Bot" } : { login: "maintainer", id: 1, type: "User" },
      head: { sha: git("rev-parse", "HEAD"), ref: "fix/nightly-regression-2026-09-22" }, base: { sha: base, ref: "develop", repo: { full_name: "timurproko/a1" } } });

    writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.1", dependencies: { fixture: "1.0.0" } }));
    git("add", "."); git("commit", "--quiet", "-m", "root version");
    expect(selectFromRepository(repo, pull())).toMatchObject({ selected: false, reasons: ["version-only"] });
    writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.1", dependencies: { fixture: "2.0.0" } }));
    git("add", "."); git("commit", "--quiet", "-m", "dependency impact");
    expect(selectFromRepository(repo, pull())).toMatchObject({ selected: false, reasons: ["ordinary-cadence"] });

    const change = "fix-nightly-regression-2026-09-22";
    const active = join(repo, "openspec", "changes", change);
    mkdirSync(active, { recursive: true });
    writeFileSync(join(active, "proposal.md"), "repair evidence\n");
    writeFileSync(join(active, "regression-provenance.json"), `${JSON.stringify({
      schema: "a1-regression-triage-provenance-v1", candidate: { branch: "fix/nightly-regression-2026-09-22", change },
      sources: [{ workflowName: "Full regression", workflowFile: "full-regression.yml", runId: 9001, runNumber: 412, attempt: 1, event: "schedule", conclusion: "failure",
        headBranch: "develop", headSha: "c".repeat(40), url: "https://github.com/timurproko/a1/actions/runs/9001", createdAt: "2026-09-22T02:47:00Z" }],
    }, null, 2)}\n`);
    git("add", "."); git("commit", "--quiet", "-m", "generated repair association");
    expect(selectFromRepository(repo, pull(false))).toMatchObject({ selected: false, reasons: ["ordinary-cadence"] });
    expect(selectFromRepository(repo, pull())).toMatchObject({ selected: true, reasons: ["generated-failed-full-regression-repair"] });

    const archived = join(repo, "openspec", "changes", "archive", `2026-09-22-${change}`);
    mkdirSync(join(repo, "openspec", "changes", "archive"), { recursive: true });
    renameSync(active, archived);
    git("add", "-A"); git("commit", "--quiet", "-m", "finalize repair association");
    expect(selectFromRepository(repo, pull())).toMatchObject({ selected: true, reasons: ["generated-failed-full-regression-repair"] });
  } finally { rmSync(repo, { recursive: true, force: true }); }
}, 30000);
