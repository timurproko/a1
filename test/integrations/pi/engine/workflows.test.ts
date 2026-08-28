import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createPiEngineAdapter,
  PI_SETTING_EFFECTS,
  PINNED_PI_HIDDEN_COMMAND_NAMES,
  PINNED_PI_SETTINGS_CALLBACKS,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
  type PiSettingOwnerHandlers,
  type PiWorkflowHost,
  type PiWorkflowRequest,
} from "../../../../src/integrations/pi/engine/index.js";

class WorkflowSession {
  readonly sessionId = "workflow-session";
  model: unknown = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  thinkingLevel: unknown = "medium";
  isStreaming = false;
  readonly isIdle = true;
  isRetrying = false;
  isCompacting = false;
  readonly messages: readonly unknown[] = [];
  readonly calls: string[] = [];
  reloadFails = false;
  readonly sessionManager = {
    getCwd: () => "D:/work",
    getSessionDir: () => "D:/sessions",
    getSessionName: () => "Fixture",
    getLeafId: () => "entry-2",
    getEntries: () => [{ id: "entry-1", type: "message" }, { id: "entry-2", type: "message" }],
  };
  #listeners = new Set<(event: unknown) => void>();

  subscribe(listener: (event: unknown) => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  async prompt(text: string): Promise<void> { this.calls.push(`prompt:${text}`); }
  async steer(text: string): Promise<void> { this.calls.push(`steer:${text}`); }
  async followUp(text: string): Promise<void> { this.calls.push(`followUp:${text}`); }
  async abort(): Promise<void> { this.calls.push("abort"); }
  abortRetry(): void { this.calls.push("abortRetry"); }
  abortCompaction(): void { this.calls.push("abortCompaction"); }
  async compact(instructions?: string): Promise<void> { this.calls.push(`compact:${instructions ?? ""}`); }
  async setModel(model: unknown): Promise<void> { this.model = model; this.calls.push("setModel"); }
  setThinkingLevel(level: unknown): void { this.thinkingLevel = level; }
  dispose(): void {}
  setScopedModels(models: readonly unknown[]): void { this.calls.push(`scoped:${models.length}`); }
  async cycleModel(): Promise<unknown> { return { model: { provider: "anthropic", id: "claude", name: "Claude" }, thinkingLevel: "high" }; }
  cycleThinkingLevel(): string { this.thinkingLevel = "high"; return "high"; }
  async executeBash(command: string, _chunk: unknown, options: { excludeFromContext: boolean }): Promise<unknown> {
    this.calls.push(`bash:${command}:${options.excludeFromContext}`);
    return { output: "bash output", exitCode: 0, cancelled: false, truncated: false };
  }
  abortBash(): void { this.calls.push("abortBash"); }
  clearQueue(): unknown { return { steering: ["steer"], followUp: ["follow"] }; }
  exportToJsonl(path?: string): string { return path ?? "session.jsonl"; }
  async exportToHtml(path?: string): Promise<string> { return path ?? "session.html"; }
  getLastAssistantText(): string { return "last answer"; }
  setSessionName(name: string): void { this.calls.push(`name:${name}`); }
  getSessionStats(): unknown { return { sessionId: this.sessionId, totalMessages: 2 }; }
  getUserMessagesForForking(): readonly unknown[] { return [{ entryId: "entry-1", text: "First prompt" }]; }
  async navigateTree(id: string, options?: { summarize?: boolean; customInstructions?: string }): Promise<unknown> {
    this.calls.push(`tree:${id}:${options?.summarize === true ? "summary" : "plain"}:${options?.customInstructions ?? ""}`);
    return { cancelled: false };
  }
  async reload(): Promise<void> { if (this.reloadFails) throw new Error("reload exploded"); this.calls.push("reload"); }
}

class WorkflowRuntime {
  readonly session = new WorkflowSession();
  newCancelled = false;
  loginPrompt = false;
  loginSelect = false;
  resumeMissingCwd = false;
  readonly calls: string[] = [];
  readonly settingsValues = new Map<string, unknown>([
    ["CompactionEnabled", true], ["ShowImages", true], ["ImageWidthCells", 40], ["ImageAutoResize", true],
    ["BlockImages", false], ["EnableSkillCommands", true], ["HideThinkingBlock", false],
    ["ShowCacheMissNotices", false], ["CollapseChangelog", false], ["EnableInstallTelemetry", false],
    ["QuietStartup", false], ["ShowHardwareCursor", false], ["ClearOnShrink", true],
    ["ShowTerminalProgress", true], ["SteeringMode", "all"], ["FollowUpMode", "all"],
    ["Transport", "sse"], ["MermaidRenderingMode", "off"], ["DefaultProjectTrust", "ask"],
    ["DoubleEscapeAction", "fork"], ["TreeFilterMode", "default"], ["OutputPad", 0],
    ["TuiMode", "fullscreen"], ["FullscreenScrollbar", "auto"], ["HttpIdleTimeoutMs", 5000],
    ["EditorPaddingX", 0], ["AutocompleteMaxVisible", 8], ["Theme", "dark"],
    ["Warnings", { anthropicExtraUsage: true }],
  ]);
  readonly settingsManager = new Proxy<Record<string, unknown>>({}, {
    get: (_target, property) => {
      const name = String(property);
      if (name === "flush") return async () => {};
      if (name === "drainErrors") return () => [];
      if (name.startsWith("get")) return () => this.settingsValues.get(name.slice(3));
      if (name.startsWith("set")) return (value: unknown) => { this.settingsValues.set(name.slice(3), value); };
      return undefined;
    },
  });
  readonly providerAuthStatus = new Map<string, { configured: boolean; source?: "stored" | "runtime" | "environment"; label?: string }>([
    ["openai", { configured: true, source: "stored" }],
  ]);
  readonly credentialTypes = new Map<string, "oauth" | "api_key">([["openai", "oauth"]]);
  readonly allModels = [{ provider: "openai", id: "gpt-5", name: "GPT-5" }];
  readonly modelRuntime = {
    getModel: (provider: string, id: string) => provider === "openai" && id === "missing" ? undefined : this.allModels.find(model => model.provider === provider && model.id === id),
    getAvailableSnapshot: () => this.allModels.filter(model => this.providerAuthStatus.get(model.provider)?.configured === true),
    getProviders: () => [{ id: "openai", name: "OpenAI", auth: { oauth: {}, apiKey: {} } }],
    getProviderAuthStatus: (providerId: string) => this.providerAuthStatus.get(providerId) ?? { configured: false },
    isUsingOAuth: (providerId: string) => this.credentialTypes.get(providerId) === "oauth",
    listCredentials: async () => [...this.credentialTypes].map(([providerId, type]) => ({ providerId, type })),
    getProvider: (providerId: string) => providerId === "openai" ? { id: providerId, name: "OpenAI Codex" } : undefined,
    login: async (provider: string, type: "oauth" | "api_key", interaction: { prompt(input: unknown): Promise<string>; notify(event: unknown): void }) => {
      if (this.loginSelect) {
        interaction.notify({ type: "auth_url", url: "https://example.test/auth", instructions: "Continue in browser" });
        await interaction.prompt({
          type: "select",
          message: "Select OpenAI Codex login method:",
          options: [{ id: "browser", label: "Browser login" }, { id: "device", label: "Device code login" }],
        });
      } else if (this.loginPrompt) {
        await interaction.prompt({ type: "input", message: "API key", placeholder: "secret" });
      }
      this.providerAuthStatus.set(provider, { configured: true, source: "stored" });
      this.credentialTypes.set(provider, type);
      return { type };
    },
    logout: async (provider: string) => {
      this.providerAuthStatus.set(provider, { configured: false });
      this.credentialTypes.delete(provider);
    },
  };
  readonly resourceLoader = {
    getSkills: () => ({ skills: [{ name: "review", description: "Review code" }], diagnostics: [] }),
    getPrompts: () => ({ prompts: [{ name: "plan", description: "Plan work", argumentHint: "<goal>" }], diagnostics: [] }),
    getThemes: () => ({ themes: [{ name: "dark" }, { name: "light" }], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPromptSource: () => undefined,
    getAppendSystemPromptSources: () => [],
  };
  readonly services = { modelRuntime: this.modelRuntime, settingsManager: this.settingsManager, resourceLoader: this.resourceLoader, diagnostics: [] };
  readonly diagnostics = [];
  setRebindSession(): void {}
  async listSessions(): Promise<readonly unknown[]> { return [{ path: "D:/sessions/one.jsonl", id: "one", firstMessage: "First", messageCount: 2, modified: new Date(0) }]; }
  async newSession(): Promise<unknown> { this.calls.push("new"); return { cancelled: this.newCancelled }; }
  async switchSession(path: string, options?: { cwdOverride?: string }): Promise<unknown> {
    this.calls.push(`resume:${path}${options?.cwdOverride ? `:${options.cwdOverride}` : ""}`);
    if (this.resumeMissingCwd && options?.cwdOverride === undefined) {
      throw Object.assign(new Error("missing cwd"), {
        issue: { sessionCwd: "D:/missing", fallbackCwd: "D:/work" },
      });
    }
    return { cancelled: false };
  }
  async fork(id: string): Promise<unknown> { this.calls.push(`fork:${id}`); return { cancelled: false }; }
  async importFromJsonl(path: string): Promise<unknown> { this.calls.push(`import:${path}`); return { cancelled: false }; }
  async dispose(): Promise<void> { this.calls.push("dispose"); }
}

function host(overrides: Partial<PiWorkflowHost> = {}): PiWorkflowHost {
  return {
    copyText: async () => {},
    runCommand: async (_command, arguments_) => arguments_[0] === "gist"
      ? { stdout: "https://gist.github.com/user/abc123\n", stderr: "" }
      : { stdout: "logged in", stderr: "" },
    readChangelog: async () => "# Changelog",
    ...overrides,
  };
}

async function fixture(workflowHost = host(), configure?: (runtime: WorkflowRuntime) => void) {
  const runtime = new WorkflowRuntime();
  configure?.(runtime);
  const adapter = await createPiEngineAdapter({
    cwd: "D:/work",
    agentDir: join(tmpdir(), "a1-workflow-fixture"),
    createRuntime: async () => runtime as unknown as AgentSessionRuntime,
    workflowHost,
    settingsProductMode: "comparison",
  });
  for (const owner of ["agent", "shell", "terminal", "startup", "shutdown", "installation"] as const) {
    const handlers = Object.fromEntries(Object.entries(PI_SETTING_EFFECTS)
      .filter(([, definition]) => definition.owner === owner)
      .map(([key]) => [key, { apply(value: unknown) { runtime.session.calls.push(`setting:${key}:${String(value)}`); } }])) as PiSettingOwnerHandlers;
    adapter.bindSettingsOwner(owner, handlers);
  }
  return { runtime, adapter };
}

const argumentsByCommand: Partial<Record<typeof PINNED_PI_WORKFLOW_COMMAND_NAMES[number], string>> = {
  model: "openai/gpt-5", export: "session.html", import: "session.jsonl", name: "Named session",
  compact: "Keep decisions", login: "oauth:openai", resume: "D:/sessions/one.jsonl",
};

const selectionByCommand: Partial<Record<typeof PINNED_PI_WORKFLOW_COMMAND_NAMES[number], string>> = {
  settings: "onAutoCompactChange", "scoped-models": "openai/gpt-5", fork: "entry-1", tree: "entry-1",
  trust: "trust", logout: "openai",
};

describe("pinned Pi command and input workflows", () => {
  it("matches the independently recorded upstream command, hidden-route, and settings manifests", async () => {
    const evidence = JSON.parse(await readFile("config/baselines/pinned-pi-command-workflow-outcomes.json", "utf8"));
    const commandMap = JSON.parse(await readFile("node_modules/@earendil-works/pi-coding-agent/dist/core/slash-commands.js.map", "utf8"));
    const commandSource = String(commandMap.sourcesContent[0]);
    const manifestSource = commandSource.slice(commandSource.indexOf("BUILTIN_SLASH_COMMANDS"), commandSource.indexOf("];", commandSource.indexOf("BUILTIN_SLASH_COMMANDS")));
    const upstreamNames = [...manifestSource.matchAll(/name:\s*"([^"]+)"/g)].map(match => match[1]);
    const interactiveMap = JSON.parse(await readFile("node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/interactive-mode.js.map", "utf8"));
    const interactiveSource = String(interactiveMap.sourcesContent[0]);

    expect(upstreamNames).toEqual(PINNED_PI_WORKFLOW_COMMAND_NAMES);
    expect(evidence.advertised.map((entry: { name: string }) => entry.name)).toEqual(upstreamNames);
    expect(evidence.hidden).toEqual(PINNED_PI_HIDDEN_COMMAND_NAMES);
    expect(evidence.settingsCallbacks).toEqual(PINNED_PI_SETTINGS_CALLBACKS);
    for (const name of [...upstreamNames, ...PINNED_PI_HIDDEN_COMMAND_NAMES]) {
      expect(interactiveSource, `upstream route /${name}`).toContain(`text === "/${name}"`);
    }
  });

  it("routes every advertised and hidden command to a successful operation or selector continuation", async () => {
    const { adapter } = await fixture();
    for (const command of PINNED_PI_WORKFLOW_COMMAND_NAMES) {
      const request: PiWorkflowRequest = {
        command,
        argument: argumentsByCommand[command] ?? "",
        ...(command === "import" ? { confirmed: true } : {}),
        ...(selectionByCommand[command] ? { selection: selectionByCommand[command] } : {}),
      };
      const result = await adapter.executeWorkflow(request);
      expect(result.outcome, `${command}: ${result.message}`).toBe("completed");
    }
    // /quit disposes the first adapter, so hidden routes use a fresh running runtime.
    const hidden = await fixture();
    for (const command of PINNED_PI_HIDDEN_COMMAND_NAMES) {
      await expect(hidden.adapter.executeWorkflow({ command, argument: "" })).resolves.toMatchObject({ command, outcome: "completed" });
    }
  });

  it("returns source-structured session information instead of a raw JSON detail fallback", async () => {
    const { adapter } = await fixture();
    const result = await adapter.executeWorkflow({ command: "session", argument: "" });
    expect(result).toMatchObject({
      command: "session",
      outcome: "completed",
      message: "Session Info",
      presentation: {
        kind: "session-info",
        sessionName: "Fixture",
        stats: {
          sessionId: "workflow-session",
          totalMessages: 2,
          userMessages: 0,
          assistantMessages: 0,
          toolCalls: 0,
          toolResults: 0,
        },
        cacheWaste: { missedTokens: 0, missedCost: 0, missCount: 0 },
      },
    });
    expect(result.detail).toBeUndefined();
    await adapter.dispose();
  });

  it("opens every selector, completes every pinned settings callback, and preserves cancellation", async () => {
    const { adapter, runtime } = await fixture();
    expect(adapter.pinnedSettingsSnapshot().availableThemes.length).toBeGreaterThan(0);
    expect(adapter.pinnedModelSelectorContext().modelRuntime).toBeDefined();
    expect(adapter.pinnedScopedModelsContext().models.length).toBeGreaterThan(0);
    expect(adapter.pinnedForkOptions().length).toBeGreaterThan(0);
    expect(adapter.pinnedTreeSelectorContext().tree).toBeInstanceOf(Array);
    expect(adapter.pinnedProjectTrustContext().trustOptions.length).toBeGreaterThan(0);
    expect(adapter.pinnedLoginOptions().length).toBeGreaterThan(0);
    expect((await adapter.pinnedLogoutOptions()).length).toBeGreaterThan(0);
    expect(adapter.pinnedSessionSelectorContext().loadCurrentSessions).toBeTypeOf("function");
    for (const command of ["settings", "model", "scoped-models", "fork", "tree", "trust", "login", "logout", "resume"] as const) {
      await expect(adapter.executeWorkflow({ command, argument: "" })).resolves.toMatchObject({
        outcome: "failed",
        message: expect.stringContaining("owned"),
      });
    }
    for (const callback of PINNED_PI_SETTINGS_CALLBACKS) {
      const result = await adapter.executeWorkflow({ command: "settings", argument: "", selection: callback });
      expect(result.outcome, `${callback}: ${result.message}`).toBe(callback === "onCancel" ? "cancelled" : "completed");
    }
    expect(await adapter.applyPinnedSettingValue("onImageWidthCellsChange", 120)).toMatchObject({ outcome: "completed" });
    expect(runtime.settingsValues.get("ImageWidthCells")).toBe(120);
    expect(await adapter.applyPinnedSettingValue("onEditorPaddingXChange", 3)).toMatchObject({ outcome: "completed" });
    expect(runtime.settingsValues.get("EditorPaddingX")).toBe(3);
    expect(await adapter.applyPinnedSettingValue("onWarningsChange", { anthropicExtraUsage: false })).toMatchObject({ outcome: "completed" });
    expect(runtime.settingsValues.get("Warnings")).toEqual({ anthropicExtraUsage: false });
    await expect(adapter.executeWorkflow({ command: "import", argument: "session.jsonl" })).resolves.toMatchObject({ outcome: "requires-confirmation" });
    await expect(adapter.executeWorkflow({ command: "import", argument: "session.jsonl", confirmed: false })).resolves.toMatchObject({ outcome: "cancelled" });
    runtime.newCancelled = true;
    await expect(adapter.executeWorkflow({ command: "new", argument: "" })).resolves.toMatchObject({ outcome: "cancelled" });

    runtime.resumeMissingCwd = true;
    await expect(adapter.executeWorkflow({ command: "resume", argument: "D:/sessions/missing.jsonl" })).resolves.toMatchObject({
      outcome: "requires-confirmation",
      message: "cwd from session file does not exist\nD:/missing\n\ncontinue in current cwd\nD:/work",
    });
    await expect(adapter.executeWorkflow({ command: "resume", argument: "D:/sessions/missing.jsonl", confirmed: false })).resolves.toMatchObject({ outcome: "cancelled" });
    await expect(adapter.executeWorkflow({ command: "resume", argument: "D:/sessions/missing.jsonl", confirmed: true })).resolves.toMatchObject({ outcome: "completed", message: "Resumed session in current cwd" });
    expect(runtime.calls).toContain("resume:D:/sessions/missing.jsonl:D:/work");

    await expect(adapter.executeWorkflow({
      command: "tree",
      argument: "",
      selection: "entry-1",
      treeSummary: { summarize: true, customInstructions: "Preserve decisions" },
    })).resolves.toMatchObject({ outcome: "completed", message: "Navigated to selected point" });
    expect(runtime.session.calls).toContain("tree:entry-1:summary:Preserve decisions");
  });

  it("covers resource autocomplete, bash context modes, model controls, queue restoration, and contained failures", async () => {
    const { adapter, runtime } = await fixture(host({ copyText: async () => { throw new Error("clipboard denied"); } }));
    expect(adapter.workflowAutocompleteCommands()).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "model", source: "builtin", argumentOptions: expect.any(Array) }),
      expect.objectContaining({ name: "login", source: "builtin", argumentOptions: expect.any(Array) }),
      { name: "plan", description: "Plan work", argumentHint: "<goal>", source: "prompt" },
      { name: "skill:review", description: "Review code", source: "skill" },
    ]));
    await expect(adapter.executeBashWorkflow("pwd", false)).resolves.toMatchObject({ output: "bash output", excludeFromContext: false });
    await expect(adapter.executeBashWorkflow("pwd", true)).resolves.toMatchObject({ excludeFromContext: true });
    await expect(adapter.cycleModelWorkflow("forward")).resolves.toMatchObject({ outcome: "completed" });
    expect(adapter.clearQueuedWorkflows()).toEqual(["steer", "follow"]);
    adapter.abortBashWorkflow();
    await expect(adapter.executeWorkflow({ command: "copy", argument: "" })).resolves.toMatchObject({ outcome: "failed", message: "clipboard denied" });
    runtime.session.reloadFails = true;
    await expect(adapter.executeWorkflow({ command: "reload", argument: "" })).resolves.toMatchObject({ outcome: "failed", message: "Reload failed: reload exploded" });
    await expect(adapter.executeWorkflow({ command: "model", argument: "openai/missing" })).resolves.toMatchObject({ outcome: "failed" });
  });

  it("preserves authoritative provider authentication status beside available models", async () => {
    const { adapter, runtime } = await fixture();
    expect(runtime.modelRuntime.getAvailableSnapshot()).toEqual([
      { provider: "openai", id: "gpt-5", name: "GPT-5" },
    ]);
    expect(adapter.pinnedLoginOptions("oauth")).toEqual([{
      id: "oauth:openai",
      providerId: "openai",
      label: "OpenAI",
      description: "Account / OAuth",
      authType: "oauth",
      status: { type: "oauth", source: "stored" },
    }]);
    await expect(adapter.pinnedLogoutOptions()).resolves.toEqual([{
      id: "oauth:openai",
      providerId: "openai",
      label: "OpenAI Codex",
      description: "oauth",
      authType: "oauth",
      status: { type: "oauth", source: "stored credential" },
    }]);

    runtime.providerAuthStatus.set("openai", { configured: false });
    runtime.credentialTypes.delete("openai");
    expect(runtime.modelRuntime.getAvailableSnapshot()).toEqual([]);
    expect(adapter.pinnedLoginOptions("oauth")).toEqual([{
      id: "oauth:openai",
      providerId: "openai",
      label: "OpenAI",
      description: "Account / OAuth",
      authType: "oauth",
    }]);
    await expect(adapter.pinnedLogoutOptions()).resolves.toEqual([]);
    await adapter.dispose();
  });

  it("keeps provider status, credential ownership, and model availability aligned across auth states", async () => {
    const { adapter, runtime } = await fixture();
    const states = [
      {
        name: "empty",
        status: { configured: false } as const,
        credentialType: undefined,
        expectedStatus: undefined,
        expectedModels: 0,
        expectedLogout: 0,
      },
      {
        name: "stored OAuth",
        status: { configured: true, source: "stored" as const },
        credentialType: "oauth" as const,
        expectedStatus: { type: "oauth", source: "stored" },
        expectedModels: 1,
        expectedLogout: 1,
      },
      {
        name: "stored API key",
        status: { configured: true, source: "stored" as const },
        credentialType: "api_key" as const,
        expectedStatus: { type: "api_key", source: "stored" },
        expectedModels: 1,
        expectedLogout: 1,
      },
      {
        name: "environment",
        status: { configured: true, source: "environment" as const, label: "OPENAI_API_KEY" },
        credentialType: undefined,
        expectedStatus: { type: "api_key", source: "OPENAI_API_KEY" },
        expectedModels: 1,
        expectedLogout: 0,
      },
      {
        name: "expired without refresh",
        status: { configured: false } as const,
        credentialType: undefined,
        expectedStatus: undefined,
        expectedModels: 0,
        expectedLogout: 0,
      },
    ];

    for (const state of states) {
      runtime.providerAuthStatus.set("openai", state.status);
      if (state.credentialType === undefined) runtime.credentialTypes.delete("openai");
      else runtime.credentialTypes.set("openai", state.credentialType);
      const option = adapter.pinnedLoginOptions("oauth")[0];
      expect(option?.status, state.name).toEqual(state.expectedStatus);
      expect(runtime.modelRuntime.getAvailableSnapshot(), state.name).toHaveLength(state.expectedModels);
      await expect(adapter.pinnedLogoutOptions(), state.name).resolves.toHaveLength(state.expectedLogout);
    }
    await adapter.dispose();
  });

  it("drops a stale selected model when an empty profile starts", async () => {
    const { adapter } = await fixture(host(), runtime => {
      runtime.providerAuthStatus.set("openai", { configured: false });
      runtime.credentialTypes.delete("openai");
    });
    expect(adapter.view().activeModel).toBeNull();
    expect(adapter.view().status.footer?.availableProviderCount).toBe(0);
    expect(adapter.pinnedModelSelectorContext().currentModel).toBeUndefined();
    await adapter.dispose();
  });

  it("reconciles login and stored logout without a process restart", async () => {
    const { adapter, runtime } = await fixture();
    runtime.providerAuthStatus.set("openai", { configured: false });
    runtime.credentialTypes.delete("openai");
    expect(runtime.modelRuntime.getAvailableSnapshot()).toEqual([]);

    await expect(adapter.executeWorkflow({ command: "login", argument: "", selection: "oauth:openai" })).resolves.toMatchObject({ outcome: "completed" });
    expect(adapter.pinnedLoginOptions("oauth")[0]?.status).toEqual({ type: "oauth", source: "stored" });
    expect(runtime.modelRuntime.getAvailableSnapshot()).toHaveLength(1);
    expect(adapter.view().activeModel).toMatchObject({ providerId: "openai", modelId: "gpt-5" });
    expect(adapter.view().status.footer?.availableProviderCount).toBe(1);
    expect(adapter.pinnedScopedModelsContext().models).toHaveLength(1);
    await expect(adapter.pinnedLogoutOptions()).resolves.toHaveLength(1);

    await expect(adapter.executeWorkflow({ command: "logout", argument: "", selection: "oauth:openai" })).resolves.toMatchObject({ outcome: "completed" });
    expect(adapter.pinnedLoginOptions("oauth")[0]?.status).toBeUndefined();
    expect(runtime.modelRuntime.getAvailableSnapshot()).toEqual([]);
    expect(adapter.view().activeModel).toBeNull();
    expect(adapter.view().status.footer?.availableProviderCount).toBe(0);
    expect(adapter.pinnedModelSelectorContext().currentModel).toBeUndefined();
    expect(adapter.pinnedScopedModelsContext().models).toEqual([]);
    await expect(adapter.pinnedLogoutOptions()).resolves.toEqual([]);
    await adapter.dispose();
  });

  it("preserves the provider-specific authentication-type level before login", async () => {
    const { adapter } = await fixture();
    expect(adapter.pinnedLoginMethodOptions("openai")).toEqual({
      title: "Select authentication method for OpenAI Codex:",
      options: [
        { id: "oauth:openai", label: "Sign in with an account", description: "Account / OAuth" },
        { id: "api_key:openai", label: "Sign in with an API key", description: "API key" },
      ],
    });
    await adapter.dispose();
  });

  it("maps public authentication prompts into owned nested states, success, and cancellation", async () => {
    const { adapter, runtime } = await fixture();
    runtime.loginPrompt = true;
    const prompts: string[] = [];
    adapter.setWorkflowInteractionHost({
      prompt: async request => { prompts.push(`${request.type}:${request.message}`); return "credential"; },
      notify() {},
    });
    await expect(adapter.executeWorkflow({ command: "login", argument: "api_key:openai" })).resolves.toMatchObject({ outcome: "completed" });
    expect(prompts).toEqual(["secret:API key"]);

    runtime.loginPrompt = false;
    runtime.loginSelect = true;
    const lifecycle: string[] = [];
    const notifications: unknown[] = [];
    adapter.setWorkflowInteractionHost({
      startLogin: request => lifecycle.push(`start:${request.providerName}:${request.authType}`),
      prompt: async request => {
        expect(request).toMatchObject({
          type: "select",
          message: "Select OpenAI Codex login method:",
          options: [{ id: "browser", label: "Browser login" }, { id: "device", label: "Device code login" }],
        });
        return "device";
      },
      notify: event => notifications.push(event),
      finishLogin: () => lifecycle.push("finish"),
    });
    await expect(adapter.executeWorkflow({ command: "login", argument: "oauth:openai" })).resolves.toMatchObject({
      outcome: "completed",
      message: expect.stringMatching(/^Logged in to OpenAI Codex\. Credentials saved to .+auth\.json$/),
    });
    expect(lifecycle).toEqual(["start:OpenAI Codex:oauth", "finish"]);
    expect(notifications).toEqual([{ type: "auth_url", url: "https://example.test/auth", instructions: "Continue in browser" }]);

    adapter.setWorkflowInteractionHost({ prompt: async () => null, notify() {} });
    runtime.loginSelect = false;
    runtime.loginPrompt = true;
    await expect(adapter.executeWorkflow({ command: "login", argument: "api_key:openai" })).resolves.toMatchObject({ outcome: "cancelled" });
  });
});
