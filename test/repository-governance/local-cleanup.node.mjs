import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, rename, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { atomicJson, createStateStore, registerEntry, transitionEntry, validateState, digest } from "../../scripts/governance/local-cleanup-state.mjs";
import { canonical, captureWorktree, discoverRepository, inspectWorktree, exists, gitRunner, removeLocalRef, removeWorktree } from "../../scripts/governance/local-cleanup-git.mjs";
import { reconcileLocalCleanup } from "../../scripts/governance/local-cleanup-reconcile.mjs";

const owner = "fixture-owner-token-at-least-32-characters";
function git(cwd, ...args) { return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
async function fixture(t, branch = false) {
  const temporary = await canonical(await mkdtemp(join(tmpdir(), "local-cleanup-")));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const primary = join(temporary, "primary"); await mkdir(primary);
  git(primary, "init", "-b", "develop"); git(primary, "config", "core.autocrlf", "false"); git(primary, "config", "user.name", "Fixture"); git(primary, "config", "user.email", "fixture@example.invalid");
  await writeFile(join(primary, "tracked.txt"), "base\n");
  await writeFile(join(primary, ".gitignore"), "node_modules/\nsecret.txt\n");
  git(primary, "add", "."); git(primary, "commit", "-m", "fixture"); git(primary, "remote", "add", "origin", "https://github.com/owner/repo.git");
  const path = join(primary, ".worktrees", "example");
  git(primary, "worktree", "add", ...(branch ? ["-b", "feature/example"] : ["--detach"]), path);
  const identity = await discoverRepository(primary), store = createStateStore(identity), snapshot = await captureWorktree(identity, path);
  let entry;
  await store.locked(async (state, save) => {
    entry = registerEntry(state, { ...snapshot, change: "example", sourcePr: 20, candidatePr: 20, role: "implementation", disposable: [] }, owner);
    transitionEntry(entry, "release", owner, entry.generation); await save(state);
  });
  const verify = async () => ({ disposition: "eligible", sourcePr: 20, sourceMerge: snapshot.head, archivePr: 21, archiveMerge: snapshot.head, targetSha: snapshot.head, refs: [] });
  const realGit = gitRunner();
  const boundedGit = async (cwd, args) => ["fetch", "merge-base"].includes(args[0]) ? "" : realGit(cwd, args);
  const pass = (options = {}) => reconcileLocalCleanup({ identity, store, reader: {}, cwd: primary, verify, git: boundedGit, ...options });
  return { identity, store, entry, path, primary, temporary, pass, verify, boundedGit };
}

test("registration rejects duplicate paths, malformed state and cross-repository identity", async t => {
  const f = await fixture(t); const state = await f.store.read();
  assert.throws(() => validateState({ ...state, version: 9 }, f.identity), /state-schema/);
  assert.throws(() => validateState(state, { ...f.identity, repository: "other/repo" }), /state-schema/);
  const input = { ...f.entry }; for (const key of ["id", "generation", "state", "ownerHash", "step"]) delete input[key];
  assert.throws(() => registerEntry(state, input, owner), /duplicate/);
  assert.throws(() => registerEntry(state, { ...input, ref: "refs/heads/develop" }, owner), /registration-schema/);
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
  const other = join(f.identity.root, "registered"); git(f.primary, "worktree", "add", "--detach", other);
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
  assert.equal(JSON.parse(invoke("watch")).error, "cleanup-disabled");
  assert.equal(invoke("status").includes(digest(owner)), false);
});

test("another unavailable worktree's registration is never pruned", async t => {
  const f = await fixture(t); await f.store.enable();
  const other = join(f.identity.root, "unavailable"); git(f.primary, "worktree", "add", "--detach", other);
  await rm(other, { recursive: true, force: true });
  assert.equal((await f.pass({ preview: false })).results[0].disposition, "removed");
  assert.ok(git(f.primary, "worktree", "list", "--porcelain").includes("unavailable"));
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
  git(f.primary, "worktree", "add", "--detach", f.path);
  assert.equal((await f.pass()).results[0].reason, "residual-or-reused-path");
  const snapshot = await captureWorktree(f.identity, f.path);
  await f.store.locked(async (state, save) => {
    const entry = registerEntry(state, { ...snapshot, change: "example", sourcePr: 20, candidatePr: 20, role: "implementation", disposable: [] }, owner);
    assert.notEqual(entry.id, f.entry.id); assert.equal(entry.state, "owned"); await save(state);
  });
});

test("a busy or stale mutation lock is never automatically evicted", async t => {
  const f = await fixture(t);
  await f.store.locked(async () => { await assert.rejects(f.store.locked(() => {}), /mutation-busy/); });
  await writeFile(join(f.store.directory, "mutation.lock"), '{"pid":9999999}');
  await assert.rejects(f.store.locked(() => {}), /mutation-busy/);
});

test("preview and disabled execution preserve local refs, files and state", async t => {
  const f = await fixture(t, true), file = join(f.store.directory, "state.json");
  const before = await readFile(file, "utf8"), refs = git(f.primary, "show-ref");
  const preview = await f.pass(); assert.equal(preview.results[0].disposition, "eligible");
  assert.equal(await readFile(file, "utf8"), before); assert.equal(git(f.primary, "show-ref"), refs);
  const disabled = await f.pass({ preview: false }); assert.equal(disabled.error, "cleanup-disabled");
  assert.equal(await exists(f.path), true); assert.equal(await readFile(file, "utf8"), before);
});

test("merged archive removes a released clean worktree and exact local ref", async t => {
  const f = await fixture(t, true); await f.store.enable();
  const report = await f.pass({ preview: false }); assert.equal(report.results[0].disposition, "removed", JSON.stringify(report));
  assert.equal(await exists(f.path), false); assert.equal(git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
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
  await writeFile(join(f.path, filename), "do not discard\n"); if (kind === "staged") git(f.path, "add", filename);
  const report = await f.pass({ preview: false }); assert.equal(report.results[0].reason, "worktree-content");
  assert.equal(await readFile(join(f.path, filename), "utf8"), "do not discard\n");
});

test("assume-unchanged and swapped Git pointers cannot hide work", async t => {
  const f = await fixture(t); await f.store.enable();
  git(f.path, "update-index", "--assume-unchanged", "tracked.txt"); await writeFile(join(f.path, "tracked.txt"), "hidden user work\n");
  assert.equal((await f.pass({ preview: false })).results[0].reason, "hidden-index-content");
  const other = join(f.identity.root, "other"); git(f.primary, "worktree", "add", "--detach", other);
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
  assert.notEqual(git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
});

test("generated ignored paths require explicit registration policy", async t => {
  const f = await fixture(t); await mkdir(join(f.path, "node_modules")); await writeFile(join(f.path, "node_modules", "generated"), "fixture");
  assert.equal((await inspectWorktree(f.identity, f.entry, { cwd: f.primary })).clean, false);
  assert.equal((await inspectWorktree(f.identity, { ...f.entry, disposable: ["node_modules"] }, { cwd: f.primary })).clean, true);
  await mkdir(join(f.path, "node_modules", ".git"));
  await assert.rejects(inspectWorktree(f.identity, { ...f.entry, disposable: ["node_modules"] }, { cwd: f.primary }), /nested-repository/);
});

test("locked, current, advanced and branch-rebound checkouts fail closed", async t => {
  const f = await fixture(t);
  await assert.rejects(inspectWorktree(f.identity, f.entry, { cwd: f.path }), /current-worktree/);
  git(f.primary, "worktree", "lock", f.path);
  await assert.rejects(captureWorktree(f.identity, f.path), /locked/);
  git(f.primary, "worktree", "unlock", f.path);
  git(f.path, "checkout", "-b", "feature/rebound");
  await assert.rejects(inspectWorktree(f.identity, f.entry, { cwd: f.primary }), /identity-changed/);
  git(f.path, "commit", "--allow-empty", "-m", "new-work");
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

test("non-force removal failures preserve residual contents and journal", async t => {
  const f = await fixture(t); await f.store.enable();
  const report = await f.pass({ preview: false, remove: async () => { throw Error("locked file with PRIVATE token"); } });
  assert.equal(report.results[0].disposition, "partial"); assert.equal(await exists(f.path), true);
  assert.equal(JSON.stringify(report).includes("PRIVATE"), false);
  assert.equal((await f.store.read()).entries[0].step, "remove-intent");
  assert.equal((await f.pass({ preview: false })).results[0].reason, "residual-or-reused-path");
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
  git(f.primary, "commit", "--allow-empty", "-m", "advanced"); git(f.primary, "branch", "-f", "feature/example", "HEAD");
  await assert.rejects(removeLocalRef(f.identity, f.entry), /advanced/);
  git(f.primary, "checkout", "feature/example");
  await assert.rejects(removeLocalRef(f.identity, f.entry), /checked-out/);
});

test("disable interrupts between removal and ref deletion without deleting the ref", async t => {
  const f = await fixture(t, true); await f.store.enable();
  const report = await f.pass({ preview: false, remove: async (...args) => { await removeWorktree(...args); await f.store.disable(); } });
  assert.equal(report.results[0].disposition, "partial"); assert.equal(report.results[0].reason, "cleanup-disabled");
  assert.notEqual(git(f.primary, "for-each-ref", "refs/heads/feature/example"), "");
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

test("Windows exclusive file handles produce a safe partial result", { skip: process.platform !== "win32" }, async t => {
  const f = await fixture(t); await f.store.enable();
  const script = "$s=[System.IO.File]::Open($env:CLEANUP_LOCK_FIXTURE,'Open','Read','None'); [Console]::WriteLine('READY'); [Console]::Out.Flush(); [Console]::ReadLine() | Out-Null; $s.Dispose()";
  let child;
  try {
    const report = await f.pass({ preview: false, remove: async (...args) => {
      child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { env: { ...process.env, CLEANUP_LOCK_FIXTURE: join(f.path, "tracked.txt") }, stdio: ["pipe", "pipe", "pipe"] });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error("fixture-lock-timeout")), 10000);
        child.stdout.once("data", data => { clearTimeout(timer); data.toString().includes("READY") ? resolve() : reject(Error("fixture-lock-failed")); });
        child.once("error", error => { clearTimeout(timer); reject(error); });
      });
      await removeWorktree(...args);
    } });
    assert.equal(report.results[0].disposition, "partial");
    assert.equal(await readFile(join(f.path, "tracked.txt")).then(() => false, () => true), true);
    assert.equal(await exists(f.path), true);
  } finally { if (child) { const ended = once(child, "exit"); child.stdin.end("done\n"); await ended; } }
  assert.equal(await readFile(join(f.path, "tracked.txt"), "utf8"), "base\n");
});

test("pass deadline reports incomplete coverage without mutation", async t => {
  const f = await fixture(t); await f.store.enable();
  const report = await f.pass({ deadline: 0, preview: false }); assert.equal(report.error, "pass-deadline"); assert.equal(await exists(f.path), true);
});
