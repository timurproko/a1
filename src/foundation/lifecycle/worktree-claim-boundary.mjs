import { AsyncLocalStorage } from "node:async_hooks";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { trackClaimGateChild, tryAcquireClaimGate } from "./claim-gate-core.mjs";
import { assertWorktreeCleanupSnapshot, captureWorktreeCleanupSnapshot } from "./worktree-cleanup-snapshot.mjs";

// Compatibility: standalone repository cleanup reads the same identity data without requiring compiled TypeScript or an installed runtime.
const product = JSON.parse(await readFile(new URL("../../product-identity.json", import.meta.url), "utf8"));
const active = new AsyncLocalStorage();
const key = path => process.platform === "win32" ? resolve(path).toLowerCase() : resolve(path);
const digest = value => createHash("sha256").update(value).digest("hex");
const failure = (code, message) => Object.assign(new Error(message), { code, cleanupCode: code });
const ENVIRONMENT_KEY = "WORKTREE_CLEANUP_RESERVATION";
const reservationBinding = reservation => digest(JSON.stringify({ expected: reservation.expected, dataDir: reservation.dataDir }));
function parseReservation(bytes) {
  try {
    const value = JSON.parse(bytes);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid authority");
    return value;
  }
  catch { throw failure("worktree-cleanup-reservation", "cleanup authority is malformed; files were retained"); }
}

/** The same claim-store root attachment resolves; callers may override only their isolated/runtime data directory. */
export function cleanupClaimDirectory({ dataDir, environment = process.env } = {}) {
  const home = environment.HOME ?? environment.USERPROFILE ?? homedir();
  return join(resolve(dataDir ?? environment[product.environment.dataDir] ?? (process.platform === "win32"
    ? join(environment.LOCALAPPDATA ?? home, product.state.windowsControlDirectory)
    : join(environment.XDG_DATA_HOME ?? join(home, ".local", "share"), product.state.unixControlDirectory))), product.state.sessionWorktreeClaimDirectory);
}

async function requireUnclaimed(directory, snapshot) {
  // Compatibility: a known legacy lease writer is not participating in target exclusion; do not overlap it.
  const legacy = await lstat(join(directory, "mutation.authority.gate")).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const barrier = await lstat(join(directory, "mutation.lock")).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (legacy && (!legacy.isFile() || legacy.isSymbolicLink()) || barrier && (!barrier.isDirectory() || barrier.isSymbolicLink())) {
    throw failure("attached-session-unverifiable", "legacy claim coordination must be recovered before cleanup");
  }
  const name = digest(`${key(snapshot.commonDir)}\0${key(snapshot.gitDir)}`);
  try {
    const path = join(directory, "worktrees", `${name}.json`), stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024) throw new Error("invalid claim");
    const claim = JSON.parse(await readFile(path, "utf8"));
    const session = value => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(value);
    if (claim?.schema !== "a1-session-worktree-claim-v1" || !Number.isSafeInteger(claim.pid) || claim.pid <= 0
      || !session(claim.runtimeId) || !session(claim.sessionId) || typeof claim.updatedAt !== "string"
      || typeof claim.startIdentity !== "string" || !claim.startIdentity || claim.startIdentity.length > 512 || claim.startIdentity.includes("\0")
      || (claim.formatVersion === undefined ? claim.agentId !== undefined : claim.formatVersion !== 2 || !session(claim.agentId))
      || key(claim.worktreeRoot) !== key(snapshot.path) || key(claim.worktreeGitDir) !== key(snapshot.gitDir)
      || key(claim.worktreeCommonDir) !== key(snapshot.commonDir)) throw new Error("invalid claim");
    try { process.kill(claim.pid, 0); }
    catch (error) { if (error.code === "ESRCH") return; throw error; }
    throw failure("attached-session", "a live session owns the checkout; cleanup did not run");
  } catch (error) {
    if (error.code === "ENOENT") return;
    if (error.code === "attached-session") throw error;
    throw failure("attached-session-unverifiable", "the editing claim cannot be verified; cleanup did not run");
  }
}

/** Validate a delegated capability against the still-present non-expiring gate, never against a timer or parent PID. */
async function delegated(directory, expected, environment) {
  const local = active.getStore(), serialized = environment[ENVIRONMENT_KEY];
  const reservation = local ?? (serialized ? parseReservation(serialized) : null);
  if (!reservation) return null;
  if (typeof reservation.nonce !== "string" || !/^[a-f0-9-]{36}$/u.test(reservation.nonce)) throw failure("worktree-cleanup-reservation", "cleanup authority has no valid generation");
  if (reservation.authority !== join(directory, `${digest(key(expected.path))}.gate`)) throw failure("worktree-cleanup-reservation", "cleanup authority belongs to another claim store");
  assertWorktreeCleanupSnapshot(reservation.expected, expected);
  const stat = await lstat(reservation.authority);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) throw failure("worktree-cleanup-reservation", "cleanup authority is unavailable; files were retained");
  const stored = parseReservation(await readFile(reservation.authority, "utf8"));
  if (stored.nonce !== reservation.nonce || stored.binding !== reservationBinding(reservation)) throw failure("worktree-cleanup-reservation", "cleanup approval or claim namespace changed; files were retained");
  return reservation;
}

/** Shared attachment exclusion around repository destructive work. Nested cleanup may borrow only this exact target. */
export async function withUnclaimedWorktree(expected, options, operation) {
  expected = Object.freeze({ ...expected });
  assertWorktreeCleanupSnapshot(expected, await captureWorktreeCleanupSnapshot(expected.path));
  return withTargetExclusion(expected, options, async () => {
    await requireUnclaimed(cleanupClaimDirectory({ ...options, dataDir: active.getStore().dataDir }), expected);
    return operation();
  }, true);
}

/** Attachment never borrows cleanup authority, including when called by a delegated cleanup child. */
export async function withWorktreeClaimExclusion(expected, options, operation) {
  return withTargetExclusion(expected, options, async () => {
    const pointer = join(expected.path, ".git"), stat = await lstat(pointer);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) throw failure("worktree-context-changed", "checkout pointer changed while claiming it");
    const bytes = (await readFile(pointer, "utf8")).trim();
    const gitDir = bytes.startsWith("gitdir: ") ? await realpath(resolve(expected.path, bytes.slice(8))) : null;
    if (!gitDir || key(gitDir) !== key(expected.gitDir)
      || key(await realpath(resolve(gitDir, (await readFile(join(gitDir, "commondir"), "utf8")).trim()))) !== key(expected.commonDir)
      || key(await realpath((await readFile(join(gitDir, "gitdir"), "utf8")).trim())) !== key(pointer)
      || (await readFile(join(gitDir, "HEAD"), "utf8")).trim() !== `ref: ${expected.ref}`) throw failure("worktree-context-changed", "checkout changed while claiming it");
    return operation();
  }, false);
}

async function withTargetExclusion(expected, options, operation, borrow) {
  expected = Object.freeze({ ...expected });
  options.signal?.throwIfAborted();
  const location = join(expected.commonDir, "worktree-claim-gates");
  if (key(await realpath(expected.commonDir)) !== key(expected.commonDir)) throw failure("worktree-coordination-boundary", "the common repository path changed");
  await mkdir(location, { recursive: true, mode: 0o700 });
  const metadata = await lstat(location), directory = await realpath(location);
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || key(directory) !== key(location)) throw failure("worktree-coordination-boundary", "the target gate directory is linked or replaced");
  const environment = options.environment ?? process.env;
  const borrowed = borrow ? await delegated(directory, expected, environment) : null;
  if (borrowed && options.dataDir !== undefined && key(options.dataDir) !== key(borrowed.dataDir)) throw failure("worktree-cleanup-reservation", "cleanup claim namespace differs from its approval");
  let gate;
  if (!borrowed) {
    const deadline = Date.now() + (options.lockTimeoutMs ?? 2_000);
    for (;;) {
      options.signal?.throwIfAborted();
      gate = tryAcquireClaimGate(join(directory, digest(key(expected.path))));
      if (gate) break;
      if (Date.now() >= deadline) throw failure("worktree-claim-busy", "attachment/cleanup authority is busy or abandoned; no lease is reclaimed");
      await delay(20, undefined, { signal: options.signal });
    }
  }
  try {
    options.signal?.throwIfAborted();
    if (borrow) await assertApprovedCleanupTarget(expected, { environment });
    const reservation = borrowed ?? Object.freeze({ authority: gate.path, nonce: gate.nonce, expected, dataDir: dirname(cleanupClaimDirectory(options)) });
    if (gate) gate.bind(reservationBinding(reservation));
    return await active.run(reservation, operation);
  } finally { gate?.release(); }
}

/** Check the original runtime approval as well as the current repository caller's captured target. */
export async function assertApprovedCleanupTarget(expected, { environment = process.env } = {}) {
  const serialized = environment[ENVIRONMENT_KEY], approved = active.getStore()?.expected ?? (serialized ? parseReservation(serialized).expected : null);
  if (approved) assertWorktreeCleanupSnapshot(approved, expected);
  assertWorktreeCleanupSnapshot(expected, await captureWorktreeCleanupSnapshot(expected.path));
}

/** Validate runtime approval before synchronous/generated-content deletion as well as before destructive children. */
export async function verifyCleanupReservation(path) {
  const serialized = process.env[ENVIRONMENT_KEY], approved = active.getStore()?.expected ?? (serialized ? parseReservation(serialized).expected : null);
  if (!approved) return;
  if (key(path) !== key(approved.path)) throw failure("worktree-cleanup-snapshot-changed", "cleanup approval names another checkout");
  await assertApprovedCleanupTarget(await captureWorktreeCleanupSnapshot(path));
}

/** Spawn only while unclaimed; authority is released on child close, not on timeout/abort/error notification. */
export async function executeUnclaimedWorktreeCleanup(expected, command, args, options = {}) {
  return withUnclaimedWorktree(expected, options, () => executeCleanupCommand(command, args, { ...options, protectTarget: true }));
}

/** Repository descendants share the reservation and leave durable intent if their immediate parent dies. */
export async function executeCleanupCommand(command, args, options = {}) {
  const environment = options.environment ?? process.env;
  const local = active.getStore(), reservation = local ?? (environment[ENVIRONMENT_KEY] ? parseReservation(environment[ENVIRONMENT_KEY]) : null);
  let closed = () => {};
  try {
    // Concurrency: reserve synchronously before any await, so an enclosing callback's error cannot release ahead of a pending spawn.
    if (local) closed = trackClaimGateChild(reservation);
    if (reservation) await delegated(join(reservation.expected.commonDir, "worktree-claim-gates"), reservation.expected, environment);
    if (options.protectTarget) {
      if (!reservation) throw failure("worktree-cleanup-reservation", "destructive work requires an unclaimed-target reservation");
      await assertApprovedCleanupTarget(reservation.expected, { environment });
    }
    if (reservation && !local) closed = trackClaimGateChild(reservation);
    return await runReservedChild(command, args, options, environment, reservation, closed);
  } catch (error) { closed(); throw error; }
}

function runReservedChild(command, args, options, environment, reservation, closed) {
  return new Promise((resolveResult, reject) => {
    let child;
    try { child = spawn(command, args, { cwd: options.cwd, windowsHide: true, detached: options.protectTarget === true,
      env: { ...environment, ...(reservation ? { [ENVIRONMENT_KEY]: JSON.stringify(reservation), [product.environment.dataDir]: reservation.dataDir } : {}) }, stdio: ["pipe", "pipe", "pipe"] }); }
    catch (error) { closed(); reject(error); return; }
    child.stdin.on("error", () => {}); child.stdin.end(options.input ?? "");
    let output = "", errors = "", cause;
    const stop = () => { cause ??= failure("worktree-cleanup-interrupted", "cleanup was interrupted; exclusion remains until its child closes"); child.kill(); };
    const timer = setTimeout(stop, options.timeoutMs ?? 300_000);
    options.signal?.addEventListener("abort", stop, { once: true });
    if (options.signal?.aborted) stop();
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    const maximum = options.maxBuffer ?? 4 * 1024 * 1024;
    const collect = (current, bytes) => {
      if (Buffer.byteLength(current) + Buffer.byteLength(bytes) <= maximum) return current + bytes;
      cause ??= failure("worktree-cleanup-output-limit", "cleanup output exceeded its verification bound; it was not accepted as complete evidence");
      child.kill(); return current;
    };
    child.stdout.on("data", bytes => { output = collect(output, bytes); });
    child.stderr.on("data", bytes => { errors = collect(errors, bytes); });
    child.on("error", error => { cause = error; });
    child.on("close", code => {
      clearTimeout(timer); options.signal?.removeEventListener("abort", stop);
      try { closed(); } catch (error) { cause ??= error; }
      if (cause || code !== 0) reject(Object.assign(cause ?? new Error("repository cleanup failed"), { stdout: output, stderr: errors }));
      else resolveResult(output);
    });
  });
}
