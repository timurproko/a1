import { describe, expect, it } from "vitest";
import type { AgentSession, AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import type { OwnedUiModelInfo, OwnedUiThinkingLevel } from "../../../../src/contracts/owned-ui/index.js";
import { PiWorkflowContexts } from "../../../../src/integrations/pi/engine/workflow-contexts.js";
import { PiWorkflowRunner, type PiWorkflowRunnerPorts } from "../../../../src/integrations/pi/engine/workflow-runner.js";
import type { PiWorkflowHost, PiWorkflowInteractionHost, PiWorkflowMessage } from "../../../../src/integrations/pi/engine/workflows.js";

class FakeSession {
  model: unknown = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  thinkingLevel: unknown = "medium";
  isStreaming = false;
  isCompacting = false;
  exportFails = false;
  readonly calls: string[] = [];
  readonly sessionManager = {
    getSessionName: () => this.name,
    getLeafId: () => "leaf-1",
    getTree: () => [{ id: "leaf-1" }],
    getCwd: () => "D:/work",
    getSessionDir: () => "D:/sessions",
    getSessionFile: () => "D:/sessions/current.jsonl",
    usesDefaultSessionDir: () => true,
    appendLabelChange: (entryId: string, label: string | undefined) => { this.calls.push(`label:${entryId}:${label ?? ""}`); },
  };
  name: string | undefined = "Fixture";
  scopedModels: unknown = [];
  async setModel(model: unknown): Promise<void> { this.model = model; this.calls.push("setModel"); }
  async cycleModel(direction: string): Promise<unknown> {
    this.calls.push(`cycle:${direction}`);
    return { model: { provider: "anthropic", id: "claude", name: "Claude", reasoning: true }, thinkingLevel: "high" };
  }
  getLastAssistantText(): string { return "last answer"; }
  setSessionName(name: string): void { this.name = name.toLowerCase(); this.calls.push(`name:${name}`); }
  getUserMessagesForForking(): readonly unknown[] { return [{ entryId: "entry-1", text: "First prompt" }]; }
  async exportToHtml(path?: string): Promise<string> { if (this.exportFails) throw new Error("disk full"); return path ?? "session.html"; }
  async executeBash(command: string, _chunk: unknown, options: { excludeFromContext: boolean }): Promise<unknown> {
    this.calls.push(`bash:${command}:${options.excludeFromContext}`);
    return { output: "ok", exitCode: 0, cancelled: false, truncated: false };
  }
  abortBash(): void { this.calls.push("abortBash"); }
}

class FakeRuntime {
  readonly calls: string[] = [];
  readonly providers = [
    { id: "openai", name: "OpenAI", auth: { oauth: { loginLabel: "Sign in with ChatGPT" }, apiKey: {} } },
    { id: "anthropic", name: "Anthropic", auth: { apiKey: {} } },
  ];
  readonly configured = new Set<string>(["openai"]);
  models = [
    { provider: "openai", id: "gpt-5", name: "GPT-5" },
    { provider: "anthropic", id: "claude-opus-4-8", name: "Opus" },
  ];
  readonly settings = new Map<string, unknown>([["TreeFilterMode", "labeled-only"], ["BranchSummarySkipPrompt", true]]);
  readonly services = {
    modelRuntime: {
      getProviders: () => this.providers,
      getProvider: (id: string) => this.providers.find(provider => provider.id === id),
      getProviderAuthStatus: (id: string) => this.configured.has(id) ? { configured: true, source: "stored" } : { configured: false },
      isUsingOAuth: (id: string) => id === "openai",
      getAvailableSnapshot: () => this.models.filter(model => this.configured.has(model.provider)),
      getModel: (provider: string, id: string) => this.models.find(model => model.provider === provider && model.id === id),
      login: async (provider: string, type: string, interaction: { notify(event: unknown): void }) => {
        this.calls.push(`login:${provider}:${type}`);
        interaction.notify({ type: "auth_url", url: "https://example.test/auth" });
        this.configured.add(provider);
      },
      refresh: async () => ({ aborted: false, errors: new Map() }),
    },
    settingsManager: {
      getTreeFilterMode: () => this.settings.get("TreeFilterMode"),
      getBranchSummarySkipPrompt: () => this.settings.get("BranchSummarySkipPrompt"),
      getEnabledModels: () => undefined,
    },
  };
}

function harness(overrides: Partial<PiWorkflowRunnerPorts> = {}) {
  const session = new FakeSession();
  const runtime = new FakeRuntime();
  const state = {
    disposed: false, generation: 1, pendingCommands: 0, running: 0, admissionStopped: false,
    activeModel: { providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" } as OwnedUiModelInfo | null,
    thinkingLevel: "medium" as OwnedUiThinkingLevel, views: 0, reconciled: 0, copied: [] as string[], published: [] as PiWorkflowMessage[],
    loginEvents: [] as string[],
  };
  const host: PiWorkflowHost = {
    copyText: async text => { state.copied.push(text); },
    runCommand: async () => ({ stdout: "", stderr: "" }),
    readChangelog: async () => "## Changes",
  };
  const interaction: PiWorkflowInteractionHost = {
    startLogin: request => { state.loginEvents.push(`start:${request.providerId}:${request.authType}`); },
    prompt: async () => null,
    notify: event => { state.loginEvents.push(`notify:${event.type}`); },
    publish: message => { state.published.push(message); },
    finishLogin: () => { state.loginEvents.push("finish"); },
  };
  const engineSession = session as unknown as AgentSession;
  const engineRuntime = runtime as unknown as AgentSessionRuntime;
  const contexts = new PiWorkflowContexts({ agentDir: "D:/agent" }, {
    cwd: () => "D:/work",
    session: () => engineSession,
    runtime: () => engineRuntime,
    disposed: () => state.disposed,
    activeModel: () => state.activeModel,
    emitView: () => { state.views += 1; },
  });
  const runner = new PiWorkflowRunner({ agentDir: "D:/agent", host, contexts }, {
    session: () => engineSession,
    runtime: () => engineRuntime,
    disposed: () => state.disposed,
    sessionGeneration: () => state.generation,
    interaction: () => interaction,
    admissionStopped: () => state.admissionStopped,
    pendingCommandCount: () => state.pendingCommands,
    beginRunning: () => { state.running += 1; },
    endRunning: () => { state.running -= 1; },
    activeModel: () => state.activeModel,
    setActiveModel: model => { state.activeModel = model; },
    thinkingLevel: () => state.thinkingLevel,
    setThinkingLevel: level => { state.thinkingLevel = level; },
    emitView: () => { state.views += 1; },
    reconcileActiveModelAvailability: () => { state.reconciled += 1; },
    bindExtensionUiToSession: async () => {},
    applyPinnedSetting: async selection => ({ command: "settings", outcome: "completed", message: `applied ${selection}` }),
    snapshot: () => { throw new Error("snapshot is not needed here"); },
    dispose: async () => { state.disposed = true; },
    ...overrides,
  });
  return { runner, contexts, session, runtime, state };
}

describe("PiWorkflowRunner", () => {
  it("refuses a workflow while admission is stopped or the shared budget is spent, without touching the session", async () => {
    const { runner, session, state } = harness();
    state.admissionStopped = true;
    expect(await runner.executeWorkflow({ command: "hotkeys", argument: "" })).toMatchObject({ outcome: "cancelled", message: "", messageKind: "silent" });
    state.admissionStopped = false;
    state.pendingCommands = 32;
    expect(await runner.executeWorkflow({ command: "name", argument: "x" })).toMatchObject({ outcome: "cancelled" });
    expect(session.calls).toEqual([]);
    expect(runner.pendingCount).toBe(0);
  });

  it("tracks admitted workflows, marks them running for the adapter, and cancels them on request except /quit", async () => {
    const { runner, state } = harness();
    const quit = runner.executeWorkflow({ command: "quit", argument: "" });
    const share = runner.executeWorkflow({ command: "share", argument: "", signal: new AbortController().signal });
    expect(runner.pendingCount).toBe(2);
    expect(state.running).toBe(2);
    runner.cancelPending("quit");
    expect(await share).toMatchObject({ command: "share", outcome: "cancelled", messageKind: "silent" });
    expect(await quit).toMatchObject({ command: "quit", outcome: "completed", message: "Shutdown complete" });
    expect(state.disposed).toBe(true);
    expect(runner.pendingCount).toBe(0);
  });

  it("words failures per command and copies through the bound writer before the host", async () => {
    const { runner, session, state } = harness();
    session.exportFails = true;
    expect(await runner.executeWorkflow({ command: "export", argument: "" })).toMatchObject({ outcome: "failed", message: "Failed to export session: disk full" });
    expect(await runner.executeWorkflow({ command: "copy", argument: "" })).toMatchObject({ outcome: "completed", message: "Copied last agent message to clipboard" });
    expect(state.copied).toEqual(["last answer"]);
    const acknowledged: string[] = [];
    const unbind = runner.bindClipboardWriter(async text => { acknowledged.push(text); return false; });
    expect(await runner.executeWorkflow({ command: "copy", argument: "" })).toMatchObject({ message: "Submitted last agent message to clipboard" });
    unbind();
    await runner.copyWorkflowText("again");
    expect(acknowledged).toEqual(["last answer"]);
    expect(state.copied).toEqual(["last answer", "again"]);
  });

  it("runs session workflows against the session and reports the normalized name", async () => {
    const { runner, session } = harness();
    expect(await runner.executeWorkflow({ command: "name", argument: " Renamed " })).toMatchObject({
      outcome: "completed", message: "Session name set: renamed", detail: expect.stringContaining("normalized"),
    });
    expect(await runner.executeBashWorkflow("ls", true)).toMatchObject({ command: "ls", output: "ok", exitCode: 0, excludeFromContext: true });
    runner.abortBashWorkflow();
    expect(session.calls).toEqual(["name:Renamed", "bash:ls:true", "abortBash"]);
    session.isStreaming = true;
    expect(runner.reloadBlockedResult()).toMatchObject({ command: "reload", outcome: "failed", messageKind: "warning" });
  });

  it("cycles the model through the session and publishes the new model and thinking level", async () => {
    const { runner, state } = harness();
    expect(await runner.cycleModelWorkflow("forward")).toMatchObject({ outcome: "completed", message: "Switched to Claude (thinking: high)" });
    expect(state.activeModel).toEqual({ providerId: "anthropic", modelId: "claude", displayName: "Claude" });
    expect(state.thinkingLevel).toBe("high");
    expect(state.views).toBe(1);
  });

  it("logs in through the interaction host and selects the provider's pinned default model when the previous one was unknown", async () => {
    const { runner, session, runtime, state } = harness();
    session.model = { provider: "unknown", id: "unknown", api: "unknown" };
    const result = await runner.executeWorkflow({ command: "login", argument: "anthropic" });
    expect(runtime.calls).toEqual(["login:anthropic:api_key"]);
    expect(state.loginEvents).toEqual(["start:anthropic:api_key", "notify:auth_url", "finish"]);
    expect(result).toMatchObject({ command: "login", outcome: "completed", message: expect.stringContaining("Saved API key for Anthropic. Selected claude-opus-4-8.") });
    expect(state.activeModel).toEqual({ providerId: "anthropic", modelId: "claude-opus-4-8", displayName: "Opus" });
    expect(state.reconciled).toBe(1);
    expect(session.calls).toContain("setModel");
  });
});

describe("PiWorkflowContexts", () => {
  it("shapes provider authentication options from the runtime, sorted by label", () => {
    const { contexts } = harness();
    expect(contexts.loginOptions().map(option => [option.id, option.status?.type])).toEqual([
      ["api_key:anthropic", undefined], ["oauth:openai", "oauth"], ["api_key:openai", "oauth"],
    ]);
    expect(contexts.loginOptions("oauth").map(option => option.id)).toEqual(["oauth:openai"]);
    expect(contexts.pinnedLoginMethodOptions("OpenAI")).toEqual({
      title: "Select authentication method for OpenAI:",
      options: [
        { id: "oauth:openai", label: "Sign in with ChatGPT", description: "Account / OAuth" },
        { id: "api_key:openai", label: "Sign in with an API key", description: "API key" },
      ],
    });
    expect(contexts.modelOptions().map(option => option.id)).toEqual(["openai/gpt-5"]);
  });

  it("reads fork, tree, and scoped-model selector state from the session and settings", () => {
    const { contexts, session, state } = harness();
    expect(contexts.pinnedForkOptions()).toEqual([{ id: "entry-1", label: "First prompt" }]);
    const tree = contexts.pinnedTreeSelectorContext();
    expect(tree).toMatchObject({ currentLeafId: "leaf-1", filterMode: "labeled-only", skipSummaryPrompt: true });
    tree.appendLabelChange("leaf-1", "done");
    expect(session.calls).toEqual(["label:leaf-1:done"]);
    expect(contexts.pinnedScopedModelsContext()).toEqual({ models: [{ provider: "openai", id: "gpt-5", name: "GPT-5" }], enabledModelIds: null });
    expect(contexts.pinnedSessionSelectorContext().currentSessionFilePath).toBe("D:/sessions/current.jsonl");
    state.disposed = true;
    expect(() => contexts.pinnedForkOptions()).toThrow("engine adapter is not running");
  });
});
