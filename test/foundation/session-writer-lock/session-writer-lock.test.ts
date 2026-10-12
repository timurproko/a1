import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  acquireExisting,
  reserveNew,
  SessionWriterConflict,
  setSessionWriterLockBackendForTest,
  type LockBackend,
  type NativeLock,
} from "../../../src/foundation/session-writer-lock/index.js";

const roots: string[] = [];
afterEach(async () => {
  setSessionWriterLockBackendForTest(undefined);
  while (roots.length) await rm(roots.pop()!, { recursive: true, force: true });
});

function exclusiveBackend(): LockBackend {
  const held = new Set<string>();
  return {
    acquire(path): NativeLock {
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
