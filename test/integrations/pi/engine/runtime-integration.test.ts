import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createAgentSessionServices, SessionManager } from "@earendil-works/pi-coding-agent";
import { writeResumeFixture } from "../../../support/session-resume-fixture.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindPiRuntimeSession,
  createPiEngineAdapter,
  createPiRuntimeIntegration,
  disposePiRuntimeIntegration,
  replacePiRuntimeSession,
} from "../../../../src/integrations/pi/engine/index.js";

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

  it("loads Windows NUL cleanup inline across session replacement without changing profile extensions", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-pi-runtime-extensions-"));
    roots.push(root);
    const cwd = resolve(root, "work");
    const agentDir = resolve(root, "agent");
    const extensionsDir = resolve(agentDir, "extensions");
    await Promise.all([mkdir(cwd), mkdir(extensionsDir, { recursive: true })]);
    await writeFile(resolve(extensionsDir, "user-extension.ts"), "export default function () {}\n");
    const runtime = await createPiRuntimeIntegration({ cwd, agentDir, sessionDir: resolve(root, "sessions") });

    const expectedInlinePaths = process.platform === "win32" ? ["<inline:windows-nul-file-cleanup>"] : [];
    const extensionPaths = () => runtime.services.resourceLoader.getExtensions().extensions.map(extension => extension.path);
    expect(extensionPaths()).toEqual(expect.arrayContaining([
      resolve(extensionsDir, "user-extension.ts"),
      ...expectedInlinePaths,
    ]));

    await replacePiRuntimeSession(runtime, { kind: "new" });

    expect(extensionPaths()).toEqual(expect.arrayContaining([
      resolve(extensionsDir, "user-extension.ts"),
      ...expectedInlinePaths,
    ]));
    expect(await readdir(extensionsDir)).toEqual(["user-extension.ts"]);
    await disposePiRuntimeIntegration(runtime);
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

  it.each([false, true])("restores same-pin session context and cwd before trust/services (compacted: %s)", async compacted => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-pi-resume-runtime-"));
    roots.push(root);
    const cwd = resolve(root, "invoking");
    const savedCwd = resolve(root, "saved");
    const agentDir = resolve(root, "agent");
    await Promise.all([mkdir(cwd), mkdir(savedCwd), mkdir(agentDir)]);
    await writeFile(resolve(agentDir, "settings.json"), JSON.stringify({ enabledModels: [], defaultThinkingLevel: "off" }));
    const resourceEffect = resolve(root, "untrusted-resource-executed");
    await mkdir(resolve(savedCwd, ".pi", "extensions"), { recursive: true });
    await writeFile(resolve(savedCwd, ".pi", "extensions", "unsafe.ts"), `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(resourceEffect)}, "loaded"); export default function () {}`);
    const saved = await writeResumeFixture(resolve(root, "sessions"), savedCwd, { compacted });
    const before = await readFile(saved.path);
    const direct = SessionManager.open(saved.path).buildSessionContext();
    const order: string[] = [];
    const runtime = await createPiRuntimeIntegration({
      cwd, agentDir, sessionSelection: { target: saved.path },
      preflightDependencies: {
        resolveTrust: async options => {
          expect(options.cwd).toBe(savedCwd);
          order.push("trust");
          return { trusted: false, source: "interactive", diagnostic: null };
        },
        createServices: async options => {
          expect(options?.cwd).toBe(savedCwd);
          expect(order).toEqual(["trust"]);
          order.push("services");
          const services = await createAgentSessionServices(options);
          await services.modelRuntime.setRuntimeApiKey("openai", "offline-fixture-never-sent");
          return services;
        },
      },
    });
    try {
      expect(runtime.cwd).toBe(savedCwd);
      expect(runtime.session.sessionId).toBe(saved.id);
      expect(runtime.session.sessionManager.getSessionFile()).toBe(saved.path);
      expect(runtime.session.thinkingLevel).toBe("high");
      expect(runtime.session.model?.id).toBe("gpt-5");
      expect(runtime.session.messages).toEqual(direct.messages);
      expect(runtime.session.messages.map(message => message.role)).toEqual(compacted ? ["compactionSummary", "user", "assistant"] : ["user", "assistant"]);
      expect(JSON.stringify(runtime.session.messages)).not.toContain("Earlier archived");
      expect(JSON.stringify(runtime.session.messages)).toContain(saved.marker);
      const prompt = vi.spyOn(runtime.session, "prompt");
      const adapter = await createPiEngineAdapter({ cwd, agentDir, createRuntime: async () => runtime });
      expect(adapter.cwd).toBe(savedCwd);
      expect(adapter.currentSessionResumeMetadata()?.sessionId).toBe(saved.id);
      expect(JSON.stringify(adapter.view().transcript)).toContain(saved.marker);
      expect(prompt).not.toHaveBeenCalled();
      await adapter.dispose();
    } finally {
      await disposePiRuntimeIntegration(runtime);
    }
    expect(await readFile(saved.path)).toEqual(before);
    await expect(readFile(resourceEffect)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("delegates an unavailable saved model to Pi fallback without losing the active branch", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-pi-resume-fallback-"));
    roots.push(root);
    const saved = await writeResumeFixture(resolve(root, "sessions"), root, { compacted: true });
    const manager = SessionManager.open(saved.path);
    const leaf = manager.getLeafId()!;
    manager.appendMessage({ role: "user", content: "unselected-branch-marker", timestamp: 5 });
    manager.branch(leaf);
    manager.appendModelChange("unavailable-fixture-provider", "unavailable-fixture-model");
    const context = manager.buildSessionContext();
    const runtime = await createPiRuntimeIntegration({
      cwd: root, agentDir: resolve(root, "agent"), sessionSelection: { target: saved.path },
      preflightDependencies: { createServices: async options => {
        const services = await createAgentSessionServices(options);
        await services.modelRuntime.setRuntimeApiKey("openai", "offline-fixture-never-sent");
        return services;
      } },
    });
    try {
      expect(runtime.session.messages).toEqual(context.messages);
      expect(runtime.session.sessionId).toBe(saved.id);
      expect(runtime.session.model?.provider).toBe("openai");
      expect(runtime.session.model?.id).not.toBe("unavailable-fixture-model");
      expect(JSON.stringify(runtime.session.messages)).toContain(saved.marker);
      expect(JSON.stringify(runtime.session.messages)).not.toContain("unselected-branch-marker");
    } finally {
      await disposePiRuntimeIntegration(runtime);
    }
  });

  it("does not advertise a persistent-but-unwritten new session as resumable", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-pi-resume-hint-"));
    roots.push(root);
    const runtime = await createPiRuntimeIntegration({ cwd: root, agentDir: resolve(root, "agent"), sessionDir: resolve(root, "sessions") });
    const adapter = await createPiEngineAdapter({ cwd: root, createRuntime: async () => runtime });
    expect(adapter.currentSessionResumeMetadata()).toBeNull();
    await adapter.dispose();
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
