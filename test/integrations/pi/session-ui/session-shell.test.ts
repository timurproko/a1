import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { readFile } from "node:fs/promises";
import { CURSOR_MARKER, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import {
  getCapabilities as getPinnedPiTuiCapabilities,
  getOsc8LinkAtColumn as getPinnedPiTuiLinkAtColumn,
  setCapabilities as setPinnedPiTuiCapabilities,
} from "#pi-tui";
import { describe, expect, it, vi } from "vitest";
import {
  createPiEngineAdapter,
  PINNED_PI_HIDDEN_COMMAND_NAMES,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
} from "../../../../src/integrations/pi/engine/index.js";
import { applyPiTheme, piTheme } from "../../../../src/integrations/pi/components/index.js";
import { OwnedUiSessionShell } from "../../../../src/integrations/pi/session-ui/index.js";
import { TestPresentationTerminal } from "../../../features/owned-ui/neutral-port-doubles.js";
import type { OwnedUiViewportSettings, OwnedUiViewportSettingsPort } from "../../../../src/contracts/owned-ui/index.js";

class Session {
  readonly sessionId = "pi-session";
  model: unknown = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  thinkingLevel: unknown = "medium";
  isStreaming = false;
  readonly isIdle = true;
  isRetrying = false;
  isCompacting = false;
  readonly calls: string[] = [];
  readonly promptOptions: unknown[] = [];
  scopedModels: readonly unknown[] = [];
  constructor(readonly messages: readonly unknown[] = []) {}
  extensionBindings: unknown;
  #listeners = new Set<(event: unknown) => void>();
  subscribe(listener: (event: unknown) => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  emit(event: unknown): void { for (const listener of this.#listeners) listener(event); }
  async prompt(text: string, options?: unknown): Promise<void> { this.calls.push(`prompt:${text}`); this.promptOptions.push(options); }
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
  getUserMessagesForForking(): readonly unknown[] { return [{ entryId: "entry-1", text: "Fork point" }]; }
  setScopedModels(models: readonly unknown[]): void { this.scopedModels = models; this.calls.push(`scoped:${models.length}`); }
  setThinkingLevel(level: unknown): void { this.thinkingLevel = level; this.calls.push(`thinking:${String(level)}`); }
  dispose(): void {}
}

class Runtime {
  readonly session: Session;
  enabledModels: readonly string[] | undefined;
  doubleEscapeAction: "fork" | "tree" | "none" = "tree";
  loginPromptKind: "select" | "optional-text" = "select";
  completeLogin: (() => void) | undefined;
  readonly availableModels = [
    { provider: "openai", id: "gpt-5", name: "GPT-5" },
    { provider: "anthropic", id: "claude", name: "Claude" },
  ];
  readonly providerAuthStatus = new Map<string, { configured: boolean; source?: "stored" | "environment"; label?: string }>([
    ["openai", { configured: true, source: "stored" }],
    ["anthropic", { configured: true, source: "environment", label: "ANTHROPIC_API_KEY" }],
  ]);
  readonly credentialTypes = new Map<string, "oauth" | "api_key">([["openai", "oauth"]]);
  extensionResources: readonly unknown[] = [];
  readonly services = {
    resourceLoader: {
      getSkills: () => ({ skills: [], diagnostics: [] }),
      getPrompts: () => ({ prompts: [], diagnostics: [] }),
      getThemes: () => ({ themes: [], diagnostics: [] }),
      getAgentsFiles: () => ({ agentsFiles: [] }),
      getSystemPromptSource: () => undefined,
      getAppendSystemPromptSources: () => [],
      getExtensions: () => ({ extensions: this.extensionResources, errors: [] }),
    },
    modelRuntime: {
      getModel: (provider: string, id: string) => this.availableModels.find(model => model.provider === provider && model.id === id),
      getAvailableSnapshot: () => this.availableModels.filter(model => this.providerAuthStatus.get(model.provider)?.configured === true),
      getProviders: () => [{ id: "openai", name: "OpenAI Codex", auth: { oauth: {}, apiKey: {} } }],
      getProvider: (id: string) => id === "openai" ? { id, name: "OpenAI Codex", auth: { oauth: {}, apiKey: {} } } : undefined,
      getProviderAuthStatus: (id: string) => this.providerAuthStatus.get(id) ?? { configured: false },
      isUsingOAuth: (id: string) => this.credentialTypes.get(id) === "oauth",
      listCredentials: async () => [...this.credentialTypes].map(([providerId, type]) => ({ providerId, type })),
      login: async (_providerId: string, _authType: string, interaction: {
        prompt(request: unknown): Promise<string>;
        notify(event: unknown): void;
      }) => {
        interaction.notify({ type: "progress", message: "Preparing authentication..." });
        if (this.loginPromptKind === "optional-text") {
          const domain = await interaction.prompt({
            type: "text",
            message: "GitHub Enterprise URL/domain (blank for github.com)",
            placeholder: "company.ghe.com",
          });
          this.calls.push(`login-domain:${domain}`);
          interaction.notify({ type: "device_code", verificationUri: "https://github.test/login/device", userCode: "SAFE-CODE" });
          await new Promise<void>(resolve => { this.completeLogin = resolve; });
          this.completeLogin = undefined;
        } else {
          const method = await interaction.prompt({
            type: "select",
            message: "Select OpenAI Codex login method:",
            options: [
              { id: "browser", label: "Browser login (default)" },
              { id: "device", label: "Device code login (headless)" },
            ],
          });
          this.calls.push(`login-method:${method}`);
        }
        this.providerAuthStatus.set("openai", { configured: true, source: "stored" });
        this.credentialTypes.set("openai", "oauth");
        return { type: "oauth" };
      },
      logout: async (providerId: string) => {
        this.providerAuthStatus.set(providerId, { configured: false });
        this.credentialTypes.delete(providerId);
      },
      refresh: async () => ({ aborted: false, errors: new Map() }),
    },
    settingsManager: {
      getEnabledModels: () => this.enabledModels,
      setEnabledModels: (patterns: readonly string[] | undefined) => { this.enabledModels = patterns; },
      getDoubleEscapeAction: () => this.doubleEscapeAction,
    },
    diagnostics: [],
  };
  constructor(messages: readonly unknown[] = []) { this.session = new Session(messages); }
  readonly diagnostics = [];
  readonly calls: string[] = [];
  rebindSession: ((session: Session) => Promise<void>) | undefined;
  setRebindSession(callback: (session: Session) => Promise<void>): void { this.rebindSession = callback; }
  async newSession(): Promise<void> { this.calls.push("newSession"); }
  async switchSession(path: string): Promise<void> { this.calls.push(`switch:${path}`); }
  async dispose(): Promise<void> { this.calls.push("dispose"); }
}

async function withPinnedHyperlinks<T>(run: () => Promise<T>): Promise<T> {
  const capabilities = getPinnedPiTuiCapabilities();
  setPinnedPiTuiCapabilities({ ...capabilities, hyperlinks: true });
  try {
    return await run();
  } finally {
    setPinnedPiTuiCapabilities(capabilities);
  }
}

async function fixture(
  messages: readonly unknown[] = [],
  extensions: readonly unknown[] = [],
  customViewport = false,
  viewportSettings?: OwnedUiViewportSettingsPort,
  clipboard?: {
    readText(): Promise<string | null>;
    readImage?(): Promise<{ readonly data: string; readonly mimeType: string } | null>;
    writeText?(text: string): Promise<void>;
  },
) {
  const engine = new Runtime(messages);
  engine.extensionResources = extensions;
  const adapter = await createPiEngineAdapter({ cwd: "D:/work", sessionId: "owned-shell", createRuntime: async () => engine as unknown as AgentSessionRuntime });
  const terminal = new TestPresentationTerminal();
  const shell = new OwnedUiSessionShell({
    backend: adapter,
    cwd: "D:/work",
    terminal,
    ...(customViewport ? { sessionLayout: "custom-viewport" as const } : {}),
    ...(viewportSettings === undefined ? {} : { viewportSettings }),
    ...(clipboard === undefined ? {} : { clipboard }),
  });
  shell.start();
  shell.runtime.renderNow();
  return { engine, adapter, terminal, shell };
}

describe("OwnedUiSessionShell", () => {
  it("forces the custom bare-A1 surface to fullscreen without changing pinned mode policy", async () => {
    const custom = await fixture([], [], true);
    expect(custom.shell.runtime.mode).toBe("fullscreen");
    await custom.shell.dispose();

    const pinned = await fixture();
    expect(pinned.shell.runtime.mode).toBe("regular");
    await pinned.shell.dispose();
  });

  it("omits Pi startup help and loaded-resource inventory from bare A1 only", async () => {
    const custom = await fixture([], [], true);
    const customFrame = stripTerminalSequences(custom.shell.root.render(80).join("\n"));
    expect(customFrame).not.toMatch(/pi v\d/i);
    expect(customFrame).not.toContain("escape interrupt");
    expect(customFrame).not.toContain("Pi can explain its own features");
    await custom.shell.dispose();

    const pinned = await fixture();
    const pinnedFrame = stripTerminalSequences(pinned.shell.root.render(80).join("\n"));
    expect(pinnedFrame).toMatch(/pi v\d/i);
    expect(pinnedFrame).toContain("escape interrupt");
    await pinned.shell.dispose();
  });

  it("renders the bare-A1 prompt bar and one-row-inset rail above an unchanged pinned dock", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `${index % 2 === 0 ? "Question" : "Answer"} ${index}` }],
      timestamp: new Date(2026, 3, 2, 11, 45 + index).getTime(),
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const initial = shell.root.render(60);
    expect(initial).toHaveLength(12);
    const plainInitial = initial.map(row => stripTerminalSequences(row));
    expect(plainInitial.some(row => /^❯ Question \d+\s+\d{2}:\d{2}\s*$/.test(row))).toBe(true);
    expect(terminal.writes.some(write => write.includes("[?1003h"))).toBe(true);

    terminal.input("\u001b[<64;30;3M");
    const detachedRaw = shell.root.render(60);
    const detached = detachedRaw.map(row => stripTerminalSequences(row));
    expect(detached).toHaveLength(12);
    expect(detachedRaw[0]).toContain(piTheme().fg("userMessageText", "11:57"));
    expect(detached.some(row => row.includes("Jump to bottom (End)"))).toBe(true);
    expect(detached[0]).not.toContain("│");
    expect(detached.slice(1, -4).some(row => row.includes("│"))).toBe(true);
    expect(detachedRaw.some(row => row.includes(piTheme().fg("accent", "│")))).toBe(true);
    expect(detachedRaw.every(row => !row.includes(piTheme().fg("text", "│")))).toBe(true);

    const completedReply = {
      role: "assistant",
      content: [{ type: "text", text: "New reply while detached" }],
      timestamp: Date.now(),
    };
    engine.session.emit({ type: "message_start", message: completedReply });
    engine.session.emit({ type: "message_end", message: completedReply });
    await shell.backend.flushEvents();
    expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("1 new message (End)"))).toBe(true);

    engine.session.emit({ type: "message_end", message: { role: "tool", content: [{ type: "text", text: "tool result" }] } });
    await shell.backend.flushEvents();
    expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("1 new message (End)"))).toBe(true);

    // v2 resumes follow at the exact agent_start boundary, which also clears
    // the completed-message count on the next frame.
    engine.session.emit({ type: "agent_start" });
    await shell.backend.flushEvents();
    expect(shell.root.render(60).every(row => !stripTerminalSequences(row).includes("new message (End)"))).toBe(true);
    engine.session.emit({ type: "agent_settled" });
    await shell.backend.flushEvents();

    shell.root.editor.setText("submitted while detached");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("prompt:submitted while detached");
    expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("Jump to bottom"))).toBe(false);

    await shell.dispose();
    expect(terminal.writes.some(write => write.includes("[?1003l"))).toBe(true);
  });

  it("keeps the reserved rail cell as one blank after a fitting prompt timestamp", async () => {
    const timestamp = new Date(2026, 3, 2, 14, 48).getTime();
    const { terminal, shell } = await fixture([
      { role: "user", content: [{ type: "text", text: "analyze code base" }], timestamp },
    ], [], true);
    terminal.resize(60, 12);
    const frame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const promptIndex = frame.findIndex(row => row.includes("analyze code base"));
    expect(promptIndex).toBe(1);
    expect(frame[0]?.trim()).toBe("");
    expect(frame[promptIndex]).toMatch(/14:48 $/);
  });

  it("uses terminal-native inactive and hover styling for submitted URL links", async () => {
    await withPinnedHyperlinks(async () => {
      const url = "https://example.com/a/complete/source?with=details";
      const { terminal, shell } = await fixture([
        { role: "user", content: [{ type: "text", text: url }], timestamp: Date.now() },
      ], [], true);
      terminal.resize(100, 12);
      const row = shell.root.render(100).find(line => stripTerminalSequences(line).includes(url)) ?? "";

      expect(row).toContain(`\u001b]8;;${url}\u001b\\`);
      expect(row).toContain(piTheme().fg("mdLink", url));
      expect(row).not.toContain("\u001b[4m");
      await shell.dispose();
    });
  });

  it("uses the same terminal-native cyan styling for assistant-content URL links", async () => {
    await withPinnedHyperlinks(async () => {
      const url = "https://www.theverge.com/reviews";
      const { terminal, shell } = await fixture([
        { role: "assistant", content: [{ type: "text", text: `The corrected link is:\n\n${url}` }], timestamp: Date.now() },
      ], [], true);
      terminal.resize(100, 12);
      const row = shell.root.render(100).find(line => stripTerminalSequences(line).includes(url)) ?? "";

      expect(row).toContain(`\u001b]8;;${url}\u001b\\`);
      expect(row).toContain(piTheme().fg("mdLink", url));
      expect(row).not.toContain("\u001b[4m");
      await shell.dispose();
    });
  });

  it("keeps file hyperlinks cyan while web URLs use link blue", async () => {
    await withPinnedHyperlinks(async () => {
      const label = "src/integrations/pi/session-ui/session-shell-root.ts";
      const target = "file:///D:/Git/a1/src/integrations/pi/session-ui/session-shell-root.ts";
      const { terminal, shell } = await fixture([{
        role: "assistant",
        content: [{ type: "text", text: `[${label}](${target})` }],
        timestamp: Date.now(),
      }], [], true);
      terminal.resize(120, 12);
      const row = shell.root.render(120).find(line => stripTerminalSequences(line).includes(label)) ?? "";
      const start = stripTerminalSequences(row).indexOf(label);

      expect(row).toContain(`\u001b]8;;${target}\u001b\\`);
      expect(row).toContain(piTheme().fg("accent", label));
      expect(row).not.toContain(piTheme().fg("mdLink", label));
      expect(getPinnedPiTuiLinkAtColumn(row, start)).toBe(target);
      await shell.dispose();
    });
  });

  it("bounds bare bash-output URLs to stable terminal-native hover cells", async () => {
    const first = "https://github.com/timurproko/a1/actions/runs/33100113637/job/98615286055";
    const second = "https://github.com/timurproko/a1/actions/runs/33100113637/job/98615285949";
    const { terminal, shell } = await fixture([{
      role: "bashExecution",
      command: "gh pr checks 144",
      output: `Fast validation pass ${first}\nProcess containment pass ${second}`,
      exitCode: 0,
      cancelled: false,
      timestamp: Date.now(),
    }], [], true);
    terminal.resize(180, 12);
    const rows = shell.root.render(180);

    for (const url of [first, second]) {
      const row = rows.find(line => stripTerminalSequences(line).includes(url)) ?? "";
      const plain = stripTerminalSequences(row);
      const start = plain.indexOf(url);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(row).toContain(`\u001b]8;;${url}\u001b\\`);
      expect(row).toContain(piTheme().fg("mdLink", url));
      expect(getPinnedPiTuiLinkAtColumn(row, start)).toBe(url);
      expect(getPinnedPiTuiLinkAtColumn(row, start + url.length)).toBeUndefined();
    }
    await shell.dispose();
  });

  it("wraps ordinary transcript content through the rail overlay column", async () => {
    const word = "x".repeat(60);
    const { terminal, shell } = await fixture([
      { role: "assistant", content: [{ type: "text", text: word }], timestamp: Date.now() },
    ], [], true);
    terminal.resize(60, 12);
    const frame = shell.root.render(60).map(row => stripTerminalSequences(row));
    expect(frame.some(row => row.trim() === "x".repeat(58))).toBe(true);
    expect(frame.every(row => row.trim() !== "x".repeat(57))).toBe(true);
    await shell.dispose();
  });

  it("scrolls an overflowing Working status with the transcript like v2", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `Status transcript ${index}` }],
      timestamp: Date.now() + index,
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    engine.session.emit({ type: "agent_start" });
    await shell.backend.flushEvents();
    const workingFrame = shell.root.render(60);
    const workingRowIndex = workingFrame.findIndex(row => stripTerminalSequences(row).includes("Working"));
    const workingColumn = stripTerminalSequences(workingFrame[workingRowIndex] ?? "").indexOf("Working") + 1;
    expect(workingRowIndex).toBeGreaterThanOrEqual(0);
    const clickWorking = () => {
      shell.root.handleViewportPreInput(`\u001b[<0;${workingColumn};${workingRowIndex + 1}M`);
      shell.root.handleViewportPreInput(`\u001b[<0;${workingColumn};${workingRowIndex + 1}m`);
    };
    clickWorking();
    clickWorking();
    expect(shell.root.render(60)[workingRowIndex]).not.toContain("\u001b[48;2;38;79;120m");
    expect(shell.root.handleViewportPreInput("\u0003")).toMatchObject({ data: "\u0003", consumed: false });

    const writesBeforeWheel = terminal.writes.length;
    terminal.input("\u001b[<64;30;3M");
    shell.runtime.renderNow();
    expect(terminal.writes.slice(writesBeforeWheel).some(write => write.includes("\u001b[2J"))).toBe(true);
    expect(shell.root.render(60).every(row => !stripTerminalSequences(row).includes("Working"))).toBe(true);
    await shell.dispose();
  });

  it("keeps Pi's queued steering order and scrolls the complete transient group out of view", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: "assistant",
      content: [{ type: "text", text: `queue-transcript-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "queue_update", steering: ["first", "second"], followUp: [] });
    await shell.backend.flushEvents();

    const rows = shell.root.render(60).map(row => stripTerminalSequences(row));
    const first = rows.findIndex(row => row.includes("Steering: first"));
    const second = rows.findIndex(row => row.includes("Steering: second"));
    const hint = rows.findIndex(row => row.includes("Alt+Up to edit all queued messages"));
    const working = rows.findIndex(row => row.includes("Working"));
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(hint).toBeGreaterThan(second);
    expect(working).toBeGreaterThan(hint);

    terminal.input("\u001b[1;1H");
    const detached = shell.root.render(60).map(row => stripTerminalSequences(row));
    expect(detached.some(row => row.includes("Steering: first"))).toBe(false);
    expect(detached.some(row => row.includes("Steering: second"))).toBe(false);
    expect(detached.some(row => row.includes("Alt+Up to edit all queued messages"))).toBe(false);
    expect(detached.some(row => row.includes("Working"))).toBe(false);
    expect(detached.some(row => row.includes("Jump to bottom (End)"))).toBe(true);
    await shell.dispose();
  });

  it("supports LMB drag, double-click word, triple-click line, and Ctrl+C transcript selection", async () => {
    const messages = [
      { role: "user", content: [{ type: "text", text: "Select this reply" }], timestamp: Date.now() - 1_000 },
      { role: "assistant", content: [{ type: "text", text: "Selectable assistant words" }], timestamp: Date.now() },
    ];
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const frame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const rowIndex = frame.findIndex(row => row.includes("Selectable assistant words"));
    expect(rowIndex).toBeGreaterThanOrEqual(0);
    const column = (frame[rowIndex] ?? "").indexOf("assistant") + 1;
    const row = rowIndex + 1;
    const click = () => {
      terminal.input(`\u001b[<0;${column};${row}M`);
      terminal.input(`\u001b[<0;${column};${row}m`);
    };

    click();
    click();
    terminal.input("\u0003");
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("assistant").toString("base64")}\u0007`);

    click();
    const tripleSelected = shell.root.render(60)[rowIndex] ?? "";
    expect(tripleSelected).toContain("\u001b[48;2;38;79;120m");
    expect(tripleSelected).not.toContain("38;2;0;0;0");
    terminal.input("\u0003");
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("Selectable assistant words").toString("base64")}\u0007`);
  });

  it("keeps Ctrl+Home/End and A1 editing aliases in Pi's editor", async () => {
    const { terminal, shell } = await fixture([], [], true);
    terminal.resize(60, 12);
    shell.root.render(60);

    shell.root.editor.setText("alpha beta");
    terminal.input("\u001b[1;5H");
    terminal.input("start ");
    terminal.input("\u001b[1;5F");
    terminal.input(" end");
    expect(shell.root.editor.getText()).toBe("start alpha beta end");

    terminal.input("\u001b[127;5u");
    expect(shell.root.editor.getText()).toBe("start alpha beta ");
    terminal.input("\u001b[1;5H");
    terminal.input("\u001b[3;5~");
    expect(shell.root.editor.getText()).toBe(" alpha beta ");
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toBe("start alpha beta ");

    await shell.dispose();
  });

  it("intercepts owned prompt selection, clipboard, undo, redo, and shift selection actions", async () => {
    let clipboardText = "pasted text";
    const { terminal, shell } = await fixture([], [], true, undefined, {
      readText: async () => clipboardText,
      writeText: async text => {
        await Promise.resolve();
        clipboardText = text;
      },
    });
    terminal.resize(60, 12);
    shell.root.editor.setText("alpha beta");
    shell.root.render(60);

    terminal.input("\u0001"); // Ctrl+A
    expect(shell.root.render(60).join("\n")).toContain("\u001b[48;2;38;79;120m");
    terminal.input("\u0003"); // Ctrl+C
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("alpha beta").toString("base64")}\u0007`);
    expect(shell.root.render(60).join("\n")).not.toContain("\u001b[48;2;38;79;120m");

    terminal.input("\u0001"); // Select again because copying collapses the selection.
    terminal.input("\u0018"); // Ctrl+X
    expect(shell.root.editor.getText()).toBe("");
    terminal.input("\u001a"); // Ctrl+Z
    expect(shell.root.editor.getText()).toBe("alpha beta");
    terminal.input("\u0019"); // Ctrl+Y
    expect(shell.root.editor.getText()).toBe("");

    terminal.input("\u0016"); // Ctrl+V immediately after copying/cutting
    await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("alpha beta"));
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toBe("");
    terminal.input("\u0019");
    expect(shell.root.editor.getText()).toBe("alpha beta");

    clipboardText = "pasted text";
    shell.root.editor.setText("replace me");
    terminal.input("\u0001");
    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("pasted text"));
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toBe("replace me");

    shell.root.editor.setText("right ");
    const rightClickFrame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const rightClickRow = rightClickFrame.findIndex(row => row.includes("right ")) + 1;
    terminal.input(`\u001b[<2;8;${rightClickRow}M`);
    terminal.input(`\u001b[<2;8;${rightClickRow}m`);
    await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("right pasted text"));

    shell.root.editor.setText("abcd");
    terminal.input("\u001b[1;2D"); // Shift+Left: d
    terminal.input("\u001b[1;2D"); // Shift+Left: cd
    terminal.input("\u001b[1;2C"); // Shift+Right shrinks to d
    terminal.input("\u0003");
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("d").toString("base64")}\u0007`);

    terminal.input("X");
    expect(shell.root.editor.getText()).toBe("abcdX");
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toBe("abcd");

    await shell.dispose();
  });

  it("pastes URLs and clipboard images as atomic chips and expands them for copy and submission", async () => {
    let clipboardText = "https://example.com/a/very/useful/resource";
    let clipboardImage: { readonly data: string; readonly mimeType: string } | null = null;
    const { engine, terminal, shell } = await fixture([], [], true, undefined, {
      readText: async () => clipboardText,
      readImage: async () => clipboardImage,
      writeText: async text => { clipboardText = text; },
    });
    terminal.resize(60, 12);
    shell.root.render(60);

    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toContain("[🔗 https://example.com/"));
    const urlChip = shell.root.editor.getText();
    shell.root.editor.setText(`This prefix takes enough room ${urlChip}`);
    const wrappedChipRows = shell.root.editor.render(70).map(row => stripTerminalSequences(row));
    expect(wrappedChipRows.filter(row => row.includes("[🔗")).length).toBe(1);
    expect(wrappedChipRows.find(row => row.includes("[🔗"))).toContain(urlChip);
    shell.root.editor.setText(urlChip);
    const linkedChipRows = shell.root.editor.render(60);
    const linkedChip = linkedChipRows.join("\n");
    const linkedChipRow = linkedChipRows.find(row => stripTerminalSequences(row).includes("https://example.com")) ?? "";
    expect(linkedChip).toContain("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\");
    expect(linkedChip).toContain("\u001b]8;;\u001b\\");
    expect(visibleWidth(linkedChipRow)).toBe(60);
    expect(stripTerminalSequences(linkedChipRow)).toMatch(/\] +$/u);

    terminal.input("\u001b[D"); // Left focuses the adjacent chip as one inverted item.
    const focusedChip = shell.root.render(60).find(row => stripTerminalSequences(row).includes("https://example.com")) ?? "";
    expect(focusedChip).toContain("\u001b[7m");
    expect(focusedChip).toContain("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\");
    expect(focusedChip).not.toContain(CURSOR_MARKER);
    expect(stripTerminalSequences(focusedChip)).toContain(urlChip);
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe("https://example.com/a/very/useful/resource"));
    const writesBeforeChipDelete = terminal.writes.length;
    terminal.input("\u007f");
    shell.runtime.renderNow();
    expect(terminal.writes.slice(writesBeforeChipDelete).some(write => write.includes("\u001b[2J"))).toBe(true);
    expect(shell.root.editor.getText()).toBe("");
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toContain("[🔗 https://example.com/");

    terminal.input("\u001b[1;5C"); // Ctrl+Right also treats the chip as one item.
    expect(shell.root.render(60).join("\n")).toContain("\u001b[7m");
    terminal.input("\u001b[1;5C"); // Collapse at its far edge.
    terminal.input("\u001b[1;5D"); // Ctrl+Left selects the whole chip, never its interior.
    expect(shell.root.render(60).join("\n")).toContain("\u001b[7m");
    terminal.input("\u001b[1;5D"); // Collapse at its near edge before the mouse check.

    const chipFrame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const chipRow = chipFrame.findIndex(row => row.includes("https://example.com")) + 1;
    const chipColumn = (chipFrame[chipRow - 1]?.indexOf("https://example.com") ?? -1) + 4;
    terminal.input(`\u001b[<0;${chipColumn};${chipRow}M`);
    terminal.input(`\u001b[<0;${chipColumn};${chipRow}m`);
    shell.runtime.renderNow();
    expect(shell.root.render(60).join("\n")).toContain("\u001b[7m");

    const redrawsBeforeDrag = shell.runtime.fullRedraws;
    terminal.input(`\u001b[<0;${chipColumn};${chipRow}M`);
    terminal.input(`\u001b[<32;${chipColumn + 1};${chipRow}M`);
    shell.runtime.renderNow();
    const heldChip = shell.root.render(60).join("\n");
    expect(shell.runtime.fullRedraws).toBe(redrawsBeforeDrag);
    expect(heldChip).toContain("\u001b[27m\u001b[48;2;38;79;120m");
    expect(heldChip).toContain("\u001b[4:4m");
    expect(heldChip).not.toContain("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\");
    expect(stripTerminalSequences(heldChip)).toContain("https:\uFE0E//example.com");
    expect(visibleWidth(heldChip.split("\n").find(row => stripTerminalSequences(row).includes("https:\uFE0E//")) ?? "")).toBe(60);
    expect(shell.root.editor.getText()).toContain("https://example.com");

    const writesBeforeRelease = terminal.writes.length;
    terminal.input(`\u001b[<0;${chipColumn + 1};${chipRow}m`);
    shell.runtime.renderNow();
    const draggedChip = shell.root.render(60).join("\n");
    expect(terminal.writes.slice(writesBeforeRelease).some(write => write.includes("\u001b[2J"))).toBe(true);
    expect(draggedChip).toContain("\u001b[27m\u001b[48;2;38;79;120m");
    expect(draggedChip).toContain("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\");
    terminal.input("\u007f");
    expect(shell.root.editor.getText()).toBe("");

    clipboardImage = { data: Buffer.from("fake-png").toString("base64"), mimeType: "image/png" };
    shell.root.editor.setText("");
    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toMatch(/^\[📷 screenshot-[a-f0-9]+\.png\]$/u));
    const imageTag = shell.root.editor.getText();
    terminal.input("\u001b[D");
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(imageTag));
    await shell.submit(imageTag);
    expect(engine.session.calls).toContain(`prompt:${imageTag}`);
    expect(engine.session.promptOptions.at(-1)).toMatchObject({
      images: [{ type: "image", data: Buffer.from("fake-png").toString("base64"), mimeType: "image/png" }],
    });

    await shell.dispose();
  });

  it("extends an uninterrupted LMB drag through adjacent URL chips and their ellipses", async () => {
    const url = "https://example.com/a/very/useful/resource";
    let clipboardText = url;
    const { terminal, shell } = await fixture([], [], true, undefined, {
      readText: async () => clipboardText,
      readImage: async () => null,
      writeText: async text => { clipboardText = text; },
    });
    terminal.resize(120, 12);
    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toContain("[🔗"));
    const chip = shell.root.editor.getText();
    shell.root.editor.setText(`${chip}${chip}`);
    const frame = shell.root.render(120).map(row => stripTerminalSequences(row));
    const promptRow = frame.findIndex(row => row.includes("https://example.com"));
    const prompt = frame[promptRow] ?? "";
    const firstUrlColumn = prompt.indexOf("https://") + 1;
    const secondEllipsisColumn = prompt.lastIndexOf("…") + 1;
    const secondBracketColumn = prompt.lastIndexOf("]") + 1;
    expect(firstUrlColumn).toBeGreaterThan(0);
    expect(secondEllipsisColumn).toBeGreaterThan(firstUrlColumn);
    expect(secondBracketColumn).toBeGreaterThan(secondEllipsisColumn);

    const redrawsBeforeDrag = shell.runtime.fullRedraws;
    terminal.input(`\u001b[<0;${firstUrlColumn};${promptRow + 1}M`);
    terminal.input(`\u001b[<32;${secondEllipsisColumn};${promptRow + 1}M`);
    terminal.input(`\u001b[<32;${secondBracketColumn};${promptRow + 1}M`);
    shell.runtime.renderNow();
    expect(shell.runtime.fullRedraws).toBe(redrawsBeforeDrag);
    expect(shell.root.editor.hasSelection()).toBe(true);
    expect(shell.root.render(120).join("\n")).toContain("\u001b[27m\u001b[48;2;38;79;120m");

    terminal.input(`\u001b[<0;${secondBracketColumn};${promptRow + 1}m`);
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(`${url}${url}`));
    await shell.dispose();
  });

  it("keeps atomic focus within the exact brackets after preceding image icons", async () => {
    const { terminal, shell } = await fixture([], [], true);
    terminal.resize(180, 12);
    const chips = Array.from({ length: 6 }, (_, index) => `[🖼  Clipboard (${index + 1}).png]`);
    shell.root.editor.setText(chips.join(""));
    terminal.input("\u001b[D");

    const row = shell.root.editor.render(180).find(line => stripTerminalSequences(line).includes("Clipboard (6).png")) ?? "";
    const reversed = [...row.matchAll(/\u001b\[7m([^\u001b]*)\u001b\[0m/gu)].map(match => match[1] ?? "");
    expect(reversed).toContain(chips.at(-1));
    expect(reversed.some(text => text.includes("Clipboard (5).png"))).toBe(false);

    await shell.dispose();
  });

  it("keeps a focused atomic chip selected while repeated pastes insert before it", async () => {
    let clipboardText = "https://example.com/focused-chip";
    const { terminal, shell } = await fixture([], [], true, undefined, {
      readText: async () => clipboardText,
      readImage: async () => null,
      writeText: async text => { clipboardText = text; },
    });
    terminal.resize(60, 12);
    shell.root.render(60);

    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toContain("[🔗 https://example.com/focused-chip]"));
    const chip = shell.root.editor.getText();
    terminal.input("\u001b[D");

    clipboardText = "first";
    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toBe(`first${chip}`));
    expect(shell.root.render(60).join("\n")).toContain("\u001b[7m");

    clipboardText = "second";
    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toBe(`firstsecond${chip}`));
    terminal.input("\u007f");
    expect(shell.root.editor.getText()).toBe("firstsecond");

    await shell.dispose();
  });

  it("moves exactly one item left and exits a focused chip right in one press", async () => {
    const firstUrl = "https://example.com/first-chip";
    const secondUrl = "https://example.com/second-chip";
    let clipboardText = firstUrl;
    const { terminal, shell } = await fixture([], [], true, undefined, {
      readText: async () => clipboardText,
      readImage: async () => null,
      writeText: async text => { clipboardText = text; },
    });
    terminal.resize(80, 12);
    shell.root.render(80);

    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toContain("first-chip"));
    clipboardText = secondUrl;
    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toContain("second-chip"));
    const adjacent = shell.root.editor.getText();
    const spaced = adjacent.replace("][", "] [");

    terminal.input("\u001b[D"); // Focus second chip.
    terminal.input(" "); // Insert before atomic focus; neither chip is replaced.
    expect(shell.root.editor.getText()).toBe(spaced);
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(secondUrl));
    terminal.input("\u001b[C");

    shell.root.editor.setText(adjacent);
    terminal.input("\u001b[1;5H"); // Focus the first chip through the native cursor.
    terminal.input(" ");
    expect(shell.root.editor.getText()).toBe(` ${adjacent}`);
    terminal.input("\u001b[C");
    terminal.input("\u001b[C");
    shell.root.editor.setText(adjacent);

    terminal.input("\u001b[D"); // Focus second chip.
    terminal.input("\u001b[D"); // Adjacent first chip is one atomic item left.
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(firstUrl));
    expect(shell.root.editor.hasSelection()).toBe(false);

    shell.root.editor.setText(adjacent);
    terminal.input("\u001b[1;5H"); // Native editor cursor at the first atomic segment start.
    expect(shell.root.editor.hasSelection()).toBe(true);
    terminal.input("\u001b[C"); // Must move to the second chip, not re-select the first.
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(secondUrl));
    expect(shell.root.editor.hasSelection()).toBe(false);

    shell.root.editor.setText(spaced);
    terminal.input("\u001b[D"); // Focus second chip.
    terminal.input("\u001b[D"); // Move only one character left, onto the separator.
    terminal.input("X");
    expect(shell.root.editor.getText()).toBe(spaced.replace("] [", "]X ["));

    shell.root.editor.setText(spaced);
    terminal.input("\u001b[D"); // Focus second chip.
    terminal.input("\u001b[D"); // Separator.
    terminal.input("\u001b[D"); // First chip.
    terminal.input("\u001b[C"); // Separator.
    terminal.input("\u001b[C"); // Second chip.
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(secondUrl));

    const imageRun = "[📷 first.png][📷 second.png][📷 third.png]";
    shell.root.editor.setText(`words ${imageRun}`);
    terminal.input("\u001b[1;5D"); // Ctrl+Left crosses the adjacent run and stops on its separator.
    terminal.input("X");
    expect(shell.root.editor.getText()).toBe(`wordsX ${imageRun}`);

    shell.root.editor.setText(`words tail${imageRun}`);
    terminal.input("\u001b[1;5D"); // An attached chip run also crosses its attached word to the separator.
    terminal.input("X");
    expect(shell.root.editor.getText()).toBe(`wordsX tail${imageRun}`);

    shell.root.editor.setText("doio ddh did d diud");
    terminal.input("\u001b[1;5D"); // Ctrl+Left stops on the separator before an ordinary word too.
    terminal.input("X");
    expect(shell.root.editor.getText()).toBe("doio ddh did dX diud");

    await shell.dispose();
  });

  it("selects prompt words on double-click and logical lines on triple-click", async () => {
    const { terminal, shell } = await fixture([], [], true);
    terminal.resize(60, 12);
    shell.root.editor.setText("mouse alpha beta");
    const frame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const row = frame.findIndex(line => line.includes("mouse alpha beta")) + 1;
    const column = (frame[row - 1]?.indexOf("alpha") ?? -1) + 2;
    expect(row).toBeGreaterThan(0);
    expect(column).toBeGreaterThan(1);
    const click = () => {
      terminal.input(`\u001b[<0;${column};${row}M`);
      terminal.input(`\u001b[<0;${column};${row}m`);
    };

    click();
    click();
    terminal.input("\u0003");
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("alpha").toString("base64")}\u0007`);

    click();
    terminal.input("\u0003");
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("mouse alpha beta").toString("base64")}\u0007`);

    await shell.dispose();
  });

  it("uses Home/End for transcript boundaries and Shift+Up/Down between prompts", async () => {
    const messages = ["one", "two", "three"].flatMap((prompt, index) => [
      { role: "user", content: [{ type: "text", text: prompt }], timestamp: Date.now() + index * 2 },
      { role: "assistant", content: [{ type: "text", text: `reply-${prompt}-1\nreply-${prompt}-2\nreply-${prompt}-3\nreply-${prompt}-4\nreply-${prompt}-5` }], timestamp: Date.now() + index * 2 + 1 },
    ]);
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const rows = () => shell.root.render(60).map(row => stripTerminalSequences(row));
    const top = () => rows()[0] ?? "";

    shell.root.render(60);
    terminal.input("\u001b[1;1H");
    expect(top().trim()).toBe("");
    expect(rows()[1]).toContain("❯ one");

    terminal.input("\u001b[1;2B");
    expect(top()).toContain("❯ two");
    terminal.input("\u001b[1;2B");
    expect(top()).toContain("❯ three");
    terminal.input("\u001b[1;2B");
    expect(top()).toContain("❯ three");

    terminal.input("\u001b[1;2A");
    expect(top()).toContain("❯ two");
    terminal.input("\u001b[1;2A");
    expect(top().trim()).toBe("");
    expect(rows()[1]).toContain("❯ one");
    terminal.input("\u001b[1;2A");
    expect(top().trim()).toBe("");
    expect(rows()[1]).toContain("❯ one");

    terminal.input("\u001b[1;1F");
    expect(top()).toContain("❯ three");

    await shell.dispose();
  });

  it("continuously auto-scrolls an active selection held at a viewport edge", async () => {
    const messages = Array.from({ length: 40 }, (_, index) => ({
      role: "assistant",
      content: [{ type: "text", text: `selection-scroll-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const firstVisible = (): number => {
      const indexes = shell.root.render(60)
        .map(row => /selection-scroll-(\d+)/.exec(stripTerminalSequences(row))?.[1])
        .filter((value): value is string => value !== undefined)
        .map(Number);
      return Math.min(...indexes);
    };
    shell.root.render(60);
    terminal.input("\u001b[<0;5;3M");
    terminal.input("\u001b[<32;5;1M");
    const afterMotion = firstVisible();

    await new Promise(resolve => setTimeout(resolve, 150));
    const whileHeld = firstVisible();
    expect(whileHeld).toBeLessThan(afterMotion);
    const normalDistance = afterMotion - whileHeld;

    terminal.input("\u001b[<0;5;1m");
    await new Promise(resolve => setTimeout(resolve, 130));
    expect(firstVisible()).toBe(whileHeld);

    // Leave enough room below for the faster direction to demonstrate its
    // greater distance rather than immediately hitting the document end.
    terminal.input("\u001b[<64;30;3M");
    terminal.input("\u001b[<64;30;3M");
    terminal.input("\u001b[<64;30;3M");
    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "fast" });
    terminal.input("\u001b[<0;5;3M");
    terminal.input("\u001b[<32;5;12M");
    const afterDownMotion = firstVisible();
    await new Promise(resolve => setTimeout(resolve, 150));
    const fastDistance = firstVisible() - afterDownMotion;
    expect(fastDistance).toBeGreaterThan(normalDistance);
    terminal.input("\u001b[<0;5;12m");

    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "high" });
    terminal.input("\u001b[<0;5;3M");
    terminal.input("\u001b[<32;5;1M");
    const beforeHigh = firstVisible();
    await new Promise(resolve => setTimeout(resolve, 150));
    const highDistance = beforeHigh - firstVisible();
    expect(highDistance).toBeGreaterThanOrEqual(fastDistance);
    terminal.input("\u001b[<0;5;1m");
    await shell.dispose();
  });

  it("suppresses selection sequences begun on status, input, or footer rows", async () => {
    const { terminal, shell } = await fixture([], [], true);
    terminal.resize(60, 12);
    shell.root.render(60);

    const press = shell.root.handleViewportPreInput("\u001b[<0;20;12M");
    const motion = shell.root.handleViewportPreInput("\u001b[<35;20;2M");
    const release = shell.root.handleViewportPreInput("\u001b[<0;20;2m");
    const copy = shell.root.handleViewportPreInput("\u0003");

    expect(press).toMatchObject({ data: "", consumed: true });
    expect(motion).toMatchObject({ data: "", consumed: true });
    expect(release).toMatchObject({ data: "", consumed: true });
    expect(copy).toMatchObject({ data: "\u0003", consumed: false });
    await shell.dispose();
  });

  it("continues an active drag through no-button motion reports", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "Selectable assistant words" }], timestamp: Date.now() },
    ];
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const frame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const rowIndex = frame.findIndex(row => row.includes("Selectable assistant words"));
    const start = (frame[rowIndex] ?? "").indexOf("Selectable") + 1;
    const end = start + "Selectable".length - 1;
    const row = rowIndex + 1;

    terminal.input(`\u001b[<0;${start};${row}M`);
    // Code 35 is motion with no button bits set.
    terminal.input(`\u001b[<35;${end};${row}M`);
    terminal.input(`\u001b[<0;${end};${row}m`);
    terminal.input("\u0003");

    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("Selectable").toString("base64")}\u0007`);
    await shell.dispose();
  });

  it("applies live scrollbar appearance and style without losing detached position", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `row ${index}` }],
      timestamp: Date.now() + index,
    }));
    let current: OwnedUiViewportSettings = {
      scrollbarAppearance: "hidden",
      scrollbarStyle: "thin",
      scrollbarSpeed: "normal",
    };
    let notify: ((settings: OwnedUiViewportSettings) => void) | undefined;
    const settings: OwnedUiViewportSettingsPort = {
      snapshot: () => current,
      onChange: listener => { notify = listener; return () => { notify = undefined; }; },
    };
    const { terminal, shell } = await fixture(messages, [], true, settings);
    terminal.resize(60, 12);
    shell.root.render(60);
    terminal.input("\u001b[<64;30;3M");
    const hidden = shell.root.render(60).map(row => stripTerminalSequences(row));
    expect(hidden.some(row => row.includes("Jump to bottom"))).toBe(true);
    expect(hidden.every(row => !row.includes("│") && !row.includes("┃"))).toBe(true);

    current = { scrollbarAppearance: "always", scrollbarStyle: "thick", scrollbarSpeed: "fast" };
    notify?.(current);
    const shownRaw = shell.root.render(60);
    const shown = shownRaw.map(row => stripTerminalSequences(row));
    expect(shown.some(row => row.includes("Jump to bottom"))).toBe(true);
    expect(shown.slice(1, -4).some(row => row.includes("┃"))).toBe(true);
    expect(shownRaw.some(row => row.includes(piTheme().fg("accent", "┃")))).toBe(true);
    await shell.dispose();
  });

  it("keeps wheel and jump-to-bottom controls responsive during streamed event bursts", async () => {
    const messages = Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `responsive-row-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    shell.root.render(60);

    for (let index = 0; index < 20; index += 1) {
      engine.session.emit({
        type: "message_update",
        message: {
          id: "responsive-stream",
          role: "assistant",
          content: [{ type: "text", text: `stream ${index}` }],
          timestamp: Date.now(),
        },
        assistantMessageEvent: { type: "text_delta", delta: String(index) },
      });
    }
    await new Promise<void>(resolve => {
      setImmediate(() => {
        terminal.input("\u001b[<64;30;3M");
        resolve();
      });
    });

    const detached = shell.root.render(60).map(row => stripTerminalSequences(row));
    const jumpRow = detached.findIndex(row => row.includes("Jump to bottom"));
    const jumpColumn = (detached[jumpRow] ?? "").indexOf("Jump to bottom") + 1;
    expect(jumpRow).toBeGreaterThanOrEqual(0);
    terminal.input(`\u001b[<0;${jumpColumn};${jumpRow + 1}M`);
    expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("Jump to bottom"))).toBe(false);

    await shell.backend.flushEvents();
    await shell.dispose();
  });

  it("moves three, six, and nine transcript rows at normal, fast, and high speed", async () => {
    const messages = Array.from({ length: 24 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `speed-row-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const firstVisibleIndex = (): number => {
      const indexes = shell.root.render(60)
        .map(row => /speed-row-(\d+)/.exec(stripTerminalSequences(row))?.[1])
        .filter((value): value is string => value !== undefined)
        .map(Number);
      return Math.min(...indexes);
    };

    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "normal" });
    shell.root.render(60);
    terminal.input("\u001b[<64;30;3M");
    const normalTop = firstVisibleIndex();

    terminal.input("\u001b[1;3F");
    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "fast" });
    shell.root.render(60);
    terminal.input("\u001b[<64;30;3M");
    const fastTop = firstVisibleIndex();

    terminal.input("\u001b[1;3F");
    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "high" });
    shell.root.render(60);
    terminal.input("\u001b[<64;30;3M");
    const highTop = firstVisibleIndex();

    expect(fastTop).toBeLessThan(normalTop);
    expect(highTop).toBeLessThanOrEqual(fastTop);
    await shell.dispose();
  });

  it("stops pointer reporting when the session ends while an owned screen is presented", async () => {
    const engine = new Runtime([]);
    const adapter = await createPiEngineAdapter({
      cwd: "D:/work",
      sessionId: "owned-shell",
      createRuntime: async () => engine as unknown as AgentSessionRuntime,
    });
    const terminal = new TestPresentationTerminal();
    let mouseEvents = 0;
    const surface = {
      id: "pointer-screen",
      render: (width: number, height: number) => Array.from({ length: height }, () => " ".repeat(width)),
      handleInput: () => true,
      handleMouse: () => { mouseEvents += 1; return true; },
      isClosed: () => false,
      close: () => {},
      onRenderRequested: () => {},
      onExitRequested: () => {},
    };
    const shell = new OwnedUiSessionShell({
      backend: adapter,
      cwd: "D:/work",
      terminal,
      routeHost: { claims: (route: string) => route === "pointer", open: () => surface },
    });
    shell.start();
    shell.runtime.renderNow();

    shell.root.editor.setText("/pointer");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(terminal.writes.some(write => write.includes("[?1003h"))).toBe(true);
    expect(terminal.writes.some(write => write.includes("[?1003l"))).toBe(false);
    terminal.input("\u001b[<0;20;4M");
    terminal.input("\u001b[<35;21;4M");
    terminal.input("\u001b[<0;21;4m");
    expect(mouseEvents).toBe(3);

    // The screen is still up: ending the session has to restore the terminal anyway.
    await shell.dispose();
    expect(terminal.writes.some(write => write.includes("[?1003l"))).toBe(true);
    expect(terminal.writes.some(write => write.includes("[?1006l"))).toBe(true);
  });


  it("applies a streamed chunk through the named block and keeps the document in order", async () => {
    const { engine, adapter, shell } = await fixture();
    const rowsOf = () => shell.root.render(80).map(row => stripTerminalSequences(row).trimEnd());
    const assistant = (text: string) => ({
      role: "assistant",
      content: [{ type: "text", text }],
      stopReason: "pending",
      timestamp: 5,
    });

    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "message_start", message: { role: "user", content: [{ type: "text", text: "Question" }], timestamp: 1 } });
    engine.session.emit({ type: "message_start", message: assistant("") });
    await adapter.flushEvents();

    engine.session.emit({ type: "message_update", message: assistant("partial"), assistantMessageEvent: { delta: "partial" } });
    await adapter.flushEvents();
    expect(rowsOf().some(row => row.includes("partial"))).toBe(true);

    engine.session.emit({ type: "message_update", message: assistant("partial answer"), assistantMessageEvent: { delta: " answer" } });
    await adapter.flushEvents();
    const streamed = rowsOf();
    const question = streamed.findIndex(row => row.includes("Question"));
    const answer = streamed.findIndex(row => row.includes("partial answer"));
    expect(question).toBeGreaterThan(-1);
    // The chunk went through the block it named without disturbing the order around it.
    expect(answer).toBeGreaterThan(question);
    await shell.dispose();
  });

  it("reuses a finalized block's rows until its revision, the width, the theme, or expansion changes", async () => {
    const { engine, adapter, shell } = await fixture();

    engine.session.emit({ type: "agent_start" });
    engine.session.emit({
      type: "message_start",
      message: { role: "assistant", content: [{ type: "text", text: "Settled answer" }], timestamp: 1 },
    });
    engine.session.emit({ type: "agent_end", messages: [], willRetry: false });
    engine.session.emit({ type: "agent_settled" });
    await adapter.flushEvents();

    const rowsOf = (width: number) => shell.root.render(width).map(row => stripTerminalSequences(row).trimEnd());
    const first = rowsOf(80);
    expect(first.some(row => row.includes("Settled answer"))).toBe(true);
    // A repeat frame at the same width shows the same content from the cached rows.
    expect(rowsOf(80)).toEqual(first);
    // A different width is a different render rather than a stale hit.
    expect(rowsOf(52).some(row => row.includes("Settled answer"))).toBe(true);
    expect(rowsOf(80)).toEqual(first);

    shell.root.setToolsExpanded(!shell.root.toolsExpanded);
    expect(rowsOf(80).some(row => row.includes("Settled answer"))).toBe(true);

    applyPiTheme("light", false, "truecolor");
    try {
      expect(rowsOf(80).some(row => row.includes("Settled answer"))).toBe(true);
    } finally {
      applyPiTheme("dark", false, "truecolor");
    }
    await shell.dispose();
  });


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

  it("retains package identity in compact extension labels and uniquely identifies local entries", async () => {
    const { shell } = await fixture([], [
      {
        path: "C:\\Users\\test\\.a1\\agent\\npm\\node_modules\\@narumitw\\pi-statusline\\dist\\index.ts",
        resolvedPath: "C:\\Users\\test\\.a1\\agent\\npm\\node_modules\\@narumitw\\pi-statusline\\dist\\index.ts",
        sourceInfo: {
          path: "C:\\Users\\test\\.a1\\agent\\npm\\node_modules\\@narumitw\\pi-statusline\\dist\\index.ts",
          source: "npm:@narumitw/pi-statusline",
          scope: "user",
          origin: "package",
          baseDir: "C:\\Users\\test\\.a1\\agent\\npm\\node_modules\\@narumitw\\pi-statusline",
        },
      },
      {
        path: "/home/test/.a1/agent/npm/node_modules/pi-mcp-adapter/index.js",
        resolvedPath: "/home/test/.a1/agent/npm/node_modules/pi-mcp-adapter/index.js",
        sourceInfo: {
          path: "/home/test/.a1/agent/npm/node_modules/pi-mcp-adapter/index.js",
          source: "npm:pi-mcp-adapter",
          scope: "user",
          origin: "package",
          baseDir: "/home/test/.a1/agent/npm/node_modules/pi-mcp-adapter",
        },
      },
      {
        path: "D:/work/one/shared/index.ts",
        resolvedPath: "D:/work/one/shared/index.ts",
        sourceInfo: { path: "D:/work/one/shared/index.ts", source: "local", scope: "project", origin: "top-level", baseDir: "D:/work" },
      },
      {
        path: "D:/work/two/shared/index.ts",
        resolvedPath: "D:/work/two/shared/index.ts",
        sourceInfo: { path: "D:/work/two/shared/index.ts", source: "local", scope: "project", origin: "top-level", baseDir: "D:/work" },
      },
      {
        path: "D:/work/hidden/shared/index.ts",
        resolvedPath: "D:/work/hidden/shared/index.ts",
        hidden: true,
        sourceInfo: { path: "D:/work/hidden/shared/index.ts", source: "local", scope: "project", origin: "top-level", baseDir: "D:/work" },
      },
    ]);

    const frame = stripTerminalSequences(shell.root.render(120).join("\n"));
    expect(frame).toContain("@narumitw/pi-statusline:dist");
    expect(frame).toContain("pi-mcp-adapter");
    expect(frame).toContain("one/shared");
    expect(frame).toContain("two/shared");
    expect(frame).not.toContain("hidden/shared");
    expect(frame).not.toContain("  dist,");
    await shell.dispose();
  });

  it("opens the configured fork selector on double escape with an empty editor", async () => {
    const { engine, terminal, shell } = await fixture([], [], true);
    engine.doubleEscapeAction = "fork";

    terminal.input("\x1b");
    expect(shell.root.usesDefaultInputSurface()).toBe(true);
    terminal.input("\x1b");
    expect(shell.root.usesDefaultInputSurface()).toBe(false);
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Fork point");

    terminal.input("\x1b");
    engine.doubleEscapeAction = "none";
    terminal.input("\x1b");
    terminal.input("\x1b");
    expect(shell.root.usesDefaultInputSurface()).toBe(true);
    await shell.dispose();
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

  it("preserves deep settings submenus, theme mode nesting, and parent restoration", async () => {
    const { terminal, shell } = await fixture();
    const frame = () => stripTerminalSequences(shell.root.render(100).join("\n"));

    await shell.submit("/settings");
    terminal.input("theme");
    terminal.input("\r");
    expect(frame()).toContain("Select a theme, or choose Automatic to follow terminal appearance.");
    terminal.input("\x1b[A");
    terminal.input("\r");
    expect(frame()).toContain("Automatic Theme");
    expect(frame()).toContain("Light theme");
    terminal.input("\r");
    expect(frame()).toContain("Light Theme");
    expect(frame()).toContain("Select the theme to use for light terminal appearance");
    terminal.input("\x1b");
    expect(frame()).toContain("Automatic Theme");
    terminal.input("\x1b");
    expect(frame()).toContain("Type to search · Enter/Space to change · Esc to cancel");
    expect(frame()).toContain("> theme");
    terminal.input("\x1b");

    await shell.submit("/settings");
    terminal.input("thinking");
    terminal.input("\r");
    expect(frame()).toContain("Thinking Level");
    expect(frame()).toContain("Select reasoning depth for thinking-capable models");
    terminal.input("\x1b");
    terminal.input("\x1b");

    await shell.submit("/settings");
    terminal.input("warnings");
    terminal.input("\r");
    expect(frame()).toContain("Anthropic extra usage");
    terminal.input("\x1b");
    terminal.input("\x1b");
    expect(frame()).not.toContain("Auto-compact");
    await shell.dispose();
  });

  it("keeps /settings open while agent lifecycle and status events arrive", async () => {
    const { engine, shell } = await fixture();
    await shell.submit("/settings");
    expect(shell.root.usesDefaultInputSurface()).toBe(false);

    engine.session.emit({ type: "agent_start" });
    await shell.backend.flushEvents();
    expect(shell.root.usesDefaultInputSurface()).toBe(false);

    engine.session.emit({ type: "agent_settled" });
    await shell.backend.flushEvents();
    expect(shell.root.usesDefaultInputSurface()).toBe(false);
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

  it("renders configured and unconfigured provider state from the model authority", async () => {
    const { terminal, shell } = await fixture();
    await shell.submit("/login");
    terminal.input("\r");
    let frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).toContain("OpenAI Codex");
    expect(frame).toContain("✓ stored");
    expect(frame).not.toContain("OpenAI Codex • unconfigured");

    terminal.input("\x1b");
    terminal.input("\x1b");
    await shell.runWorkflow({ command: "logout", argument: "", selection: "oauth:openai" });
    await shell.backend.flushEvents();
    expect(shell.view().activeModel).toBeNull();
    expect(shell.view().status.footer?.availableProviderCount).toBe(1);
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("gpt-5 • medium");
    await shell.submit("/login");
    terminal.input("\r");
    frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).toContain("OpenAI Codex • unconfigured");
    await shell.dispose();
  });

  it("nests login authentication type and provider selection with pinned cancellation", async () => {
    const { adapter, terminal, shell } = await fixture();
    vi.spyOn(adapter, "pinnedLoginOptions").mockImplementation(authType => [{
      id: `${authType ?? "oauth"}:openai`,
      providerId: "openai",
      label: "OpenAI",
      description: authType === "api_key" ? "API key" : "Account / OAuth",
      authType: authType ?? "oauth",
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

  it("preserves a blank optional OAuth prompt before a device-code flow", async () => {
    const { engine, terminal, shell } = await fixture();
    engine.loginPromptKind = "optional-text";

    const login = shell.runWorkflow({ command: "login", argument: "", selection: "oauth:openai" });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("GitHub Enterprise URL/domain (blank for github.com)");

    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.calls).toContain("login-domain:");
    const deviceCode = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(deviceCode).toContain("https://github.test/login/device");
    expect(deviceCode).toContain("Enter code: SAFE-CODE");
    expect(deviceCode).toContain("Waiting for authentication...");

    engine.completeLogin?.();
    await login;
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Logged in to OpenAI Codex");
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

  it("renders every advertised and hidden route without a generic raw/plain fallback at narrow and wide widths", async () => {
    const { shell } = await fixture();
    const routes = [...PINNED_PI_WORKFLOW_COMMAND_NAMES, ...PINNED_PI_HIDDEN_COMMAND_NAMES];
    for (const command of routes) {
      shell.root.resetWorkflowPresentation();
      const result = command === "session"
        ? {
            command,
            outcome: "completed" as const,
            message: "Session Info",
            presentation: {
              kind: "session-info" as const,
              stats: {
                sessionId: "matrix-session", userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, totalMessages: 0,
                tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0,
              },
              cacheWaste: { missedTokens: 0, missedCost: 0, missCount: 0 },
              usageBreakdown: [],
            },
          }
        : command === "changelog"
          ? { command, outcome: "completed" as const, message: "What's New", detail: "## 0.84.2\n\n- parity" }
          : command === "hotkeys"
            ? { command, outcome: "completed" as const, message: "Keyboard Shortcuts" }
            : command === "new"
              ? { command, outcome: "completed" as const, message: "✓ New session started" }
              : command === "debug"
                ? { command, outcome: "completed" as const, message: "✓ Debug log written", detail: "D:/debug.log" }
                : { command, outcome: "completed" as const, message: `route:${command}` };
      shell.root.appendWorkflowResult(result);
      for (const width of [44, 100]) {
        const frame = stripTerminalSequences(shell.root.render(width).join("\n"));
        expect(frame, `${command}@${width}`).not.toContain("{\n  \"");
        if (command === "quit" || command === "compact") expect(frame).not.toContain(`route:${command}`);
        else if (command === "session") expect(frame).toContain("Messages");
        else if (command === "changelog") expect(frame).toContain("What's New");
        else if (command === "hotkeys") expect(frame).toContain("Keyboard Shortcuts");
        else if (command === "arminsayshi") expect(frame).toContain("ARMIN SAYS HI");
        else if (command === "dementedelves") expect(frame).toContain("pi has joined Earendil");
        else expect(frame).toContain(result.message);
      }
    }
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
      .filter(command => !["settings", "model", "scoped-models", "fork", "tree", "trust", "login", "logout", "resume"].includes(command));
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
    expect(engine.session.calls).toContain("prompt:steer now");
    expect(engine.session.calls).toContain("prompt:follow later");
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
    expect(engine.session.calls).toContain("prompt:after compaction");

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
    const shareRows = shell.root.render(100);
    expect(stripTerminalSequences(shareRows.join("\n"))).not.toContain("Creating gist...");
    expect(shareRows.every(row => !row.includes("\n"))).toBe(true);
    const plainShareRows = shareRows.map(row => stripTerminalSequences(row));
    const shareRow = plainShareRows.findIndex(row => row.trimEnd() === " Share URL: https://example.test");
    expect(shareRow).toBeGreaterThanOrEqual(0);
    expect(plainShareRows[shareRow + 1]?.trimEnd()).toBe(" Gist: https://gist.test/id");

    const reload = shell.runWorkflow({ command: "reload", argument: "" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Reloading keybindings, extensions, skills, prompts, themes, and context files...");
    await reload;
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("Reloading keybindings");
    expect(execute).toHaveBeenCalledTimes(2);
    await shell.dispose();
  });

  it("renders and removes extension status contributions in the footer", async () => {
    const { engine, shell } = await fixture();
    await vi.waitFor(() => expect(engine.session.calls).toContain("bindExtensions"));
    const bindings = engine.session.extensionBindings as {
      uiContext: { setStatus(key: string, text: string | undefined): void };
    };

    bindings.uiContext.setStatus("mcp", "🔌 MCP: 1 server enabled");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("🔌 MCP: 1 server enabled");
    bindings.uiContext.setStatus("mcp", undefined);
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("MCP: 1 server enabled");
    await shell.dispose();
  });

  it("rebinds extension UI and clears stale command presentation before reload status", async () => {
    const { engine, shell } = await fixture();
    expect(engine.session.calls.filter(call => call === "bindExtensions")).toHaveLength(1);
    shell.root.appendWorkflowStatus("stale extension command status");
    shell.root.appendWorkflowResult({ command: "debug", outcome: "failed", message: "stale extension command error" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("stale extension command");
    await shell.runWorkflow({ command: "reload", argument: "" });
    expect(engine.session.calls.filter(call => call === "bindExtensions")).toHaveLength(2);
    expect(engine.session.calls).toContain("reload");
    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).not.toContain("stale extension command");
    expect(frame).toContain("Reloaded keybindings, extensions, skills, prompts, themes, and context files");
    await shell.dispose();
  });

  it("cancels active extension surfaces and restores the editor on session rebind", async () => {
    const { engine, shell } = await fixture();
    await new Promise(resolve => setTimeout(resolve, 0));
    const bindings = engine.session.extensionBindings as {
      uiContext: { input(title: string, placeholder?: string): Promise<string | undefined> };
    };
    const pending = bindings.uiContext.input("Session switch input", "cancelled on rebind");
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Session switch input");
    await engine.rebindSession?.(new Session());
    await expect(pending).resolves.toBeUndefined();
    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).not.toContain("Session switch input");
    expect(frame).toContain("commands");
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

    shell.root.setExtensionWorking("Extension indexing source");
    rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.some(row => row.includes("Extension indexing source"))).toBe(true);
    expect(rows.some(row => row.includes("Working..."))).toBe(false);
    shell.root.setExtensionWorking(undefined);
    rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.some(row => row.includes("Extension indexing source"))).toBe(false);

    engine.session.emit({ type: "agent_end", messages: [] });
    engine.session.emit({ type: "agent_settled" });
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

  it("uses specialized hidden-command presenters without exposing raw debug objects", async () => {
    const { shell } = await fixture();
    shell.root.appendWorkflowResult({ command: "debug", outcome: "completed", message: "✓ Debug log written", detail: "D:/agent/pi-debug.log" });
    shell.root.appendWorkflowResult({ command: "arminsayshi", outcome: "completed", message: "Armin says hi" });
    shell.root.appendWorkflowResult({ command: "dementedelves", outcome: "completed", message: "Demented elves announcement" });
    const plain = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(plain).toContain("✓ Debug log written");
    expect(plain).toContain("D:/agent/pi-debug.log");
    expect(plain).not.toContain("\"snapshotId\"");
    expect(plain).toContain("ARMIN SAYS HI");
    expect(plain).toContain("pi has joined Earendil");
    expect(plain).toContain("Read the blog post:");
    await shell.dispose();
  });

  it("uses the pinned confirmation surface without committing on cancel", async () => {
    const { adapter, terminal, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow")
      .mockResolvedValueOnce({ command: "import", outcome: "cancelled", message: "Import cancelled" })
      .mockResolvedValueOnce({ command: "import", outcome: "completed", message: "Session imported" });

    const cancelled = shell.runWorkflow({ command: "import", argument: "fixture.jsonl" });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(shell.root.render(80).join("\n")).toContain("Import session");
    expect(shell.root.render(80).join("\n")).toContain("Replace current session");
    terminal.input("\x1b");
    await cancelled;
    expect(workflow).toHaveBeenNthCalledWith(1, { command: "import", argument: "fixture.jsonl", confirmed: false });

    const confirmed = shell.runWorkflow({ command: "import", argument: "fixture.jsonl" });
    await new Promise(resolve => setTimeout(resolve, 0));
    terminal.input("\r");
    await confirmed;
    expect(workflow).toHaveBeenNthCalledWith(2, { command: "import", argument: "fixture.jsonl", confirmed: true });
    await shell.dispose();
  });

  it("closes selectors silently, restores editor input, and continues selected workflows", async () => {
    const { adapter, terminal, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow")
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
    expect(workflow).toHaveBeenNthCalledWith(1, { command: "model", argument: "", selection: "openai/gpt-5" });
    await shell.submit("/copy");
    expect(shell.root.render(80).join("\n")).toContain("Error: clipboard denied");
    await shell.dispose();
  });

  it("renders startup warnings and the package-update banner with pinned styling and order", async () => {
    const engine = new Runtime();
    (engine.diagnostics as { type: string; message: string }[]).push(
      { type: "warning", message: 'No models match pattern "github-copilot/gpt-5.6-sol"' },
      { type: "warning", message: 'No models match pattern "github-copilot/gpt-5.5"' },
      { type: "warning", message: 'No models match pattern "github-copilot/claude-opus-5"' },
    );
    const adapter = await createPiEngineAdapter({
      cwd: "D:/work",
      sessionId: "owned-shell",
      createRuntime: async () => engine as unknown as AgentSessionRuntime,
      checkPackageUpdates: async () => ["pi-mcp-adapter"],
    });
    await vi.waitFor(() => {
      expect(adapter.view().diagnostics.some(diagnostic => diagnostic.code === "package-updates")).toBe(true);
    });
    const terminal = new TestPresentationTerminal();
    const shell = new OwnedUiSessionShell({ backend: adapter, cwd: "D:/work", terminal });
    shell.start();
    shell.runtime.renderNow();

    const rawRows = shell.root.render(100);
    const rows = rawRows.map(row => stripTerminalSequences(row));
    const frame = rows.join("\n");
    for (const pattern of ["github-copilot/gpt-5.6-sol", "github-copilot/gpt-5.5", "github-copilot/claude-opus-5"]) {
      expect(frame).toContain(`Warning: No models match pattern "${pattern}"`);
    }
    const firstWarningRow = rows.findIndex(row => row.startsWith("Warning: No models match"));
    const bannerRow = rows.findIndex(row => row.includes("v0.84.2"));
    const updateTitleRow = rows.findIndex(row => row.includes("Package Updates Available"));
    expect(firstWarningRow).toBeGreaterThanOrEqual(0);
    expect(firstWarningRow).toBeLessThan(bannerRow);
    expect(rawRows[firstWarningRow]).toContain(`${String.fromCharCode(27)}[33mWarning: `);
    expect(updateTitleRow).toBeGreaterThan(bannerRow);
    expect(frame).toContain("Package updates are available. Run a1 pi update --extensions");
    expect(frame).toContain("Packages:");
    expect(frame).toContain("- pi-mcp-adapter");
    expect(rows[updateTitleRow - 1]).toMatch(/─/);
    await shell.dispose();
  });

  it("keeps startup neutral while composition selects the owned session shell", async () => {
    const [source, composition] = await Promise.all([
      readFile("src/features/owned-ui/run.ts", "utf8"),
      readFile("src/composition/owned-ui.ts", "utf8"),
    ]);
    expect(source).toContain("OwnedUiApplicationPort");
    expect(source).not.toMatch(/Pi|Adapter|OwnedUiSessionShell|OwnedTerminalRuntime|OwnedPromptEditor|OwnedSessionRootComponent|createProcessTerminalHost/);
    expect(composition).toContain("OwnedUiSessionShell");
  });
});
