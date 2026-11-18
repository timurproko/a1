import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { inspectSessionAttachment } from "../../scripts/governance/local-cleanup-attachment.mjs";

const key = value => process.platform === "win32" ? resolve(value).toLowerCase() : resolve(value);

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "a1-cleanup-attachment-"));
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 5 }));
  const primary = join(root, "primary"), worktree = join(root, "task"), store = join(root, "claims");
  const git = (...args) => execFileSync("git", args, { stdio: "pipe" });
  git("init", "-b", "develop", primary);
  writeFileSync(join(primary, "README.md"), "fixture\n");
  git("-C", primary, "add", ".");
  git("-C", primary, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-m", "fixture");
  git("-C", primary, "worktree", "add", "-b", "fix/task", worktree);
  // Compatibility: the product resolves claim identities with the native realpath, which expands Windows short names.
  const commonDir = realpathSync.native(join(primary, ".git")), gitDir = realpathSync.native(join(commonDir, "worktrees", "task"));
  mkdirSync(store, { recursive: true });
  const record = join(store, `${createHash("sha256").update(`${key(commonDir)}\0${key(gitDir)}`).digest("hex")}.json`);
  const claim = pid => ({ schema: "a1-session-worktree-claim-v1", formatVersion: 2, runtimeId: "runtime", agentId: "primary",
    sessionId: "session", worktreeRoot: worktree, worktreeCommonDir: commonDir, worktreeGitDir: gitDir, pid, startIdentity: "fixture", updatedAt: "now" });
  return { root, primary, worktree, store, record, claim };
}

test("a live claim for the exact checkout blocks and a dead or absent claim does not", async t => {
  const f = fixture(t);
  assert.equal(await inspectSessionAttachment(f.worktree, { store: f.store }), null);
  assert.equal(await inspectSessionAttachment(f.worktree, { store: join(f.root, "no-such-store") }), null);
  writeFileSync(f.record, JSON.stringify(f.claim(process.pid)));
  assert.deepEqual(await inspectSessionAttachment(f.worktree, { store: f.store }), { reason: "attached-session" });
  assert.deepEqual(await inspectSessionAttachment(f.worktree, { store: f.store, alive: () => true }), { reason: "attached-session" });
  assert.equal(await inspectSessionAttachment(f.worktree, { store: f.store, alive: () => false }), null);
  assert.equal(await inspectSessionAttachment(f.primary, { store: f.store }), null, "the primary checkout has no claim of its own");
});

test("a malformed claim for the candidate blocks instead of being ignored and nothing is modified", async t => {
  const f = fixture(t);
  writeFileSync(f.record, "\0".repeat(64));
  assert.deepEqual(await inspectSessionAttachment(f.worktree, { store: f.store }), { reason: "attached-session-unverifiable" });
  writeFileSync(f.record, JSON.stringify({ ...f.claim(process.pid), worktreeGitDir: join(f.root, "elsewhere") }));
  assert.deepEqual(await inspectSessionAttachment(f.worktree, { store: f.store }), { reason: "attached-session-unverifiable" });
  assert.equal(realpathSync(f.record).length > 0, true);
});

test("a checkout without its Git pointer and an environment-selected store are handled without an installation", async t => {
  const f = fixture(t);
  writeFileSync(f.record, JSON.stringify(f.claim(process.pid)));
  const environment = { A1_DATA_DIR: join(f.root, "data") };
  assert.equal(await inspectSessionAttachment(f.worktree, { environment }), null);
  mkdirSync(join(f.root, "data", "session-worktree-claims", "worktrees"), { recursive: true });
  writeFileSync(join(f.root, "data", "session-worktree-claims", "worktrees", f.record.split(/[\\/]/u).at(-1)), JSON.stringify(f.claim(process.pid)));
  assert.deepEqual(await inspectSessionAttachment(f.worktree, { environment }), { reason: "attached-session" });
  rmSync(join(f.worktree, ".git"));
  assert.equal(await inspectSessionAttachment(f.worktree, { store: f.store }), null);
  assert.equal(await inspectSessionAttachment(join(f.root, "missing"), { store: f.store }), null);
});
