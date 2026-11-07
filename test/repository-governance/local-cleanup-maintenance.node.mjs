import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat, mkdtemp, mkdir, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonical, discoverRepository, gitRunner, inspectWorktree, readLocalRef, removeLinkEntry, REPOSITORY_DISPOSABLE_PATHS } from "../../scripts/governance/local-cleanup-git.mjs";
import { createStateStore, digest, fail, registerEntry, transitionEntry } from "../../scripts/governance/local-cleanup-state.mjs";
import { discardBranchCleanup } from "../../scripts/governance/local-cleanup-branch-discard.mjs";
import { handoffLocalCleanup } from "../../scripts/governance/local-cleanup-complete.mjs";
import { unlinkDisposableLink } from "../../scripts/governance/local-cleanup-link.mjs";

const execute = promisify(execFile);
const owner = "fixture-cleanup-owner-at-least-32-characters";
const runGit = async (cwd, ...args) => (await execute("git", ["-C", cwd, ...args], { encoding: "utf8", windowsHide: true })).stdout.trim();

async function fixture(t) {
  const temporary = await canonical(await mkdtemp(join(tmpdir(), "cleanup-maintenance-")));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const primary = join(temporary, "primary"); await mkdir(primary);
  await runGit(primary, "init", "-b", "develop");
  await writeFile(join(primary, ".git", "config"), "\n[user]\n name = Fixture\n email = fixture@example.invalid\n[core]\n autocrlf = false\n[remote \"origin\"]\n url = https://github.com/owner/repo.git\n", { flag: "a" });
  await writeFile(join(primary, "tracked.txt"), "preserve\n");
  await writeFile(join(primary, ".gitignore"), "/.artifacts\n/node_modules\n/.worktrees\nsecret.txt\n");
  await runGit(primary, "add", "."); await runGit(primary, "commit", "-m", "fixture");
  const head = await runGit(primary, "rev-parse", "HEAD"), branch = "feature/rejected", ref = `refs/heads/${branch}`;
  await runGit(primary, "branch", branch);
  const identity = await discoverRepository(primary), store = createStateStore(identity);
  const remote = { sha: head, protected: false }, calls = [];
  const pull = { number: 40, state: "closed", merged: false, merged_at: null, draft: true,
    body: `\`\`\`openspec-implementation\n${JSON.stringify({ version: 3, change: "rejected-change" })}\n\`\`\``,
    base: { ref: "develop", repo: { full_name: "owner/repo" } }, head: { sha: head, ref: branch, repo: { full_name: "owner/repo" } } };
  const openPulls = [];
  const reader = { repository: identity.repository, prefix: "/repos/owner/repo", async get(path) {
    if (path.endsWith("/pulls/40")) return pull;
    if (path.endsWith(`/git/ref/heads/${encodeURIComponent(branch)}`) && remote.sha) return { object: { sha: remote.sha } };
    if (path.endsWith(`/branches/${encodeURIComponent(branch)}`) && remote.sha) return { protected: remote.protected };
    throw Object.assign(Error("github-not-found"), { archiveCode: "github-not-found" });
  }, async pages(path) {
    assert.equal(path, `/pulls?state=open&head=${encodeURIComponent(`owner:${branch}`)}`);
    return openPulls;
  } };
  const realGit = gitRunner();
  const git = async (cwd, args, options) => {
    calls.push(args);
    if (args[0] === "ls-remote") return remote.sha ? `${remote.sha}\t${ref}\n` : "";
    if (args[0] === "push") {
      assert.deepEqual(args, ["push", `--force-with-lease=${ref}:${head}`, "origin", `:${ref}`]);
      if (remote.sha !== head) fail("remote-ref-advanced");
      remote.sha = null; return "";
    }
    return realGit(cwd, args, options);
  };
  const options = { identity, store, reader, branch, change: "rejected-change", sourcePr: 40, confirmed: true, git };
  const pass = extra => discardBranchCleanup({ ...options, ...extra });
  const local = () => readLocalRef(identity, ref, realGit);
  return { temporary, primary, head, branch, ref, identity, store, remote, pull, openPulls, reader, calls, git, options, pass, local };
}

async function linkFixture(t) {
  const f = await fixture(t), path = join(f.primary, ".worktrees", "link-case"), link = ".artifacts/agent/shared-node-modules";
  await runGit(f.primary, "worktree", "add", path, f.branch);
  await handoffLocalCleanup({ identity: f.identity, store: f.store, path, change: "rejected-change", sourcePr: 40 });
  const entry = (await f.store.read()).entries[0];
  const target = join(f.temporary, "external-generated");
  await mkdir(target); await writeFile(join(target, "keep.txt"), "external target must survive\n");
  // If the implementation traverses the target, this nested marker must make normal inspection fail.
  await mkdir(join(target, ".git")); await writeFile(join(target, ".git", "keep"), "not cleanup authority\n");
  await mkdir(join(path, ".artifacts", "agent"), { recursive: true });
  const linkedPath = join(path, link), type = process.platform === "win32" ? "junction" : "dir";
  await symlink(target, linkedPath, type);
  f.remote.sha = null;
  const verify = async () => ({ disposition: "eligible", sourceHead: f.head, sourcePr: 40, refs: [] });
  const options = { identity: f.identity, store: f.store, reader: f.reader, path, change: "rejected-change", sourcePr: 40,
    link, confirmed: true, cwd: f.primary, verify };
  const unlink = extra => unlinkDisposableLink({ ...options, ...extra });
  const intactTarget = async () => {
    assert.equal(await readFile(join(target, "keep.txt"), "utf8"), "external target must survive\n");
    assert.equal(await readFile(join(target, ".git", "keep"), "utf8"), "not cleanup authority\n");
  };
  return { ...f, path, link, linkedPath, target, type, entry, options, unlink, intactTarget };
}

const result = report => report.results[0];

describe("guarded cleanup maintenance", { concurrency: 4 }, () => {
  test("branch-only discard removes exact refs without a checkout or fabricated worktree state", async t => {
    const f = await fixture(t), before = await f.store.read();
    const report = await f.pass();
    assert.equal(result(report).disposition, "discarded", JSON.stringify(report));
    assert.equal(f.remote.sha, null); assert.equal(await f.local(), null);
    assert.deepEqual(await f.store.read(), before);
    assert.equal(f.calls.some(args => args[0] === "worktree" && args[1] !== "list"), false);
    const files = await readdir(f.store.directory);
    const journal = JSON.parse(await readFile(join(f.store.directory, files.find(name => name.startsWith("branch-discard-"))), "utf8"));
    assert.equal(journal.step, "complete"); assert.equal("path" in journal, false); assert.equal("filesystem" in journal, false);
    assert.equal(result(await f.pass()).disposition, "already-discarded");
  });

  for (const absent of ["local", "remote", "both"]) test(`branch-only discard tolerates already absent ${absent} refs`, async t => {
    const f = await fixture(t);
    if (absent !== "remote") await runGit(f.primary, "update-ref", "-d", f.ref, f.head);
    if (absent !== "local") f.remote.sha = null;
    assert.equal(result(await f.pass()).disposition, "discarded");
    assert.equal(await f.local(), null); assert.equal(f.remote.sha, null);
  });

  test("branch-only discard refuses checkouts, live registrations, and missing confirmation", async t => {
    const f = await fixture(t);
    assert.equal(result(await f.pass({ confirmed: false })).reason, "discard-confirmation-required");
    const path = join(f.primary, ".worktrees", "in-use");
    await runGit(f.primary, "worktree", "add", path, f.branch);
    assert.equal(result(await f.pass()).reason, "local-ref-checked-out");
    await runGit(f.primary, "worktree", "remove", path);
    await f.store.locked(async (state, save) => {
      const entry = registerEntry(state, { path, filesystem: "1:2:3", head: f.head, ref: f.ref,
        change: "rejected-change", sourcePr: 40, candidatePr: 40, role: "implementation", disposable: [] }, owner);
      transitionEntry(entry, "release", owner, entry.generation); await save(state);
    });
    assert.equal(result(await f.pass()).reason, "discard-branch-registered");
    assert.equal(f.remote.sha, f.head); assert.equal(await f.local(), f.head);
  });

  for (const [name, mutate, expected] of [
    ["open PR", f => { f.pull.state = "open"; }, "discard-source-association"],
    ["merged PR", f => { f.pull.merged = true; f.pull.merged_at = "2026-11-07"; }, "discard-source-association"],
    ["fork", f => { f.pull.head.repo.full_name = "foreign/repo"; }, "discard-source-association"],
    ["association", f => { f.pull.body = "no association"; }, "discard-source-association"],
    ["protected ref", f => { f.remote.protected = true; }, "discard-ref-protected"],
    ["advanced remote", f => { f.remote.sha = "b".repeat(40); }, "remote-ref-advanced"],
    ["second open PR", f => { f.openPulls.push({ state: "open", head: f.pull.head }); }, "discard-branch-open-pr"],
    ["malformed open PR evidence", f => { f.openPulls.push({ state: "closed" }); }, "discard-open-pr-evidence"],
  ]) test(`branch-only discard preserves refs for ${name}`, async t => {
    const f = await fixture(t); mutate(f);
    const remote = f.remote.sha, report = await f.pass();
    assert.equal(result(report).reason, expected, JSON.stringify(report));
    assert.equal(await f.local(), f.head); assert.equal(f.remote.sha, remote);
    assert.equal(f.calls.some(args => args[0] === "push"), false);
  });

  test("advanced local head is retained before remote mutation", async t => {
    const f = await fixture(t);
    await runGit(f.primary, "commit", "--allow-empty", "-m", "advanced");
    const advanced = await runGit(f.primary, "rev-parse", "HEAD");
    await runGit(f.primary, "update-ref", f.ref, advanced, f.head);
    assert.equal(result(await f.pass()).reason, "local-ref-advanced");
    assert.equal(await f.local(), advanced); assert.equal(f.remote.sha, f.head);
  });

  test("branch-only discard resumes after remote deletion and never reuses completed authority", async t => {
    const f = await fixture(t);
    const interrupted = await f.pass({ removeRef: async () => fail("fixture-interruption") });
    assert.equal(result(interrupted).disposition, "partial"); assert.equal(f.remote.sha, null); assert.equal(await f.local(), f.head);
    assert.equal(result(await f.pass()).disposition, "discarded");
    f.remote.sha = f.head;
    assert.equal(result(await f.pass()).reason, "discard-ref-recreated"); assert.equal(f.remote.sha, f.head);
    f.remote.sha = null; await runGit(f.primary, "update-ref", f.ref, f.head);
    assert.equal(result(await f.pass()).reason, "discard-ref-recreated"); assert.equal(await f.local(), f.head);
  });

  test("remote mutation interrupted before its journal update resumes without losing refs", async t => {
    const f = await fixture(t);
    const first = await f.pass({ removeRemote: async () => { f.remote.sha = null; fail("git-operation-failed"); } });
    assert.equal(result(first).disposition, "partial"); assert.equal(await f.local(), f.head);
    assert.equal(result(await f.pass()).disposition, "discarded"); assert.equal(await f.local(), null);
  });

  test("a checkout appearing during the last evidence read blocks remote deletion", async t => {
    const f = await fixture(t); let reads = 0;
    const reader = { ...f.reader, async pages(...args) {
      if (++reads === 2) await runGit(f.primary, "worktree", "add", join(f.primary, ".worktrees", "late-owner"), f.branch);
      return f.reader.pages(...args);
    } };
    const report = await f.pass({ reader });
    assert.equal(result(report).reason, "local-ref-checked-out"); assert.equal(f.remote.sha, f.head);
    assert.equal(await f.local(), f.head);
  });

  test("a reopened PR appearing before remote deletion blocks mutation", async t => {
    const f = await fixture(t); let reads = 0;
    const reader = { ...f.reader, async pages(path, maximum) {
      if (++reads === 2) f.pull.state = "open";
      return f.reader.pages(path, maximum);
    } };
    // Reopening after one evidence read is caught by the next mandatory live verification.
    const report = await f.pass({ reader });
    assert.equal(result(report).reason, "discard-source-association");
    assert.equal(await f.local(), f.head);
    // The PR reopened during the second read, before the remote Git primitive is entered.
    assert.equal(f.remote.sha, f.head);
  });

  test("malformed ref-only journals and conflicting identities block rather than fabricate state", async t => {
    const f = await fixture(t);
    await f.store.locked(async () => {});
    const path = join(f.store.directory, `branch-discard-${digest(f.ref.toLowerCase())}.json`);
    await writeFile(path, "not-json");
    assert.equal(result(await f.pass()).reason, "discard-branch-journal");
    await writeFile(path, JSON.stringify({ version: 1, repository: f.identity.repository, ref: f.ref, change: "other-change", sourcePr: 40, head: f.head, step: "remote-delete-intent" }));
    assert.equal(result(await f.pass()).reason, "discard-branch-journal-conflict");
    assert.equal(await f.local(), f.head); assert.equal(f.remote.sha, f.head);
  });

  test("branch locks, deadlines and unsafe selectors never mutate refs", async t => {
    const f = await fixture(t), release = await f.store.acquireResources([`ref:${f.ref}`]);
    try { assert.equal(result(await f.pass()).reason, "resource-busy"); }
    finally { await release(); }
    if (process.platform === "win32") {
      const unlock = await f.store.acquireResources([`ref:${f.ref.toUpperCase()}`]);
      try { assert.equal(result(await f.pass()).reason, "resource-busy"); } finally { await unlock(); }
    }
    for (const branch of ["develop", "master", "feature/../unsafe", "refs/heads/feature/rejected", "feature/rejected.lock"]) {
      assert.equal(result(await f.pass({ branch })).reason, "discard-branch-arguments");
    }
    assert.equal(result(await f.pass({ deadline: Date.now() - 1 })).reason, "pass-deadline");
    assert.equal(await f.local(), f.head); assert.equal(f.remote.sha, f.head);
  });

  test("named-link remediation removes only the link and leaves default purge refusal unchanged", async t => {
    const f = await linkFixture(t), before = await f.store.read();
    await assert.rejects(inspectWorktree(f.identity, f.entry, { cwd: f.primary }), /content-link/);
    const report = await f.unlink();
    assert.equal(result(report).disposition, "unlinked", JSON.stringify(report));
    await assert.rejects(lstat(f.linkedPath), { code: "ENOENT" });
    await f.intactTarget();
    assert.deepEqual(await f.store.read(), before);
    assert.equal((await inspectWorktree(f.identity, f.entry, { cwd: f.primary })).clean, true);
    assert.equal(await readFile(join(f.path, "tracked.txt"), "utf8"), "preserve\n");
    assert.equal(result(await f.unlink()).reason, "disposable-link-missing");
  });

  test("named-link remediation accepts live trusted-finalization head advancement", async t => {
    const f = await linkFixture(t);
    await runGit(f.path, "commit", "--allow-empty", "-m", "trusted finalization");
    const sourceHead = await runGit(f.path, "rev-parse", "HEAD");
    const report = await f.unlink({ verify: async () => ({ disposition: "eligible", sourceHead, sourcePr: 40 }) });
    assert.equal(result(report).disposition, "unlinked", JSON.stringify(report));
    assert.equal((await f.store.read()).entries[0].head, f.head); await f.intactTarget();
  });

  test("named-link remediation refuses unsafe paths, ordinary entries and tracked links", async t => {
    const f = await linkFixture(t);
    for (const link of ["/absolute", "C:/escape", "../escape", ".artifacts/../escape", ".artifacts", ".artifacts/.git/link", "node_modules", ".artifacts-user/link", ".artifacts\\escape"]) {
      assert.equal(result(await f.unlink({ link })).reason, "disposable-link-path", link);
    }
    assert.equal(result(await f.unlink({ confirmed: false })).reason, "disposable-link-confirmation-required");
    await rm(f.linkedPath); await writeFile(f.linkedPath, "ordinary file");
    assert.equal(result(await f.unlink()).reason, "disposable-link-not-link");
    assert.equal(await readFile(f.linkedPath, "utf8"), "ordinary file");
    await runGit(f.path, "add", "-f", f.link);
    assert.equal(result(await f.unlink()).reason, "disposable-link-tracked");
    await f.intactTarget();
  });

  test("named-link remediation requires a released eligible exact candidate", async t => {
    const f = await linkFixture(t);
    assert.equal(result(await f.unlink({ path: f.target })).reason, "disposable-link-unregistered");
    assert.equal(result(await f.unlink({ change: "other-change" })).reason, "disposable-link-candidate");
    assert.equal(result(await f.unlink({ verify: async () => ({ disposition: "pending", reason: "pr-open" }) })).reason, "pr-open");
    assert.equal(result(await f.unlink({ verify: async () => ({ disposition: "eligible", sourceHead: f.head, remoteRefPresent: true }) })).reason, "disposable-link-delivery");
    assert.equal(result(await f.unlink({ cwd: f.path })).reason, "current-worktree");
    await f.store.locked(async (state, save) => { transitionEntry(state.entries[0], "claim", owner, state.entries[0].generation); await save(state); });
    assert.equal(result(await f.unlink()).reason, "owned-worktree");
    assert.equal((await lstat(f.linkedPath)).isSymbolicLink(), true); await f.intactTarget();
  });

  test("named-link remediation refuses dirty, unknown ignored and additional unsafe linked content", async t => {
    const f = await linkFixture(t);
    for (const name of ["user.txt", "secret.txt"]) {
      await writeFile(join(f.path, name), "keep");
      assert.equal(result(await f.unlink()).reason, "worktree-content");
      assert.equal(await readFile(join(f.path, name), "utf8"), "keep");
      await rm(join(f.path, name));
    }
    const other = join(f.path, ".artifacts", "agent", "another-link"); await symlink(f.target, other, f.type);
    assert.equal(result(await f.unlink()).reason, "content-link");
    assert.equal((await lstat(other)).isSymbolicLink(), true);
    assert.equal((await lstat(f.linkedPath)).isSymbolicLink(), true); await f.intactTarget();
  });

  test("named-link remediation rejects alias ancestors, cyclic links and Git metadata targets", async t => {
    const f = await linkFixture(t);
    await rm(f.linkedPath); await symlink(f.identity.common, f.linkedPath, f.type);
    assert.equal(result(await f.unlink()).reason, "disposable-link-git-target");
    await rm(f.linkedPath); await symlink(join(f.path, ".artifacts"), f.linkedPath, f.type);
    assert.equal(result(await f.unlink()).reason, "content-link-cycle");
    await rm(f.linkedPath); await symlink(f.target, f.linkedPath, f.type);
    const parent = join(f.path, ".artifacts", "agent"), moved = join(f.path, ".artifacts", "saved-agent");
    await rename(parent, moved); await symlink(moved, parent, f.type);
    assert.equal(result(await f.unlink()).reason, "disposable-link-ancestor");
    assert.equal((await lstat(join(moved, "shared-node-modules"))).isSymbolicLink(), true); await f.intactTarget();
  });

  test("internal and unresolved targets are rejected before target enumeration", async t => {
    const f = await linkFixture(t), internal = join(f.path, ".artifacts", "internal-target");
    await mkdir(join(internal, ".git"), { recursive: true }); await writeFile(join(internal, ".git", "keep"), "internal data");
    await rm(f.linkedPath); await symlink(internal, f.linkedPath, f.type);
    assert.equal(result(await f.unlink()).reason, "disposable-link-internal-target");
    assert.equal(await readFile(join(internal, ".git", "keep"), "utf8"), "internal data");
    await rm(f.linkedPath); await symlink(join(f.temporary, "absent-target"), f.linkedPath, f.type);
    assert.equal(result(await f.unlink()).reason, "disposable-link-unresolved");
    assert.equal((await lstat(f.linkedPath)).isSymbolicLink(), true); await f.intactTarget();
  });

  test("replacement links survive revalidation immediately before the unlink primitive", async t => {
    const f = await linkFixture(t), otherTarget = join(f.temporary, "other-generated");
    await mkdir(otherTarget); await writeFile(join(otherTarget, "keep.txt"), "other target");
    const report = await f.unlink({ removeLink: async (path, reported, timing) => {
      await rm(path); await symlink(otherTarget, path, f.type);
      await removeLinkEntry(path, reported, timing);
    } });
    assert.equal(result(report).reason, "disposable-link-drift");
    assert.equal((await lstat(f.linkedPath)).isSymbolicLink(), true);
    assert.equal(await canonical(f.linkedPath), await canonical(otherTarget));
    assert.equal(await readFile(join(otherTarget, "keep.txt"), "utf8"), "other target"); await f.intactTarget();
  });

  test("a link replaced by a regular file survives the final unlink checks", async t => {
    const f = await linkFixture(t);
    const report = await f.unlink({ removeLink: async (path, reported, timing) => {
      await rm(path); await writeFile(path, "replacement user file");
      await removeLinkEntry(path, reported, timing);
    } });
    assert.equal(result(report).reason, "disposable-link-drift");
    assert.equal(await readFile(f.linkedPath, "utf8"), "replacement user file"); await f.intactTarget();
  });

  test("replaced ordinary ancestors, new content and registration drift stop named unlink", async t => {
    const f = await linkFixture(t), parent = join(f.path, ".artifacts", "agent"), saved = join(f.path, ".artifacts", "saved");
    const report = await f.unlink({ removeLink: async (path, reported, timing) => {
      await rename(parent, saved); await mkdir(parent); await symlink(f.target, path, f.type);
      await removeLinkEntry(path, reported, timing);
    } });
    assert.equal(result(report).reason, "disposable-link-ancestor-drift");
    assert.equal((await lstat(f.linkedPath)).isSymbolicLink(), true);
    await rm(parent, { recursive: true }); await rename(saved, parent);
    let reads = 0;
    const dirty = await f.unlink({ inspect: async (...args) => {
      const content = await inspectWorktree(...args);
      if (++reads === 2) await writeFile(join(f.path, "late-user-file"), "keep");
      return content;
    } });
    assert.equal(result(dirty).reason, "worktree-content");
    await rm(join(f.path, "late-user-file"));
    reads = 0;
    const drift = await f.unlink({ verify: async () => {
      if (++reads === 2) await f.store.locked(async (state, save) => {
        transitionEntry(state.entries[0], "claim", owner, state.entries[0].generation); await save(state);
      });
      return f.options.verify();
    } });
    assert.equal(result(drift).reason, "disposable-link-registration-drift");
    assert.equal((await lstat(f.linkedPath)).isSymbolicLink(), true); await f.intactTarget();
  });

  test("locked links, budgets and concurrent cleanup preserve the target and released state", async t => {
    const f = await linkFixture(t), before = await f.store.read();
    assert.equal(result(await f.unlink({ removeLink: async () => fail("disposable-link-locked") })).reason, "disposable-link-locked");
    assert.equal(result(await f.unlink({ deadline: Date.now() - 1 })).reason, "pass-deadline");
    assert.equal(result(await f.unlink({ inspect: (identity, entry, options) => inspectWorktree(identity, entry, { ...options, generatedEntryLimit: 1 }) })).reason, "content-inspection-budget");
    const release = await f.store.acquireResources([`path:${f.entry.path}`, `ref:${f.entry.ref}`]);
    try { assert.equal(result(await f.unlink()).reason, "resource-busy"); } finally { await release(); }
    assert.deepEqual(await f.store.read(), before);
    assert.equal((await lstat(f.linkedPath)).isSymbolicLink(), true); await f.intactTarget();
  });

  test("selected remediation evidence cannot authorize recursive purge of an external link", async t => {
    const f = await linkFixture(t);
    const content = await inspectWorktree(f.identity, f.entry, { cwd: f.primary, remediationLink: f.link });
    assert.equal(content.selectedLink.path, f.link); assert.deepEqual(content.containedLinks, []);
    const { purgeDisposable } = await import("../../scripts/governance/local-cleanup-git.mjs");
    await assert.rejects(purgeDisposable({ ...f.entry, disposable: [...REPOSITORY_DISPOSABLE_PATHS] }, { containedLinks: content.containedLinks }), /content-link-drift/);
    assert.equal((await lstat(f.linkedPath)).isSymbolicLink(), true); await f.intactTarget();
  });

  test("named-link authority is revalidated again at the final unlink boundary", async t => {
    const f = await linkFixture(t); let reads = 0;
    const report = await f.unlink({ verify: async () => ++reads >= 3
      ? { disposition: "pending", reason: "remote-ref-present" } : f.options.verify() });
    assert.equal(result(report).reason, "remote-ref-present");
    assert.equal((await lstat(f.linkedPath)).isSymbolicLink(), true); await f.intactTarget();
  });

  test("branch CLI deletes a real fixture remote with default evidence and lease primitives", async t => {
    const f = await fixture(t), bare = join(f.temporary, "remote.git");
    await runGit(f.temporary, "init", "--bare", bare);
    await runGit(f.primary, "config", `url.${pathToFileURL(bare).href}.insteadOf`, "https://github.com/owner/repo.git");
    await runGit(f.primary, "push", "origin", `HEAD:${f.ref}`);
    const preload = join(f.temporary, "github-fixture.mjs");
    await writeFile(preload, `import { spawnSync } from "node:child_process";
globalThis.fetch = async url => {
  const path = new URL(url).pathname;
  const ref = spawnSync("git", ["--git-dir", ${JSON.stringify(bare)}, "rev-parse", "--verify", ${JSON.stringify(f.ref)}], {encoding:"utf8"});
  const sha = ref.status === 0 ? ref.stdout.trim() : null;
  let value;
  if (path.endsWith("/pulls/40")) value = ${JSON.stringify(f.pull)};
  else if (path.endsWith("/pulls")) value = [];
  else if (path.includes("/git/ref/heads/") && sha) value = {object:{sha}};
  else if (path.includes("/branches/") && sha) value = {protected:false};
  return new Response(JSON.stringify(value ?? {}), {status:value === undefined ? 404 : 200});
};
`);
    const cli = fileURLToPath(new URL("../../scripts/governance/local-worktree-cleanup.mjs", import.meta.url));
    const args = ["--import", pathToFileURL(preload).href, cli, "discard", "--branch", f.branch, "--change", "rejected-change", "--pr", "40", "--confirm-closed-unmerged", "--repo", f.primary];
    const invoke = async () => JSON.parse((await execute(process.execPath, args, {
      cwd: f.primary, env: { ...process.env, GH_TOKEN: "fixture-unused-token" }, encoding: "utf8", windowsHide: true,
    })).stdout);
    assert.equal(result(await invoke()).disposition, "discarded");
    assert.equal(await runGit(f.primary, "ls-remote", "--heads", "origin", f.ref), "");
    assert.equal(await f.local(), null);
    assert.equal(result(await invoke()).disposition, "already-discarded");
  });

  test("CLI rejects mixed selectors and branch options on unrelated commands", async t => {
    const f = await fixture(t), cli = fileURLToPath(new URL("../../scripts/governance/local-worktree-cleanup.mjs", import.meta.url));
    const invoke = args => execute(process.execPath, [cli, ...args, "--repo", f.primary], {
      cwd: f.primary, env: { ...process.env, GH_TOKEN: "fixture-unused-token" }, encoding: "utf8", windowsHide: true,
    });
    for (const args of [
      ["discard", "--branch", f.branch, "--path", f.primary, "--change", "rejected-change", "--pr", "40", "--confirm-closed-unmerged"],
      ["discard", "--branch", f.branch, "--path", "", "--change", "rejected-change", "--pr", "40", "--confirm-closed-unmerged"],
      ["discard", "--branch", f.branch, "--change", "rejected-change", "--pr", "40"],
      ["complete", "--branch", f.branch],
    ]) await assert.rejects(invoke(args), /discard-arguments/);
    for (const args of [
      ["unlink-disposable-link", "--path", f.primary, "--change", "rejected-change", "--pr", "40", "--link", ".artifacts/link"],
      ["complete", "--link", ".artifacts/link", "--confirm-link-only"],
      ["unlink-disposable-link", "--path", f.primary, "--change", "rejected-change", "--pr", "40", "--link", ".artifacts/link", "--confirm-link-only", "--role", "implementation"],
    ]) await assert.rejects(invoke(args), /disposable-link-arguments/);
  });
});
