import { readFile } from "node:fs/promises";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import {
  createPiEngineAdapter,
  PINNED_PI_HIDDEN_COMMAND_NAMES,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
  type PiRuntimeLike,
  type PiSessionLike,
} from "../../../src/foundation/pi-engine-adapter/index.js";
import type { PiTuiTerminalPort } from "../../../src/foundation/pi-tui-runtime-adapter/index.js";
import { PiSessionShell } from "../../../src/features/owned-ui/index.js";

class Session implements PiSessionLike {
  readonly sessionId = "pi-session";
  model: unknown = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  thinkingLevel: unknown = "medium";
  isStreaming = false;
  readonly isIdle = true;
  isRetrying = false;
  isCompacting = false;
  readonly calls: string[] = [];
  scopedModels: readonly unknown[] = [];
  constructor(readonly messages: readonly unknown[] = []) {}
  extensionBindings: unknown;
  #listeners = new Set<(event: unknown) => void>();
  subscribe(listener: (event: unknown) => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  emit(event: unknown): void { for (const listener of this.#listeners) listener(event); }
  async prompt(text: string): Promise<void> { this.calls.push(`prompt:${text}`); }
  async steer(text: string): Promise<void> { this.calls.push(`steer:${text}`); }
  async followUp(text: string): Promise<void> { this.calls.push(`followUp:${text}`); }
  async abort(): Promise<void> { this.calls.push("abort"); }
  abortRetry(): void { this.calls.push("abortRetry"); }
  abortCompaction(): void { this.calls.push("abortCompaction"); }
  async compact(): Promise<void> { this.calls.push("compact"); }
  clearQueue(): unknown { this.calls.push("clearQueue"); return { steering: ["queued steer"], followUp: ["queued follow"] }; }
  async executeBash(command: string, _onChunk: unknown, options: { excludeFromContext: boolean }): Promise<unknown> {
    this.calls.push(`bash:${command}:${options.excludeFromContext}`);
    return { output: command, exitCode: 0, cancelled: false, truncated: false };
  }
  async bindExtensions(bindings: unknown): Promise<void> { this.extensionBindings = bindings; this.calls.push("bindExtensions"); }
  async reload(): Promise<void> { this.calls.push("reload"); }
  async setModel(model: unknown): Promise<void> { this.model = model; this.calls.push("setModel"); }
  setScopedModels(models: readonly unknown[]): void { this.scopedModels = models; this.calls.push(`scoped:${models.length}`); }
  setThinkingLevel(level: unknown): void { this.thinkingLevel = level; this.calls.push(`thinking:${String(level)}`); }
  dispose(): void {}
}

class Runtime implements PiRuntimeLike {
  readonly session: Session;
  enabledModels: readonly string[] | undefined;
  readonly availableModels = [
    { provider: "openai", id: "gpt-5", name: "GPT-5" },
    { provider: "anthropic", id: "claude", name: "Claude" },
  ];
  readonly services = {
    modelRuntime: {
      getModel: (provider: string, id: string) => this.availableModels.find(model => model.provider === provider && model.id === id),
      getAvailableSnapshot: () => this.availableModels,
      getProviders: () => [{ id: "openai", name: "OpenAI Codex", auth: { oauth: {}, apiKey: {} } }],
      getProvider: (id: string) => id === "openai" ? { id, name: "OpenAI Codex", auth: { oauth: {}, apiKey: {} } } : undefined,
      login: async (_providerId: string, _authType: string, interaction: {
        prompt(request: unknown): Promise<string>;
        notify(event: unknown): void;
      }) => {
        interaction.notify({ type: "progress", message: "Preparing authentication..." });
        const method = await interaction.prompt({
          type: "select",
          message: "Select OpenAI Codex login method:",
          options: [
            { id: "browser", label: "Browser login (default)" },
            { id: "device", label: "Device code login (headless)" },
          ],
        });
        this.calls.push(`login-method:${method}`);
        return { type: "oauth" };
      },
      refresh: async () => ({ aborted: false, errors: new Map() }),
    },
    settingsManager: {
      getEnabledModels: () => this.enabledModels,
      setEnabledModels: (patterns: readonly string[] | undefined) => { this.enabledModels = patterns; },
    },
    diagnostics: [],
  };
  constructor(messages: readonly unknown[] = []) { this.session = new Session(messages); }
  readonly diagnostics = [];
  readonly calls: string[] = [];
  setRebindSession(): void {}
  async newSession(): Promise<void> { this.calls.push("newSession"); }
  async switchSession(path: string): Promise<void> { this.calls.push(`switch:${path}`); }
  async dispose(): Promise<void> { this.calls.push("dispose"); }
}

class Terminal implements PiTuiTerminalPort {
  columns = 80;
  rows = 24;
  readonly kittyProtocolActive = false;
  readonly writes: string[] = [];
  #input: ((data: string) => void) | undefined;
  #resize: (() => void) | undefined;
  start(onInput: (data: string) => void, onResize: () => void): void { this.#input = onInput; this.#resize = onResize; }
  stop(): void { this.#input = undefined; this.#resize = undefined; }
  async drainInput(): Promise<void> {}
  write(data: string): void { this.writes.push(data); }
  input(data: string): void { this.#input?.(data); }
  resize(columns: number, rows: number): void { this.columns = columns; this.rows = rows; this.#resize?.(); }
  moveBy(): void {}
  hideCursor(): void { this.write("\x1b[?25l"); }
  showCursor(): void { this.write("\x1b[?25h"); }
  clearLine(): void { this.write("\x1b[K"); }
  clearFromCursor(): void { this.write("\x1b[J"); }
  clearScreen(): void { this.write("\x1b[2J\x1b[H"); }
  setTitle(): void {}
  setProgress(): void {}
}

async function fixture(messages: readonly unknown[] = []) {
  const engine = new Runtime(messages);
  const adapter = await createPiEngineAdapter({ cwd: "D:/work", sessionId: "owned-shell", createRuntime: async () => engine });
  const terminal = new Terminal();
  const shell = new PiSessionShell({ adapter, cwd: "D:/work", terminal });
  shell.start();
  shell.runtime.renderNow();
  return { engine, adapter, terminal, shell };
}

describe("PiSessionShell", () => {
  it("composes the public Pi editor, transcript, tool/status surfaces, and runtime", async () => {
    const { engine, adapter, terminal, shell } = await fixture();
    shell.root.editor.setText("Inspect with Pi editor");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("prompt:Inspect with Pi editor");

    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "message_start", message: { role: "assistant", content: [{ type: "text", text: "Streaming answer" }], timestamp: 1 } });
    await adapter.flushEvents();
    const streamingId = shell.view().transcript.find(block => block.kind === "assistant")?.id;
    expect(streamingId).toBeDefined();
    const persistentComponent = shell.root.transcriptComponent(streamingId!);
    engine.session.emit({ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: " complete" } });
    await adapter.flushEvents();
    expect(shell.root.transcriptComponent(streamingId!)).toBe(persistentComponent);
    shell.runtime.renderNow();
    const rows = shell.root.render(60).join("\n");
    expect(rows).toContain("Streaming answer");
    expect(rows).toContain("gpt-5 • medium");
    expect(rows).toContain("v0.84.2");
    expect(rows).toContain("commands");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("bindExtensions");
    expect(adapter.visualExtensionSupport()).toMatchObject({ available: true, binding: "bound" });

    const handle = shell.showSelector("Choose", [{ id: "one", label: "One" }], () => {});
    shell.runtime.renderNow();
    expect(handle.isFocused()).toBe(true);
    terminal.resize(50, 16);
    shell.runtime.renderNow();
    expect(shell.runtime.viewport()).toEqual({ columns: 50, rows: 16 });

    shell.root.editor.setText("clear me");
    await shell.clearOrExit(1_000);
    expect(shell.root.editor.getText()).toBe("");
    expect(shell.view().lifecycle).not.toBe("stopped");
    await shell.clearOrExit(1_200);
    await shell.dispose();
    expect(engine.calls).toContain("dispose");
  });

  it("populates and updates current-session prompt history with pinned Up/Down draft restoration", async () => {
    const { engine, terminal, shell } = await fixture([
      { role: "user", content: [{ type: "text", text: "loaded older" }], timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "answer" }], timestamp: 2 },
      { role: "user", content: [{ type: "text", text: "loaded newer" }], timestamp: 3 },
    ]);

    shell.root.editor.setText("draft");
    terminal.input("\x1b[A");
    expect(shell.root.editor.getText()).toBe("draft");
    terminal.input("\x1b[A");
    expect(shell.root.editor.getText()).toBe("loaded newer");
    terminal.input("\x1b[A");
    expect(shell.root.editor.getText()).toBe("loaded older");
    terminal.input("\x1b[B");
    expect(shell.root.editor.getText()).toBe("loaded newer");
    terminal.input("\x1b[B");
    expect(shell.root.editor.getText()).toBe("draft");

    shell.root.editor.setText("entered now");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("prompt:entered now");
    terminal.input("\x1b[A");
    expect(shell.root.editor.getText()).toBe("entered now");
    await shell.dispose();
  });

  it("keeps scoped-model changes session-only until Ctrl+S and leaves the modal open", async () => {
    const { engine, terminal, shell } = await fixture();
    await shell.submit("/scoped-models");
    expect(shell.root.render(100).join("\n")).toContain("Model Configuration");
    expect(shell.root.render(100).join("\n")).toContain("ctrl+s");

    terminal.input("\r");
    const dirtyFrame = shell.root.render(100).join("\n");
    expect(dirtyFrame).toContain("Model Configuration");
    expect(dirtyFrame).toContain("(unsaved)");
    expect(engine.session.calls).toContain("scoped:1");
    expect(engine.enabledModels).toBeUndefined();

    terminal.input("\x13");
    const savedFrame = shell.root.render(100).join("\n");
    expect(savedFrame).toContain("Model Configuration");
    expect(savedFrame).toContain("Model selection saved to settings");
    expect(savedFrame).not.toContain("(unsaved)");
    expect(engine.enabledModels).toEqual(["openai/gpt-5"]);

    terminal.input("\x1b");
    const restoredFrame = shell.root.render(100).join("\n");
    expect(restoredFrame).not.toContain("Model Configuration");
    expect(restoredFrame).not.toContain("Scoped models cancelled");
    await shell.dispose();
  });

  it("ports project trust as a stateful save-or-cancel selector", async () => {
    const { adapter, terminal, shell } = await fixture();
    vi.spyOn(adapter, "pinnedProjectTrustContext").mockReturnValue({
      cwd: "D:\\work",
      savedDecision: null,
      projectTrusted: false,
      trustOptions: [
        { label: "Trust", trusted: true, updates: [{ path: "D:\\work", decision: true }], savedPath: "D:\\work" },
        { label: "Do not trust", trusted: false, updates: [{ path: "D:\\work", decision: false }], savedPath: "D:\\work" },
      ],
    });
    const persist = vi.spyOn(adapter, "persistProjectTrust").mockImplementation(() => {});

    await shell.submit("/trust");
    expect(shell.root.render(100).join("\n")).toContain("Project trust");
    expect(shell.root.render(100).join("\n")).toContain("Current session: untrusted");
    terminal.input("\x1b");
    expect(persist).not.toHaveBeenCalled();
    expect(shell.root.render(100).join("\n")).not.toContain("Project trust");

    await shell.submit("/trust");
    terminal.input("\r");
    expect(persist).toHaveBeenCalledWith([{ path: "D:\\work", decision: true }]);
    expect(shell.root.render(100).join("\n")).toContain("Saved trust decision: trusted. Restart pi for this to take effect.");
    await shell.dispose();
  });

  it("uses the stateful session controller and closes resume cancellation silently", async () => {
    const { engine, adapter, terminal, shell } = await fixture();
    const session = {
      path: "D:/sessions/one.jsonl",
      id: "one",
      cwd: "D:/work",
      name: "Named session",
      created: new Date(0),
      modified: new Date(),
      messageCount: 3,
      firstMessage: "First prompt",
      allMessagesText: "First prompt response",
    };
    vi.spyOn(adapter, "pinnedSessionSelectorContext").mockReturnValue({
      currentSessionFilePath: "D:/sessions/current.jsonl",
      loadCurrentSessions: async () => [session],
      loadAllSessions: async progress => {
        progress?.(1, 1);
        return [session];
      },
      renameSession: async () => {},
    });

    await shell.submit("/resume");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Resume Session (Current Folder)");
    terminal.input("\t");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Resume Session (All)");
    terminal.input("\x1b");
    expect(shell.root.render(100).join("\n")).not.toContain("Resume Session");
    expect(shell.root.render(100).join("\n")).not.toContain("Resume cancelled");

    await shell.submit("/resume");
    await new Promise(resolve => setTimeout(resolve, 0));
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.calls).toContain("switch:D:/sessions/one.jsonl");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Resumed session");
    await shell.dispose();
  });

  it("nests tree summary choice and custom instructions while restoring cancellation", async () => {
    const { adapter, terminal, shell } = await fixture();
    const tree = [{
      entry: {
        type: "message",
        id: "entry-1",
        parentId: null,
        timestamp: new Date(0).toISOString(),
        message: { role: "user", content: [{ type: "text", text: "First prompt" }], timestamp: 0 },
      },
      children: [],
    }];
    vi.spyOn(adapter, "pinnedTreeSelectorContext").mockReturnValue({
      tree,
      currentLeafId: null,
      filterMode: "default",
      skipSummaryPrompt: false,
      appendLabelChange() {},
    });
    const execute = vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => ({
      command: request.command,
      outcome: "completed",
      message: "Navigated to selected point",
    }));

    await shell.submit("/tree");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Session Tree");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Summarize branch?");
    terminal.input("\x1b");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Session Tree");

    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    terminal.input("\x1b[B");
    terminal.input("\x1b[B");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Custom summarization instructions");
    terminal.input("Preserve decisions");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(execute).toHaveBeenCalledWith({
      command: "tree",
      argument: "",
      selection: "entry-1",
      treeSummary: { summarize: true, customInstructions: "Preserve decisions" },
    });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Navigated to selected point");
    await shell.dispose();
  });

  it("nests login authentication type and provider selection with pinned cancellation", async () => {
    const { adapter, terminal, shell } = await fixture();
    vi.spyOn(adapter, "pinnedLoginOptions").mockImplementation(authType => [{
      id: `${authType ?? "oauth"}:openai`,
      label: "OpenAI",
      description: authType === "api_key" ? "API key" : "Account / OAuth",
    }]);
    const execute = vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => ({
      command: request.command,
      outcome: "completed",
      message: `completed ${request.selection ?? ""}`,
    }));

    await shell.submit("/login");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Select authentication method:");
    terminal.input("\r");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("OpenAI");
    terminal.input("\x1b");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Select authentication method:");
    terminal.input("\r");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(execute).toHaveBeenCalledWith({ command: "login", argument: "", selection: "oauth:openai" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("completed oauth:openai");
    await shell.dispose();
  });

  it("ports the nested provider authentication-method selector and restores its parent dialog", async () => {
    const { engine, terminal, shell } = await fixture();
    await shell.submit("/login");
    terminal.input("\r");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    const nested = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(nested).toContain("Select OpenAI Codex login method:");
    expect(nested).toContain("Browser login (default)");
    expect(nested).toContain("Device code login (headless)");
    expect(nested).not.toContain("Login to provider");

    terminal.input("\x1b[B");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.calls).toContain("login-method:device");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Logged in to OpenAI Codex");
    await shell.dispose();
  });

  it("routes the complete command manifest, hidden routes, prompt resources, bash modes, and streaming queues", async () => {
    const { engine, adapter, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => ({
      command: request.command,
      outcome: "completed",
      message: `ran ${request.command}`,
    }));
    const routedCommands = [...PINNED_PI_WORKFLOW_COMMAND_NAMES, ...PINNED_PI_HIDDEN_COMMAND_NAMES]
      .filter(command => command !== "scoped-models" && command !== "trust" && command !== "resume" && command !== "login" && command !== "tree");
    for (const command of routedCommands) {
      await shell.submit(`/${command}`);
    }
    expect(workflow.mock.calls.map(([request]) => request.command)).toEqual(routedCommands);

    await shell.submit("/plan release");
    await shell.submit("/skill:review src");
    await shell.submit("!echo included");
    await shell.submit("!!echo excluded");
    expect(engine.session.calls).toContain("prompt:/plan release");
    expect(engine.session.calls).toContain("prompt:/skill:review src");
    expect(engine.session.calls).toContain("bash:echo included:false");
    expect(engine.session.calls).toContain("bash:echo excluded:true");

    engine.session.emit({ type: "agent_start" });
    await adapter.flushEvents();
    await shell.submit("steer now");
    shell.root.editor.setText("follow later");
    await shell.queueFollowUp();
    expect(engine.session.calls).toContain("steer:steer now");
    expect(engine.session.calls).toContain("followUp:follow later");
    await shell.dispose();
  });

  it("retains compaction-time input and restores queued steering and follow-up text", async () => {
    const { engine, adapter, shell } = await fixture();
    engine.session.emit({ type: "compaction_start", reason: "manual" });
    await adapter.flushEvents();
    await shell.submit("after compaction");
    expect(engine.session.calls).not.toContain("steer:after compaction");
    engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
    await adapter.flushEvents();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("steer:after compaction");

    shell.restoreQueuedInput();
    expect(shell.root.editor.getText()).toBe("queued steer\nqueued follow");
    await shell.dispose();
  });

  it("uses pinned editor-replacement loaders for share and reload operations", async () => {
    const { adapter, shell } = await fixture();
    let resolveShare: ((result: Awaited<ReturnType<typeof adapter.executeWorkflow>>) => void) | undefined;
    const execute = vi.spyOn(adapter, "executeWorkflow").mockImplementation(request => request.command === "share"
      ? new Promise(resolve => { resolveShare = resolve; })
      : Promise.resolve({ command: request.command, outcome: "completed", message: "Reloaded keybindings, extensions, skills, prompts, themes, and context files" }));

    const share = shell.runWorkflow({ command: "share", argument: "" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Creating gist...");
    resolveShare?.({ command: "share", outcome: "completed", message: "Share URL: https://example.test", detail: "https://gist.test/id" });
    await share;
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("Creating gist...");

    const reload = shell.runWorkflow({ command: "reload", argument: "" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Reloading keybindings, extensions, skills, prompts, themes, and context files...");
    await reload;
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("Reloading keybindings");
    expect(execute).toHaveBeenCalledTimes(2);
    await shell.dispose();
  });

  it("rebinds the owned extension UI after reload replaces extension contexts", async () => {
    const { engine, shell } = await fixture();
    expect(engine.session.calls.filter(call => call === "bindExtensions")).toHaveLength(1);
    await shell.runWorkflow({ command: "reload", argument: "" });
    expect(engine.session.calls.filter(call => call === "bindExtensions")).toHaveLength(2);
    expect(engine.session.calls).toContain("reload");
    await shell.dispose();
  });

  it("keeps working and chronological command messages in their pinned root order with the dock spacer", async () => {
    const { engine, adapter, shell } = await fixture();
    engine.session.emit({ type: "agent_start" });
    await adapter.flushEvents();
    let rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    const working = rows.findIndex(row => row.includes("Working"));
    expect(working).toBeGreaterThan(-1);
    expect(rows[working + 1]?.trim()).toBe("");
    expect(rows[working + 2]).toMatch(/^─+$/);

    engine.session.emit({ type: "agent_end", messages: [] });
    await adapter.flushEvents();
    shell.root.appendWorkflowStatus("first informational message");
    shell.root.appendWorkflowResult({ command: "import", outcome: "failed", message: "Usage: /import <path.jsonl>" });
    shell.root.appendWorkflowStatus("latest informational message");
    rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    const first = rows.findIndex(row => row.includes("first informational message"));
    const error = rows.findIndex(row => row.includes("Error: Usage: /import <path.jsonl>"));
    const latest = rows.findIndex(row => row.includes("latest informational message"));
    const editorBorder = rows.findIndex((row, index) => index > latest && /^─+$/.test(row));
    expect(first).toBeGreaterThan(-1);
    expect(error).toBeGreaterThan(first);
    expect(latest).toBeGreaterThan(error);
    expect(editorBorder).toBe(latest + 2);
    expect(rows[latest + 1]?.trim()).toBe("");
    await shell.dispose();
  });

  it("renders /session with pinned structured groups, styles, and indentation instead of JSON", async () => {
    const { shell } = await fixture();
    shell.root.appendWorkflowResult({
      command: "session",
      outcome: "completed",
      message: "Session Info",
      presentation: {
        kind: "session-info",
        sessionName: "Parity fixture",
        stats: {
          sessionFile: "D:/sessions/parity.jsonl",
          sessionId: "session-1",
          userMessages: 2,
          assistantMessages: 2,
          toolCalls: 1,
          toolResults: 1,
          totalMessages: 6,
          tokens: { input: 100, output: 20, cacheRead: 300, cacheWrite: 50, total: 470 },
          cost: 0.125,
        },
        cacheWaste: { missedTokens: 2048, missedCost: 0.002, missCount: 1 },
        usageBreakdown: [
          { key: "openai/gpt-5", cost: 0.1, tokens: 400 },
          { key: "Tools/summaries", cost: 0.025, tokens: 70 },
        ],
      },
    });
    const raw = shell.root.render(100).join("\n");
    const plain = stripTerminalSequences(raw);
    expect(plain).toMatch(/Session Info\s*\n\s*\n\s*Name: Parity fixture/);
    expect(plain).toMatch(/Messages\s*\n\s*Total: 6\s*\n\s*User: 2\s*\n\s*Assistant: 2\s*\n\s*Tools: 1 calls, 1 results/);
    expect(plain).toMatch(/Tokens\s*\n\s*Input: 450\s*\n\s*Cached: 300 \(66\.7%\)\s*\n\s*Uncached: 150 \(50 written to cache\)/);
    expect(plain).toMatch(/Cost\s*\n\s*Total: \$0\.125/);
    expect(plain).toContain("Cache Re-billed: $0.002 (2,048 tokens, 1 miss)");
    expect(plain).not.toContain("\"sessionId\"");
    expect(raw).toContain("\x1b[");
    await shell.dispose();
  });

  it("renders changelog, errors, and reload through pinned route-specific presentation", async () => {
    const { shell } = await fixture();
    shell.root.appendWorkflowResult({
      command: "changelog",
      outcome: "completed",
      message: "What's New",
      detail: "# Changelog\n\n## 0.84.2\n\n- **Fixed selection rendering**",
    });
    shell.root.appendWorkflowResult({
      command: "export",
      outcome: "failed",
      message: "Failed to export session: Nothing to export yet - start a conversation first",
    });
    shell.root.appendWorkflowResult({
      command: "reload",
      outcome: "completed",
      message: "Reloaded keybindings, extensions, skills, prompts, themes, and context files",
    });
    const raw = shell.root.render(100).join("\n");
    const plain = stripTerminalSequences(raw);
    expect(plain).toContain("What's New");
    expect(plain).toContain("Fixed selection rendering");
    expect(plain).not.toContain("# Changelog");
    expect(plain).toContain("Error: Failed to export session: Nothing to export yet - start a conversation first");
    expect(plain).toContain("Reloaded keybindings, extensions, skills, prompts, themes, and context files");
    expect(plain).not.toContain("✓ Reloaded");
    expect(raw).toContain("\x1b[");
    await shell.dispose();
  });

  it("uses the pinned confirmation surface without committing on cancel", async () => {
    const { adapter, terminal, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow")
      .mockResolvedValueOnce({
        command: "import",
        outcome: "requires-confirmation",
        message: "Replace current session with fixture.jsonl?",
        selectorTitle: "Import session",
        options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }],
      })
      .mockResolvedValueOnce({
        command: "import",
        outcome: "requires-confirmation",
        message: "Replace current session with fixture.jsonl?",
        selectorTitle: "Import session",
        options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }],
      })
      .mockResolvedValueOnce({ command: "import", outcome: "completed", message: "Session imported" });

    await shell.runWorkflow({ command: "import", argument: "fixture.jsonl" });
    expect(shell.root.render(80).join("\n")).toContain("Import session");
    expect(shell.root.render(80).join("\n")).toContain("Replace current session");
    terminal.input("\x1b");
    expect(workflow).toHaveBeenCalledTimes(1);

    await shell.runWorkflow({ command: "import", argument: "fixture.jsonl" });
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(workflow).toHaveBeenNthCalledWith(3, { command: "import", argument: "fixture.jsonl", confirmed: true });
    await shell.dispose();
  });

  it("closes selectors silently, restores editor input, and continues selected workflows", async () => {
    const { adapter, terminal, shell } = await fixture();
    const selectionRequired = {
      command: "model" as const,
      outcome: "requires-selection" as const,
      message: "Model",
      selectorTitle: "Model",
      options: [{ id: "openai/gpt-5", label: "GPT-5" }],
    };
    const workflow = vi.spyOn(adapter, "executeWorkflow")
      .mockResolvedValueOnce(selectionRequired)
      .mockResolvedValueOnce(selectionRequired)
      .mockResolvedValueOnce({ command: "model", outcome: "completed", message: "Selected GPT-5" })
      .mockResolvedValueOnce({ command: "copy", outcome: "failed", message: "clipboard denied" });

    await shell.submit("/model");
    terminal.input("\x1b");
    const cancelledFrame = shell.root.render(80).join("\n");
    expect(cancelledFrame).not.toContain("Model cancelled");
    terminal.input("restored input");
    expect(shell.root.editor.getText()).toBe("restored input");
    shell.root.editor.setText("");

    await shell.submit("/model");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(workflow).toHaveBeenNthCalledWith(3, { command: "model", argument: "", selection: "openai/gpt-5" });
    await shell.submit("/copy");
    expect(shell.root.render(80).join("\n")).toContain("Error: clipboard denied");
    await shell.dispose();
  });

  it("keeps the production bare a1 path free of the hand-written runtime, editor, and chrome", async () => {
    const source = await readFile("src/features/owned-ui/run.ts", "utf8");
    expect(source).toContain("PiSessionShell");
    expect(source).not.toMatch(/OwnedTerminalRuntime|OwnedPromptEditor|OwnedSessionRootComponent|createProcessTerminalHost/);
  });
});
