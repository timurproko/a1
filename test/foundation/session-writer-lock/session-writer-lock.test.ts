import { mkdirSync, readdirSync, utimesSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  acquireExisting,
  lockfileBackend,
  reserveNew,
  SessionWriterConflict,
  setSessionWriterLockBackendForTest,
  type LockBackend,
  type WriterLock,
} from "../../../src/foundation/session-writer-lock/index.js";

const roots: string[] = [];
afterEach(async () => {
  setSessionWriterLockBackendForTest(undefined);
  while (roots.length) await rm(roots.pop()!, { recursive: true, force: true });
});

function exclusiveBackend(): LockBackend {
  const held = new Set<string>();
  return {
    acquire(path): WriterLock {
      if (held.has(path)) throw new Error("held");
      held.add(path);
      let bound = false;
      return {
        get bound() { return bound; },
        bindCreated(created) {
          if (created !== path) throw new Error("wrong path");
          bound = true;
        },
        release() { held.delete(path); },
      };
    },
  };
}

describe("session writer lock", () => {
  it("holds an existing session until explicit release", async () => {
    const root = await mkdtemp(join(tmpdir(), "session-writer-")); roots.push(root);
    const path = join(root, "session.jsonl");
    writeFileSync(path, "{}\n");
    setSessionWriterLockBackendForTest(exclusiveBackend());
    const held = acquireExisting(path);
    expect(() => acquireExisting(path)).toThrow(SessionWriterConflict);
    held.release();
    acquireExisting(path).release();
  });

  it("reserves and binds a new session without a release gap", async () => {
    const root = await mkdtemp(join(tmpdir(), "session-writer-")); roots.push(root);
    mkdirSync(root, { recursive: true });
    setSessionWriterLockBackendForTest(exclusiveBackend());
    const held = reserveNew(root, "new.jsonl");
    expect(held.bound).toBe(false);
    writeFileSync(held.path, "");
    held.bind();
    expect(held.bound).toBe(true);
    expect(() => reserveNew(root, "new.jsonl")).toThrow(SessionWriterConflict);
    held.release();
  });
});

describe("session writer lockfile backend", () => {
  it("excludes a second writer, then admits it after release", async () => {
    const root = await mkdtemp(join(tmpdir(), "session-writer-")); roots.push(root);
    const path = join(root, "session.jsonl");
    writeFileSync(path, "{}\n");
    const backend = lockfileBackend(join(root, "locks"));
    const held = backend.acquire(path);
    expect(held.bound).toBe(true);
    expect(() => backend.acquire(path)).toThrow();
    held.release();
    backend.acquire(path).release();
  });

  it("treats Windows-style case aliases of one name as one location", async () => {
    if (process.platform !== "win32") return;
    const root = await mkdtemp(join(tmpdir(), "session-writer-")); roots.push(root);
    const backend = lockfileBackend(join(root, "locks"));
    const held = backend.acquire(join(root, "new.jsonl"));
    expect(() => backend.acquire(join(root, "NEW.JSONL"))).toThrow();
    held.release();
  });

  it("reclaims a lock whose holder stopped refreshing it", async () => {
    const root = await mkdtemp(join(tmpdir(), "session-writer-")); roots.push(root);
    const path = join(root, "session.jsonl");
    writeFileSync(path, "{}\n");
    const locks = join(root, "locks");
    lockfileBackend(locks, 60_000).acquire(path);
    // Invariant: an abandoned lock directory ages past the bound because nothing refreshes it.
    const stale = new Date(Date.now() - 120_000);
    for (const name of readdirSync(locks)) utimesSync(join(locks, name), stale, stale);
    const reclaimed = lockfileBackend(locks, 60_000).acquire(path);
    expect(reclaimed.bound).toBe(true);
    reclaimed.release();
  });
});
