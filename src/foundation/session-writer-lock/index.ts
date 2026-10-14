import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export interface NativeLock {
  readonly bound: boolean;
  bindCreated(path: string): void;
  release(): void;
}
interface NativeLockConstructor {
  acquire(path: string): NativeLock;
}
export interface LockBackend {
  acquire(path: string): NativeLock;
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

let backendOverride: LockBackend | undefined;
let cachedBackend: LockBackend | undefined;

/** Development-only override naming a native lock addon to load first. */
export const SESSION_LOCK_OVERRIDE_ENVIRONMENT = "A1_SESSION_LOCK_PATH";

export function nativeCandidates(
  moduleUrl: string = import.meta.url,
  environment: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  exists: (path: string) => boolean = existsSync,
): string[] {
  const suffix = process.platform === "win32" ? "win32" : process.platform;
  const target = `${suffix}-${process.arch}`;
  // Invariant: this module sits at dist/foundation/session-writer-lock/ inside the installed release root.
  const releaseLock = resolve(fileURLToPath(new URL("../../../", moduleUrl)), "dist", "native", target, "a1_session_lock.node");
  // Security: overrides and working-directory addons are development aids; a release that carries its
  // own lock never loads native code chosen by the environment or the current directory.
  const override = environment[PRODUCT_IDENTITY.environment.developmentInstanceId] ? environment[SESSION_LOCK_OVERRIDE_ENVIRONMENT]?.trim() : undefined;
  if (exists(releaseLock)) return override ? [override, releaseLock] : [releaseLock];
  return [
    override,
    resolve(cwd, "dist", "native", target, "a1_session_lock.node"),
    resolve(cwd, ".artifacts", "terminal-host", "a1_session_lock.node"),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

function loadNativeBackend(): LockBackend | undefined {
  const require = createRequire(import.meta.url);
  for (const candidate of nativeCandidates()) {
    if (!existsSync(candidate)) continue;
    try {
      const loaded = require(candidate) as { SessionLock?: NativeLockConstructor };
      if (loaded.SessionLock?.acquire) return loaded.SessionLock;
    } catch {
      // Compatibility: an addon for another Node ABI is unusable; try the next location.
    }
  }
  return undefined;
}

function processIsLive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Development fallback. Installed releases carry the verified Node-API lock resolved above. */
function portableBackend(): LockBackend {
  const root = join(tmpdir(), "a1-session-writer-locks");
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const authorityPath = (kind: "location" | "identity", key: string) =>
    join(root, `${createHash("sha256").update(`${kind}\0${key}`).digest("hex")}.lock`);
  const locationKey = (path: string) =>
    `${realpathSync.native(dirname(path))}\0${process.platform === "win32" ? basename(path).toLowerCase() : basename(path)}`;
  const identityKey = (path: string) => {
    const physical = realpathSync.native(path);
    const metadata = statSync(physical, { bigint: true });
    return `${metadata.dev}:${metadata.ino}`;
  };
  const acquireAuthority = (path: string) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const descriptor = openSync(path, "wx", 0o600);
        writeFileSync(descriptor, JSON.stringify({ pid: process.pid, kind: process.env.A1_TAB_ID ? "resident tab" : "another A1 process" }));
        closeSync(descriptor);
        return;
      } catch (error) {
        if (attempt === 0) {
          try {
            const record = JSON.parse(readFileSync(path, "utf8")) as { pid?: unknown };
            if (typeof record.pid === "number" && !processIsLive(record.pid)) {
              rmSync(path, { force: true });
              continue;
            }
          } catch {
            // Security: malformed or racing lock evidence remains authoritative and fails closed.
          }
        }
        throw error;
      }
    }
  };
  return {
    acquire(requested: string): NativeLock {
      const absolute = resolve(requested);
      const location = authorityPath("location", locationKey(absolute));
      acquireAuthority(location);
      let identity: string | undefined;
      let identityAcquired = false;
      let bound = false;
      try {
        if (existsSync(absolute)) {
          const key = identityKey(absolute);
          identity = authorityPath("identity", key);
          acquireAuthority(identity);
          identityAcquired = true;
          if (identityKey(absolute) !== key) {
            throw new Error("session identity changed while its writer lock was acquired");
          }
          rmSync(location, { force: true });
          bound = true;
        }
      } catch (error) {
        rmSync(location, { force: true });
        if (identityAcquired && identity !== undefined) rmSync(identity, { force: true });
        throw error;
      }
      let released = false;
      return {
        get bound() { return bound; },
        bindCreated(created: string) {
          if (bound || resolve(created) !== absolute || !existsSync(absolute)) {
            throw new Error("created session does not match its reservation");
          }
          const key = identityKey(absolute);
          identity = authorityPath("identity", key);
          acquireAuthority(identity);
          if (identityKey(absolute) !== key) {
            rmSync(identity, { force: true });
            identity = undefined;
            throw new Error("created session identity changed during bind");
          }
          rmSync(location, { force: true });
          bound = true;
        },
        release() {
          if (released) throw new Error("session lock was already released");
          released = true;
          rmSync(bound ? identity! : location, { force: true });
        },
      };
    },
  };
}

function backend(): LockBackend {
  return backendOverride ?? (cachedBackend ??= loadNativeBackend() ?? portableBackend());
}

function acquire(path: string): SessionWriterHandle {
  const absolute = resolve(path);
  let lock: NativeLock;
  try {
    lock = backend().acquire(absolute);
  } catch {
    throw new SessionWriterConflict(absolute, process.env.A1_TAB_ID ? "a resident tab" : "another A1 process");
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

/** Test-only backend seam; passing undefined restores native discovery. */
export function setSessionWriterLockBackendForTest(value: LockBackend | undefined): void {
  backendOverride = value;
  cachedBackend = undefined;
}
