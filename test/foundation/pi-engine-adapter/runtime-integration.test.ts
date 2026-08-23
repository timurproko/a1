import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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

  it("surfaces pinned Pi's model-scope warnings for unmatched patterns in the enabledModels setting", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-pi-runtime-"));
    roots.push(root);
    const cwd = resolve(root, "work");
    const agentDir = resolve(root, "agent");
    await Promise.all([mkdir(cwd), mkdir(agentDir)]);
    await writeFile(resolve(agentDir, "settings.json"), JSON.stringify({ enabledModels: ["github-copilot/does-not-exist-anywhere"] }), "utf8");
    const runtime = await createPiRuntimeIntegration({ cwd, agentDir, sessionDir: resolve(root, "sessions") });

    expect(runtime.diagnostics.map(diagnostic => diagnostic.message)).toContain(
      'No models match pattern "github-copilot/does-not-exist-anywhere"',
    );
    await disposePiRuntimeIntegration(runtime);
  });

  it("applies the scoped model list and initial model from the enabledModels setting", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-pi-runtime-"));
    roots.push(root);
    const cwd = resolve(root, "work");
    const agentDir = resolve(root, "agent");
    await Promise.all([mkdir(cwd), mkdir(agentDir)]);
    const runtime = await createPiRuntimeIntegration({ cwd, agentDir, sessionDir: resolve(root, "sessions") });
    const available = await runtime.services.modelRuntime.getAvailable();
    if (available.length === 0) {
      await disposePiRuntimeIntegration(runtime);
      return;
    }
    const target = available[0]!;
    await disposePiRuntimeIntegration(runtime);

    await writeFile(resolve(agentDir, "settings.json"), JSON.stringify({ enabledModels: [`${target.provider}/${target.id}`] }), "utf8");
    const scoped = await createPiRuntimeIntegration({ cwd, agentDir, sessionDir: resolve(root, "sessions") });
    expect(scoped.session.scopedModels.map(entry => `${entry.model.provider}/${entry.model.id}`)).toEqual([`${target.provider}/${target.id}`]);
    expect(scoped.session.model && `${scoped.session.model.provider}/${scoped.session.model.id}`).toBe(`${target.provider}/${target.id}`);
    expect(scoped.diagnostics).toEqual([]);
    await disposePiRuntimeIntegration(scoped);
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
