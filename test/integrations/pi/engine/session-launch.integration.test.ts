import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectTrustStore, SessionManager } from "@earendil-works/pi-coding-agent";
import { createPiRuntimeIntegration } from "../../../../src/integrations/pi/engine/runtime-integration.js";
import { pickPiLaunchSession, resolvePiSessionDirectory } from "../../../../src/integrations/pi/engine/session-launch.js";
import { acquireSessionWriter } from "../../../../src/foundation/session-writer-lock/index.js";

const roots: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))); });
async function fixture(trustHandler = "") {
  vi.stubEnv("PI_OFFLINE", "1");
  vi.stubEnv("PI_CODING_AGENT_SESSION_DIR", undefined);
  const root = await mkdtemp(resolve(tmpdir(), "a1-session-launch-")); roots.push(root);
  const cwd = resolve(root, "project"), agentDir = resolve(root, "agent"), sessionDir = resolve(root, "sessions"), trace = resolve(root, "trace.txt");
  await Promise.all([mkdir(cwd), mkdir(agentDir)]);
  const settings = JSON.stringify({ defaultProvider: "fixture", defaultModel: "first", defaultThinkingLevel: "low", defaultProjectTrust: "never" });
  await writeFile(resolve(agentDir, "settings.json"), settings);
  const extension = resolve(root, "fixture.ts");
  await writeFile(extension, `import { appendFileSync } from "node:fs";
    export default function(pi) {
      appendFileSync(${JSON.stringify(trace)}, "global-factory\\n");
      pi.registerProvider("fixture", { api: "openai-completions", apiKey: "baseline-never-sent", baseUrl: "http://127.0.0.1:1/v1", models: ["first", "second"].map(id => ({ id, name: id, reasoning: true, input: ["text"], contextWindow: 4096, maxTokens: 128, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } })) });
      ${trustHandler.replaceAll("TRACE", JSON.stringify(trace))}
    }`);
  const options = { cwd, agentDir, sessionDir, runtimeOptions: { extensionPaths: [extension] } };
  return { root, cwd, agentDir, sessionDir, trace, extension, settings, options };
}
async function persisted(f: Awaited<ReturnType<typeof fixture>>, id = "fixture-session") {
  const runtime = await createPiRuntimeIntegration({ ...f.options, runtimeOptions: { ...f.options.runtimeOptions, sessionId: id } });
  runtime.session.sessionManager.appendMessage({ role: "user", content: "original context", timestamp: 1 });
  const path = runtime.session.sessionManager.getSessionFile()!;
  await runtime.dispose();
  return path;
}
async function allText(directory: string): Promise<string> {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? allText(resolve(directory, entry.name)) : readFile(resolve(directory, entry.name), "utf8")))).join("\n");
}

describe("guarded public session/model/trust launch services", () => {
  it("continues the most recent local session, or creates a new guarded one when empty", async () => {
    const f = await fixture();
    const fresh = await createPiRuntimeIntegration({ ...f.options, runtimeOptions: { ...f.options.runtimeOptions, continueSession: true } });
    const path = fresh.session.sessionManager.getSessionFile()!;
    fresh.session.sessionManager.appendMessage({ role: "user", content: "continue context", timestamp: 1 });
    await fresh.dispose();
    const resumed = await createPiRuntimeIntegration({ ...f.options, runtimeOptions: { ...f.options.runtimeOptions, continueSession: true } });
    try {
      expect(resumed.session.sessionManager.getSessionFile()).toBe(path);
      expect(JSON.stringify(resumed.session.messages)).toContain("continue context");
      expect(() => acquireSessionWriter(path)).toThrow("session is open");
    } finally { await resumed.dispose(); }
    acquireSessionWriter(path).release();
  });

  it("creates exact IDs and names, then reopens without matching a different ID prefix", async () => {
    const f = await fixture();
    await persisted(f, "task-longer");
    const runtime = await createPiRuntimeIntegration({ ...f.options, runtimeOptions: { ...f.options.runtimeOptions, sessionId: "task", sessionName: "Task name" } });
    const manager = runtime.session.sessionManager, path = manager.getSessionFile()!;
    expect(manager.getSessionId()).toBe("task"); expect(manager.getSessionName()).toBe("Task name");
    manager.appendMessage({ role: "user", content: "exact ID context", timestamp: 1 });
    await runtime.dispose();
    const reopened = await createPiRuntimeIntegration({ ...f.options, runtimeOptions: { ...f.options.runtimeOptions, sessionId: "task" } });
    try {
      expect(reopened.session.sessionManager.getSessionFile()).toBe(path);
      expect(reopened.session.sessionManager.getSessionName()).toBe("Task name");
      expect(JSON.stringify(reopened.session.messages)).toContain("exact ID context");
    } finally { await reopened.dispose(); }
  });

  it("forks live history into the invocation cwd with a new guarded custom ID, leaving the source intact", async () => {
    const f = await fixture(); const path = await persisted(f);
    const before = await readFile(path);
    const sourceWriter = acquireSessionWriter(path);
    const targetCwd = resolve(f.root, "other-project"); await mkdir(targetCwd);
    const fork = await createPiRuntimeIntegration({ ...f.options, cwd: targetCwd, runtimeOptions: { ...f.options.runtimeOptions, forkSession: path, sessionId: "copied-task" } });
    try {
      expect(fork.cwd).toBe(targetCwd); expect(fork.session.sessionManager.getSessionId()).toBe("copied-task");
      expect(fork.session.sessionManager.getHeader()?.parentSession).toBe(path);
      expect(JSON.stringify(fork.session.messages)).toContain("original context");
      expect(() => acquireSessionWriter(fork.session.sessionManager.getSessionFile()!)).toThrow("session is open");
      expect(await readFile(path)).toEqual(before);
    } finally { await fork.dispose(); sourceWriter.release(); }
    await expect(createPiRuntimeIntegration({ ...f.options, cwd: targetCwd, runtimeOptions: { ...f.options.runtimeOptions, forkSession: path, sessionId: "copied-task" } })).rejects.toThrow("already exists");
    expect(await readFile(path)).toEqual(before);
  });

  it("serializes custom-ID creation and releases startup-failure reservations and real writers", async () => {
    const f = await fixture();
    const options = { ...f.options, runtimeOptions: { ...f.options.runtimeOptions, sessionId: "one-writer" } };
    const results = await Promise.allSettled([createPiRuntimeIntegration(options), createPiRuntimeIntegration(options)]);
    const accepted = results.filter(result => result.status === "fulfilled");
    expect(accepted).toHaveLength(1); expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: { name: "PiSessionSelectionError" } });
    await accepted[0]!.value.dispose();
    expect((await SessionManager.list(f.cwd, f.sessionDir)).filter(session => session.id === "one-writer")).toHaveLength(1);
    await expect(createPiRuntimeIntegration({ ...options, markStartupPhase: async phase => { if (phase === "settings-loaded") throw new Error("fixture startup failure"); } })).rejects.toThrow("fixture startup failure");
    const recovered = await createPiRuntimeIntegration(options);
    await recovered.dispose();
  });

  it("keeps memory sessions fileless across replacement, usable by ordinary tools, and explicit about durable capabilities", async () => {
    const f = await fixture(); await writeFile(resolve(f.cwd, "read-me.txt"), "in-memory cwd");
    const readCwd = Object.assign(vi.fn(async () => { throw new Error("must not consult durable worktree context"); }), { detach: vi.fn(async () => "unused") });
    const runtime = await createPiRuntimeIntegration({ ...f.options, worktreeCwdReader: readCwd, runtimeOptions: { ...f.options.runtimeOptions, noSession: true, sessionId: "memory-only", sessionName: "Scratch" } });
    try {
      expect(runtime.session.sessionManager.isPersisted()).toBe(false);
      expect(runtime.session.sessionManager.getSessionId()).toBe("memory-only");
      expect(runtime.session.sessionManager.getSessionFile()).toBeUndefined();
      const result = await runtime.session.getToolDefinition("read")!.execute("read", { path: "read-me.txt" }, undefined, undefined, {} as never);
      expect(JSON.stringify(result)).toContain("in-memory cwd"); expect(readCwd).not.toHaveBeenCalled();
      await expect(runtime.session.getToolDefinition("worktree_detach")!.execute("detach", {}, undefined, undefined, {} as never)).rejects.toThrow("persistent session file");
      await expect(runtime.session.exportToHtml(resolve(f.root, "memory.html"))).rejects.toThrow(/in.memory|persist/i);
      runtime.session.sessionManager.appendMessage({ role: "user", content: "explicit memory branch export", timestamp: 1 });
      const exported = resolve(f.root, "explicit-export.jsonl");
      expect(runtime.session.exportToJsonl(exported)).toBe(exported);
      expect(await readFile(exported, "utf8")).toContain("explicit memory branch export");
      expect(runtime.session.sessionManager.isPersisted()).toBe(false);
      expect(runtime.session.sessionManager.getSessionFile()).toBeUndefined();
      await runtime.newSession();
      expect(runtime.session.sessionManager.isPersisted()).toBe(false); expect(runtime.session.sessionManager.getSessionFile()).toBeUndefined();
      expect(runtime.session.sessionManager.getSessionId()).not.toBe("memory-only");
    } finally { await runtime.dispose(); }
    await expect(readdir(f.sessionDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("lists and cancels before writer admission, validates picker choices and refuses headless guessing", async () => {
    const f = await fixture(); const path = await persisted(f);
    const held = acquireSessionWriter(path);
    try {
      expect(await pickPiLaunchSession({ ...f.options, pick: async ({ sessions }) => { expect(sessions.map(session => session.path)).toContain(path); return path; } })).toBe(path);
      await expect(pickPiLaunchSession({ ...f.options, pick: async () => null })).rejects.toMatchObject({ exitCode: 0 });
      await expect(pickPiLaunchSession({ ...f.options, pick: async () => "not-a-session" })).rejects.toThrow("unknown session");
      const pick = vi.fn(async () => path);
      await expect(pickPiLaunchSession({ ...f.options, hasUI: false, pick })).rejects.toThrow("interactive terminal"); expect(pick).not.toHaveBeenCalled();
    } finally { held.release(); }
  });

  it("uses CLI then environment then trusted settings storage without evaluating untrusted project resources", async () => {
    const f = await fixture();
    await writeFile(resolve(f.agentDir, "settings.json"), JSON.stringify({ sessionDir: "global-store", defaultProjectTrust: "never" }));
    await mkdir(resolve(f.cwd, ".pi"));
    await writeFile(resolve(f.cwd, ".pi/settings.json"), JSON.stringify({ sessionDir: "project-store" }));
    expect(resolvePiSessionDirectory({ cwd: f.cwd, agentDir: f.agentDir })).toBe(resolve(f.cwd, "global-store"));
    new ProjectTrustStore(f.agentDir).set(f.cwd, true);
    expect(resolvePiSessionDirectory({ cwd: f.cwd, agentDir: f.agentDir })).toBe(resolve(f.cwd, "project-store"));
    expect(resolvePiSessionDirectory({ cwd: f.cwd, agentDir: f.agentDir, runtimeOptions: { projectTrust: false } })).toBe(resolve(f.cwd, "global-store"));
    vi.stubEnv("PI_CODING_AGENT_SESSION_DIR", "env-store");
    expect(resolvePiSessionDirectory({ cwd: f.cwd, agentDir: f.agentDir })).toBe(resolve(f.cwd, "env-store"));
    expect(resolvePiSessionDirectory({ cwd: f.cwd, agentDir: f.agentDir, runtimeOptions: { sessionDir: "cli-store" } })).toBe(resolve(f.cwd, "cli-store"));
  });

  it("uses invocation scopes/effort and provider-bound runtime keys across replacement without durable secret/default writes", async () => {
    const f = await fixture(); const key = "invocation-only-never-sent-fixture";
    const runtime = await createPiRuntimeIntegration({ ...f.options, runtimeOptions: { ...f.options.runtimeOptions, noSession: true, model: "fixture/second:high", thinking: "medium", modelPatterns: ["fixture/second"], apiKey: key } });
    try {
      expect(runtime.session.model?.id).toBe("second"); expect(runtime.session.thinkingLevel).toBe("medium");
      expect(runtime.session.scopedModels.map(entry => entry.model.id)).toEqual(["second"]);
      expect(await runtime.services.modelRuntime.getAuth("fixture")).toMatchObject({ auth: { apiKey: key } });
      await runtime.newSession();
      expect(await runtime.services.modelRuntime.getAuth("fixture")).toMatchObject({ auth: { apiKey: key } });
      expect(runtime.session.scopedModels.map(entry => entry.model.id)).toEqual(["second"]);
    } finally { await runtime.dispose(); }
    expect(await readFile(resolve(f.agentDir, "settings.json"), "utf8")).toBe(f.settings);
    expect(await allText(f.root)).not.toContain(key);
  });

  it.each(["cli", "global"])("runs %s trust handlers once before project factories, with real UI capability and opt-in remembering", async origin => {
    const f = await fixture('pi.on("project_trust", async (_event, ctx) => { appendFileSync(TRACE, "trust:" + ctx.hasUI + "\\n"); return { trusted: await ctx.ui.confirm("Trust", ctx.cwd) ? "yes" : "no", remember: true }; });');
    await mkdir(resolve(f.cwd, ".pi/extensions"), { recursive: true });
    await writeFile(resolve(f.cwd, ".pi/extensions/project.ts"), `import { appendFileSync } from "node:fs"; export default function(pi) { appendFileSync(${JSON.stringify(f.trace)}, "project-factory\\n"); pi.on("project_trust", () => { throw new Error("project handler must not decide its own trust"); }); }`);
    if (origin === "global") { await mkdir(resolve(f.agentDir, "extensions")); await writeFile(resolve(f.agentDir, "extensions/trust.ts"), await readFile(f.extension)); }
    new ProjectTrustStore(f.agentDir).set(f.cwd, false);
    const confirm = vi.fn(async () => true);
    const runtime = await createPiRuntimeIntegration({ ...f.options, runtimeOptions: origin === "global" ? {} : f.options.runtimeOptions,
      projectTrustUi: { hasUI: true, ui: { confirm, select: async () => undefined, input: async () => undefined, notify() {} } } });
    try {
      expect(confirm).toHaveBeenCalledOnce(); expect(runtime.services.settingsManager.isProjectTrusted()).toBe(true);
      expect(new ProjectTrustStore(f.agentDir).get(f.cwd)).toBe(true);
      expect(await readFile(f.trace, "utf8")).toBe("global-factory\ntrust:true\nproject-factory\n");
    } finally { await runtime.dispose(); }
  });

  it("withholds project factories after headless denial and after a failed global trust handler", async () => {
    for (const handler of ['pi.on("project_trust", (_event, ctx) => ({ trusted: ctx.hasUI ? "yes" : "no" }));', 'pi.on("project_trust", () => { throw new Error("never-sent-fixture-credential"); });']) {
      const f = await fixture(handler);
      new ProjectTrustStore(f.agentDir).set(f.cwd, true);
      await mkdir(resolve(f.cwd, ".pi/extensions"), { recursive: true });
      await writeFile(resolve(f.cwd, ".pi/extensions/project.ts"), 'throw new Error("project factory must not run");');
      const runtime = await createPiRuntimeIntegration(f.options);
      try {
        expect(runtime.services.settingsManager.isProjectTrusted()).toBe(false);
        expect(runtime.services.resourceLoader.getExtensions().errors).toEqual([]);
        expect(JSON.stringify(runtime.diagnostics)).not.toContain("never-sent-fixture-credential");
      } finally { await runtime.dispose(); }
      expect(new ProjectTrustStore(f.agentDir).get(f.cwd)).toBe(true);
    }
  });

  it.each([true, false])("keeps trust override %s process-only, ahead of saved and extension decisions", async trusted => {
    const f = await fixture('pi.on("project_trust", () => { throw new Error("override must bypass handlers"); });');
    await mkdir(resolve(f.cwd, ".pi/extensions"), { recursive: true });
    await writeFile(resolve(f.cwd, ".pi/extensions/project.ts"), `import { appendFileSync } from "node:fs"; export default function() { appendFileSync(${JSON.stringify(f.trace)}, "project-factory"); }`);
    const store = new ProjectTrustStore(f.agentDir); store.set(f.cwd, !trusted);
    const before = await readFile(resolve(f.agentDir, "trust.json"));
    const runtime = await createPiRuntimeIntegration({ ...f.options, runtimeOptions: { ...f.options.runtimeOptions, projectTrust: trusted } });
    try { expect(runtime.services.settingsManager.isProjectTrusted()).toBe(trusted); expect((await readFile(f.trace, "utf8")).includes("project-factory")).toBe(trusted); }
    finally { await runtime.dispose(); }
    expect(await readFile(resolve(f.agentDir, "trust.json"))).toEqual(before);
  });
});
