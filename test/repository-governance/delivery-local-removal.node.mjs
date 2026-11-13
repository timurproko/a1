import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";
import { captureWorktree, discoverRepository, exists, gitRunner } from "../../scripts/governance/local-cleanup-git.mjs";
import { createStateStore } from "../../scripts/governance/local-cleanup-state.mjs";
import { cleanupPreflight } from "../../scripts/governance/local-cleanup-preflight.mjs";
import { removePublishedLocalWorktree } from "../../scripts/governance/local-cleanup-remove-local.mjs";
import { pruneMergedBranches } from "../../scripts/governance/local-cleanup-branches.mjs";

const execute = promisify(execFile), roots = [];
const cases = JSON.parse(await readFile(new URL("../../docs/delivery-cases.json", import.meta.url), "utf8")).cases;
const expected = id => cases.find(item => item.id === id).expect;
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true, maxRetries: 5 }); });
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "a1-local-removal-"))); roots.push(root);
  const primary = join(root, "primary"), remote = join(root, "remote.git");
  const git = async (cwd, args) => (await execute("git", ["-c", "core.hooksPath=/dev/null", "-c", "user.name=Test", "-c", "user.email=test@example.com", "-C", cwd, ...args], { encoding: "utf8" })).stdout.trim();
  await execute("git", ["init", "-b", "develop", primary]); await git(primary, ["config", "core.autocrlf", "false"]);
  await writeFile(join(primary, "README.md"), "published content\n");
  await writeFile(join(primary, ".gitignore"), ".worktrees/\n.artifacts/\nnode_modules/\n.private/\nunknown.log\n");
  await git(primary, ["add", "."]); await git(primary, ["commit", "-m", "base"]);
  await execute("git", ["clone", "--bare", primary, remote]);
  await git(primary, ["remote", "add", "origin", "https://github.com/timurproko/a1.git"]);
  await git(primary, ["config", `url.${remote.replaceAll("\\", "/")}.insteadOf`, "https://github.com/timurproko/a1.git"]);
  const path = join(primary, ".worktrees", "task").replaceAll("\\", "/");
  await git(primary, ["worktree", "add", "-b", "fix/task", path]); await git(path, ["push", "origin", "fix/task"]);
  const identity = await discoverRepository(primary), store = createStateStore(identity), calls = [], actual = gitRunner();
  const observedGit = async (cwd, args, options) => { calls.push(args); return actual(cwd, args, options); };
  const preflight = (identity, entry, options) => cleanupPreflight(identity, entry, { ...options, inspectProcesses: async () => [] });
  const options = { identity, store, path, cwd: primary, confirmed: true, git: observedGit, preflight, deadline: Date.now() + 120_000 };
  return { root, primary, remote, path, identity, store, git, calls, options };
}

test("C34: exact local removal needs publication/preservation, not merge, CI, completion or archive", async () => {
  const f = await fixture(), head = await f.git(f.path, ["rev-parse", "HEAD"]);
  const report = await removePublishedLocalWorktree(f.options);
  assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
  const state = await f.store.read();
  assert.deepEqual({ checkoutRemoved: !await exists(f.path), localBranchPreserved: await f.git(f.primary, ["rev-parse", "fix/task"]) === head,
    remoteWrites: f.calls.filter(args => ["push", "send-pack"].includes(args[0])).length,
    acceptanceClaimed: state.entries[0].completion !== "published-local-removal" }, expected("C34"));
  assert.equal((await f.git(f.primary, ["ls-remote", "origin", "refs/heads/fix/task"])).split(/\s+/u)[0], head);
  assert.equal(state.entries[0].role, "local-removal");
  const prune = await pruneMergedBranches({ identity: f.identity, state, reader: { pages: async () => { throw new Error("retained refs must not enter remote pruning"); } } });
  assert.equal(prune.coverage.total, 0);
});

test("C36: unavailable fresh remote evidence retains checkout and both refs", async () => {
  const f = await fixture(), head = await f.git(f.path, ["rev-parse", "HEAD"]);
  const report = await removePublishedLocalWorktree({ ...f.options, git: async (cwd, args, options) => {
    if (args[0] === "ls-remote") throw new Error("offline"); return f.options.git(cwd, args, options);
  } });
  assert.deepEqual({ checkoutRemoved: !await exists(f.path), refsPreserved: await f.git(f.primary, ["rev-parse", "fix/task"]) === head,
    publicationBlockerReported: report.results[0].reason === "publication-evidence-unavailable" }, expected("C36"));
});

for (const hazard of cases.find(item => item.id === "C37").given.preservationHazards) {
  test(`C37: preservation hazard ${hazard} blocks only the named checkout without fallback`, async () => {
    const f = await fixture(); let preflight = f.options.preflight, path = f.path, cwd = f.primary;
    if (hazard === "dirty") await writeFile(join(f.path, "README.md"), "dirty private content\n");
    if (hazard === "untracked") await writeFile(join(f.path, "untracked.txt"), "private\n");
    if (hazard === "unknown-ignored") await writeFile(join(f.path, "unknown.log"), "private\n");
    if (hazard === "private-workspace") { await mkdir(join(f.path, ".private")); await writeFile(join(f.path, ".private", "secret.txt"), "fixture-only private sentinel\n"); }
    if (hazard === "KEEP") { await mkdir(join(f.path, ".artifacts")); await writeFile(join(f.path, ".artifacts", "KEEP"), "retain\n"); }
    if (hazard === "nested-Git") { await mkdir(join(f.path, "nested", ".git"), { recursive: true }); await writeFile(join(f.path, "nested", ".git", "config"), "fixture sentinel\n"); }
    if (hazard === "gitlink") await f.git(f.path, ["update-index", "--add", "--cacheinfo", `160000,${await f.git(f.path, ["rev-parse", "HEAD"])},nested`]);
    if (hazard === "unsafe-link") {
      const target = join(f.root, "external"); await mkdir(target); await writeFile(join(target, "data.txt"), "external fixture sentinel\n");
      await mkdir(join(f.path, ".artifacts")); await symlink(target, join(f.path, ".artifacts", "escape"), process.platform === "win32" ? "junction" : "dir");
    }
    if (hazard === "live-owner" || hazard === "unverifiable-owner") preflight = (identity, entry, options) => cleanupPreflight(identity, entry,
      { ...options, inspectProcesses: async () => [], inspectAttachment: async () => ({ reason: hazard === "live-owner" ? "attached-session" : "attached-session-unverifiable" }) });
    if (hazard === "primary-or-current-directory") cwd = f.path;
    const before = await readFile(join(f.path, "README.md"), "utf8");
    const report = await removePublishedLocalWorktree({ ...f.options, path, cwd, preflight });
    assert.equal(report.results[0].disposition, "blocked", JSON.stringify(report));
    assert.deepEqual({ checkoutRemoved: !await exists(f.path), privateExportCalls: f.calls.filter(args => args[0] === "export").length,
      forceRemovalCalls: f.calls.filter(args => args.includes("--force") || args.includes("-f")).length,
      processTerminationCalls: f.calls.filter(args => args[0] === "kill").length,
      userDataPreserved: await readFile(join(f.path, "README.md"), "utf8") === before }, expected("C37"));
    assert.equal(f.calls.filter(args => args[0] === "worktree" && args[1] === "remove").length, 0);
  });
}

test("C38: a tracked regular gitmodules file without actual submodule configuration is ordinary content", async () => {
  const f = await fixture();
  await writeFile(join(f.path, ".gitmodules"), "# Not a configured submodule\n");
  await f.git(f.path, ["add", ".gitmodules"]); await f.git(f.path, ["commit", "-m", "ordinary metadata"]); await f.git(f.path, ["push", "origin", "fix/task"]);
  const report = await removePublishedLocalWorktree({ ...f.options, preflightOnly: true });
  assert.equal(report.results[0].disposition, "eligible", JSON.stringify(report));
  assert.deepEqual({ blockedSolelyByGitmodules: report.results[0].reason === "nested-repository" }, expected("C38"));
  assert.equal((await f.store.read()).entries.length, 0);
});

test("new ownership at the final preservation check retains the checkout and never sweeps another candidate", async () => {
  const f = await fixture(); let inspections = 0;
  const unrelated = join(f.primary, ".worktrees", "unrelated"); await f.git(f.primary, ["worktree", "add", "-b", "fix/unrelated", unrelated]);
  const report = await removePublishedLocalWorktree({ ...f.options, preflight: (identity, entry, options) => cleanupPreflight(identity, entry,
    { ...options, inspectProcesses: async () => [], inspectAttachment: async () => ++inspections > 1 ? { reason: "attached-session" } : null }) });
  assert.equal(report.results[0].reason, "attached-session"); assert.equal(await exists(f.path), true); assert.equal(await exists(unrelated), true);
  assert.ok(!f.calls.some(args => args[0] === "push" || args[0] === "update-ref"));
});

test("C41: interrupted removal cannot delete a recreated checkout or retained ref", async () => {
  const f = await fixture();
  const first = await removePublishedLocalWorktree({ ...f.options, remove: async (identity, entry, git) => {
    await git(identity.primary, ["worktree", "remove", entry.path]); throw new Error("response lost");
  } });
  assert.equal(first.results[0].disposition, "partial");
  await f.git(f.primary, ["worktree", "add", f.path, "fix/task"]); await writeFile(join(f.path, "new-owner.txt"), "new owner\n");
  const head = await f.git(f.primary, ["rev-parse", "fix/task"]), second = await removePublishedLocalWorktree(f.options);
  assert.ok(["partial", "blocked"].includes(second.results[0].disposition));
  assert.deepEqual({ recreatedCheckoutPreserved: await readFile(join(f.path, "new-owner.txt"), "utf8") === "new owner\n",
    retainedRefsPreserved: await f.git(f.primary, ["rev-parse", "fix/task"]) === head }, expected("C41"));
});

test("CLI exact remove-local preflight and execution retain refs without requiring GitHub CI or PR APIs", async () => {
  const f = await fixture(), script = fileURLToPath(new URL("../../scripts/governance/local-worktree-cleanup.mjs", import.meta.url));
  const args = [script, "remove-local", "--repo", f.primary, "--path", f.path, "--confirm-local-removal"];
  const preflight = JSON.parse((await execute(process.execPath, [...args, "--preflight"], { cwd: f.primary, timeout: 120_000 })).stdout);
  assert.equal(preflight.results[0].disposition, "eligible"); assert.equal(await exists(f.path), true);
  assert.equal((await f.store.read()).entries.length, 0);
  const report = JSON.parse((await execute(process.execPath, args, { cwd: f.primary, timeout: 120_000 })).stdout);
  assert.equal(report.results[0].disposition, "removed"); assert.equal(await exists(f.path), false);
  assert.equal(await f.git(f.primary, ["rev-parse", "fix/task"]), report.results[0].localHead);
});

test("interrupted successful Git removal settles idempotently without ref deletion", async () => {
  const f = await fixture();
  await removePublishedLocalWorktree({ ...f.options, remove: async (identity, entry, git) => {
    await git(identity.primary, ["worktree", "remove", entry.path]); throw new Error("response lost");
  } });
  const second = await removePublishedLocalWorktree(f.options);
  assert.equal(second.results[0].disposition, "removed", JSON.stringify(second));
  assert.equal((await removePublishedLocalWorktree(f.options)).results[0].disposition, "already-absent");
  assert.ok(!f.calls.some(args => args[0] === "update-ref" || args[0] === "push"));
});
