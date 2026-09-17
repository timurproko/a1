import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, rename, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { execFile, execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { promisify } from "node:util";
import { atomicJson, createStateStore, registerEntry, transitionEntry, validateState, digest } from "../../scripts/governance/local-cleanup-state.mjs";
import { canonical, captureWorktree, discoverRepository, inspectWorktree, exists, gitRunner, removeLocalRef, removeRemoteRef, removeWorktree } from "../../scripts/governance/local-cleanup-git.mjs";
import { reconcileLocalCleanup } from "../../scripts/governance/local-cleanup-reconcile.mjs";
import { completeLocalCleanup, handoffLocalCleanup, COMPLETION_DISPOSABLE_PATHS } from "../../scripts/governance/local-cleanup-complete.mjs";
import { pruneMergedBranches } from "../../scripts/governance/local-cleanup-branches.mjs";
import { sweepLines } from "../../scripts/governance/local-worktree-cleanup.mjs";
import { discardLocalCleanup } from "../../scripts/governance/local-cleanup-discard.mjs";

const owner = "fixture-owner-token-at-least-32-characters";
const execFileAsync = promisify(execFile);
async function git(cwd, ...args) { return (await execFileAsync("git", ["-C", cwd, ...args], { encoding: "utf8", windowsHide: true })).stdout.trim(); }
async function fixture(t, branch = false, registered = true) {
  const temporary = await canonical(await mkdtemp(join(tmpdir(), "local-cleanup-")));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const primary = join(temporary, "primary"); await mkdir(primary);
  await git(primary, "init", "-b", "develop"); await git(primary, "config", "core.autocrlf", "false"); await git(primary, "config", "user.name", "Fixture"); await git(primary, "config", "user.email", "fixture@example.invalid");
  await writeFile(join(primary, "tracked.txt"), "base\n");
  await mkdir(join(primary, "vendor")); await writeFile(join(primary, "vendor", ".gitmodules"), "");
  await mkdir(join(primary, "node_modules-cache")); await writeFile(join(primary, "node_modules-cache", "tracked.txt"), "ordinary content\n");
  await writeFile(join(primary, ".gitignore"), "node_modules/\nsecret.txt\n/.artifacts/\n/.artifacts-user/\n/artifacts/\n.builds/\ndist/\n/native/process-guardian/target/\n/native/terminal-host/target/\n/target/\n/native/other/target/\n/native/process-guardian/target-user/\n");
  await git(primary, "add", "."); await git(primary, "commit", "-m", "fixture"); await git(primary, "remote", "add", "origin", "https://github.com/owner/repo.git");
  const path = join(primary, ".worktrees", "example");
  await git(primary, "worktree", "add", ...(branch ? ["-b", "feature/example"] : ["--detach"]), path);
  const identity = await discoverRepository(primary), store = createStateStore(identity), snapshot = await captureWorktree(identity, path);
  let entry = null;
  if (registered) await store.locked(async (state, save) => {
    entry = registerEntry(state, { ...snapshot, change: "example", sourcePr: 20, candidatePr: 20, role: "implementation", disposable: [] }, owner);
    transitionEntry(entry, "release", owner, entry.generation); await save(state);
  });
  const verify = async () => ({ disposition: "eligible", sourcePr: 20, sourceHead: snapshot.head, sourceMerge: snapshot.head, archivePr: 21, archiveMerge: snapshot.head, targetSha: snapshot.head, refs: [] });
  const realGit = gitRunner();
  const boundedGit = async (cwd, args, options) => ["fetch", "merge-base"].includes(args[0]) ? "" : realGit(cwd, args, options);
  // Rationale: ancestry is answered by the temporary repository itself, standing in for the GitHub compare the reader performs.
  const ancestorOf = async (sha, head) => { try { await git(primary, "merge-base", "--is-ancestor", sha, head); return true; } catch { return false; } };
  const pass = (options = {}) => reconcileLocalCleanup({ identity, store, reader: {}, cwd: primary, verify, git: boundedGit, ancestorOf, ...options });
  return { identity, store, entry, snapshot, path, primary, temporary, pass, verify, boundedGit, ancestorOf };
}

// Performance: every case owns a private temporary repository, so cases run concurrently instead of
// serially; a bounded width keeps Git and child-process load predictable on shared runners.
describe("local cleanup", { concurrency: 4 }, () => {

test("registration rejects duplicate paths, malformed state and cross-repository identity", async t => {
  const f = await fixture(t); const state = await f.store.read();
  assert.throws(() => validateState({ ...state, version: 9 }, f.identity), /state-schema/);
  assert.throws(() => validateState(state, { ...f.identity, repository: "other/repo" }), /state-schema/);
  const input = { ...f.entry }; for (const key of ["id", "generation", "state", "ownerHash", "step"]) delete input[key];
  assert.throws(() => registerEntry(state, input, owner), /duplicate/);
  assert.throws(() => registerEntry(state, { ...input, ref: "refs/heads/develop" }, owner), /registration-schema/);
  assert.throws(() => registerEntry(state, { ...input, disposable: ["target"] }, owner), /registration-schema/);
  assert.throws(() => registerEntry(state, { ...input, disposable: ["native/other/target"] }, owner), /registration-schema/);
});

test("ownership is generation-bound and cannot expire or be stolen", async t => {
  const f = await fixture(t), entry = structuredClone(f.entry);
  transitionEntry(entry, "claim", owner, entry.generation);
  assert.throws(() => transitionEntry(entry, "claim", "new-owner-token-at-least-32-characters", entry.generation), /owned-worktree/);
  assert.throws(() => transitionEntry(entry, "release", owner, randomUUID()), /generation-changed/);
  assert.throws(() => transitionEntry(entry, "release", "wrong-owner-token-at-least-32-characters", entry.generation), /owner-mismatch/);
  transitionEntry(entry, "recover", owner, entry.generation); assert.equal(entry.state, "owned");
});

test("atomic state writes preserve identity and unresolved journals over restart", async t => {
  const f = await fixture(t); const reopened = createStateStore(f.identity);
  assert.equal((await reopened.read()).entries[0].id, f.entry.id);
  await f.store.locked(async (state, save) => {
    const previous = await readFile(join(f.store.directory, "state.json"), "utf8");
    state.version = 99; await assert.rejects(save(state), /state-schema/);
    assert.equal(await readFile(join(f.store.directory, "state.json"), "utf8"), previous);
  });
});

test("failed atomic replacement retains the previous complete journal", async t => {
  const f = await fixture(t), path = join(f.store.directory, "state.json");
  const before = await readFile(path, "utf8");
  await assert.rejects(atomicJson(path, { incomplete: true }, async () => { throw Error("replacement-failed"); }), /replacement-failed/);
  assert.equal(await readFile(path, "utf8"), before);
  assert.equal((await f.store.read()).entries[0].id, f.entry.id);
});

test("CLI registration, ownership, recovery, preview and enable controls use the documented surface", async t => {
  const f = await fixture(t);
  await f.store.locked(async (state, save) => { transitionEntry(state.entries[0], "claim", owner, state.entries[0].generation); await save(state); });
  const cli = fileURLToPath(new URL("../../scripts/governance/local-worktree-cleanup.mjs", import.meta.url));
  const invoke = (...args) => execFileSync(process.execPath, [cli, ...args, "--repo", f.primary], {
    cwd: f.primary, env: { ...process.env, LOCAL_CLEANUP_OWNER_TOKEN: owner, GH_TOKEN: "fixture-unused-token" }, encoding: "utf8",
  });
  const help = invoke("--help"); assert.match(help, /complete/); assert.match(help, /discard/); assert.match(help, /confirm-closed-unmerged/);
  assert.match(help, /\.artifacts,/); assert.match(help, /native\/process-guardian\/target/);
  assert.match(help, /native\/terminal-host\/target/); assert.equal(COMPLETION_DISPOSABLE_PATHS.includes(".artifacts"), true);
  assert.equal(COMPLETION_DISPOSABLE_PATHS.includes(".artifacts/validation"), false);
  assert.equal(COMPLETION_DISPOSABLE_PATHS.includes("target"), false); assert.equal(COMPLETION_DISPOSABLE_PATHS.includes("native\/*\/target"), false);
  const other = join(f.identity.root, "registered"); await git(f.primary, "worktree", "add", "--detach", other);
  let record = JSON.parse(invoke("register", "--path", other, "--change", "example", "--source-pr", "20", "--candidate-pr", "20", "--role", "implementation", "--disposable", "node_modules"));
  assert.equal(record.state, "owned");
  const before = await readFile(join(f.store.directory, "state.json"), "utf8");
  assert.ok(JSON.parse(invoke("preview")).results.every(row => row.reason === "owned-worktree"));
  assert.equal(await readFile(join(f.store.directory, "state.json"), "utf8"), before);
  record = JSON.parse(invoke("release", "--id", record.id, "--generation", record.generation)); assert.equal(record.state, "released");
  record = JSON.parse(invoke("claim", "--id", record.id, "--generation", record.generation)); assert.equal(record.state, "owned");
  record = JSON.parse(invoke("recover", "--id", record.id, "--generation", record.generation, "--confirm-stopped")); assert.equal(record.state, "owned");
  invoke("enable"); assert.equal(JSON.parse(invoke("status")).enabled, true);
  invoke("disable"); assert.equal(JSON.parse(invoke("status")).stopped, true);
  assert.throws(() => invoke("complete", "--path", other, "--change", "example"), /completion-arguments/);
  assert.throws(() => invoke("complete", "--path", other, "--change", "example", "--pr", "20", "--source-pr", "21"), /completion-arguments/);
  assert.throws(() => invoke("discard", "--path", other, "--change", "example", "--pr", "20"), /discard-arguments/);
  assert.throws(() => invoke("register", "--path", other, "--change", "example", "--source-pr", "20", "--candidate-pr", "20", "--role", "discard"), /registration-role/);
  assert.equal(JSON.parse(invoke("watch")).error, "cleanup-disabled");
  assert.equal(invoke("status").includes(digest(owner)), false);
});

test("complete registers one exact candidate, applies central disposables, and is idempotent", async t => {
  const f = await fixture(t, true, false);
  const unrelatedPath = join(f.identity.root, "unrelated"); await git(f.primary, "worktree", "add", "--detach", unrelatedPath);
  const unrelatedSnapshot = await captureWorktree(f.identity, unrelatedPath);
  await f.store.locked(async (state, save) => {
    const unrelated = registerEntry(state, { ...unrelatedSnapshot, change: "unrelated", sourcePr: 21, candidatePr: 21,
      role: "implementation", disposable: [] }, owner);
    transitionEntry(unrelated, "release", owner, unrelated.generation); await save(state);
  });
  await mkdir(join(f.path, "node_modules")); await writeFile(join(f.path, "node_modules", "generated"), "fixture");
  await mkdir(join(f.path, ".artifacts", "openspec-archive"), { recursive: true });
  await writeFile(join(f.path, ".artifacts", "openspec-archive", "report.json"), "{}");
  await mkdir(join(f.path, ".artifacts", "validation"), { recursive: true });
  await writeFile(join(f.path, ".artifacts", "validation", "impact.json"), "{\"selection\":true}");
  await writeFile(join(f.path, ".artifacts", "validation", "code-documentation.json"), "{\"passed\":true}");
  await mkdir(join(f.path, ".artifacts", "final-package")); await writeFile(join(f.path, ".artifacts", "final-package", "pack.json"), "{}");
  await writeFile(join(f.path, ".artifacts", "run-35072062726-core.log"), "agent log");
  const options = { identity: f.identity, store: f.store, reader: {}, path: f.path, change: "example", sourcePr: 20,
    cwd: f.primary, reconcileOptions: { verify: f.verify, git: f.boundedGit } };
  const report = await completeLocalCleanup(options);
  assert.equal(report.results.length, 1, JSON.stringify(report));
  assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
  assert.equal(JSON.stringify(report).includes(owner), false); assert.equal(JSON.stringify(report).includes("fixture"), false);
  assert.equal(await exists(f.path), false); assert.equal(await exists(unrelatedPath), true);
  const state = await f.store.read(), completed = state.entries.find(item => item.change === "example");
  assert.deepEqual(completed.disposable, [...COMPLETION_DISPOSABLE_PATHS]);
  assert.equal(completed.state, "done"); assert.equal(state.enabled, false);
  const repeated = await completeLocalCleanup(options);
  assert.equal(repeated.results.length, 1); assert.equal(repeated.results[0].disposition, "already-absent");
});

test("complete blocks unknown ignored content and conflicting ownership", async t => {
  let f = await fixture(t, false, false); await writeFile(join(f.path, "secret.txt"), "preserve");
  await mkdir(join(f.path, "node_modules-user")); await writeFile(join(f.path, "node_modules-user", "data"), "preserve-near-match");
  const options = { identity: f.identity, store: f.store, reader: {}, path: f.path, change: "example", sourcePr: 20,
    cwd: f.primary, reconcileOptions: { verify: f.verify, git: f.boundedGit } };
  const blocked = await completeLocalCleanup(options);
  assert.equal(blocked.results[0].reason, "worktree-content"); assert.equal(await readFile(join(f.path, "secret.txt"), "utf8"), "preserve");
  assert.equal(await readFile(join(f.path, "node_modules-user", "data"), "utf8"), "preserve-near-match");
  f = await fixture(t);
  await f.store.locked(async (state, save) => { transitionEntry(state.entries[0], "claim", owner, state.entries[0].generation); await save(state); });
  await assert.rejects(completeLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, cwd: f.primary }), /owned-worktree/);
  await assert.rejects(completeLocalCleanup({ ...options, identity: f.identity, store: f.store, path: f.path,
    change: "different" }), /completion-registration-conflict/);
});

test("complete accepts only the two exact native Cargo output roots", async t => {
  for (const root of ["native/process-guardian/target", "native/terminal-host/target"]) {
    const f = await fixture(t, true, false), directory = join(f.path, ...root.split("/"));
    await mkdir(join(directory, "release", "deps"), { recursive: true });
    await writeFile(join(directory, "release", "deps", "artifact.rlib"), "generated");
    const report = await completeLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
      change: "example", sourcePr: 20, cwd: f.primary, reconcileOptions: { verify: f.verify, git: f.boundedGit } });
    assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
    assert.equal(await exists(f.path), false);
  }
});

test("complete blocks arbitrary, sibling, and near-match native target roots", async t => {
  for (const root of ["target", "native/other/target", "native/process-guardian/target-user"]) {
    const f = await fixture(t, false, false), directory = join(f.path, ...root.split("/"));
    await mkdir(directory, { recursive: true }); await writeFile(join(directory, "artifact"), "preserve");
    const blocked = await completeLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
      change: "example", sourcePr: 20, cwd: f.primary, reconcileOptions: { verify: f.verify, git: f.boundedGit } });
    assert.equal(blocked.results[0].reason, "worktree-content", JSON.stringify(blocked));
    assert.ok(blocked.results[0].paths.some(path => path === root || path.startsWith(`${root}/`)), JSON.stringify(blocked));
    assert.equal(await readFile(join(directory, "artifact"), "utf8"), "preserve");
  }
});

test("complete blocks near-match artifact roots and boundary crossings inside the artifact root", async t => {
  for (const root of [".artifacts-user", "artifacts"]) {
    const f = await fixture(t, false, false), directory = join(f.path, root);
    await mkdir(directory, { recursive: true }); await writeFile(join(directory, "report.json"), "preserve");
    const blocked = await completeLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
      change: "example", sourcePr: 20, cwd: f.primary, reconcileOptions: { verify: f.verify, git: f.boundedGit } });
    assert.equal(blocked.results[0].reason, "worktree-content", JSON.stringify(blocked));
    assert.ok(blocked.results[0].paths.some(path => path === root || path.startsWith(`${root}/`)), JSON.stringify(blocked));
    assert.equal(await readFile(join(directory, "report.json"), "utf8"), "preserve");
  }
  const f = await fixture(t, false, false);
  await mkdir(join(f.path, ".artifacts")); await writeFile(join(f.path, ".artifacts", "run.log"), "keep");
  await symlink(f.primary, join(f.path, ".artifacts", "escape"), process.platform === "win32" ? "junction" : "dir");
  const linked = await completeLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, cwd: f.primary, reconcileOptions: { verify: f.verify, git: f.boundedGit } });
  assert.equal(linked.results[0].reason, "content-link", JSON.stringify(linked));
  assert.equal(await readFile(join(f.path, ".artifacts", "run.log"), "utf8"), "keep");
});

test("legacy artifact subroot registrations are widened to the artifact root", async t => {
  const f = await fixture(t, false, false);
  await f.store.locked(async (state, save) => {
    const entry = registerEntry(state, { ...f.snapshot, change: "example", sourcePr: 20, candidatePr: 20, role: "implementation",
      disposable: [".artifacts/validation"] }, owner);
    transitionEntry(entry, "release", owner, entry.generation); await save(state);
  });
  await mkdir(join(f.path, ".artifacts", "validation"), { recursive: true }); await writeFile(join(f.path, ".artifacts", "validation", "impact.json"), "{}");
  await writeFile(join(f.path, ".artifacts", "stray.log"), "agent log");
  const report = await completeLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, cwd: f.primary, reconcileOptions: { verify: f.verify, git: f.boundedGit } });
  assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
  const entry = (await f.store.read()).entries[0];
  assert.ok(entry.disposable.includes(".artifacts")); assert.ok(entry.disposable.includes(".artifacts/validation"));
});

test("a released worktree deleted by hand completes through its journal", async t => {
  for (const pruned of [false, true]) {
    const f = await fixture(t, true); await f.store.enable();
    await rm(f.path, { recursive: true, force: true });
    if (pruned) await git(f.primary, "worktree", "prune");
    else assert.match(await git(f.primary, "worktree", "list", "--porcelain"), /prunable/);
    const preview = await f.pass(); assert.equal(preview.results[0].disposition, "eligible", JSON.stringify(preview));
    assert.equal((await f.store.read()).entries[0].step, "none");
    const report = await f.pass({ preview: false });
    assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
    assert.deepEqual(report.results[0].steps, ["worktree-already-absent", "local-ref-removed"]);
    assert.doesNotMatch(await git(f.primary, "worktree", "list", "--porcelain"), /prunable/);
    assert.equal(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
    const entry = (await f.store.read()).entries[0]; assert.equal(entry.state, "done"); assert.equal(entry.step, "complete");
    assert.equal((await f.pass()).results[0].disposition, "already-absent");
  }
});

test("complete finishes a hand-deleted registration and refuses an unregistered absent path", async t => {
  const f = await fixture(t, true, false);
  const options = { identity: f.identity, store: f.store, reader: {}, path: f.path, change: "example", sourcePr: 20,
    cwd: f.primary, reconcileOptions: { verify: f.verify, git: f.boundedGit } };
  await f.store.locked(async (state, save) => {
    const entry = registerEntry(state, { ...f.snapshot, change: "example", sourcePr: 20, candidatePr: 20, role: "implementation", disposable: [] }, owner);
    transitionEntry(entry, "release", owner, entry.generation); await save(state);
  });
  await rm(f.path, { recursive: true, force: true });
  const report = await completeLocalCleanup(options);
  assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
  assert.deepEqual(report.results[0].steps, ["worktree-already-absent", "local-ref-removed"]);
  const g = await fixture(t, true); await g.store.enable();
  await rm(g.path, { recursive: true, force: true }); await git(g.primary, "worktree", "add", "-f", "--detach", g.path);
  const reused = await g.pass({ preview: false });
  assert.equal(reused.results[0].disposition, "blocked"); assert.equal(reused.results[0].reason, "worktree-identity-changed");
  assert.equal(await readFile(join(g.path, "tracked.txt"), "utf8"), "base\n");
  const missing = join(f.identity.root, "never-registered");
  await assert.rejects(completeLocalCleanup({ ...options, path: missing, change: "other", sourcePr: 21 }), /worktree-absent-unregistered/);
  assert.equal((await f.store.read()).entries.some(entry => entry.path.endsWith("never-registered")), false);
});

test("expected-SHA remote deletion uses a lease and verifies absence", async () => {
  const entry = { ref: "refs/heads/fix/rejected", head: "a".repeat(40) }, identity = { primary: "C:/repo", remote: "origin" };
  const calls = []; let present = true;
  const git = async (_cwd, args) => {
    calls.push(args);
    if (args[0] === "ls-remote") return present ? `${entry.head}\t${entry.ref}\n` : "";
    if (args[0] === "push") { present = false; return ""; }
    throw Error("unexpected git call");
  };
  assert.equal(await removeRemoteRef(identity, entry, git), "removed");
  assert.deepEqual(calls[1], ["push", `--force-with-lease=${entry.ref}:${entry.head}`, "origin", `:${entry.ref}`]);
  assert.equal(await removeRemoteRef(identity, entry, git), "already-absent");
  present = true;
  await assert.rejects(removeRemoteRef(identity, { ...entry, head: "b".repeat(40) }, git), /remote-ref-advanced/);
  await assert.rejects(removeRemoteRef(identity, { ...entry, ref: "refs/heads/release/1" }, git), /remote-ref-unsafe/);
  await assert.rejects(removeRemoteRef(identity, entry, async () => "malformed"), /remote-ref-identity/);
  await assert.rejects(removeRemoteRef(identity, entry, async () => { throw Error("authentication failed with PRIVATE"); }), /authentication/);
});

function discardHarness(f, remote = { present: true }) {
  const verify = async (_reader, entry) => ({ disposition: "eligible", sourcePr: entry.sourcePr, sourceHead: entry.head,
    ref: entry.ref.slice("refs/heads/".length), expectedSha: entry.head, actualSha: remote.present ? entry.head : undefined,
    remoteRefPresent: remote.present });
  const removeRemote = async () => { if (!remote.present) return "already-absent"; remote.present = false; return "removed"; };
  return { verify, removeRemote, remote };
}

test("discard removes only one exact rejected remote ref, worktree and local ref", async t => {
  const f = await fixture(t, true, false), unrelated = join(f.identity.root, "unrelated");
  await git(f.primary, "worktree", "add", "--detach", unrelated);
  const d = discardHarness(f);
  const report = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: true, cwd: f.primary, git: f.boundedGit, verify: d.verify, removeRemote: d.removeRemote });
  assert.equal(report.results[0].disposition, "discarded", JSON.stringify(report));
  assert.deepEqual(report.results[0].steps, ["remote-ref-removed", "worktree-removed", "local-ref-removed"]);
  assert.equal(d.remote.present, false); assert.equal(await exists(f.path), false); assert.equal(await exists(unrelated), true);
  assert.equal(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
  const repeated = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: true, cwd: f.primary, git: f.boundedGit, verify: d.verify, removeRemote: d.removeRemote });
  assert.equal(repeated.results[0].disposition, "already-discarded", JSON.stringify(repeated));
  await git(f.primary, "worktree", "add", "--detach", f.path);
  const reused = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: true, cwd: f.primary, git: f.boundedGit, verify: d.verify, removeRemote: d.removeRemote });
  assert.equal(reused.results[0].reason, "residual-or-reused-path");
});

test("discard inspects locally before remote mutation and retains partial state after remote deletion", async t => {
  let f = await fixture(t, true, false), d = discardHarness(f), remoteCalls = 0;
  await writeFile(join(f.path, "secret.txt"), "preserve");
  let report = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: true, cwd: f.primary, git: f.boundedGit, verify: d.verify,
    removeRemote: async (...args) => { remoteCalls++; return d.removeRemote(...args); } });
  assert.equal(report.results[0].reason, "worktree-content"); assert.equal(remoteCalls, 0); assert.equal(d.remote.present, true);

  f = await fixture(t, true, false); d = discardHarness(f); let inspections = 0;
  report = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: true, cwd: f.primary, git: f.boundedGit, verify: d.verify, removeRemote: d.removeRemote,
    inspect: async (...args) => ++inspections === 1 ? inspectWorktree(...args) : { clean: false, reason: "worktree-content", paths: ["late"] } });
  assert.equal(report.results[0].disposition, "partial", JSON.stringify(report));
  assert.equal(report.results[0].reason, "worktree-content"); assert.equal(d.remote.present, false); assert.equal(await exists(f.path), true);
  assert.notEqual(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
});

test("discard journals interruption, refuses reopened PRs, and is never queue-evaluated", async t => {
  let f = await fixture(t, true, false), d = discardHarness(f), verifies = 0;
  const reopened = async (...args) => { if (++verifies >= 3) throw Object.assign(Error("discard-source-association"), { cleanupCode: "discard-source-association" }); return d.verify(...args); };
  let report = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: true, cwd: f.primary, git: f.boundedGit, verify: reopened, removeRemote: d.removeRemote });
  assert.equal(report.results[0].disposition, "partial"); assert.equal(report.results[0].reason, "discard-source-association");
  assert.equal(await exists(f.path), true); assert.equal(d.remote.present, false);
  report = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: true, cwd: f.primary, git: f.boundedGit, verify: d.verify, removeRemote: d.removeRemote });
  assert.equal(report.results[0].disposition, "discarded", JSON.stringify(report));
  assert.ok(report.results[0].steps.includes("remote-ref-already-absent"), JSON.stringify(report));

  f = await fixture(t, true, false); d = discardHarness(f);
  report = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: true, cwd: f.primary, git: f.boundedGit, verify: d.verify, removeRemote: d.removeRemote,
    remove: async () => { throw Error("simulated Windows lock"); } });
  assert.equal(report.results[0].disposition, "partial"); assert.equal((await f.store.read()).entries[0].step, "remove-intent");
  assert.equal(await exists(f.path), true); assert.equal(d.remote.present, false);
  assert.equal((await f.pass()).coverage.total, 0, "queue preview must ignore discard entries");
});

test("discard confirmation, ownership, current worktree and mutation lock fail closed", async t => {
  let f = await fixture(t, true, false), d = discardHarness(f), calls = 0;
  let report = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: false, cwd: f.primary, git: f.boundedGit, verify: d.verify,
    removeRemote: async () => { calls++; } });
  assert.equal(report.results[0].reason, "discard-confirmation-required"); assert.equal(calls, 0);
  report = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: true, cwd: f.path, git: f.boundedGit, verify: d.verify,
    removeRemote: async () => { calls++; } });
  assert.equal(report.results[0].reason, "current-worktree"); assert.equal(calls, 0);

  f = await fixture(t, true); d = discardHarness(f);
  await f.store.locked(async (state, save) => { transitionEntry(state.entries[0], "claim", owner, state.entries[0].generation); await save(state); });
  report = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, confirmed: true, cwd: f.primary, git: f.boundedGit, verify: d.verify, removeRemote: d.removeRemote });
  assert.equal(report.results[0].reason, "owned-worktree"); assert.equal(d.remote.present, true);
  await f.store.locked(async () => {
    const busy = await discardLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
      change: "example", sourcePr: 20, confirmed: true, cwd: f.primary, git: f.boundedGit, verify: d.verify, removeRemote: d.removeRemote });
    assert.equal(busy.results[0].reason, "mutation-busy");
  });
});

test("complete rejects primary, current, and cross-root candidates", async t => {
  let f = await fixture(t, false, false);
  await assert.rejects(completeLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.primary,
    change: "example", sourcePr: 20, cwd: f.primary }), /worktree-path/);
  const current = await completeLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: f.path,
    change: "example", sourcePr: 20, cwd: f.path, reconcileOptions: { verify: f.verify, git: f.boundedGit } });
  assert.equal(current.results[0].reason, "current-worktree"); assert.equal(await exists(f.path), true);
  f = await fixture(t, false, false);
  const outside = await canonical(await mkdtemp(join(tmpdir(), "outside-cleanup-"))); t.after(() => rm(outside, { recursive: true, force: true }));
  await assert.rejects(completeLocalCleanup({ identity: f.identity, store: f.store, reader: {}, path: outside,
    change: "example", sourcePr: 20, cwd: f.primary }), /worktree-path/);
});

test("another unavailable worktree's registration is never pruned", async t => {
  const f = await fixture(t); await f.store.enable();
  const other = join(f.identity.root, "unavailable"); await git(f.primary, "worktree", "add", "--detach", other);
  await rm(other, { recursive: true, force: true });
  assert.equal((await f.pass({ preview: false })).results[0].disposition, "removed");
  assert.ok((await git(f.primary, "worktree", "list", "--porcelain")).includes("unavailable"));
});

test("report retention is bounded without evicting unresolved state or unrelated files", async t => {
  const f = await fixture(t); await f.store.enable();
  const old = join(f.store.directory, `report-0-${randomUUID()}.json`);
  const large = join(f.store.directory, `report-1-${randomUUID()}.json`);
  const unrelated = join(f.store.directory, "manual-review-notes");
  await writeFile(old, "{}"); await utimes(old, 0, 0);
  await writeFile(large, "x".repeat(11 * 1024 * 1024)); await writeFile(unrelated, "preserve");
  await f.pass({ preview: false, verify: async () => ({ disposition: "pending", reason: "archive-pending" }) });
  assert.equal(await exists(old), false); assert.equal(await exists(large), false);
  assert.equal((await f.store.read()).entries[0].id, f.entry.id);
  assert.equal(await readFile(unrelated, "utf8"), "preserve"); assert.equal(await exists(f.path), true);
});

test("completed paths report absence and need fresh registration after reuse", async t => {
  const f = await fixture(t); await f.store.enable(); await f.pass({ preview: false });
  assert.equal((await f.pass()).results[0].disposition, "already-absent");
  await git(f.primary, "worktree", "add", "--detach", f.path);
  assert.equal((await f.pass()).results[0].reason, "residual-or-reused-path");
  const snapshot = await captureWorktree(f.identity, f.path);
  await f.store.locked(async (state, save) => {
    const entry = registerEntry(state, { ...snapshot, change: "example", sourcePr: 20, candidatePr: 20, role: "implementation", disposable: [] }, owner);
    assert.notEqual(entry.id, f.entry.id); assert.equal(entry.state, "owned"); await save(state);
  });
});

test("a dead holder's silent lock is evicted once, journaled, and a live or fresh lock is kept", async t => {
  const f = await fixture(t), lock = join(f.store.directory, "mutation.lock");
  await f.store.locked(async () => {
    await assert.rejects(f.store.locked(() => {}), /mutation-busy/);
    const record = JSON.parse(await readFile(lock, "utf8"));
    assert.equal(record.pid, process.pid); assert.equal(record.version, 2); assert.ok(Number.isFinite(record.heartbeatAt));
  });
  assert.equal(await exists(lock), false);
  const dead = { version: 2, pid: 9999999, nonce: "x", startedAt: 0, heartbeatAt: 0 };
  await writeFile(lock, JSON.stringify({ ...dead, heartbeatAt: Date.now() }));
  await assert.rejects(f.store.locked(() => {}), /mutation-busy/);
  await writeFile(lock, JSON.stringify({ ...dead, pid: process.pid }));
  await assert.rejects(f.store.locked(() => {}), /mutation-busy/);
  await writeFile(lock, JSON.stringify(dead));
  let ran = false; await f.store.locked(async () => { ran = true; }); assert.equal(ran, true);
  assert.equal(await exists(lock), false);
  const notes = (await readdir(f.store.directory)).filter(name => name.startsWith("lock-evicted-"));
  assert.equal(notes.length, 1); const note = JSON.parse(await readFile(join(f.store.directory, notes[0]), "utf8"));
  assert.equal(note.lock.pid, 9999999); assert.equal(note.evictedBy, process.pid);
  await writeFile(lock, '{"version":1,"pid":9999999,"nonce":"legacy"}'); const old = new Date(Date.now() - 600000); await utimes(lock, old, old);
  ran = false; await f.store.locked(async () => { ran = true; }); assert.equal(ran, true, "a legacy lock is judged by its mtime");
  await writeFile(lock, "not json"); const fresh = new Date(); await utimes(lock, fresh, fresh);
  await assert.rejects(f.store.locked(() => {}), /mutation-busy/, "an unreadable fresh lock is busy");
});

test("preview and disabled execution preserve local refs, files and state", async t => {
  const f = await fixture(t, true), file = join(f.store.directory, "state.json");
  const before = await readFile(file, "utf8"), refs = await git(f.primary, "show-ref");
  const preview = await f.pass(); assert.equal(preview.results[0].disposition, "eligible");
  assert.equal(await readFile(file, "utf8"), before); assert.equal(await git(f.primary, "show-ref"), refs);
  const disabled = await f.pass({ preview: false }); assert.equal(disabled.error, "cleanup-disabled");
  assert.equal(await exists(f.path), true); assert.equal(await readFile(file, "utf8"), before);
});

test("merged archive removes a released clean worktree and exact local ref", async t => {
  const f = await fixture(t, true); await f.store.enable();
  const report = await f.pass({ preview: false }); assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
  assert.equal(await exists(f.path), false); assert.equal(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
  assert.equal((await f.store.read()).entries[0].state, "done");
  assert.equal((await f.pass({ preview: false })).coverage.total, 0);
});

test("pending archive, active ownership, and unmanaged directories stay untouched", async t => {
  const f = await fixture(t); await f.store.enable();
  const pending = await f.pass({ preview: false, verify: async () => ({ disposition: "pending", reason: "archive-pending" }) });
  assert.equal(pending.results[0].disposition, "pending"); assert.equal(await exists(f.path), true);
  await f.store.locked(async (state, save) => { transitionEntry(state.entries[0], "claim", owner, state.entries[0].generation); await save(state); });
  await mkdir(join(f.identity.root, "unmanaged"));
  const report = await f.pass({ preview: false });
  assert.equal(report.results[0].reason, "owned-worktree"); assert.ok(report.results.some(row => row.disposition === "unmanaged"));
});

for (const kind of ["unstaged", "staged", "untracked", "ignored"]) test(`preserves ${kind} content`, async t => {
  const f = await fixture(t); await f.store.enable();
  const filename = kind === "ignored" ? "secret.txt" : kind === "untracked" ? "new.txt" : "tracked.txt";
  await writeFile(join(f.path, filename), "do not discard\n"); if (kind === "staged") await git(f.path, "add", filename);
  const report = await f.pass({ preview: false }); assert.equal(report.results[0].reason, "worktree-content");
  assert.equal(await readFile(join(f.path, filename), "utf8"), "do not discard\n");
});

test("assume-unchanged and swapped Git pointers cannot hide work", async t => {
  const f = await fixture(t); await f.store.enable();
  await git(f.path, "update-index", "--assume-unchanged", "tracked.txt"); await writeFile(join(f.path, "tracked.txt"), "hidden user work\n");
  assert.equal((await f.pass({ preview: false })).results[0].reason, "hidden-index-content");
  const other = join(f.identity.root, "other"); await git(f.primary, "worktree", "add", "--detach", other);
  await rm(join(f.path, ".git"));
  await writeFile(join(f.path, ".git"), await readFile(join(other, ".git")));
  await assert.rejects(captureWorktree(f.identity, f.path), /worktree-backlink/);
});

test("concurrent reconciler defers and ref recreation blocks the remaining deletion", async t => {
  const f = await fixture(t, true); await f.store.enable();
  await f.store.locked(async () => {
    assert.equal((await f.pass({ preview: false })).error, "mutation-busy"); assert.equal(await exists(f.path), true);
  });
  let calls = 0;
  const report = await f.pass({ preview: false, verify: async () => ++calls > 2 ? { disposition: "pending", reason: "remote-ref-present" } : f.verify() });
  assert.equal(report.results[0].disposition, "partial"); assert.equal(await exists(f.path), false);
  assert.notEqual(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
});

test("generated ignored paths require explicit registration policy", async t => {
  const f = await fixture(t); await mkdir(join(f.path, "node_modules")); await writeFile(join(f.path, "node_modules", "generated"), "fixture");
  assert.equal((await inspectWorktree(f.identity, f.entry, { cwd: f.primary })).clean, false);
  assert.equal((await inspectWorktree(f.identity, { ...f.entry, disposable: ["node_modules"] }, { cwd: f.primary })).clean, true);
  await mkdir(join(f.path, "node_modules", ".git"));
  await assert.rejects(inspectWorktree(f.identity, { ...f.entry, disposable: ["node_modules"] }, { cwd: f.primary }), /nested-repository/);
  await rm(join(f.path, "node_modules", ".git"), { recursive: true });
  const outside = join(f.temporary, "generated-link-target"); await mkdir(outside);
  await symlink(outside, join(f.path, "node_modules", "linked"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(inspectWorktree(f.identity, { ...f.entry, disposable: ["node_modules"] }, { cwd: f.primary }), /content-link/);
});

test("generated traversal has a separate bounded allowance from ordinary content", async t => {
  const f = await fixture(t), generated = join(f.path, "node_modules", "package");
  await mkdir(generated, { recursive: true });
  await Promise.all([0, 1, 2, 3].map(value => writeFile(join(generated, `${value}.txt`), "fixture")));
  const entry = { ...f.entry, disposable: ["node_modules"] };
  assert.equal((await inspectWorktree(f.identity, entry, {
    cwd: f.primary, ordinaryEntryLimit: 6, generatedEntryLimit: 6,
  })).clean, true);
  await assert.rejects(inspectWorktree(f.identity, entry, {
    cwd: f.primary, ordinaryEntryLimit: 5, generatedEntryLimit: 100,
  }), /content-inspection-budget/);
  await assert.rejects(inspectWorktree(f.identity, entry, {
    cwd: f.primary, ordinaryEntryLimit: 100, generatedEntryLimit: 5,
  }), /content-inspection-budget/);
});

test("tracked empty gitmodules is ordinary content while configured modules and gitlinks block", async t => {
  const f = await fixture(t);
  assert.equal((await inspectWorktree(f.identity, f.entry, { cwd: f.primary })).clean, true);
  await writeFile(join(f.path, "vendor", ".gitmodules"), "[submodule \"nested\"]\n\tpath = nested\n\turl = https://example.invalid/nested.git\n");
  await assert.rejects(inspectWorktree(f.identity, f.entry, { cwd: f.primary }), /nested-repository/);
  await git(f.path, "checkout", "--", "vendor/.gitmodules");
  await git(f.path, "update-index", "--add", "--cacheinfo", `160000,${f.snapshot.head},vendor/nested`);
  await assert.rejects(inspectWorktree(f.identity, f.entry, { cwd: f.primary }), /nested-repository/);
});

test("locked, current, advanced and branch-rebound checkouts fail closed", async t => {
  const f = await fixture(t);
  await assert.rejects(inspectWorktree(f.identity, f.entry, { cwd: f.path }), /current-worktree/);
  await git(f.primary, "worktree", "lock", f.path);
  await assert.rejects(captureWorktree(f.identity, f.path), /locked/);
  await git(f.primary, "worktree", "unlock", f.path);
  await git(f.path, "checkout", "-b", "feature/rebound");
  await assert.rejects(inspectWorktree(f.identity, f.entry, { cwd: f.primary }), /identity-changed/);
  await git(f.path, "commit", "--allow-empty", "-m", "new-work");
  await assert.rejects(inspectWorktree(f.identity, f.entry, { cwd: f.primary }), /identity-changed/);
});

test("directory replacements and junction escapes cannot inherit authority", async t => {
  const f = await fixture(t), old = `${f.path}-old`;
  await rename(f.path, old); await mkdir(f.path);
  await assert.rejects(captureWorktree(f.identity, f.path));
  await rm(f.path, { recursive: true });
  await symlink(old, f.path, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(captureWorktree(f.identity, f.path), /path/);
});

test("non-force removal failures preserve residual contents and journal, then retry the intact worktree", async t => {
  const f = await fixture(t, true); await f.store.enable();
  const report = await f.pass({ preview: false, remove: async () => { throw Error("locked file with PRIVATE token"); } });
  assert.equal(report.results[0].disposition, "partial"); assert.equal(await exists(f.path), true);
  assert.equal(JSON.stringify(report).includes("PRIVATE"), false);
  assert.equal((await f.store.read()).entries[0].step, "remove-intent");
  assert.equal(await readFile(join(f.path, "tracked.txt"), "utf8"), "base\n");
  await writeFile(join(f.path, "late-user-file"), "preserve");
  const dirty = await f.pass({ preview: false });
  assert.equal(dirty.results[0].disposition, "partial"); assert.equal(dirty.results[0].reason, "worktree-content");
  assert.deepEqual(dirty.results[0].paths, ["late-user-file"]); assert.equal(await exists(f.path), true);
  await rm(join(f.path, "late-user-file"));
  const retried = await f.pass({ preview: false });
  assert.equal(retried.results[0].disposition, "removed", JSON.stringify(retried));
  assert.deepEqual(retried.results[0].steps, ["worktree-removed", "local-ref-removed"]);
  assert.equal(await exists(f.path), false); assert.equal(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
});

/** Mimic Git's directory-order removal stopping at a held handle: pointer and earlier entries gone, the rest left behind. */
const dismantle = f => async () => {
  await rm(join(f.path, ".git")); await rm(join(f.path, ".gitignore")); await rm(join(f.path, "node_modules-cache"), { recursive: true });
  throw Object.assign(Error("sharing violation"), { cleanupCode: "git-operation-failed" });
};

test("verified residue of an interrupted removal is removed and only its own registration retired", async t => {
  const f = await fixture(t, true); await f.store.enable();
  const unrelated = join(f.identity.root, "unrelated"); await git(f.primary, "worktree", "add", "--detach", unrelated);
  await f.store.locked(async (state, save) => { state.entries[0].disposable = ["node_modules"]; await save(state); });
  const report = await f.pass({ preview: false, remove: dismantle(f) });
  assert.equal(report.results[0].disposition, "partial"); assert.equal(report.results[0].reason, "git-operation-failed");
  await mkdir(join(f.path, "node_modules")); await writeFile(join(f.path, "node_modules", "dep.js"), "generated");
  assert.match(await git(f.primary, "worktree", "list", "--porcelain"), /prunable/);
  const preview = await f.pass(); assert.equal(preview.results[0].disposition, "eligible", JSON.stringify(preview));
  assert.equal(await exists(f.path), true);
  const repaired = await f.pass({ preview: false });
  assert.equal(repaired.results[0].disposition, "removed", JSON.stringify(repaired));
  assert.deepEqual(repaired.results[0].steps, ["residue-removed", "local-ref-removed"]);
  assert.equal(await exists(f.path), false); assert.doesNotMatch(await git(f.primary, "worktree", "list", "--porcelain"), /prunable|example/);
  assert.match(await git(f.primary, "worktree", "list", "--porcelain"), /unrelated/); assert.equal(await exists(unrelated), true);
  assert.equal(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
  assert.equal((await f.store.read()).entries[0].state, "done");
});

test("residue with changed, foreign, or linked content is retained and named", async t => {
  const f = await fixture(t, true); await f.store.enable();
  await f.pass({ preview: false, remove: dismantle(f) });
  await writeFile(join(f.path, "tracked.txt"), "edited\n"); await writeFile(join(f.path, "vendor", "notes.txt"), "keep");
  const changed = await f.pass({ preview: false });
  assert.equal(changed.results[0].disposition, "partial"); assert.equal(changed.results[0].reason, "residual-content");
  assert.deepEqual(changed.results[0].paths.sort(), ["tracked.txt", "vendor/notes.txt"]);
  assert.equal(await readFile(join(f.path, "tracked.txt"), "utf8"), "edited\n");
  assert.equal((await f.store.read()).entries[0].step, "remove-intent");
  await writeFile(join(f.path, "tracked.txt"), "base\n"); await rm(join(f.path, "vendor", "notes.txt"));
  await symlink(f.primary, join(f.path, "escape"), process.platform === "win32" ? "junction" : "dir");
  const linked = await f.pass({ preview: false });
  assert.equal(linked.results[0].reason, "residual-content"); assert.deepEqual(linked.results[0].paths, ["escape"]);
  await rm(join(f.path, "escape")); await mkdir(join(f.path, "nested")); await writeFile(join(f.path, "nested", ".git"), "gitdir: elsewhere");
  const nested = await f.pass({ preview: false });
  assert.equal(nested.results[0].reason, "residual-content"); assert.deepEqual(nested.results[0].paths, ["nested/.git"]);
  await rm(join(f.path, "nested"), { recursive: true });
  await rm(f.path, { recursive: true }); await git(f.primary, "worktree", "add", "-f", "--detach", f.path);
  const reused = await f.pass({ preview: false });
  assert.equal(reused.results[0].reason, "residual-or-reused-path"); assert.equal(await exists(join(f.path, "tracked.txt")), true);
  assert.equal(await exists(f.path), true);
});

test("absent residue with a dangling registration is retired only for the exact candidate", async t => {
  const f = await fixture(t, true); await f.store.enable();
  await f.pass({ preview: false, remove: dismantle(f) });
  await rm(f.path, { recursive: true });
  assert.match(await git(f.primary, "worktree", "list", "--porcelain"), /prunable/);
  const report = await f.pass({ preview: false });
  assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
  assert.deepEqual(report.results[0].steps, ["worktree-already-absent", "local-ref-removed"]);
  assert.doesNotMatch(await git(f.primary, "worktree", "list", "--porcelain"), /prunable/);
});

test("restart completes branch-only cleanup and refuses a reused path", async t => {
  const f = await fixture(t, true); await f.store.enable();
  const report = await f.pass({ preview: false, removeRef: async () => { throw Error("interruption"); } });
  assert.equal(report.results[0].disposition, "partial"); assert.equal(await exists(f.path), false);
  await mkdir(f.path); await writeFile(join(f.path, "new-user-data"), "preserve");
  assert.equal((await f.pass({ preview: false })).results[0].reason, "residual-or-reused-path");
  await rm(f.path, { recursive: true });
  assert.equal((await f.pass({ preview: false })).results[0].disposition, "removed");
});

test("advanced and checked-out refs survive branch cleanup", async t => {
  const f = await fixture(t, true); await removeWorktree(f.identity, f.entry);
  await git(f.primary, "commit", "--allow-empty", "-m", "advanced"); await git(f.primary, "branch", "-f", "feature/example", "HEAD");
  await assert.rejects(removeLocalRef(f.identity, f.entry), /advanced/);
  await git(f.primary, "checkout", "feature/example");
  await assert.rejects(removeLocalRef(f.identity, f.entry), /checked-out/);
});

test("disable interrupts between removal and ref deletion without deleting the ref", async t => {
  const f = await fixture(t, true); await f.store.enable();
  const report = await f.pass({ preview: false, remove: async (...args) => { await removeWorktree(...args); await f.store.disable(); } });
  assert.equal(report.results[0].disposition, "partial"); assert.equal(report.results[0].reason, "cleanup-disabled");
  assert.notEqual(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
});

test("dirty content appearing during revalidation prevents deletion", async t => {
  const f = await fixture(t); await f.store.enable(); let reads = 0;
  const report = await f.pass({ preview: false, verify: async () => {
    if (++reads === 2) await writeFile(join(f.path, "late-user-file"), "preserve");
    return f.verify();
  } });
  assert.equal(report.results[0].reason, "worktree-content"); assert.equal(await exists(f.path), true);
});

test("bounded passes fairly resume candidates after the first hundred", async t => {
  const f = await fixture(t); await f.store.enable();
  await f.store.locked(async (state, save) => {
    for (let i = 1; i < 102; i++) state.entries.push({ ...f.entry, id: randomUUID(), path: f.entry.path + i });
    await save(state);
  });
  const verify = async () => ({ disposition: "pending", reason: "archive-pending" });
  const first = await f.pass({ preview: false, verify }); assert.equal(first.coverage.visited, 100); assert.equal(first.coverage.complete, false);
  const second = await f.pass({ preview: false, verify }); assert.equal(second.results[0].path, f.entry.path + "100");
});

// Protocol: hold until explicit release outside the target, not Console.ReadLine/EOF on a CI pipe.
const HOLD_SCRIPT = "$ErrorActionPreference='Stop'; $s=[System.IO.File]::Open($env:CLEANUP_LOCK_FIXTURE,'Open','Read','None'); try { [Console]::WriteLine('READY'); [Console]::Out.Flush(); $deadline=[DateTime]::UtcNow.AddSeconds(60); while(-not [System.IO.File]::Exists($env:CLEANUP_LOCK_RELEASE)) { if([DateTime]::UtcNow -gt $deadline) { throw 'fixture-release-timeout' }; [System.Threading.Thread]::Sleep(20) } } finally { $s.Dispose() }";
// Invariant: prove Win32 ERROR_SHARING_VIOLATION, not a Node readFile rejection that differs on hosted Windows.
const PROBE_SCRIPT = "$ErrorActionPreference='Stop'; try { $p=[System.IO.File]::Open($env:CLEANUP_LOCK_FIXTURE,'Open','Read','ReadWrite'); $p.Dispose(); throw 'fixture-lock-not-held' } catch { $e=$_.Exception; while($e.InnerException) { $e=$e.InnerException }; if(($e.HResult -band 65535) -ne 32) { throw }; [Console]::WriteLine('SHARING_VIOLATION') }";
const powershell = (script, env) => spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });

/** Windows-only exclusive handle on one file, released only by an explicit sentinel written outside the target. */
function exclusiveHandle(f, lockedPath) {
  const releasePath = join(f.temporary, `release-${randomUUID()}`);
  let child, ended, diagnostic = "";
  const assertNativeLock = async () => {
    const result = await promisify(execFile)("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", PROBE_SCRIPT], {
      env: { ...process.env, CLEANUP_LOCK_FIXTURE: lockedPath }, timeout: 10000, maxBuffer: 65536, encoding: "utf8",
    });
    assert.equal(result.stdout.trim(), "SHARING_VIOLATION");
  };
  const hold = async () => {
    child = powershell(HOLD_SCRIPT, { CLEANUP_LOCK_FIXTURE: lockedPath, CLEANUP_LOCK_RELEASE: releasePath });
    ended = once(child, "close").then(([code, signal]) => ({ code, signal }), error => ({ error: error.message }));
    child.stderr.on("data", data => { diagnostic += data.toString(); });
    await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => finish(Error("fixture-lock-timeout")), 10000);
      const exited = () => finish(Error(`fixture-lock-exited: ${diagnostic}`));
      const failed = error => finish(error);
      const ready = data => { output += data.toString(); if (output.split(/\r?\n/).includes("READY")) finish(); };
      function finish(error) {
        clearTimeout(timer); child.stdout.off("data", ready); child.off("exit", exited); child.off("error", failed);
        error ? reject(error) : resolve();
      }
      child.stdout.on("data", ready); child.once("exit", exited); child.once("error", failed);
    });
    await assertNativeLock();
  };
  const release = async () => {
    if (!child) return;
    await writeFile(releasePath, "release\n");
    const timer = setTimeout(() => child.kill(), 10000);
    try { assert.deepEqual(await ended, { code: 0, signal: null }, diagnostic); }
    finally { clearTimeout(timer); child = null; }
    await assert.rejects(assertNativeLock, /fixture-lock-not-held/, "the probe must observe explicit release");
  };
  return { assertNativeLock, hold, release, context: () => JSON.stringify({ diagnostic, exitCode: child?.exitCode }) };
}

test("Windows exclusive file handles produce a safe partial result that the next pass completes", { skip: process.platform !== "win32" }, async t => {
  const f = await fixture(t, true); await f.store.enable();
  const lockedPath = join(f.path, "tracked.txt"), lock = exclusiveHandle(f, lockedPath);
  await assert.rejects(lock.assertNativeLock, /fixture-lock-not-held/, "the probe must reject an unlocked file");
  let removalAttempted = false;
  try {
    const report = await f.pass({ preview: false, remove: async (...args) => {
      await lock.hold(); removalAttempted = true;
      await removeWorktree(...args);
    } });
    const context = JSON.stringify({ report }) + lock.context();
    assert.equal(removalAttempted, true, context);
    assert.equal(report.results[0].disposition, "partial", context);
    assert.ok(["git-operation-failed", "worktree-removal-partial"].includes(report.results[0].reason), context);
    await lock.assertNativeLock();
    assert.equal(await exists(f.path), true);
    assert.equal((await f.store.read()).entries[0].step, "remove-intent");
    assert.equal(await git(f.primary, "rev-parse", "refs/heads/feature/example"), f.entry.head);
    // Invariant: a still-held handle keeps the residue and journal; nothing is force-deleted around the lock.
    const locked = await f.pass({ preview: false });
    assert.equal(locked.results[0].disposition, "partial", JSON.stringify(locked));
    assert.ok(["residual-locked", "git-operation-failed", "worktree-content"].includes(locked.results[0].reason), JSON.stringify(locked));
    assert.equal(await exists(lockedPath), true);
    assert.equal((await f.store.read()).entries[0].step, "remove-intent");
  } finally { await lock.release(); }
  assert.equal(await readFile(lockedPath, "utf8"), "base\n");
  const repaired = await f.pass({ preview: false });
  assert.equal(repaired.results[0].disposition, "removed", JSON.stringify(repaired));
  assert.equal(repaired.results[0].steps.at(-1), "local-ref-removed");
  assert.equal(await exists(f.path), false); assert.equal(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
  assert.doesNotMatch(await git(f.primary, "worktree", "list", "--porcelain"), /prunable/);
});

test("a locked disposable root blocks before any journaled intent and completes after release", { skip: process.platform !== "win32" }, async t => {
  const f = await fixture(t, true); await f.store.enable();
  await mkdir(join(f.path, "node_modules")); await writeFile(join(f.path, "node_modules", "held.js"), "generated");
  await f.store.locked(async (state, save) => { state.entries[0].disposable = ["node_modules"]; await save(state); });
  const lock = exclusiveHandle(f, join(f.path, "node_modules", "held.js"));
  let removalAttempted = false;
  try {
    await lock.hold();
    const report = await f.pass({ preview: false, remove: async () => { removalAttempted = true; throw Error("must not run"); } });
    assert.equal(removalAttempted, false);
    assert.equal(report.results[0].disposition, "blocked", JSON.stringify(report));
    assert.equal(report.results[0].reason, "disposable-path-locked"); assert.deepEqual(report.results[0].paths, ["node_modules"]);
    assert.equal(await exists(join(f.path, ".git")), true); assert.equal(await exists(join(f.path, "node_modules", "held.js")), true);
    const entry = (await f.store.read()).entries[0]; assert.equal(entry.state, "released"); assert.equal(entry.step, "none");
  } finally { await lock.release(); }
  const report = await f.pass({ preview: false });
  assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
  assert.deepEqual(report.results[0].steps, ["worktree-removed", "local-ref-removed"]);
  assert.equal(await exists(f.path), false);
});

test("handoff registers and releases a clean pushed worktree, is idempotent, and records repair pushes", async t => {
  const f = await fixture(t, true, false);
  await mkdir(join(f.path, "node_modules")); await writeFile(join(f.path, "node_modules", "generated"), "fixture");
  const options = { identity: f.identity, store: f.store, path: f.path, change: "example", sourcePr: 20 };
  const first = await handoffLocalCleanup(options);
  assert.equal(first.disposition, "released"); assert.equal(first.state, "released"); assert.equal(first.head, f.snapshot.head);
  assert.equal(await exists(f.path), true); assert.equal((await f.store.read()).enabled, false);
  let state = await f.store.read(); assert.equal(state.entries.length, 1); assert.equal(state.entries[0].step, "none");
  assert.deepEqual(state.entries[0].disposable, [...COMPLETION_DISPOSABLE_PATHS]);
  const again = await handoffLocalCleanup(options);
  assert.equal(again.id, first.id); assert.notEqual(again.generation, first.generation); assert.equal(again.state, "released");
  await git(f.path, "commit", "--allow-empty", "-m", "repair");
  const repaired = await handoffLocalCleanup(options);
  assert.equal(repaired.id, first.id); assert.equal(repaired.head, await git(f.path, "rev-parse", "HEAD"));
  state = await f.store.read(); assert.equal(state.entries.length, 1); assert.equal(state.entries[0].head, repaired.head);
  assert.equal(JSON.stringify(state).includes(owner), false);
  await assert.rejects(handoffLocalCleanup({ ...options, change: "other" }), /completion-registration-conflict/);
  await assert.rejects(handoffLocalCleanup({ ...options, path: join(f.identity.root, "missing") }), /worktree-absent-unregistered/);
  await assert.rejects(handoffLocalCleanup({ ...options, path: f.primary }), /worktree-path/);
});

for (const kind of ["unstaged", "staged", "untracked"]) test(`handoff blocks ${kind} content and keeps the registration owned`, async t => {
  const f = await fixture(t, true, false);
  const filename = kind === "untracked" ? "new.txt" : "tracked.txt";
  await writeFile(join(f.path, filename), "unpushed\n"); if (kind === "staged") await git(f.path, "add", filename);
  await writeFile(join(f.path, "secret.txt"), "ignored is judged at removal, not at hand-off\n");
  await assert.rejects(handoffLocalCleanup({ identity: f.identity, store: f.store, path: f.path, change: "example", sourcePr: 20 }),
    error => error.cleanupCode === "worktree-content" && error.paths.includes(filename) && !error.paths.includes("secret.txt"));
  assert.equal((await f.store.read()).entries.length, 0);
  await assert.rejects(handoffLocalCleanup({ identity: f.identity, store: f.store, path: f.path, change: "example", sourcePr: 20 }), /worktree-content/);
});

test("handoff refuses an owned or replaced registration and a changed branch", async t => {
  const f = await fixture(t, true);
  await f.store.locked(async (state, save) => { transitionEntry(state.entries[0], "claim", owner, state.entries[0].generation); await save(state); });
  const options = { identity: f.identity, store: f.store, path: f.path, change: "example", sourcePr: 20 };
  await assert.rejects(handoffLocalCleanup(options), /owned-worktree/);
  await f.store.locked(async (state, save) => { transitionEntry(state.entries[0], "release", owner, state.entries[0].generation); await save(state); });
  await git(f.path, "checkout", "-b", "feature/rebound");
  await assert.rejects(handoffLocalCleanup(options), /worktree-identity-changed/);
  await git(f.path, "checkout", "feature/example"); await git(f.path, "branch", "-D", "feature/rebound");
  await f.store.locked(async (state, save) => { state.entries[0].filesystem = "1:2:3"; await save(state); });
  await assert.rejects(handoffLocalCleanup(options), /directory-replaced/);
});

test("a finalization commit on top of the registered head is removed with its accepted-ancestry ref", async t => {
  const f = await fixture(t, true);
  await git(f.path, "commit", "--allow-empty", "-m", "finalize (App)");
  const merged = await git(f.path, "rev-parse", "HEAD");
  const verify = async () => ({ ...await f.verify(), sourceHead: merged, sourceMerge: merged, archiveMerge: merged });
  const preview = await f.pass({ verify }); assert.equal(preview.results[0].disposition, "eligible", JSON.stringify(preview));
  const report = await f.pass({ preview: false, verify, requireEnabled: false });
  assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
  assert.equal(report.results[0].head, merged);
  assert.deepEqual(report.results[0].steps, ["worktree-removed", "local-ref-removed"]);
  assert.equal(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
  assert.equal((await f.store.read()).entries[0].head, merged);
});

test("a local-only commit after registration still blocks removal and keeps the ref", async t => {
  const f = await fixture(t, true);
  await git(f.path, "commit", "--allow-empty", "-m", "local work");
  const report = await f.pass({ preview: false, requireEnabled: false });
  assert.equal(report.results[0].disposition, "blocked"); assert.equal(report.results[0].reason, "worktree-identity-changed");
  assert.equal(await exists(f.path), true);
  await removeWorktree(f.identity, { ...f.entry, path: f.path });
  await assert.rejects(removeLocalRef(f.identity, f.entry, undefined, async sha => f.ancestorOf(sha, f.snapshot.head)), /local-ref-advanced/);
  assert.notEqual(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
});

test("a hand-deleted worktree whose branch gained the finalization commit completes through its journal", async t => {
  const f = await fixture(t, true);
  await git(f.path, "commit", "--allow-empty", "-m", "finalize (App)");
  const merged = await git(f.path, "rev-parse", "HEAD");
  await rm(f.path, { recursive: true, force: true });
  const verify = async () => ({ ...await f.verify(), sourceHead: merged, sourceMerge: merged, archiveMerge: merged });
  const report = await f.pass({ preview: false, verify, requireEnabled: false });
  assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
  assert.deepEqual(report.results[0].steps, ["worktree-already-absent", "local-ref-removed"]);
  assert.equal(await git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
});

function branchReader(primary, pulls, remote = new Set()) {
  const repository = "owner/repo", prefix = `/repos/${repository}`, calls = [];
  return { repository, prefix, calls,
    async pages(path) {
      calls.push(path);
      const name = decodeURIComponent(new URL(`https://api.github.com${path}`).searchParams.get("head")).split(":")[1];
      return pulls.filter(pull => pull.head.ref === name).map(pull => ({ base: { ref: "develop", repo: { full_name: repository } },
        ...pull, head: { repo: { full_name: repository }, ...pull.head } }));
    },
    async get(path) {
      calls.push(path);
      const name = decodeURIComponent(path.slice(`${prefix}/git/ref/heads/`.length));
      if (path.startsWith(`${prefix}/git/ref/heads/`) && remote.has(name)) return { object: { sha: "0".repeat(40) } };
      throw Object.assign(Error("github-not-found"), { archiveCode: "github-not-found" });
    } };
}

test("sweep prunes merged local branches by pull-request evidence and retains everything else", async t => {
  const f = await fixture(t, false, false);
  const base = await git(f.primary, "rev-parse", "HEAD");
  const branch = async (name, commits = 1) => {
    await git(f.primary, "checkout", "-q", "-b", name, base);
    for (let i = 0; i < commits; i++) await git(f.primary, "commit", "--allow-empty", "-m", `${name} ${i}`);
    const tip = await git(f.primary, "rev-parse", "HEAD"); await git(f.primary, "checkout", "-q", "develop"); return tip;
  };
  const mergedTip = await branch("fix/merged"), behindTip = await branch("fix/behind", 2), aheadTip = await branch("fix/ahead");
  const openTip = await branch("fix/open"), closedTip = await branch("fix/closed"), remoteTip = await branch("fix/remote"), noneTip = await branch("fix/none");
  await git(f.primary, "branch", "-f", "fix/behind", `${behindTip}~1`);
  await git(f.primary, "branch", "fix/checked-out", base); await git(f.primary, "worktree", "add", join(f.identity.root, "checked-out"), "fix/checked-out");
  const registeredPath = join(f.identity.root, "registered"); await git(f.primary, "worktree", "add", "-b", "fix/registered", registeredPath, base);
  const registeredSnapshot = await captureWorktree(f.identity, registeredPath);
  await f.store.locked(async (state, save) => {
    const entry = registerEntry(state, { ...registeredSnapshot, change: "registered", sourcePr: 30, candidatePr: 30, role: "implementation", disposable: [] }, owner);
    transitionEntry(entry, "release", owner, entry.generation); await save(state);
  });
  await git(f.primary, "worktree", "remove", registeredPath);
  const pulls = [
    { number: 1, state: "closed", merged_at: "2026-09-17T10:00:00Z", head: { ref: "fix/merged", sha: mergedTip } },
    { number: 2, state: "closed", merged_at: "2026-09-17T10:00:00Z", head: { ref: "fix/behind", sha: behindTip } },
    { number: 3, state: "closed", merged_at: "2026-09-17T09:00:00Z", head: { ref: "fix/ahead", sha: base } },
    { number: 4, state: "open", merged_at: null, head: { ref: "fix/open", sha: openTip } },
    { number: 5, state: "closed", merged_at: null, head: { ref: "fix/closed", sha: closedTip } },
    { number: 6, state: "closed", merged_at: "2026-09-17T10:00:00Z", head: { ref: "fix/remote", sha: remoteTip } },
    { number: 7, state: "closed", merged_at: "2026-09-17T10:00:00Z", head: { ref: "fix/checked-out", sha: base } },
    { number: 8, state: "closed", merged_at: "2026-09-17T10:00:00Z", head: { ref: "fix/registered", sha: registeredSnapshot.head } },
    { number: 9, state: "closed", merged_at: "2026-09-17T10:00:00Z", head: { ref: "fix/merged", sha: "1".repeat(40) } },
    { number: 10, state: "closed", merged_at: "2026-09-17T11:00:00Z", head: { ref: "fix/merged", sha: mergedTip } },
  ];
  const reader = branchReader(f.primary, pulls, new Set(["fix/remote"]));
  const verify = async () => ({ disposition: "pending", reason: "remote-ref-present" });
  const report = await f.pass({ preview: false, requireEnabled: false, pruneBranches: true, reader, verify });
  assert.equal(report.error, undefined, JSON.stringify(report));
  const outcome = Object.fromEntries(report.branches.results.map(row => [row.ref.slice("refs/heads/".length), `${row.disposition}${row.reason ? `:${row.reason}` : ""}${row.sourcePr ? `:#${row.sourcePr}` : ""}`]));
  assert.deepEqual(outcome, {
    "fix/merged": "removed:#10", "fix/behind": "removed:#2", "fix/ahead": "retained:branch-unmerged-commits:#3",
    "fix/open": "retained:branch-open-pull-request:#4", "fix/closed": "retained:branch-closed-pull-request",
    "fix/remote": "retained:branch-remote-present:#6", "fix/checked-out": "retained:branch-checked-out", "fix/none": "retained:branch-no-pull-request",
  });
  assert.equal(report.branches.coverage.complete, true);
  const remaining = (await git(f.primary, "for-each-ref", "--format=%(refname:short)", "refs/heads/")).split("\n").sort();
  assert.deepEqual(remaining, ["develop", "fix/ahead", "fix/checked-out", "fix/closed", "fix/none", "fix/open", "fix/registered", "fix/remote"]);
  assert.equal(await git(f.primary, "rev-parse", "fix/ahead"), aheadTip); assert.equal(await git(f.primary, "rev-parse", "fix/none"), noneTip);
  assert.equal(reader.calls.some(call => call.includes("fix%2Fregistered") || call.includes("owner%3Adevelop")), false, "registered and protected refs are never looked up");
  assert.equal(await exists(join(f.identity.root, "checked-out")), true);
  const lines = sweepLines(report);
  assert.ok(lines.some(line => line === "branch fix/merged: removed #10"), lines.join("\n"));
  assert.ok(lines.some(line => line.startsWith("#30 registered: pending")), lines.join("\n"));
  const preview = await f.pass({ pruneBranches: true, reader, verify });
  assert.equal(preview.branches, undefined); assert.equal(await git(f.primary, "rev-parse", "fix/open"), openTip);
});

test("branch pruning compare-and-deletes the tip read immediately before and defers on exhausted budgets", async t => {
  const f = await fixture(t, false, false);
  const base = await git(f.primary, "rev-parse", "HEAD");
  await git(f.primary, "branch", "fix/racy", base); await git(f.primary, "branch", "fix/second", base);
  const pulls = [{ number: 1, state: "closed", merged_at: "2026-09-17T10:00:00Z", head: { ref: "fix/racy", sha: base } },
    { number: 2, state: "closed", merged_at: "2026-09-17T10:00:00Z", head: { ref: "fix/second", sha: base } }];
  const reader = branchReader(f.primary, pulls);
  let moved = false;
  const enabled = async () => { if (!moved) { moved = true; await git(f.primary, "commit", "--allow-empty", "-m", "late"); await git(f.primary, "branch", "-f", "fix/racy", "HEAD"); await git(f.primary, "reset", "-q", "--hard", base); } };
  const state = await f.store.read();
  const result = await pruneMergedBranches({ identity: f.identity, state, reader, git: f.boundedGit, ancestorOf: f.ancestorOf, enabled });
  const racy = result.results.find(row => row.ref === "refs/heads/fix/racy");
  assert.equal(racy.disposition, "retained"); assert.equal(racy.reason, "branch-unmerged-commits");
  assert.notEqual(await git(f.primary, "for-each-ref", "refs/heads/fix/racy"), "");
  assert.equal(result.results.find(row => row.ref === "refs/heads/fix/second").disposition, "removed");
  await git(f.primary, "branch", "fix/second", base);
  const exhausted = { ...reader, async pages() { throw Object.assign(Error("remote-budget"), { cleanupCode: "remote-budget" }); } };
  const deferred = await pruneMergedBranches({ identity: f.identity, state, reader: exhausted, git: f.boundedGit, ancestorOf: f.ancestorOf });
  assert.equal(deferred.deferred, "remote-budget"); assert.equal(deferred.coverage.complete, false);
  assert.equal(deferred.results.length, 1); assert.equal(deferred.results[0].reason, "remote-budget");
  assert.notEqual(await git(f.primary, "for-each-ref", "refs/heads/fix/second"), "");
});

test("sweep completes released candidates without queue enablement, reports unmerged ones, and honors a fresh stop only", async t => {
  const f = await fixture(t, true);
  const pendingPath = join(f.identity.root, "pending"); await git(f.primary, "worktree", "add", "-b", "feature/pending", pendingPath);
  const rejectedPath = join(f.identity.root, "rejected"); await git(f.primary, "worktree", "add", "-b", "feature/rejected", rejectedPath);
  const snapshots = { pending: await captureWorktree(f.identity, pendingPath), rejected: await captureWorktree(f.identity, rejectedPath) };
  await f.store.locked(async (state, save) => {
    for (const [name, snapshot] of Object.entries(snapshots)) {
      const entry = registerEntry(state, { ...snapshot, change: name, sourcePr: name === "pending" ? 21 : 22, candidatePr: name === "pending" ? 21 : 22, role: "implementation", disposable: [] }, owner);
      transitionEntry(entry, "release", owner, entry.generation);
    }
    await save(state);
  });
  await f.store.disable();
  await new Promise(resolve => setTimeout(resolve, 20));
  const verify = async (reader, entry) => entry.sourcePr === 20 ? f.verify()
    : entry.sourcePr === 21 ? { disposition: "pending", reason: "pr-open", sourcePr: 21 } : { disposition: "awaiting-discard", reason: "pr-closed-unmerged", sourcePr: 22 };
  const started = Date.now();
  const report = await f.pass({ preview: false, requireEnabled: false, stopSince: started, verify });
  assert.equal(report.error, undefined, JSON.stringify(report));
  const byPr = Object.fromEntries(report.results.filter(row => row.sourcePr).map(row => [row.sourcePr, row.disposition]));
  assert.deepEqual(byPr, { 20: "removed", 21: "pending", 22: "awaiting-discard" });
  assert.equal(await exists(f.path), false); assert.equal(await exists(pendingPath), true); assert.equal(await exists(rejectedPath), true);
  assert.notEqual(await git(f.primary, "for-each-ref", "refs/heads/feature/rejected"), "");
  assert.equal((await f.store.read()).enabled, false);
  const lines = sweepLines(report);
  assert.ok(lines.includes("#20 example: removed [worktree-removed, local-ref-removed]"), lines.join("\n"));
  assert.ok(lines.includes("#22 rejected: awaiting-discard (pr-closed-unmerged)"), lines.join("\n"));
  const g = await fixture(t, true);
  const fresh = await g.pass({ preview: false, requireEnabled: false, stopSince: Date.now(), remove: async (...args) => { await removeWorktree(...args); await g.store.disable(); } });
  assert.equal(fresh.results[0].disposition, "partial"); assert.equal(fresh.results[0].reason, "cleanup-disabled");
  assert.notEqual(await git(g.primary, "for-each-ref", "refs/heads/feature/example"), "");
  assert.deepEqual(sweepLines({ error: "mutation-busy", results: [] }), ["sweep deferred: another cleanup holds the mutation lock"]);
  assert.deepEqual(sweepLines({ results: [], coverage: { complete: true } }), ["sweep: nothing handed off, nothing to prune"]);
});

test("CLI handoff and sweep use the documented surface", async t => {
  const f = await fixture(t, true, false);
  const cli = fileURLToPath(new URL("../../scripts/governance/local-worktree-cleanup.mjs", import.meta.url));
  const invoke = (...args) => execFileSync(process.execPath, [cli, ...args, "--repo", f.primary], {
    cwd: f.primary, env: { ...process.env, GH_TOKEN: "fixture-unused-token" }, encoding: "utf8",
  });
  const help = invoke("--help"); assert.match(help, /handoff/); assert.match(help, /sweep/);
  const record = JSON.parse(invoke("handoff", "--path", f.path, "--change", "example", "--pr", "20"));
  assert.equal(record.disposition, "released"); assert.equal(record.head, f.snapshot.head);
  assert.throws(() => invoke("handoff", "--path", f.path, "--change", "example"), /handoff-arguments/);
  assert.throws(() => invoke("handoff", "--path", f.path, "--change", "example", "--pr", "20", "--role", "archive"), /handoff-arguments/);
  const status = JSON.parse(invoke("status")); assert.equal(status.entries[0].state, "released"); assert.equal(status.enabled, false);
});

test("pass deadline reports incomplete coverage without mutation", async t => {
  const f = await fixture(t); await f.store.enable();
  const report = await f.pass({ deadline: 0, preview: false }); assert.equal(report.error, "pass-deadline"); assert.equal(await exists(f.path), true);
});

});
