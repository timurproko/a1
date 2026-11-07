import { existsSync, mkdirSync, realpathSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
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
 * A crashed writer is not released by the kernel; its lock becomes stale once its holder stops
 * refreshing it. The bound keeps resume after a crash a matter of seconds.
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
    // Rationale: the lock directory is the authority; no target file exists or is needed.
    return lockfile.lockSync(path, {
      realpath: false,
      lockfilePath: path,
      stale: staleMs,
      // Rationale: a missed refresh means this process stalled; the next writer takes over, and the
      // stalled one must not crash for it.
      onCompromised: () => {},
    });
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
