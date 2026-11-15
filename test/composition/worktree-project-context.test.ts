import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentSessionServices, type AgentSession, type ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import { SessionRuntimeRegistry } from "../../src/composition/session-runtime-registry.js";
import { readActiveSessionRepositoryContext } from "../../src/foundation/lifecycle/index.js";
import { acquireExisting } from "../../src/foundation/session-writer-lock/index.js";
import { createPiRuntimeIntegration, settlePiWorktreeTransition, type PiRuntimeIntegrationOptions } from "../../src/integrations/pi/engine/runtime-integration.js";
import { PiEngineRuntime } from "../../src/integrations/pi/engine/session-runtime.js";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";

const execute = promisify(execFile), roots: string[] = [];
vi.setConfig({ testTimeout: 30_000 });
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })));
});

async function fixture(options: Partial<PiRuntimeIntegrationOptions> = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "a1-project-worktrees-"))); roots.push(root);
  const home = join(root, "home"), agentDir = join(root, "agent"), dataDir = join(root, "data");
  await mkdir(home); await mkdir(agentDir);
  await writeFile(join(agentDir, "settings.json"), JSON.stringify({ defaultProvider: "fixture", defaultModel: "offline", cacheWarming: "off" }));
  await writeFile(join(agentDir, "models.json"), JSON.stringify({ providers: { fixture: { api: "openai-completions", apiKey: "hermetic-no-network", baseUrl: "http://127.0.0.1:1/v1", models: [{ id: "offline", name: "Offline", reasoning: false, input: ["text"], contextWindow: 128000, maxTokens: 128 }] } } }));
  await writeFile(join(home, "AGENTS.md"), "HOME_CONTEXT_RULE\n");
  vi.stubEnv(PRODUCT_IDENTITY.environment.dataDir, dataDir);
  const runtimeId = "project-context-runtime", inspectProcess = async (pid: number) => ({ pid, startIdentity: "fixture" });
  const registry = new SessionRuntimeRegistry({ runtimeId, inspectProcess });
  const prompts: string[] = [];
  const runtime = await createPiRuntimeIntegration({
    cwd: home, agentDir, worktreeCwdReader: registry.toolReaderFor(undefined),
    projectTrustPrompt: async request => { prompts.push(request.cwd); return "trust-session"; },
    ...options,
  });
  runtime.session.sessionManager.appendMessage({ role: "user", content: "Keep this conversation while moving projects", timestamp: 1 });
  const identity = { sessionId: runtime.session.sessionId, sessionFile: runtime.session.sessionFile! };
  await registry.readerFor(undefined)(identity.sessionId, identity.sessionFile, new AbortController().signal);
  const repository = async (name: string) => {
    const primary = join(root, name), task = join(primary, ".worktrees", name);
    await execute("git", ["init", "-b", "develop", primary]);
    await mkdir(join(primary, ".pi", "extensions"), { recursive: true });
    await mkdir(join(primary, ".pi", "skills", name), { recursive: true });
    await writeFile(join(primary, "AGENTS.md"), `PRIMARY_${name}_RULE\n`);
    await writeFile(join(primary, ".gitignore"), ".worktrees/\n");
    await writeFile(join(primary, ".pi", "settings.json"), JSON.stringify({ showHardwareCursor: name === "beta" }));
    await writeFile(join(primary, ".pi", "skills", name, "SKILL.md"), `---\nname: ${name}\ndescription: ${name} project skill\n---\n${name} skill\n`);
    await writeFile(join(primary, ".pi", "extensions", "marker.ts"), `export default pi => { pi.registerTool({ name: "${name}_marker", label: "Marker", description: "${name} project", parameters: { type: "object", properties: {} }, execute: async () => ({ content: [{ type: "text", text: "${name}" }], details: {} }) }); }`);
    await execute("git", ["-C", primary, "add", "."]);
    await execute("git", ["-C", primary, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "fixture"]);
    await execute("git", ["-C", primary, "worktree", "add", "-b", `fix/${name}`, task]);
    await writeFile(join(task, "AGENTS.md"), `TASK_${name}_RULE\n`);
    return { primary, task };
  };
  const context = () => ({ cwd: runtime.cwd, sessionManager: runtime.session.sessionManager }) as unknown as ExtensionToolContext;
  const control = (params: Record<string, unknown>, signal?: AbortSignal) => runtime.session.getToolDefinition("worktree")!.execute("context", params, signal, undefined, context());
  const settle = (signal = new AbortController().signal) => settlePiWorktreeTransition(runtime, signal);
  const attach = async (path: string) => { expect((await control({ action: "attach", path })).terminate).toBe(true); return await settle(); };
  const write = (path: string, content: string) => runtime.session.getToolDefinition("write")!.execute("write", { path, content }, undefined, undefined, context());
  return { root, home, runtime, registry, dataDir, identity, prompts, repository, control, settle, attach, write,
    active: () => readActiveSessionRepositoryContext(identity, { runtimeId, inspectProcess, dataDir }),
    dispose: async () => { await runtime.dispose(); await registry.dispose(); },
  };
}

describe("trusted worktree project transitions", () => {
  it("persists a real tool result before idle host replacement and automatically continues under the new project", async () => {
    const f = await fixture();
    let engine: PiEngineRuntime | undefined;
    try {
      const alpha = await f.repository("alpha");
      const prompts: string[] = [];
      let bindings = 0;
      const bind = async (session: AgentSession) => {
        bindings++;
        if (bindings > 1) expect(session.sessionManager.getEntries().some(entry => entry.type === "message" && entry.message.role === "toolResult" && entry.message.toolName === "worktree")).toBe(true);
        await session.bindExtensions({});
        session.agent.streamFunction = (async (model: Parameters<typeof session.agent.streamFunction>[0]) => {
          prompts.push(f.runtime.session.systemPrompt);
          const tool = prompts.length === 1;
          const message = { role: "assistant" as const, content: tool ? [{ type: "toolCall", id: "attach-context", name: "worktree", arguments: { action: "attach", path: alpha.task } }] : [{ type: "text", text: "continued in target" }], api: model.api, provider: model.provider, model: model.id, timestamp: Date.now(), stopReason: tool ? "toolUse" : "stop", usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } };
          return { result: async () => message, async *[Symbol.asyncIterator]() { yield { type: "start", partial: message }; yield { type: "done", reason: message.stopReason, message }; } };
        }) as unknown as typeof session.agent.streamFunction;
      };
      engine = new PiEngineRuntime({
        cwd: f.home, agentDir: f.runtime.services.agentDir, sessionId: "owned-fixture", signal: new AbortController().signal,
        sessionPath: undefined, sessionSelection: undefined, sessionForkPrompt: undefined, projectTrustPrompt: undefined,
        createRuntime: async () => f.runtime, checkPackageUpdates: async () => [], markStartupPhase: async () => {},
        repositoryContextReader: f.registry.readerFor(undefined), gitBranchReader: async () => null, pullRequestProbe: async () => null,
        host: { copyText: async () => {}, runCommand: async () => ({ stdout: "", stderr: "" }), readChangelog: async () => "" },
      }, {
        disposed: () => false, started: () => {}, rebindBlocked: () => false, sessionReplacing: () => {}, sessionReplaced: bind,
        rebound: () => {}, event: () => {}, compactionProgress: () => {}, diagnostic: () => {}, emitView: () => {},
      });
      await engine.start();
      await f.runtime.session.prompt("Attach the requested worktree and continue");
      await vi.waitFor(() => expect(prompts).toHaveLength(2), { timeout: 15_000 });
      await f.runtime.session.waitForIdle();
      expect(bindings).toBe(2);
      expect(prompts[0]).toContain("HOME_CONTEXT_RULE");
      expect(prompts[1]).toContain("TASK_alpha_RULE");
      expect(f.runtime.session.getLastAssistantText()).toBe("continued in target");
      expect((await f.active())?.cwd).toBe(alpha.task);
    } finally { await engine?.dispose(); await f.dispose(); }
  });
  it("attaches from home, replaces all project resources across repositories, and restores home without changing conversation or writer", async () => {
    const f = await fixture();
    try {
      const alpha = await f.repository("alpha"), beta = await f.repository("beta");
      const source = await readFile(f.identity.sessionFile, "utf8");
      expect(await f.attach(alpha.task)).toContain("Session worktree attached");
      expect(f.runtime.cwd).toBe(alpha.task);
      expect(f.runtime.session.systemPrompt).toContain("TASK_alpha_RULE");
      expect(f.runtime.session.systemPrompt).not.toContain("HOME_CONTEXT_RULE");
      expect(f.runtime.session.systemPrompt).not.toContain("PRIMARY_alpha_RULE");
      expect(f.runtime.session.getToolDefinition("alpha_marker")).toBeDefined();
      expect(f.runtime.services.settingsManager.getShowHardwareCursor()).toBe(false);
      expect(f.runtime.services.resourceLoader.getSkills().skills.map(skill => skill.name)).toContain("alpha");
      await f.write("alpha.txt", "alpha");
      expect(await f.attach(beta.task)).toContain("Project instructions, settings, skills and extensions reloaded");
      expect(f.runtime.session.systemPrompt).toContain("TASK_beta_RULE");
      expect(f.runtime.session.systemPrompt).not.toContain("TASK_alpha_RULE");
      expect(f.runtime.session.getToolDefinition("alpha_marker")).toBeUndefined();
      expect(f.runtime.session.getToolDefinition("beta_marker")).toBeDefined();
      expect(f.runtime.services.settingsManager.getShowHardwareCursor()).toBe(true);
      expect(f.runtime.services.resourceLoader.getSkills().skills.filter(skill => skill.filePath.startsWith(f.root)).map(skill => skill.name)).toEqual(["beta"]);
      const status = await f.control({ action: "status" });
      expect(JSON.parse(status.content.find(part => part.type === "text")!.text)).toMatchObject({ repositoryRoot: beta.primary, startupDirectory: f.home, health: "attached" });
      expect(f.prompts).toEqual(expect.arrayContaining([f.home, alpha.task, beta.task]));
      expect(f.runtime.session.sessionId).toBe(f.identity.sessionId);
      expect(f.runtime.session.sessionFile).toBe(f.identity.sessionFile);
      expect(f.runtime.session.messages.some(message => message.role === "user" && message.content === "Keep this conversation while moving projects")).toBe(true);
      expect(() => acquireExisting(f.identity.sessionFile)).toThrow();
      expect(await readFile(f.identity.sessionFile, "utf8")).toContain(source.trim());
      await f.control({ action: "detach" });
      expect(await f.settle()).toContain("Session detached");
      expect(f.runtime.cwd).toBe(f.home);
      expect(f.runtime.session.systemPrompt).toContain("HOME_CONTEXT_RULE");
      expect(f.runtime.session.getToolDefinition("beta_marker")).toBeUndefined();
      await f.write("home.txt", "home");
      expect(await readFile(join(f.home, "home.txt"), "utf8")).toBe("home");
      expect(await readFile(join(alpha.task, "alpha.txt"), "utf8")).toBe("alpha");
      expect(await readdir(join(f.dataDir, "session-worktree-claims", "worktrees"))).toEqual([]);
    } finally { await f.dispose(); }
  });

  it("does not mutate attachment or run another ordinary tool before the requesting batch settles", async () => {
    const f = await fixture();
    try {
      const target = await f.repository("alpha");
      const before = f.runtime.session;
      await f.control({ action: "attach", path: target.task });
      expect(await f.active()).toBeNull();
      expect(f.runtime.session).toBe(before);
      await expect(f.write("blocked.txt", "must not execute")).rejects.toThrow("transition is pending");
      await expect(readFile(join(target.task, "blocked.txt"))).rejects.toMatchObject({ code: "ENOENT" });
      expect(await f.settle()).toContain("Session worktree attached");
      expect(f.runtime.session).not.toBe(before);
      await f.write("after.txt", "target");
      expect(await readFile(join(target.task, "after.txt"), "utf8")).toBe("target");
    } finally { await f.dispose(); }
  });

  it.each(["deny-session", null] as const)("retains the old operational context when target trust returns %s", async decision => {
    let deniedPath = "";
    const f = await fixture({ projectTrustPrompt: async request => request.cwd === deniedPath ? decision : "trust-session" });
    try {
      const alpha = await f.repository("alpha"), beta = await f.repository("beta");
      expect(await f.attach(alpha.task)).toContain("Session worktree attached");
      deniedPath = beta.task;
      const before = f.runtime.session;
      expect(await f.attach(beta.task)).toContain("target project was not trusted");
      expect(f.runtime.session).toBe(before);
      expect((await f.active())?.cwd).toBe(alpha.task);
      expect(f.runtime.session.getToolDefinition("beta_marker")).toBeUndefined();
      await f.write("retained.txt", "alpha");
      expect(await readFile(join(alpha.task, "retained.txt"), "utf8")).toBe("alpha");
      expect(await readdir(join(f.dataDir, "session-worktree-claims", "worktrees"))).toHaveLength(1);
    } finally { await f.dispose(); }
  });

  it("preserves the prior session and claim when an extension vetoes replacement", async () => {
    const f = await fixture();
    try {
      const alpha = await f.repository("alpha"), beta = await f.repository("beta");
      await writeFile(join(alpha.task, ".pi", "extensions", "veto.ts"), 'export default pi => { pi.on("session_before_switch", () => ({ cancel: true })); }');
      await f.attach(alpha.task);
      const before = f.runtime.session;
      expect(await f.attach(beta.task)).toContain("cancelled by an extension");
      expect(f.runtime.session).toBe(before);
      expect((await f.active())?.cwd).toBe(alpha.task);
      await f.write("retained.txt", "alpha");
      expect(await readdir(join(f.dataDir, "session-worktree-claims", "worktrees"))).toHaveLength(1);
    } finally { await f.dispose(); }
  });

  it("attaches away from an invalid checkout without resolving its ordinary tool cwd", async () => {
    const f = await fixture();
    try {
      const alpha = await f.repository("alpha"), beta = await f.repository("beta");
      await f.attach(alpha.task);
      await rm(join(alpha.task, ".git"));
      expect(await f.attach(beta.task)).toContain("Session worktree attached");
      expect(f.runtime.cwd).toBe(beta.task);
      expect(f.runtime.session.systemPrompt).toContain("TASK_beta_RULE");
      expect(await readFile(join(alpha.task, "AGENTS.md"), "utf8")).toBe("TASK_alpha_RULE\n");
    } finally { await f.dispose(); }
  });

  it("retains prior resources and claim after a target extension fails to load", async () => {
    const f = await fixture();
    try {
      const alpha = await f.repository("alpha"), beta = await f.repository("beta");
      await f.attach(alpha.task);
      await writeFile(join(beta.task, ".pi", "extensions", "broken.ts"), "export default () => { throw new Error('broken target extension'); }");
      const before = f.runtime.session;
      expect(await f.attach(beta.task)).toContain("target project extensions could not be loaded");
      expect(f.runtime.session).toBe(before);
      expect((await f.active())?.cwd).toBe(alpha.task);
      await f.write("retained.txt", "alpha");
    } finally { await f.dispose(); }
  });

  it("recreates the old agent after a replacement fails after teardown without losing its writer", async () => {
    let preparedCwd = "", failedCwd = "", failed = false;
    const f = await fixture({
      preflightDependencies: { createServices: async options => { preparedCwd = options.cwd; return await createAgentSessionServices(options); } },
      markStartupPhase: async phase => { if (phase === "session-created" && preparedCwd === failedCwd && !failed) { failed = true; throw new Error("replacement initialization failed"); } },
    });
    try {
      const alpha = await f.repository("alpha"), beta = await f.repository("beta");
      await f.attach(alpha.task); failedCwd = beta.task;
      expect(await f.attach(beta.task)).toContain("replacement initialization failed");
      expect(f.runtime.cwd).toBe(alpha.task);
      expect((await f.active())?.cwd).toBe(alpha.task);
      expect(f.runtime.session.systemPrompt).toContain("TASK_alpha_RULE");
      expect(() => acquireExisting(f.identity.sessionFile)).toThrow();
      await f.write("restored.txt", "alpha");
      expect(await readFile(join(alpha.task, "restored.txt"), "utf8")).toBe("alpha");
    } finally { await f.dispose(); }
  });

  it("retains queued input instead of losing it during runtime replacement", async () => {
    const f = await fixture();
    try {
      const alpha = await f.repository("alpha");
      await f.runtime.session.followUp("queued follow-up", [{ type: "image", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", mimeType: "image/png" }]);
      const before = f.runtime.session;
      expect(await f.attach(alpha.task)).toContain("pending messages were preserved");
      expect(f.runtime.session).toBe(before);
      expect(f.runtime.session.pendingMessageCount).toBe(1);
      expect(f.runtime.session.getFollowUpMessages()).toEqual(["queued follow-up"]);
      expect(await f.active()).toBeNull();
    } finally { await f.dispose(); }
  });

  it("discards a stale pending conversation and honors cancellation before transition", async () => {
    const f = await fixture();
    try {
      const alpha = await f.repository("alpha");
      await f.control({ action: "attach", path: alpha.task });
      const abort = new AbortController(); abort.abort();
      expect(await f.settle(abort.signal)).toContain("transition failed");
      expect(await f.active()).toBeNull();
      await f.control({ action: "attach", path: alpha.task });
      await f.runtime.newSession();
      expect(await f.settle()).toContain("active conversation changed");
      expect(f.runtime.cwd).toBe(f.home);
    } finally { await f.dispose(); }
  });
});
