import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { SessionManager, type AgentSession, type AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";
import { PiWorkflowContexts } from "../../../../src/integrations/pi/engine/workflow-contexts.js";
import {
  acquireExisting,
  setSessionWriterLockBackendForTest,
  type LockBackend,
} from "../../../../src/foundation/session-writer-lock/index.js";
import { writeResumeFixture } from "../../../support/session-resume-fixture.js";

const roots: string[] = [];
afterEach(async () => {
  setSessionWriterLockBackendForTest(undefined);
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

function exclusiveBackend(): LockBackend {
  const held = new Set<string>();
  return {
    acquire(path) {
      if (held.has(path)) throw new Error("held");
      held.add(path);
      return {
        bound: existsSync(path),
        bindCreated() {},
        release() { held.delete(path); },
      };
    },
  };
}

describe("session picker writer guard", () => {
  it("refuses to rename a held session and leaves its file unchanged", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-picker-writer-"));
    roots.push(root);
    const fixture = await writeResumeFixture(resolve(root, "sessions"), root);
    const before = await readFile(fixture.path, "utf8");
    setSessionWriterLockBackendForTest(exclusiveBackend());
    const held = acquireExisting(fixture.path);
    const manager = SessionManager.create(root, resolve(root, "current"));
    const session = { sessionManager: manager } as unknown as AgentSession;
    const runtime = {} as AgentSessionRuntime;
    const contexts = new PiWorkflowContexts({ agentDir: resolve(root, "agent") }, {
      cwd: () => root,
      session: () => session,
      runtime: () => runtime,
      disposed: () => false,
      activeModel: () => null,
      emitView: () => {},
    });

    await expect(contexts.pinnedSessionSelectorContext().renameSession(fixture.path, "blocked"))
      .rejects.toThrow("session is open in another A1 process");
    expect(await readFile(fixture.path, "utf8")).toBe(before);
    held.release();
  });
});
