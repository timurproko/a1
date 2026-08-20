import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  bindPiRuntimeSession,
  createPiRuntimeIntegration,
  disposePiRuntimeIntegration,
  replacePiRuntimeSession,
} from "../../../src/foundation/pi-engine-adapter/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("official Pi runtime integration", () => {
  it("creates, rebinds, replaces, and disposes an isolated public runtime", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-pi-runtime-"));
    roots.push(root);
    const cwd = resolve(root, "work");
    const agentDir = resolve(root, "agent");
    const sessionDir = resolve(root, "sessions");
    await Promise.all([mkdir(cwd), mkdir(agentDir), mkdir(sessionDir)]);
    const runtime = await createPiRuntimeIntegration({ cwd, agentDir, sessionDir });
    const rebound: string[] = [];
    const unbind = bindPiRuntimeSession(runtime, async session => { rebound.push(session.sessionId); });

    const replacement = await replacePiRuntimeSession(runtime, { kind: "new" });
    expect(replacement.cancelled).toBe(false);
    expect(runtime.cwd).toBe(cwd);
    expect(runtime.session.sessionId).toMatch(/^[a-f0-9-]+$/i);
    expect(rebound).toContain(runtime.session.sessionId);

    unbind();
    await expect(disposePiRuntimeIntegration(runtime)).resolves.toBeUndefined();
  });

  it("uses the official resume replacement path without retaining the old session", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-pi-runtime-"));
    roots.push(root);
    const cwd = resolve(root, "work");
    const agentDir = resolve(root, "agent");
    await Promise.all([mkdir(cwd), mkdir(agentDir)]);
    const runtime = await createPiRuntimeIntegration({ cwd, agentDir, sessionDir: resolve(root, "sessions") });
    const original = runtime.session;

    await expect(replacePiRuntimeSession(runtime, { kind: "resume", sessionPath: resolve(root, "missing.jsonl") })).resolves.toEqual({ cancelled: false });
    expect(runtime.session).not.toBe(original);
    await disposePiRuntimeIntegration(runtime);
  });
});
