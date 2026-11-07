import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readdir, realpath, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { tryAcquireClaimGate } from "./claim-gate.js";

interface ClaimLockOptions { readonly signal?: AbortSignal; readonly lockTimeoutMs?: number }
const FILES = new Set(["owner.json", "owner.next", "recovery.json", "recovery.next"]);

/** Inventory is advisory and read-only, including when abandoned metadata needs recovery. */
export async function claimMutationPending(directory: string): Promise<boolean> {
  try {
    const barrier = join(directory, "mutation.lock");
    const metadata = await lstat(barrier);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) return true;
    const files = await readdir(barrier);
    return files.some(name => name !== "recovery.json");
  } catch (error) {
    return !hasCode(error, "ENOENT");
  }
}

/**
 * The persistent directory excludes legacy wx-file writers. Only the gate beside the authority file
 * permits upgraded mutations; owner.json is disposable evidence, never a liveness oracle.
 * Never remove the barrier or authority file: doing so would create a second lock universe.
 */
export async function withSessionClaimLock<T>(directory: string, options: ClaimLockOptions, operation: () => Promise<T>): Promise<T> {
  options.signal?.throwIfAborted();
  let canonical: string;
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    canonical = await realpath(directory);
  } catch (cause) {
    throw failure("worktree-coordination-io", "cannot access the A1 claim directory; check permissions and filesystem availability", cause);
  }
  const authority = join(canonical, "mutation.authority");
  const barrier = join(canonical, "mutation.lock");
  const deadline = Date.now() + (options.lockTimeoutMs ?? 2_000);
  let gate;
  while (gate === undefined) {
    options.signal?.throwIfAborted();
    const acquired = tryAcquireClaimGate(authority);
    if (acquired !== null) { gate = acquired; break; }
    if (Date.now() >= deadline) throw failure("worktree-claim-busy", "worktree mutation is temporarily busy; automatic runtime registration will retry, and linking can be retried");
    await delay(Math.min(20, Math.max(1, deadline - Date.now())), undefined, { signal: options.signal });
  }
  let operationStarted = false;
  try {
    options.signal?.throwIfAborted();
    try { await mkdir(barrier, { mode: 0o700 }); }
    catch (error) { if (!hasCode(error, "EEXIST")) throw error; }
    const metadata = await lstat(barrier);
    if (metadata.isSymbolicLink() || (!metadata.isFile() && !metadata.isDirectory())) {
      throw failure("worktree-coordination-boundary", "worktree mutation barrier is not a regular file or directory; retain it for inspection");
    }
    if (metadata.isFile()) {
      // Security: a new OS gate proves nothing about an older writer that does not participate in it.
      // Even a dead legacy PID does not exclude a competing legacy reclaimer's rename race.
      throw failure("worktree-legacy-recovery-required", "legacy worktree lock prevents safe recovery; stop all older A1 processes, back up only session-worktree-claims/mutation.lock while stopped, then start the updated A1; do not delete sessions or worktree claims");
    }
    for (const name of await readdir(barrier)) {
      const entry = await lstat(join(barrier, name));
      if (!FILES.has(name) || !entry.isFile() || entry.isSymbolicLink()) {
        throw failure("worktree-coordination-boundary", "unexpected worktree coordination entry; retain it for inspection rather than deleting the claim store");
      }
    }
    const owner = join(barrier, "owner.json");
    const pending = join(barrier, "owner.next");
    if (await exists(owner) || await exists(pending)) {
      // Security: keep one bounded summary, not an accumulating dump of potentially sensitive corrupt bytes.
      await publish(barrier, "recovery", { reason: "abandoned-mutation-metadata", recoveredAt: new Date().toISOString() });
      await rm(owner, { force: true });
      await rm(pending, { force: true });
    }
    await publish(barrier, "owner", { generation: randomUUID(), acquiredAt: new Date().toISOString() });
    try {
      options.signal?.throwIfAborted();
      operationStarted = true;
      return await operation();
    } finally {
      // Concurrency: authority is still held; no successor can publish until after this removal completes.
      await rm(owner, { force: true });
    }
  } catch (error) {
    if (operationStarted) throw error;
    if (error instanceof Error && (error.name === "AbortError" || ("code" in error && String(error.code).startsWith("worktree-")))) throw error;
    throw failure("worktree-coordination-io", "worktree coordination I/O failed; check A1 data-directory permissions and filesystem availability, then retry", error);
  } finally {
    gate.release();
  }
}

async function publish(directory: string, name: string, value: unknown): Promise<void> {
  const pending = join(directory, `${name}.next`);
  await rm(pending, { force: true });
  const handle = await open(pending, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`);
    await handle.sync();
  } finally { await handle.close(); }
  await rename(pending, join(directory, `${name}.json`));
}

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if (hasCode(error, "ENOENT")) return false; throw error; }
}
function hasCode(error: unknown, code: string): boolean { return error instanceof Error && "code" in error && error.code === code; }
function failure(code: string, message: string, cause?: unknown): Error { return Object.assign(new Error(message, { cause }), { code }); }
