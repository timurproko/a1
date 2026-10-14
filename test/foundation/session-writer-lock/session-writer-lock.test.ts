import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
import {
  acquireExisting,
  nativeCandidates,
  SESSION_LOCK_OVERRIDE_ENVIRONMENT,
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

describe("session-writer lock addon resolution", () => {
  const release = resolve("/release");
  const moduleUrl = pathToFileURL(join(release, "dist", "foundation", "session-writer-lock", "index.js")).href;
  const target = `${process.platform}-${process.arch}`;
  const releaseLock = join(release, "dist", "native", target, "a1_session_lock.node");
  const development = { [PRODUCT_IDENTITY.environment.developmentInstanceId]: "dev", [SESSION_LOCK_OVERRIDE_ENVIRONMENT]: "/override.node" };

  it("loads only the release's own lock when the release carries one", () => {
    const candidates = nativeCandidates(moduleUrl, { [SESSION_LOCK_OVERRIDE_ENVIRONMENT]: "/override.node" }, resolve("/elsewhere"), path => path === releaseLock);
    expect(candidates).toEqual([releaseLock]);
  });

  it("honors the override and working-directory addons only as development aids", () => {
    expect(nativeCandidates(moduleUrl, development, resolve("/elsewhere"), path => path === releaseLock)).toEqual(["/override.node", releaseLock]);
    const checkout = nativeCandidates(moduleUrl, {}, resolve("/checkout"), () => false);
    expect(checkout).toEqual([
      join(resolve("/checkout"), "dist", "native", target, "a1_session_lock.node"),
      join(resolve("/checkout"), ".artifacts", "terminal-host", "a1_session_lock.node"),
    ]);
  });
});