import { existsSync, mkdirSync, realpathSync, statSync, readFileSync, writeFileSync, unlinkSync, rmdirSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import lockfile from "proper-lockfile";

/** One held authority; `bindCreated` moves a reservation onto the file it created. */
export interface WriterLock {
  readonly bound: boolean;
  bindCreated(path: string): void;
  release(): void;
}
export interface LockBackend {
  acquire(path: string): WriterLock;
}

/** Reports that a canonical session identity already has a live writer. */
export class SessionWriterConflict extends Error {
  readonly path: string;
  readonly holderKind: string;
  constructor(path: string, holderKind = "another A1 process") {
    super(`session is open in ${holderKind}`);
    this.name = "SessionWriterConflict";
    this.path = path;
    this.holderKind = holderKind;
  }
}

export interface SessionWriterHandle {
  readonly path: string;
  readonly bound: boolean;
  bind(createdPath?: string): void;
  release(): void;
}

/**
 * Heartbeats diagnose ownership loss, but never authorize takeover of a live writer.
 * Dead owners are recovered by process absence; legacy or uncertain owners stay protected.
 */
export const SESSION_WRITER_STALE_MS = 10_000;

let backendOverride: LockBackend | undefined;
let cachedBackend: LockBackend | undefined;

/**
 * Locks live in one per-user directory keyed by canonical identity, not beside the session, so two
 * spellings of one file (case, short names, links, hard links) contend for the same lock.
 */
export function lockfileBackend(root = join(tmpdir(), "a1-session-writer-locks"), staleMs = SESSION_WRITER_STALE_MS): LockBackend {
  const authorityPath = (kind: "location" | "identity", key: string) =>
    join(root, `${createHash("sha256").update(`${kind}\0${key}`).digest("hex")}.lock`);
  // Platform: Windows file names are case-insensitive, and realpath canonicalizes only existing parents.
  const locationKey = (path: string) =>
    `${realpathSync.native(dirname(path))}\0${process.platform === "win32" ? basename(path).toLowerCase() : basename(path)}`;
  const identityKey = (path: string) => {
    const metadata = statSync(realpathSync.native(path), { bigint: true });
    return `${metadata.dev}:${metadata.ino}`;
  };
  const acquireAuthority = (path: string): (() => void) => {
    mkdirSync(root, { recursive: true, mode: 0o700 });
    // The nonempty owner record also prevents legacy heartbeat-only clients from reclaiming
    // a stalled live writer: proper-lockfile removes directories non-recursively.
    reclaimDeadWriter(path);
    const release = lockfile.lockSync(path, {
      realpath: false, lockfilePath: path, stale: staleMs,
      onCompromised: () => { throw new Error("Session writer ownership was lost; execution has been stopped."); },
    });
    const owner = { pid: process.pid, token: randomUUID() };
    const stamp = statSync(path).mtime;
    try {
      writeFileSync(join(path, "owner.json"), JSON.stringify(owner), { flag: "wx", mode: 0o600 });
      // Creating the owner record must not masquerade as a foreign heartbeat.
      utimesSync(path, stamp, stamp);
    } catch (error) {
      try { unlinkSync(join(path, "owner.json")); release(); } catch { /* Retain uncertain ownership. */ }
      throw error;
    }
    return () => {
      if (readWriterOwner(path)?.token !== owner.token) throw new Error("Session writer ownership was lost");
      // A legacy contender must not reclaim the short empty-directory release interval.
      const now = new Date(); utimesSync(path, now, now);
      unlinkSync(join(path, "owner.json"));
      release();
    };
  };
  return {
    acquire(requested: string): WriterLock {
      const absolute = resolve(requested);
      let releaseCurrent = acquireAuthority(authorityPath("location", locationKey(absolute)));
      let bound = false;
      const bindTo = () => {
        const key = identityKey(absolute);
        const releaseIdentity = acquireAuthority(authorityPath("identity", key));
        if (identityKey(absolute) !== key) {
          releaseIdentity();
          throw new Error("session identity changed while its writer lock was acquired");
        }
        // Invariant: the identity lock is held before the location lock goes, so there is no gap.
        releaseCurrent();
        releaseCurrent = releaseIdentity;
        bound = true;
      };
      try {
        if (existsSync(absolute)) bindTo();
      } catch (error) {
        releaseCurrent();
        throw error;
      }
      let released = false;
      return {
        get bound() { return bound; },
        bindCreated(created: string) {
          if (bound || resolve(created) !== absolute || !existsSync(absolute)) {
            throw new Error("created session does not match its reservation");
          }
          bindTo();
        },
        release() {
          if (released) throw new Error("session lock was already released");
          released = true;
          try { releaseCurrent(); } catch { /* Compatibility: a reclaimed stale lock is already gone. */ }
        },
      };
    },
  };
}

function readWriterOwner(path: string): { pid: number; token: string } | null {
  try {
    const source = readFileSync(join(path, "owner.json"), "utf8");
    if (source.length > 1024) return null;
    const value = JSON.parse(source) as { pid?: unknown; token?: unknown };
    return Number.isSafeInteger(value.pid) && (value.pid as number) > 0 && typeof value.token === "string"
      && /^[a-f0-9-]{36}$/.test(value.token) ? value as { pid: number; token: string } : null;
  } catch { return null; }
}

function writerAbsent(pid: number): boolean {
  try { process.kill(pid, 0); return false; }
  catch (error) { return error instanceof Error && "code" in error && error.code === "ESRCH"; }
}

function reclaimDeadWriter(path: string): void {
  if (!existsSync(path)) return;
  const owner = readWriterOwner(path);
  // Age and malformed/legacy records cannot prove that a writer is absent.
  if (owner === null || !writerAbsent(owner.pid)) throw new Error("Session writer is live or unverifiable");
  const gate = join(path, ".reclaim");
  mkdirSync(gate);
  try {
    if (readWriterOwner(path)?.token !== owner.token || !writerAbsent(owner.pid)) throw new Error("Session writer changed during recovery");
    const now = new Date(); utimesSync(path, now, now);
    unlinkSync(join(path, "owner.json"));
    rmdirSync(gate);
    rmdirSync(path);
  } catch (error) {
    try { rmdirSync(gate); } catch { /* A partial recovery remains conservatively blocked. */ }
    throw error;
  }
}

function backend(): LockBackend {
  return backendOverride ?? (cachedBackend ??= lockfileBackend());
}

function acquire(path: string): SessionWriterHandle {
  const absolute = resolve(path);
  let lock: WriterLock;
  try {
    lock = backend().acquire(absolute);
  } catch {
    throw new SessionWriterConflict(absolute);
  }
  let released = false;
  return {
    path: absolute,
    get bound() { return lock.bound; },
    bind(createdPath = absolute) {
      if (released) throw new Error("session writer lock was released");
      if (!lock.bound) lock.bindCreated(resolve(createdPath));
    },
    release() {
      if (released) return;
      released = true;
      lock.release();
    },
  };
}

export function acquireExisting(path: string): SessionWriterHandle {
  if (!existsSync(path)) throw new Error(`session file does not exist: ${path}`);
  return acquire(path);
}

export function reserveNew(parent: string, name: string): SessionWriterHandle {
  if (!name || basename(name) !== name) throw new Error("session reservation requires one file name");
  return acquire(join(parent, name));
}

export function acquireSessionWriter(path: string): SessionWriterHandle {
  return acquire(path);
}

export function bind(handle: SessionWriterHandle, createdPath?: string): void {
  handle.bind(createdPath);
}

export function release(handle: SessionWriterHandle): void {
  handle.release();
}

/** Test-only backend seam; passing undefined restores the default backend. */
export function setSessionWriterLockBackendForTest(value: LockBackend | undefined): void {
  backendOverride = value;
  cachedBackend = undefined;
}
