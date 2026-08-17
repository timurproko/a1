import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  createPiEngineAdapter,
  PINNED_PI_HIDDEN_COMMAND_NAMES,
  PINNED_PI_SETTINGS_CALLBACKS,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
  type PiRuntimeLike,
  type PiSessionLike,
  type PiWorkflowHost,
  type PiWorkflowRequest,
} from "../../../src/foundation/pi-engine-adapter/index.js";

class WorkflowSession implements PiSessionLike {
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
  getUserMessagesForForking(): unknown { return [{ entryId: "entry-1", text: "First prompt" }]; }
  async navigateTree(id: string, options?: { summarize?: boolean; customInstructions?: string }): Promise<unknown> {
    this.calls.push(`tree:${id}:${options?.summarize === true ? "summary" : "plain"}:${options?.customInstructions ?? ""}`);
    return { cancelled: false };
  }
  async reload(): Promise<void> { if (this.reloadFails) throw new Error("reload exploded"); this.calls.push("reload"); }
}

class WorkflowRuntime implements PiRuntimeLike {
  readonly session = new WorkflowSession();
  newCancelled = false;
  loginPrompt = false;
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
      if (name.startsWith("get")) return () => this.settingsValues.get(name.slice(3));
      if (name.startsWith("set")) return (value: unknown) => { this.settingsValues.set(name.slice(3), value); };
      return undefined;
    },
  });
  readonly modelRuntime = {
    getModel: (provider: string, id: string) => provider === "openai" && id === "missing" ? undefined : ({ provider, id, name: id }),
    getAvailableSnapshot: () => [{ provider: "openai", id: "gpt-5", name: "GPT-5" }],
    getProviders: () => [{ id: "openai", name: "OpenAI", auth: { oauth: {}, apiKey: {} } }],
    listCredentials: async () => [{ providerId: "openai", type: "oauth" }],
    login: async (_provider: string, _type: string, interaction: { prompt(input: unknown): Promise<string> }) => {
      if (this.loginPrompt) await interaction.prompt({ type: "input", message: "API key", placeholder: "secret" });
      return { type: "oauth" };
    },
    logout: async () => {},
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
  async listSessions(): Promise<unknown> { return [{ path: "D:/sessions/one.jsonl", id: "one", firstMessage: "First", messageCount: 2, modified: new Date(0) }]; }
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

async function fixture(workflowHost = host()) {
  const runtime = new WorkflowRuntime();
  const adapter = await createPiEngineAdapter({ cwd: "D:/work", createRuntime: async () => runtime, workflowHost });
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
    const evidence = JSON.parse(await readFile("openspec/changes/build-owned-pi-ui-foundation/evidence/pinned-pi-command-workflow-outcomes.json", "utf8"));
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

  it("opens every selector, completes every pinned settings callback, and preserves cancellation", async () => {
    const { adapter, runtime } = await fixture();
    for (const command of ["settings", "model", "scoped-models", "fork", "tree", "trust", "login", "logout", "resume"] as const) {
      const result = await adapter.executeWorkflow({ command, argument: "" });
      expect(result.outcome, command).toBe("requires-selection");
      expect(result.options?.length, command).toBeGreaterThan(0);
    }
    for (const callback of PINNED_PI_SETTINGS_CALLBACKS) {
      const result = await adapter.executeWorkflow({ command: "settings", argument: "", selection: callback });
      expect(result.outcome, `${callback}: ${result.message}`).toBe(callback === "onCancel" ? "cancelled" : "completed");
    }
    expect(adapter.applyPinnedSettingValue("onImageWidthCellsChange", 120)).toMatchObject({ outcome: "completed" });
    expect(runtime.settingsValues.get("ImageWidthCells")).toBe(120);
    expect(adapter.applyPinnedSettingValue("onEditorPaddingXChange", 3)).toMatchObject({ outcome: "completed" });
    expect(runtime.settingsValues.get("EditorPaddingX")).toBe(3);
    expect(adapter.applyPinnedSettingValue("onWarningsChange", { anthropicExtraUsage: false })).toMatchObject({ outcome: "completed" });
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

  it("maps public authentication prompts into owned success and cancellation interactions", async () => {
    const { adapter, runtime } = await fixture();
    runtime.loginPrompt = true;
    const prompts: string[] = [];
    adapter.setWorkflowInteractionHost({
      prompt: async request => { prompts.push(`${request.type}:${request.message}`); return "credential"; },
      notify() {},
    });
    await expect(adapter.executeWorkflow({ command: "login", argument: "api_key:openai" })).resolves.toMatchObject({ outcome: "completed" });
    expect(prompts).toEqual(["secret:API key"]);

    adapter.setWorkflowInteractionHost({ prompt: async () => null, notify() {} });
    await expect(adapter.executeWorkflow({ command: "login", argument: "api_key:openai" })).resolves.toMatchObject({ outcome: "cancelled" });
  });
});
