import { memoryHistory } from "./prompt-history-fixture.js";
import { PromptHistoryService } from "../../../../src/features/prompt-history/index.js";
import { PromptHistoryStore } from "../../../../src/features/prompt-history/store.js";
import { resolvePromptHistoryPath } from "../../../../src/features/prompt-history/paths.js";
import { holdHistoryLock } from "../../../support/history-lock.js";
import { SessionManager, type AgentSessionRuntime, type ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CURSOR_MARKER, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import {
  Editor,
  getCapabilities as getPinnedPiTuiCapabilities,
  getOsc8LinkAtColumn as getPinnedPiTuiLinkAtColumn,
  setCapabilities as setPinnedPiTuiCapabilities,
} from "#pi-tui";
import { describe, expect, it, vi } from "vitest";
import { screenshotPng } from "../../../fixtures/image-sources.js";
import {
  createPiEngineAdapter,
  PINNED_PI_HIDDEN_COMMAND_NAMES,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
} from "../../../../src/integrations/pi/engine/index.js";
import { applyPiTheme, piTheme, loadHistoryEditor } from "../../../../src/integrations/pi/components/index.js";
import {
  formatSessionResumeCommand,
  OwnedUiSessionShell,
  type OwnedUiSessionShellOptions,
} from "../../../../src/integrations/pi/session-ui/index.js";
import { TestPresentationTerminal } from "../../../features/owned-ui/neutral-port-doubles.js";
import { classifyTerminalPaint, replayTerminalBackgroundCells, replayTerminalCheckpoints, replayTerminalPaint } from "../../../support/rendering/terminal-paint-evidence.js";
import { withPiParityColorMode } from "../../../support/pi-terminal-capabilities.js";
import { BottomHoverEvidence, classifyBottomHoverFinding, type BottomHoverState } from "../../../support/rendering/bottom-hover-evidence.js";
import type {
  OwnedUiPromptSuggestionGeneratorPort,
  OwnedUiViewportSettings,
  OwnedUiViewportSettingsPort,
} from "../../../../src/contracts/owned-ui/index.js";

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
  readonly agent: { state: { systemPrompt: string; messages: unknown[]; tools: unknown[] } };
  scopedModels: readonly unknown[] = [];
  constructor(readonly messages: readonly unknown[] = []) {
    this.agent = { state: { systemPrompt: "You are a coding agent.", messages: [...messages], tools: [] } };
  }
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
  streamPresentation?: OwnedUiSessionShellOptions["streamPresentation"],
  inputPresentation?: OwnedUiSessionShellOptions["inputPresentation"],
  promptSuggestions?: OwnedUiSessionShellOptions["promptSuggestions"],
  promptHistory?: Omit<NonNullable<OwnedUiSessionShellOptions["promptHistory"]>, "editor">,
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
    ...(streamPresentation === undefined ? {} : { streamPresentation }),
    ...(inputPresentation === undefined ? {} : { inputPresentation }),
    ...(promptSuggestions === undefined ? {} : { promptSuggestions }),
    ...(promptHistory === undefined ? {} : { promptHistory: { ...promptHistory, editor: await loadHistoryEditor() } }),
  });
  shell.start();
  shell.runtime.renderNow();
  return { engine, adapter, terminal, shell };
}

class InputImmediateScheduler {
  readonly callbacks = new Map<ReturnType<typeof setImmediate>, () => void>();
  scheduleImmediate(callback: () => void): ReturnType<typeof setImmediate> {
    const handle = {} as ReturnType<typeof setImmediate>;
    this.callbacks.set(handle, callback);
    return handle;
  }
  cancelImmediate(handle: ReturnType<typeof setImmediate>): void { this.callbacks.delete(handle); }
  flush(): void {
    for (const [handle, callback] of [...this.callbacks]) {
      this.callbacks.delete(handle);
      callback();
    }
  }
}

async function nextImmediate(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve));
}

describe("prompt-style compaction in the real engine and shell", () => {
  const time = new Date(2026, 8, 13, 14, 35).getTime();
  const compaction = (tokensBefore = 281483, summary = Array.from({ length: 24 }, (_, i) => `summary-${i} alpha beta`).join("\n\n")) => ({
    role: "compactionSummary", summary, tokensBefore, timestamp: time,
  });
  const user = (text: string) => ({ role: "user", content: [{ type: "text", text }], timestamp: time });
  const reply = (name: string) => ({ role: "assistant", content: [{ type: "text", text: Array.from({ length: 30 }, (_, i) => `${name}-${i}`).join("\n\n") }], timestamp: time + 1 });

  it("loads the disposable visual-review session through Pi's real session manager", async () => {
    const directory = await mkdtemp(join(tmpdir(), "compaction-review-"));
    try {
      const script = fileURLToPath(new URL("../../../../scripts/pi/create-compaction-review-session.mjs", import.meta.url));
      const path = execFileSync(process.execPath, [script, directory], { encoding: "utf8" }).trim();
      const manager = SessionManager.open(path);
      const { adapter, shell } = await fixture(manager.buildSessionContext().messages, [], true);
      try {
        const source = adapter.view().transcript.find(block => block.kind === "compaction")!;
        expect(source.payload).toMatchObject({ role: "compactionSummary", tokensBefore: 281483 });
        const rows = shell.root.transcriptComponent(source.id)!.render(80).map(stripTerminalSequences);
        expect(rows[0]).toContain("Compacted from 281,483 tokens");
        expect(rows.join("\n")).toContain("END OF FULL COMPACTION SUMMARY");
        expect(adapter.view().transcript.filter(block => block.kind === "user")).toHaveLength(2);
      } finally { await shell.dispose(); }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("keeps resumed and newly completed summary data through settlement without adding prompt recall entries", async () => {
    const messages: unknown[] = [compaction(), user("real prompt"), reply("answer")];
    const { engine, adapter, terminal, shell } = await fixture(messages, [], true);
    try {
      const original = adapter.view().transcript.find(block => block.kind === "compaction")!;
      expect(original).toMatchObject({ text: compaction().summary, payload: { role: "compactionSummary", tokensBefore: 281483, timestamp: time } });
      const source = shell.root.transcriptComponent(original.id)!;
      expect(stripTerminalSequences(source.render(80).join("\n"))).toContain("summary-23 alpha beta");
      const next = { ...compaction(300001, "Fresh **summary** content."), timestamp: time + 2 };
      messages.push(next);
      engine.session.emit({ type: "message_end", message: next });
      await adapter.flushEvents();
      const latest = adapter.view().transcript.filter(block => block.kind === "compaction").at(-1)!;
      expect(latest.id).not.toBe(original.id);
      expect(latest).toMatchObject({ text: next.summary, payload: { tokensBefore: 300001, timestamp: next.timestamp } });
      expect(stripTerminalSequences(shell.root.transcriptComponent(latest.id)!.render(80).join("\n"))).toContain("Compacted from 300,001 tokens");
      engine.session.emit({ type: "agent_settled", messages });
      await adapter.flushEvents();
      expect(adapter.view().transcript.filter(block => block.kind === "compaction").map(block => block.text)).toEqual([compaction().summary, next.summary]);
      shell.root.editor.setText("draft");
      for (let i = 0; i < 5; i++) { terminal.input("\u001b[A"); await nextImmediate(); }
      expect(shell.root.editor.getText()).toBe("real prompt");
      expect(engine.session.calls.some(call => call.startsWith("prompt:"))).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each(["always", "hidden", "auto"] as const)("pins and navigates one mixed sequence with a %s scrollbar", async scrollbarAppearance => {
    const { terminal, shell } = await fixture([compaction(), user("middle prompt"), reply("middle"), compaction(300001), user("last prompt"), reply("last")], [], true);
    try {
      terminal.resize(80, 14);
      shell.root.editor.setText("keep draft");
      shell.root.setViewportConfig({ scrollbarAppearance, scrollbarStyle: "thin", scrollbarSpeed: "normal" });
      const rows = () => shell.root.render(80).map(stripTerminalSequences);
      const key = async (data: string) => { terminal.input(data); await nextImmediate(); return rows(); };
      const bottom = rows();
      let frame = await key("\u001b[1;5H");
      expect(frame[0]!.trim()).toBe("");
      expect(frame[1]).toContain("❯ Compacted from 281,483 tokens");
      const header = frame[1]!;
      const firstExtent = shell.root.viewportPresentationEvidence().maxScroll;
      frame = await key("\u001b[<65;3;3M");
      expect(frame[0]).toContain("❯ Compacted from 281,483 tokens");
      expect(frame[0]).toContain("14:35");
      expect(shell.root.render(80)[0]).not.toContain("\u001b[2m");
      expect(frame.filter(row => row.includes("Compacted from 281,483 tokens"))).toHaveLength(1);
      expect(shell.root.viewportPresentationEvidence().maxScroll).toBe(firstExtent);
      const whilePinned = shell.root.exitTranscript(80);
      await key("\u000f");
      expect(shell.root.exitTranscript(80)).toBe(whilePinned);
      terminal.input("\u001b[<0;5;1M");
      terminal.input("\u001b[<0;5;1m");
      frame = rows();
      // Invariant: the reserved scrollbar cell is naturally blank on viewport row zero.
      expect(frame[0]!.slice(0, -1)).toBe(header.slice(0, -1));
      expect(frame[2]).toContain("summary-0 alpha beta");
      expect(shell.root.viewportPresentationEvidence().followingEnd).toBe(false);
      expect((await key("\u001b[1;2B"))[0]).toContain("❯ middle prompt");
      expect((await key("\u001b[1;2B"))[0]).toContain("❯ Compacted from 300,001 tokens");
      expect((await key("\u001b[1;2B"))[0]).toContain("❯ last prompt");
      expect((await key("\u001b[1;2B")).map(row => row.slice(0, 79))).toEqual(bottom.map(row => row.slice(0, 79)));
      expect(shell.root.viewportPresentationEvidence().followingEnd).toBe(true);
      expect((await key("\u001b[1;2A"))[0]).toContain("❯ last prompt");
      expect((await key("\u001b[1;2A"))[0]).toContain("❯ Compacted from 300,001 tokens");
      expect((await key("\u001b[1;2A"))[0]).toContain("❯ middle prompt");
      frame = await key("\u001b[1;2A");
      expect(frame[0]!.trim()).toBe("");
      expect(frame[1]).toBe(header);
      expect(await key("\u001b[1;2A")).toEqual(frame);
      await key("\u001b[1;5F");
      expect((await key("\u001b[1;3H"))[0]).toContain("❯ last prompt");
      expect((await key("\u001b[1;3H"))[0]).toContain("❯ Compacted from 300,001 tokens");
      expect((await key("\u001b[1;3H"))[0]).toContain("❯ middle prompt");
      expect((await key("\u001b[1;3H"))[1]).toBe(header);
      expect(shell.root.editor.getText()).toBe("keep draft");
    } finally { await shell.dispose(); }
  });

  it("uses quiet compaction context after the full summary and preserves selector input ownership", async () => {
    const { terminal, shell } = await fixture([compaction(281483, "Short summary."), reply("long reply")], [], true);
    try {
      terminal.resize(80, 14);
      const frame = shell.root.render(80);
      expect(stripTerminalSequences(frame[0]!)).toContain("Compacted from 281,483 tokens");
      expect(frame[0]).toContain("\u001b[2m");
      await shell.submit("/model");
      shell.runtime.renderNow();
      const top = shell.root.viewportPresentationEvidence().scrollTop;
      terminal.input("\u001b[1;2A");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
    } finally { await shell.dispose(); }
  });

  it("retains cached long summary rows, links and selection while later output streams and the viewport resizes", async () => {
    await withPinnedHyperlinks(async () => {
      const text = "copyable alpha beta\n\n[web](https://example.com/summary) [file](file:///D:/work/summary.md)\n\n" + compaction().summary.repeat(25);
      const { engine, adapter, terminal, shell } = await fixture([compaction(281483, text), reply("tail")], [], true);
      try {
        terminal.resize(80, 16);
        shell.root.editor.setText("unsubmitted draft");
        shell.root.render(80);
        terminal.input("\u001b[1;5H");
        const rows = shell.root.render(80);
        const source = adapter.view().transcript.find(block => block.kind === "compaction")!;
        const renderer = shell.root.transcriptComponent(source.id)!;
        const spy = vi.spyOn(renderer, "render");
        const linkRow = rows.find(row => stripTerminalSequences(row).includes("web"))!;
        const linkText = stripTerminalSequences(linkRow);
        expect(getPinnedPiTuiLinkAtColumn(linkRow, linkText.indexOf("web"))).toBe("https://example.com/summary");
        expect(getPinnedPiTuiLinkAtColumn(linkRow, linkText.indexOf("file"))).toBe("file:///D:/work/summary.md");
        expect(linkRow).toContain(piTheme().fg("mdLink", "web"));
        expect(linkRow).toContain(piTheme().fg("accent", "file"));
        const row = rows.findIndex(line => stripTerminalSequences(line).includes("copyable alpha beta")) + 1;
        terminal.input(`\u001b[<0;3;${row}M`);
        terminal.input(`\u001b[<32;21;${row}M`);
        terminal.input(`\u001b[<0;21;${row}m`);
        expect(shell.root.hasActiveSelection()).toBe(true);
        for (let i = 0; i < 8; i++) {
          const message = { role: "assistant", timestamp: time + 5, content: [{ type: "text", text: `stream ${i}` }] };
          engine.session.emit({ type: "message_update", message, assistantMessageEvent: { type: "text_delta", delta: String(i) } });
          await adapter.flushEvents();
          shell.runtime.renderNow();
        }
        expect(spy).not.toHaveBeenCalled();
        expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(0);
        expect(shell.root.hasActiveSelection()).toBe(true);
        for (const width of [40, 100, 80]) {
          terminal.resize(width, 16);
          const resized = shell.root.render(width);
          expect(resized.every(line => visibleWidth(line) <= width)).toBe(true);
          expect(shell.root.viewportPresentationEvidence().followingEnd).toBe(false);
          expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(0);
        }
        expect(shell.root.hasActiveSelection()).toBe(true);
        terminal.input("\u0003");
        expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("copyable alpha beta").toString("base64")}\u0007`);
        expect(stripTerminalSequences(renderer.render(80).join("\n"))).toContain("summary-23 alpha beta");
        expect(shell.root.editor.getText()).toBe("unsubmitted draft");
        expect(adapter.view().transcript.find(block => block.id === source.id)?.text).toBe(text);
      } finally { await shell.dispose(); }
    });
  });

  it("keeps branch summaries, compaction working status and the comparison route unchanged", async () => {
    const branch = { role: "branchSummary", summary: "Branch body.", fromId: "branch-1", timestamp: time };
    for (const custom of [false, true]) {
      const { engine, adapter, terminal, shell } = await fixture([compaction(), branch, reply("tail")], [], custom);
      try {
        terminal.resize(80, 16);
        const before = shell.root.exitTranscript(80);
        if (!custom) {
          expect(before).toContain("ctrl+o");
          expect(before).not.toContain("summary-23 alpha beta");
        }
        const branchBlock = adapter.view().transcript.find(block => (block.payload as { role?: string }).role === "branchSummary")!;
        expect(stripTerminalSequences(shell.root.transcriptComponent(branchBlock.id)!.render(80).join("\n"))).toContain("ctrl+o");
        engine.session.emit({ type: "compaction_start", reason: "manual" });
        await adapter.flushEvents();
        expect(stripTerminalSequences(shell.root.render(80).join("\n"))).toContain("Compacting");
        engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
        await adapter.flushEvents();
        expect(shell.root.exitTranscript(80)).toBe(before);
        expect(adapter.view().transcript.filter(block => block.kind === "compaction")).toHaveLength(2);
      } finally { await shell.dispose(); }
    }
  });
});

describe("OwnedUiSessionShell", () => {
  it.each([
    ["/scoped-models", "Model Configuration"],
    ["/model", "Select model"],
    ["/settings", "Auto-compact"],
    ["/fork", "Fork"],
    ["/login", "Login"],
    ["/logout", "Logout"],
  ])("preserves normal transcript scroll and copy behind %s", async (command, _heading) => {
    const messages = [{ role: "assistant", content: [{ type: "text", text: Array.from({ length: 120 }, (_, i) => `transcript-${i} alpha beta gamma`).join("\n\n") }] }];
    const { shell, terminal, engine } = await fixture(messages, [], true);
    try {
      terminal.resize(80, 54);
      shell.runtime.renderNow();
      await shell.submit(command!);
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      const previous = shell.root.viewportPresentationEvidence().scrollTop;
      const calls = [...engine.session.calls];
      terminal.input("\u001b[<64;3;3M");
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(previous - 3);
      expect(engine.session.calls).toEqual(calls);
      const selectedRow = shell.root.render(80).findIndex(row => stripTerminalSequences(row).includes("transcript-")) + 1;
      expect(selectedRow).toBeGreaterThan(0);
      const before = terminal.writes.length;
      terminal.input(`\u001b[<0;2;${selectedRow}M\u001b[<32;7;${selectedRow}M\u001b[<0;7;${selectedRow}m\u0003`);
      shell.runtime.renderNow();
      const output = terminal.writes.slice(before).join("");
      const copies = [...output.matchAll(/\u001b\]52;c;([^\u0007]*)\u0007/g)];
      expect(copies).toHaveLength(1);
      expect(Buffer.from(copies[0]![1]!, "base64").toString()).not.toContain("\u001b");
      expect(output).not.toContain("Copied");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      expect(engine.session.calls).toEqual(calls);
      terminal.input("\u001b");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
    } finally { await shell.dispose(); }
  });

  it.each(["replacement", "overlay"])("routes an unlisted extension %s by painted bounds and preserves mixed input order", async kind => {
    const { shell, terminal, engine } = await fixture([{ role: "assistant", content: [{ type: "text", text: "alpha beta gamma\n\n".repeat(100) }] }], [], true);
    const received: string[] = [];
    let done: (() => void) | undefined;
    try {
      terminal.resize(80, 40);
      const context = (engine.session.extensionBindings as { uiContext: ExtensionUIContext }).uiContext;
      const result = context.custom<void>((_tui, _theme, _keys, finish) => {
        done = () => finish();
        return { render: (width: number) => ["EXTENSION".padEnd(width), " ".repeat(width), " ".repeat(width)],
          invalidate() {}, handleInput(data: string) { received.push(data); } };
      }, kind === "overlay" ? { overlay: true, overlayOptions: { width: 20, row: 8, col: 10 } } : undefined);
      await nextImmediate();
      shell.runtime.renderNow();
      const modalRow = kind === "overlay" ? 9 : shell.root.render(80).findIndex(row => row.includes("EXTENSION")) + 1;
      const modalCol = kind === "overlay" ? 11 : 1;
      const top = shell.root.viewportPresentationEvidence().scrollTop;
      terminal.input("\u001b[<64;2;3M");
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top - 3);
      expect(received).toEqual([]);
      terminal.input(`x\u001b[<0;${modalCol};${modalRow}M\u001b[<32;2;3M\u001b[<0;2;3my`);
      await nextImmediate();
      expect(received).toEqual(["x", `\u001b[<0;${modalCol};${modalRow}M`, "\u001b[<32;2;3M", "\u001b[<0;2;3m", "y"]);
      received.length = 0;
      const selectedRow = shell.root.render(80).findIndex(row => stripTerminalSequences(row).includes("alpha")) + 1;
      terminal.input("\u001b[<0;2;");
      terminal.input(`${selectedRow}M\u001b[<32;7;${selectedRow}M\u001b[<0;7;${selectedRow}m`);
      const copyAt = terminal.writes.length;
      terminal.input("\u0003");
      expect(terminal.writes.slice(copyAt).join("")).toContain("\u001b]52;c;");
      expect(received).toEqual([]);
      done!();
      await result;
      shell.runtime.renderNow();
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
      expect(shell.runtime.hasOverlay()).toBe(false);
    } finally { done?.(); await shell.dispose(); }
  });

  it.each(["select", "confirm", "input", "editor", "custom-editor"])("preserves viewport interaction during extension %s", async kind => {
    const { shell, terminal, engine } = await fixture([{ role: "assistant", content: [{ type: "text", text: "alpha beta gamma\n\n".repeat(100) }] }], [], true);
    const context = (engine.session.extensionBindings as { uiContext: ExtensionUIContext }).uiContext;
    let pending: Promise<unknown> | undefined;
    try {
      terminal.resize(80, 54);
      if (kind === "select") pending = context.select("Extension choices", ["One", "Two"]);
      else if (kind === "confirm") pending = context.confirm("Permission", "Allow this operation?");
      else if (kind === "input") pending = context.input("Extension input");
      else if (kind === "editor") pending = context.editor("Extension editor", "draft");
      else context.setEditorComponent(() => ({ render: () => ["Custom editor"], invalidate() {}, handleInput() {}, getText: () => "", setText() {}, insertTextAtCursor() {}, addToHistory() {} }));
      await nextImmediate();
      shell.runtime.renderNow();
      const before = shell.root.viewportPresentationEvidence().scrollTop;
      terminal.input("\u001b[<64;2;3M");
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(before - 3);
      const row = shell.root.render(80).findIndex(line => stripTerminalSequences(line).includes("alpha")) + 1;
      const copyAt = terminal.writes.length;
      terminal.input(`\u001b[<0;2;${row}M\u001b[<32;7;${row}M\u001b[<0;7;${row}m\u0003`);
      expect(terminal.writes.slice(copyAt).join("")).toContain("\u001b]52;c;");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      if (kind === "custom-editor") context.setEditorComponent(undefined);
      else terminal.input("\u001b");
      await pending;
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
    } finally { await shell.dispose(); }
  });

  it("keeps nested settings and post-resize transcript hit regions independent", async () => {
    const { shell, terminal } = await fixture([{ role: "assistant", content: [{ type: "text", text: "alpha beta gamma\n\n".repeat(100) }] }], [], true);
    try {
      terminal.resize(80, 54);
      await shell.submit("/settings");
      terminal.input("thinking");
      terminal.input("\r");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.render(80).join("\n")).toContain("Thinking Level");
      terminal.input("\u001b[<64;2;3M".repeat(4));
      shell.runtime.renderNow();
      const top = shell.root.viewportPresentationEvidence().scrollTop;
      const row = shell.root.render(80).findIndex(line => stripTerminalSequences(line).includes("alpha")) + 1;
      terminal.input(`\u001b[<0;2;${row}M\u001b[<32;7;${row}M`);
      terminal.resize(70, 48);
      terminal.input("\u001b[<32;3;2M\u001b[<0;3;2m");
      expect(shell.root.hasActiveSelection()).toBe(false);
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
      terminal.input("\u001b");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.render(70).join("\n")).not.toContain("Select reasoning depth");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      terminal.input("\u001b");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
    } finally { await shell.dispose(); }
  });

  it("keeps overlay paint above transcript selection while streaming and blocks full-cover click-through", async () => {
    const { shell, terminal, engine } = await fixture([{ role: "assistant", content: [{ type: "text", text: "alpha beta gamma\n\n".repeat(100) }] }], [], true);
    try {
      terminal.resize(80, 40);
      const received: string[] = [];
      const component = { render: (width: number) => Array.from({ length: 4 }, () => "#".repeat(width)),
        invalidate() {}, handleInput: (data: string) => received.push(data) };
      const overlay = shell.runtime.showOverlay(component, { width: 20, row: 5, col: 10 });
      engine.session.emit({ type: "agent_start" });
      await shell.backend.flushEvents();
      shell.runtime.renderNow();
      terminal.input("\u001b[<64;3;3M");
      shell.runtime.renderNow();
      const top = shell.root.viewportPresentationEvidence().scrollTop;
      const selectedRow = shell.root.render(80).findIndex(row => stripTerminalSequences(row).includes("alpha")) + 1;
      terminal.input(`\u001b[<0;2;${selectedRow}M\u001b[<32;15;8M`);
      engine.session.emit({ type: "message_start", message: { role: "assistant", content: [{ type: "text", text: "new streamed output" }], timestamp: 5 } });
      await shell.backend.flushEvents();
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
      const replay = await replayTerminalPaint(terminal.writes.map(data => ({ data, atMs: 0 })), { columns: 80, rows: 40, synchronizedUpdates: "honor" });
      expect(replay.final.rows[5]!.slice(10, 30)).toBe("#".repeat(20));
      const backgrounds = await replayTerminalBackgroundCells(terminal.writes.map(data => ({ data, atMs: 0 })), { columns: 80, rows: 40 });
      expect(backgrounds.some(cell => cell.color === 0x264f78)).toBe(true);
      expect(backgrounds.filter(cell => cell.row >= 6 && cell.row <= 9 && cell.column >= 11 && cell.column <= 30)
        .some(cell => cell.color === 0x264f78)).toBe(false);
      expect(received).toEqual([]);
      terminal.input("\u001b[<0;15;8m");
      overlay.hide();
      const full = shell.runtime.showOverlay({ ...component, render: (width: number) => Array.from({ length: 40 }, () => "#".repeat(width)) }, { width: "100%", anchor: "top-left" });
      shell.runtime.renderNow();
      terminal.input("\u001b[<64;3;3M\u001b[<0;2;3M\u001b[<32;7;3M\u001b[<0;7;3m");
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
      expect(received).toHaveLength(4);
      full.hide();
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
    } finally { await shell.dispose(); }
  });

  it.each([false, true])("anchors slash autocomplete above the shell input (history=%s)", async persistent => {
    const history = memoryHistory();
    const { shell, terminal } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
      persistent ? { store: history.store, limit: 100 } : undefined);
    try {
      terminal.resize(80, 24);
      const position = () => {
        const rows = shell.root.render(80);
        const prompt = rows.findIndex(row => stripTerminalSequences(row).startsWith("❯ "));
        return { prompt, upper: prompt - 1, lower: prompt + 1,
          cursor: rows.findIndex(row => row.includes(CURSOR_MARKER)), footer: rows.slice(-2) };
      };
      const closed = position();
      terminal.input("/");
      await nextImmediate(); await nextImmediate();
      expect(shell.root.render(80).join("\n")).toContain("settings");
      expect(position()).toEqual(closed);
      terminal.input("mo");
      await nextImmediate(); await nextImmediate();
      expect(position()).toEqual(closed);
      terminal.input("\u001b");
      expect(position()).toEqual(closed);
    } finally { await shell.dispose(); }
  });

  it.each([false, true].flatMap(history => ["empty", "long", "detached", "streaming"].map(state => ({ history, state }))))(
    "paints stable autocomplete checkpoints ($state, history=$history)", async ({ history, state }) => {
      const messages = state === "empty" ? [] : Array.from({ length: 40 }, (_, index) => ({
        role: "assistant", content: [{ type: "text", text: `settled paragraph ${index}` }], timestamp: index + 1,
      }));
      const saved = memoryHistory();
      const { shell, terminal, engine, adapter } = await fixture(messages, [], true, undefined, undefined, undefined, undefined, undefined,
        history ? { store: saved.store, limit: 100 } : undefined);
      try {
        terminal.resize(80, 24);
        shell.root.setExtensionWidget("above", { render: () => ["above widget"], invalidate() {} }, "aboveEditor");
        shell.root.setExtensionWidget("below", { render: () => ["below widget"], invalidate() {} }, "belowEditor");
        if (state === "streaming") { engine.session.emit({ type: "agent_start" }); await adapter.flushEvents(); }
        shell.runtime.renderNow();
        if (state === "detached") terminal.input("\u001b[<64;20;3M");
        const checkpoints: Array<{ writeEnd: number; columns: number; rows: number }> = [];
        const expected: Array<{ rows: string[]; cursorRow: number }> = [];
        const capture = async () => {
          await nextImmediate(); await nextImmediate(); shell.runtime.renderNow();
          const frame = shell.root.render(terminal.columns);
          checkpoints.push({ writeEnd: terminal.writes.length, columns: terminal.columns, rows: terminal.rows });
          expected.push({ rows: frame.map(row => stripTerminalSequences(row).trimEnd()),
            cursorRow: frame.findIndex(row => row.includes(CURSOR_MARKER)) + 1 });
          return expected.at(-1)!;
        };
        const before = await capture();
        const detachedTop = shell.root.viewportPresentationEvidence().scrollTop;
        terminal.input("/");
        await capture();
        expect(shell.root.editor.bodyGeometry!().rowOffset).toBeGreaterThan(0);
        if (state === "detached") {
          expect(shell.root.viewportFrameDescriptor()?.followingEnd).toBe(false);
          expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(detachedTop);
        }
        if (state !== "streaming") {
          const work = shell.root.viewportCompositionEvidence();
          terminal.input("\u001b[B"); await nextImmediate(); await nextImmediate();
          expect(shell.root.viewportCompositionEvidence().full).toBe(work.full);
          expect(shell.root.viewportCompositionEvidence().dockOnly).toBeGreaterThan(work.dockOnly);
        }
        await capture();
        terminal.input("mo"); await capture();
        terminal.input("\u007f"); terminal.input("\u007f"); await capture();
        terminal.input("zzzz-no-match"); await capture();
        expect(shell.root.editor.bodyGeometry!().rowOffset).toBe(0);
        shell.root.editor.setText(""); terminal.input("/"); await capture();
        if (state === "streaming") {
          const message = { role: "assistant", content: [{ type: "text", text: "new streamed reply" }], timestamp: 100 };
          engine.session.emit({ type: "message_start", message });
          engine.session.emit({ type: "message_end", message });
          await adapter.flushEvents(); await capture();
        }
        terminal.input("\u001b"); await capture();
        for (const frame of expected) {
          expect(frame.cursorRow).toBe(before.cursorRow);
          expect(frame.rows.slice(before.cursorRow)).toEqual(before.rows.slice(before.cursorRow));
        }
        terminal.resize(40, 12); await capture();
        terminal.input("\u007f"); terminal.input("/"); await capture();
        terminal.input("\u001b"); await capture();
        const writes = terminal.writes.map((data, atMs) => ({ data, atMs }));
        const painted = await replayTerminalCheckpoints(writes, checkpoints);
        for (const [index, frame] of painted.entries()) {
          expect(frame.rows.map(row => row.trimEnd()), `checkpoint ${index}`).toEqual(expected[index]!.rows);
          expect(frame.cursor.row, `cursor ${index}`).toBe(expected[index]!.cursorRow);
        }
      } finally { await shell.dispose(); }
    });

  it.each([false, true])("routes autocomplete body pointers and restores extension editors (history=%s)", async persistent => {
    const history = memoryHistory();
    const copied: string[] = [];
    const readText = vi.fn(async () => "clipboard text");
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText, writeText: async text => { copied.push(text); } },
      undefined, undefined, undefined, persistent ? { store: history.store, limit: 100 } : undefined);
    try {
      terminal.resize(80, 24);
      terminal.input("/"); terminal.input("mo"); await nextImmediate(); await nextImmediate();
      const frame = shell.root.render(80);
      const row = frame.findIndex(line => stripTerminalSequences(line).startsWith("❯ ")) + 1;
      expect(shell.root.editor.bodyGeometry!().rowOffset).toBeGreaterThan(0);
      // Rationale: with the counter merged into the body's top border, there is no
      // longer a plain top line above the menu; the counter border now sits directly
      // above the input prompt as part of the editor's own body geometry.
      const topLineRow = row - 1;
      expect(stripTerminalSequences(frame[topLineRow - 1]!)).toMatch(/^(?:─+|─── \d+\/\d+ ─*)$/u);
      expect(shell.root.editor.getText()).toBe("/mo");
      terminal.input(`\u001b[<0;3;${row}M`);
      terminal.input(`\u001b[<32;6;${row}M`);
      terminal.input(`\u001b[<0;6;${row}m`);
      expect(shell.root.hasActiveSelection()).toBe(true);
      terminal.input("\u0003"); await nextImmediate();
      expect(copied).toEqual(["/mo"]);
      const ui = (engine.session.extensionBindings as { uiContext: ExtensionUIContext }).uiContext;
      ui.setEditorComponent(tui => new Editor(tui, {
        borderColor: text => text,
        selectList: { selectedPrefix: text => text, selectedText: text => text, description: text => text, scrollInfo: text => text, noMatch: text => text },
      }));
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      expect(shell.root.render(80).some(line => stripTerminalSequences(line).startsWith("❯ "))).toBe(false);
      ui.setEditorComponent(undefined);
      shell.root.editor.setText(""); terminal.input("/"); await nextImmediate(); await nextImmediate();
      const restored = shell.root.render(80);
      expect(restored.findIndex(line => stripTerminalSequences(line).startsWith("❯ ")) + 1).toBe(row);
      expect(shell.root.editor.bodyGeometry!().rowOffset).toBeGreaterThan(0);
    } finally { await shell.dispose(); }
  });

  it("quietly recovers combined history contention and a 16,384-update assistant/tool burst with interactive input", async () => {
    const root = await mkdtemp(join(tmpdir(), "combined-history-pressure-"));
    const options = { dataDir: root, profileRoot: join(root, "profile"), limit: 100 };
    const store = new PromptHistoryService(options);
    expect(await store.record({ id: "seed", text: "saved seed", kind: "prompt", timestamp: 0 })).toBe("committed");
    const phases: Array<{ phase: string; pendingDepth: number }> = [];
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, undefined, undefined,
      { onEvent: event => phases.push(event) }, undefined, { store, limit: 100 });
    const notifications = vi.spyOn(shell.root, "addExtensionNotification");
    const stdout = vi.spyOn(process.stdout, "write"); const stderr = vi.spyOn(process.stderr, "write");
    const location = resolvePromptHistoryPath(options.dataDir, options.profileRoot);
    let lock: Awaited<ReturnType<typeof holdHistoryLock>> | undefined;
    try {
      await adapter.flushEvents();
      lock = await holdHistoryLock(location.path);
      await shell.submit("saved during contention");
      await vi.waitFor(() => expect(store.diagnostics().failures.busy).toBeGreaterThan(0), { timeout: 2500 });
      shell.root.editor.setText("draft");
      terminal.input("\u001b[A"); terminal.input("\u001b[A");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("saved during contention"));
      terminal.input("\u001b[B");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("draft"));
      terminal.input("\u001b[F"); await nextImmediate();
      engine.session.isStreaming = true;
      engine.session.emit({ type: "agent_start" });
      const messages = Array.from({ length: 16 }, (_, index) => ({ role: "assistant", timestamp: index + 100, content: [{ type: "text", text: "" }] }));
      const tools = Array.from({ length: 16 }, (_, index) => ({ id: `load-${index}`, text: "" }));
      for (let burst = 0; burst < 8; burst++) {
        for (let offset = 0; offset < 2048; offset++) {
          const index = burst * 2048 + offset;
          if (index % 32 < 16) {
            const message = messages[index % 16]!; message.content[0]!.text += ` ${index}`;
            engine.session.emit({ type: "message_update", message });
          } else {
            const tool = tools[index % 16]!; tool.text += ` ${index}`;
            engine.session.emit({ type: "tool_execution_update", toolCallId: tool.id, toolName: "bash", partialResult: { content: [{ type: "text", text: tool.text }] } });
          }
        }
        terminal.input("x"); terminal.input("\u001b[<35;10;3M");
        await nextImmediate(); shell.runtime.renderNow();
        expect(shell.root.editor.getText()).toBe(`draft${"x".repeat(burst + 1)}`);
      }
      terminal.input("\u001b"); await vi.waitFor(() => expect(engine.session.calls).toContain("abort"));
      for (const message of messages) engine.session.emit({ type: "message_end", message });
      for (const tool of tools) engine.session.emit({ type: "tool_execution_end", toolCallId: tool.id, toolName: "bash", result: { content: [{ type: "text", text: tool.text }] } });
      engine.session.emit({ type: "agent_settled" });
      await adapter.flushEvents(); await nextImmediate(); shell.runtime.renderNow();
      expect(adapter.view().transcript.map(block => block.text).sort()).toEqual([...messages.map(message => message.content[0]!.text), ...tools.map(tool => tool.text)].sort());
      expect(adapter.view().lifecycle).toBe("ready");
      expect(phases.at(-1)?.pendingDepth).toBe(0);
      expect(adapter.deliveryDiagnostics().superseded).toBeGreaterThan(15_000);
      expect(adapter.deliveryDiagnostics()).toMatchObject({ overloads: 0, pending: 0, bytes: 0 });
      expect(adapter.deliveryDiagnostics().peakNodes).toBeLessThanOrEqual(1024);
      expect(adapter.deliveryDiagnostics().peakBytes).toBeLessThanOrEqual(8 * 1024 * 1024);
      await lock.released;
      await vi.waitFor(() => expect(store.diagnostics().pending).toBe(0), { timeout: 10_000 });
      const saved = new PromptHistoryStore(location.path, location.profileId, 100);
      try { expect(saved.snapshot().entries.map(entry => entry.text)).toEqual(["saved during contention", "saved seed"]); }
      finally { saved.close(); }
      expect(store.diagnostics().recoveries).toBeGreaterThan(0);
      expect(store.diagnostics().timers).toBeLessThanOrEqual(3);
      await shell.dispose();
      expect(store.diagnostics()).toMatchObject({ state: "closed", pending: 0, timers: 0 });
      expect(notifications).not.toHaveBeenCalled();
      const output = JSON.stringify([terminal.writes, adapter.view().status, adapter.view().diagnostics, stdout.mock.calls, stderr.mock.calls]);
      expect(output).not.toMatch(/prompt history|backpressure|coalesc|recover(y|ing)|could not finish saving/i);
      expect(stdout).not.toHaveBeenCalled(); expect(stderr).not.toHaveBeenCalled();
    } finally {
      stdout.mockRestore(); stderr.mockRestore();
      await lock?.stop(); await shell.dispose(); await store.close();
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);

  it.each(["shortcut", "terminal", "right-click"])("renders large text as one chip through %s and records the full prompt", async gesture => {
    const history = memoryHistory();
    const payload = Array.from({ length: 136 }, (_, index) => `line ${index} 日本語 [paste #999 1001 chars]`).join("\n");
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText: async () => payload },
      undefined, undefined, undefined, { store: history.store, limit: 100 });
    try {
      terminal.resize(80, 24); shell.root.editor.setText("before "); shell.runtime.renderNow();
      if (gesture === "shortcut") terminal.input("\x16");
      else if (gesture === "terminal") terminal.input(`\x1b[200~${payload}\x1b[201~`);
      else {
        const row = shell.root.render(80).map(stripTerminalSequences).findIndex(line => line.includes("before ")) + 1;
        terminal.input(`\x1b[<2;8;${row}M\x1b[<2;8;${row}m`);
      }
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("before [paste #1 +136 lines]"));
      const frame = stripTerminalSequences(shell.root.editor.render(80).join("\n"));
      expect(frame).toContain("[paste #1 +136 lines]"); expect(frame).not.toContain("line 135");
      terminal.input(" after"); await nextImmediate(); terminal.input("\r");
      await vi.waitFor(() => expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([`prompt:before ${payload} after`]));
      expect(engine.session.promptOptions).toHaveLength(1);
      expect(engine.session.promptOptions[0] ?? {}).not.toHaveProperty("images");
      expect(history.submitted.map(item => item.text)).toEqual([`before ${payload} after`]);
    } finally { await shell.dispose(); }
  });

  it.each(["ordinary", "steer", "follow-up", "compaction", "compaction-follow-up"])("waits for a pending large text %s submission and sends its captured payload once", async mode => {
    let release!: (text: string) => void;
    const read = new Promise<string>(resolve => { release = resolve; });
    const payload = "original payload 👩‍💻\n".repeat(12).trim();
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: () => read });
    try {
      if (mode.startsWith("compaction")) engine.session.emit({ type: "compaction_start", reason: "manual" });
      else if (mode !== "ordinary") engine.session.emit({ type: "agent_start" });
      await adapter.flushEvents();
      terminal.input("before "); terminal.input("\x16");
      const draft = shell.root.editor.getText();
      const pending = mode.endsWith("follow-up") ? shell.queueFollowUp() : shell.submit(draft);
      const duplicate = mode.endsWith("follow-up") ? pending : shell.submit(draft);
      shell.root.editor.setText("newer draft");
      expect(engine.session.promptOptions).toHaveLength(0);
      release(payload); expect((await pending).outcome).toBe("completed"); await duplicate;
      if (mode.startsWith("compaction")) {
        expect(engine.session.promptOptions).toHaveLength(0);
        engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
        await adapter.flushEvents(); await nextImmediate();
      }
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([`prompt:before ${payload}`]);
      expect(engine.session.promptOptions).toHaveLength(1);
      expect(engine.session.promptOptions[0] ?? {}).not.toHaveProperty("images");
      if (mode !== "ordinary") expect(engine.session.promptOptions[0]).toMatchObject({ streamingBehavior: mode.endsWith("follow-up") ? "followUp" : "steer" });
      expect(shell.root.editor.getText()).toBe("newer draft");
    } finally { await shell.dispose(); }
  });

  it.each(["delete", "cancel", "session", "dispose"])("does not resurrect or dispatch a pending large text paste after %s", async action => {
    let release!: (text: string) => void;
    const read = new Promise<string>(resolve => { release = resolve; });
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: () => read });
    try {
      terminal.input("\x16"); await nextImmediate();
      let pending: Promise<unknown> | undefined;
      if (action === "delete") { terminal.input("\x01"); terminal.input("\x7f"); }
      if (action === "cancel") { pending = shell.submit(shell.root.editor.getText()); await shell.interrupt(); }
      if (action === "session") { await engine.rebindSession?.(new Session()); await adapter.flushEvents(); }
      if (action === "dispose") await shell.dispose();
      await nextImmediate(); shell.root.editor.setText("newer");
      release("large late payload\n".repeat(136)); await pending; await nextImmediate(); await nextImmediate();
      expect(shell.root.editor.getText()).toBe("newer"); expect(engine.session.promptOptions).toHaveLength(0);
    } finally { await shell.dispose(); }
  });

  it.each(["waiting", "compaction"])("recovers a large text %s queue without losing or double-expanding its payload", async mode => {
    let release!: (text: string) => void;
    const read = new Promise<string>(resolve => { release = resolve; });
    const payload = "literal [paste #999 1001 chars]\n".repeat(12).trim();
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: () => read });
    try {
      if (mode === "compaction") { engine.session.emit({ type: "compaction_start", reason: "manual" }); await adapter.flushEvents(); }
      terminal.input("\x16"); const draft = shell.root.editor.getText();
      const pending = shell.submit(draft);
      if (mode === "compaction") { release(payload); await pending; }
      shell.restoreQueuedInput();
      if (mode === "waiting") { release(payload); await pending; }
      await vi.waitFor(() => expect(shell.root.hasPendingPastes(draft)).toBe(false));
      expect(engine.session.promptOptions).toHaveLength(0);
      const restored = shell.root.preparePromptSubmission(shell.root.editor.getText()).text;
      expect(restored).toBe(mode === "waiting" ? `${payload}\nqueued steer\nqueued follow` : `queued steer\nqueued follow\n${payload}`);
      if (mode === "compaction") {
        engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
        await adapter.flushEvents(); await nextImmediate();
      }
      await shell.submit(shell.root.editor.getText());
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([`prompt:${restored}`]);
    } finally { await shell.dispose(); }
  });

  it("recalls expanded large pasted text using a fresh durable history worker and chip store", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "text-paste-history-"));
    const options = { dataDir, profileRoot: join(dataDir, "profile"), limit: 100 };
    const payload = "日本語 👩‍💻 [📷 literal] [paste #999 1001 chars]\n  indented\n".repeat(12).trim();
    let shell: OwnedUiSessionShell | undefined;
    try {
      const first = await fixture([], [], true, undefined, { readText: async () => payload }, undefined, undefined, undefined,
        { store: new PromptHistoryService(options), limit: 100 });
      shell = first.shell; first.terminal.input("\x16");
      await vi.waitFor(() => expect(shell!.root.editor.getText()).toMatch(/^\[paste #1 /u));
      await shell.submit(shell.root.editor.getText()); await shell.dispose(); shell = undefined;
      const second = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
        { store: new PromptHistoryService(options), limit: 100 });
      shell = second.shell;
      await vi.waitFor(() => expect(shell!.root.editor.recall?.position().total).toBe(1));
      second.terminal.input("\x1b[A");
      await vi.waitFor(() => expect(shell!.root.editor.getText()).toBe(payload));
      await shell.submit(shell.root.editor.getText());
      expect(second.engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([`prompt:${payload}`]);
    } finally { await shell?.dispose(); await rm(dataDir, { recursive: true, force: true }); }
  });

  it.each(["shortcut", "terminal", "right-click"])("pastes text without flashing a screenshot chip through %s", async gesture => {
    let release!: (text: string) => void;
    const read = new Promise<string>(resolve => { release = resolve; });
    const { shell, terminal } = await fixture([], [], true, undefined, { readText: () => read });
    try {
      terminal.resize(40, 16);
      shell.root.editor.setText("before ");
      shell.runtime.renderNow();
      const before = shell.root.editor.render(40);
      const start = terminal.writes.length;
      if (gesture === "shortcut") terminal.input("\u0016");
      else if (gesture === "terminal") terminal.input("\u001b[200~\u001b[201~");
      else {
        const frame = shell.root.render(40).map(stripTerminalSequences);
        const row = frame.findIndex(line => line.includes("before ")) + 1;
        terminal.input(`\u001b[<2;8;${row}M\u001b[<2;8;${row}m`);
      }
      // Concurrency: force real presentation while clipboard acquisition is still unresolved.
      shell.runtime.renderNow();
      expect(shell.root.editor.render(40)).toEqual(before);
      terminal.input("after");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(stripTerminalSequences(shell.root.editor.render(40).join("\n"))).toContain("before after");
      release("pasted\ntext");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("before pasted\ntextafter"));
      shell.runtime.renderNow();
      expect(terminal.writes.slice(start).join("")).not.toMatch(/screenshot-|preparing/u);
      terminal.input("!");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("before pasted\ntextafter!");
    } finally { await shell.dispose(); }
  });

  it("keeps repeated text pastes invisible and ordered when the second read finishes first", async () => {
    let first!: (text: string) => void;
    let second!: (text: string) => void;
    const readText = vi.fn().mockImplementationOnce(() => new Promise(resolve => { first = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { second = resolve; }));
    const { shell, terminal } = await fixture([], [], true, undefined, { readText });
    try {
      shell.root.editor.setText("left ");
      terminal.input("\u0016");
      terminal.input("middle ");
      terminal.input("\u0016");
      terminal.input("right");
      await vi.waitFor(() => expect(readText).toHaveBeenCalledTimes(2));
      const frame = () => stripTerminalSequences(shell.root.editor.render(40).join("\n"));
      expect(frame()).toContain("left middle right");
      expect(frame()).not.toContain("screenshot-");
      second("second ");
      await vi.waitFor(() => expect(frame()).toContain("left middle second right"));
      expect(frame()).not.toContain("screenshot-");
      first("first ");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("left first middle second right"));
      expect(frame()).not.toContain("screenshot-");
    } finally { await shell.dispose(); }
  });

  it("reserves paste before acquisition and waits once on Enter without replacing newer input", async () => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const source = screenshotPng().toString("base64");
    const read = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => read });
    try {
      terminal.input("\u0016");
      const chip = shell.root.editor.getText();
      expect(chip).toMatch(/^\[📷 screenshot-[a-f0-9]+\]$/u);
      expect(shell.root.hasPendingPastes(chip)).toBe(true);
      shell.runtime.renderNow();
      const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
      expect(frame).not.toContain(chip);
      expect(frame).not.toContain("preparing");
      terminal.input(" inspect this");
      await nextImmediate();
      const draft = shell.root.editor.getText();
      terminal.input("\r");
      const duplicate = shell.submit(draft);
      terminal.input("newer draft");
      expect(engine.session.promptOptions).toHaveLength(0);
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Waiting for images");
      release({ data: source, mimeType: "image/png" });
      expect((await duplicate).outcome).toBe("completed");
      expect(engine.session.promptOptions).toHaveLength(1);
      expect(engine.session.calls.find(call => call.startsWith("prompt:"))).toBe(`prompt:${chip.slice(0, -1)}-resized] inspect this`);
      expect(shell.root.editor.getText()).toBe("newer draft");
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("Waiting for images");
    } finally { await shell.dispose(); }
  }, 20_000);

  it.each(["delete", "cancel", "session", "dispose"])("does not resurrect or dispatch a pending image after %s", async action => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const read = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => read });
    try {
      terminal.input("\u0016");
      expect(shell.root.editor.getText()).toMatch(/^\[📷 screenshot-[a-f0-9]+\]$/u);
      expect(shell.root.hasPendingPastes(shell.root.editor.getText())).toBe(true);
      await nextImmediate();
      if (action === "delete") { terminal.input("\u0001"); terminal.input("\u007f"); }
      if (action === "cancel") { terminal.input("\r"); await shell.interrupt(); }
      if (action === "session") { await engine.rebindSession?.(new Session()); await adapter.flushEvents(); }
      if (action === "dispose") await shell.dispose();
      await nextImmediate();
      shell.root.editor.setText("newer");
      release({ data: screenshotPng(8, 8).toString("base64"), mimeType: "image/png" });
      await nextImmediate(); await nextImmediate();
      expect(shell.root.editor.getText()).toBe("newer");
      expect(engine.session.promptOptions).toHaveLength(0);
    } finally { await shell.dispose(); }
  });

  it("keeps image order and caret position when the second paste completes first", async () => {
    let first!: (value: { data: string; mimeType: string }) => void;
    const firstData = screenshotPng(8, 8).toString("base64");
    const secondData = screenshotPng(12, 12).toString("base64");
    const readImage = vi.fn().mockImplementationOnce(() => new Promise(resolve => { first = resolve; }))
      .mockResolvedValueOnce({ data: secondData, mimeType: "image/png" });
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText: async () => null, readImage });
    try {
      terminal.input("\u0016");
      const firstChip = shell.root.editor.getText();
      terminal.input("\u0016");
      const secondChip = shell.root.editor.getText().slice(firstChip.length);
      terminal.input(" tail");
      await vi.waitFor(() => expect(shell.root.hasPendingPastes(secondChip)).toBe(false));
      expect(shell.root.editor.getText()).toBe(`${firstChip}${secondChip} tail`);
      expect(shell.root.hasPendingPastes(firstChip)).toBe(true);
      first({ data: firstData, mimeType: "image/png" });
      await vi.waitFor(() => expect(shell.root.hasPendingPastes(firstChip)).toBe(false));
      expect(shell.root.editor.getText()).toBe(`${firstChip}${secondChip} tail`);
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain(`${firstChip}${secondChip}`);
      terminal.input("!");
      await nextImmediate();
      expect(shell.root.editor.getText()).toMatch(/ tail!$/u);
      terminal.input("\r");
      await nextImmediate();
      expect(engine.session.promptOptions.at(-1)).toMatchObject({ images: [
        { data: firstData, mimeType: "image/png" }, { data: secondData, mimeType: "image/png" },
      ] });
    } finally { await shell.dispose(); }
  });

  it.each(["steer", "follow-up", "compaction"])("gates pending %s images and preserves a newer draft", async mode => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const read = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => read });
    try {
      if (mode === "compaction") engine.session.emit({ type: "compaction_start", reason: "manual" });
      else engine.session.emit({ type: "agent_start" });
      await adapter.flushEvents();
      terminal.input("\u0016");
      const pending = mode === "follow-up" ? shell.queueFollowUp() : shell.submit(shell.root.editor.getText());
      shell.root.editor.setText("newer");
      expect(engine.session.promptOptions).toHaveLength(0);
      release({ data: screenshotPng(8, 8).toString("base64"), mimeType: "image/png" });
      await pending;
      if (mode === "compaction") {
        expect(engine.session.promptOptions).toHaveLength(0);
        engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
        await adapter.flushEvents(); await nextImmediate();
      }
      expect(engine.session.promptOptions).toHaveLength(1);
      expect(engine.session.promptOptions.at(-1)).toMatchObject({ streamingBehavior: mode === "follow-up" ? "followUp" : "steer" });
      expect(shell.root.editor.getText()).toBe("newer");
    } finally { await shell.dispose(); }
  });

  it("dequeues a waiting intent without canceling the image now referenced by the editor", async () => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const read = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => read });
    try {
      terminal.input("\u0016");
      const draft = shell.root.editor.getText();
      const pending = shell.submit(draft);
      shell.restoreQueuedInput();
      expect(shell.root.editor.getText()).toBe(`${draft}\nqueued steer\nqueued follow`);
      release({ data: screenshotPng(8, 8).toString("base64"), mimeType: "image/png" });
      await pending;
      await vi.waitFor(() => expect(shell.root.preparePromptSubmission(draft).images).toHaveLength(1));
      expect(engine.session.promptOptions).toHaveLength(0);
      expect((await shell.submit(shell.root.editor.getText())).outcome).toBe("completed");
      expect(engine.session.promptOptions).toHaveLength(1);
    } finally { await shell.dispose(); }
  });

  it("keeps a failed waiting prompt recoverable and never sends its text alone", async () => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const read = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => read });
    try {
      terminal.input("look "); terminal.input("\u0016");
      const draft = shell.root.editor.getText();
      terminal.input("\r");
      const waiting = shell.submit(draft);
      terminal.input("new input");
      release({ data: "AAAA".repeat(Math.ceil(20 * 1024 * 1024 / 3) + 1), mimeType: "image/png" });
      expect((await waiting).outcome).toBe("rejected");
      expect(engine.session.promptOptions).toHaveLength(0);
      expect(shell.root.editor.getText()).toBe("new input");
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("20 MiB");
      shell.root.editor.setText(""); terminal.input("\u001b[A");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe(draft);
    } finally { await shell.dispose(); }
  });

  it("keeps an invalid image editor submission recoverable instead of rejecting its callback", async () => {
    const { shell, terminal, engine } = await fixture([], [], true);
    try {
      const preparation = vi.spyOn(shell.root, "preparePromptSubmission").mockReturnValue({
        text: "inspect screenshot",
        images: [{ type: "image", data: "AAAA".repeat(2 * 1024 * 1024 + 1), mimeType: "image/png" }],
      });
      shell.root.editor.setText("inspect screenshot");
      terminal.input("\r");
      await nextImmediate();
      expect(shell.root.render(80).join("\n")).toContain("8 MiB");
      expect(shell.root.editor.getText()).toBe("inspect screenshot");
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
      preparation.mockRestore();
      shell.root.editor.setText("corrected prompt");
      terminal.input("\r");
      await nextImmediate();
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:corrected prompt"]);
    } finally { await shell.dispose(); }
  });

  it("retains a real image chip and its bytes across rejection and explicit retry", async () => {
    const data = screenshotPng(16, 16, false).toString("base64");
    const { shell, adapter, terminal, engine } = await fixture([], [], true, undefined, {
      readText: async () => null, readImage: async () => ({ data, mimeType: "image/png" }),
    });
    try {
      terminal.input("\u0016");
      await vi.waitFor(() => expect(shell.root.hasPendingPastes(shell.root.editor.getText())).toBe(false));
      const draft = shell.root.editor.getText();
      expect(draft).toMatch(/^\[📷 screenshot-[a-f0-9]+\]$/u);
      vi.spyOn(adapter, "execute").mockResolvedValueOnce({ outcome: "rejected", diagnostic: "synthetic rejection" });
      terminal.input("\r");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe(draft);
      expect(engine.session.promptOptions).toEqual([]);
      terminal.input("\r");
      await nextImmediate();
      expect(engine.session.promptOptions).toHaveLength(1);
      expect(engine.session.promptOptions[0]).toMatchObject({ images: [{ type: "image", data, mimeType: "image/png" }] });
    } finally { await shell.dispose(); }
  });

  it("leaves Pi fullscreen selection and copying available in the comparison profile", async () => {
    const { shell, terminal } = await fixture([{ role: "assistant", content: [{ type: "text", text: "comparison selection\nsecond line\nthird line" }], timestamp: 1 }]);
    try {
      shell.runtime.switchMode("fullscreen");
      shell.runtime.renderNow();
      const start = terminal.writes.length;
      terminal.input("\u001b[<0;1;2M");
      terminal.input("\u001b[<32;15;4M");
      shell.runtime.renderNow();
      terminal.input("\u001b[<0;15;4m");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(terminal.writes.slice(start).join("")).toContain("Copied!");
      expect(terminal.writes.slice(start).join("")).toContain("\u001b]52;c;");
    } finally { await shell.dispose(); }
  });

  it("preserves newer editor input when a pending submission is rejected", async () => {
    const { shell, adapter, terminal, engine } = await fixture([], [], true);
    try {
      let rejectSubmission!: (value: { outcome: "rejected"; diagnostic: string }) => void;
      const execute = vi.spyOn(adapter, "execute").mockImplementationOnce(() => new Promise(resolve => { rejectSubmission = resolve; }));
      shell.root.editor.setText("old draft");
      terminal.input("\r");
      terminal.input("new draft");
      await nextImmediate();
      rejectSubmission({ outcome: "rejected", diagnostic: "do not leak provider payload" });
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("new draft");
      expect(shell.root.render(80).join("\n")).not.toContain("do not leak provider payload");
      shell.root.editor.setText("");
      terminal.input("\u001b[A");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("old draft");
      expect(execute).toHaveBeenCalledOnce();
      expect(engine.session.calls.some(call => call.startsWith("prompt:"))).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each(["throw", "reject"])("contains an unexpected %s from dispatch without automatic retry", async failure => {
    const { shell, adapter, terminal } = await fixture([], [], true);
    try {
      const execute = vi.spyOn(adapter, "execute").mockImplementationOnce(() => {
        if (failure === "throw") throw new Error("PRIVATE_REQUEST");
        return Promise.reject(new Error("PRIVATE_REQUEST"));
      });
      shell.root.editor.setText("inspect");
      terminal.input("\r");
      await nextImmediate();
      expect(execute).toHaveBeenCalledOnce();
      expect(shell.root.render(80).join("\n")).toContain("uncertain");
      expect(shell.root.render(80).join("\n")).not.toContain("PRIVATE_REQUEST");
      terminal.input("usable");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("usable");
    } finally { await shell.dispose(); }
  });

  it("rejects unsafe source size with a removable failed chip and preserves surrounding input", async () => {
    const { shell, terminal } = await fixture([], [], true, undefined, {
      readText: async () => null,
      readImage: async () => ({ data: "AAAA".repeat(Math.ceil(20 * 1024 * 1024 / 3) + 1), mimeType: "image/png" }),
    });
    try {
      shell.root.editor.setText("keep draft");
      terminal.input("\u0016");
      await vi.waitFor(() => expect(shell.root.render(80).join("\n")).toContain("20 MiB"));
      expect(shell.root.editor.getText()).toMatch(/^keep draft\[📷 failed-/u);
      expect((await shell.submit(shell.root.editor.getText())).outcome).toBe("rejected");
      shell.root.editor.setText("keep draft");
      expect((await shell.submit("keep draft")).outcome).toBe("completed");
    } finally { await shell.dispose(); }
  });

  it("does not turn a suppressed drag into selection when content arrives", async () => {
    const { shell, terminal, engine, adapter } = await fixture([], [], true);
    try {
      terminal.input("\u001b[<0;4;2M");
      const message = { role: "assistant", content: [{ type: "text", text: "new selectable content" }], timestamp: 1 };
      engine.session.emit({ type: "message_end", message });
      await adapter.flushEvents();
      shell.runtime.renderNow();
      const start = terminal.writes.length;
      terminal.input("x\u001b[<32;15;3M\u001b[<35;15;3M\u001b[<0;15;3my");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.editor.getText()).toBe("xy");
      const output = terminal.writes.slice(start).join("");
      expect(output).not.toContain("Copied!");
      expect(output).not.toContain("\u001b]52;c;");
      expect(shell.root.hasActiveSelection()).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each(["exit-render", "unbind-error", "unbind-stall"])("restores the terminal despite %s during disposal", async failure => {
    const { shell, terminal, adapter } = await fixture([], [], true);
    if (failure === "exit-render") vi.spyOn(shell.root, "exitTranscript").mockImplementation(() => { throw new Error("render failed"); });
    else vi.spyOn(adapter, "unbindExtensionUi").mockImplementation(() => failure === "unbind-stall" ? new Promise(() => {}) : Promise.reject(new Error("unbind failed")));
    await expect(shell.dispose()).rejects.toThrow("disposal failed");
    expect(terminal.active).toBe(false);
    expect(terminal.writes.join("")).toContain("\u001b[?1049l");
    expect(terminal.writes.join("")).toContain("\u001b[?1003l");
    const count = terminal.writes.length;
    await shell.dispose();
    expect(terminal.writes).toHaveLength(count);
  });

  it("never paints or copies Pi selection for an empty transcript drag", async () => {
    const { shell, terminal } = await fixture([], [], true);
    try {
      const start = terminal.writes.length;
      terminal.input("\u001b[<0;4;2M");
      terminal.input("\u001b[<32;20;5M");
      shell.runtime.renderNow();
      terminal.input("\u001b[<0;20;5m");
      await nextImmediate();
      shell.runtime.renderNow();
      const output = terminal.writes.slice(start).join("");
      expect(output).not.toContain("Copied!");
      expect(output).not.toContain("\u001b]52;c;");
      expect(output).not.toContain("\u001b[7m");
      terminal.input("still usable");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("still usable");
    } finally { await shell.dispose(); }
  });

  it("prefetches before settlement, reveals atomically at settlement, and requires Tab before Enter", async () => {
    const messages = [
      { role: "user", content: "fix it", timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "First answer" }], stopReason: "stop", timestamp: 2 },
      { role: "user", content: "continue", timestamp: 3 },
      { role: "assistant", content: [{ type: "text", text: "Shall I merge it?" }], stopReason: "stop", timestamp: 4 },
    ];
    const calls: string[] = [];
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: async request => {
        calls.push(`suggest:${request.identity.runSequence}:${request.identity.responseSequence}`);
        return { identity: request.identity, text: "go ahead and merge it" };
      },
    };
    const target = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator,
      enabled: () => true,
      onChange: () => () => {},
    });
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    await target.adapter.flushEvents();
    await nextImmediate();
    expect(calls).toEqual(["suggest:1:1"]);
    expect(stripTerminalSequences(target.shell.root.editor.render(60).join("\n"))).not.toContain("go ahead and merge it");

    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    const ghost = target.shell.root.editor.render(60).join("\n");
    expect(stripTerminalSequences(ghost)).toContain("❯ go ahead and merge it");
    expect(ghost).toContain("\u001b[2m");
    expect(target.shell.root.editor.getText()).toBe("");
    expect(target.adapter.view().status.workingMessage).toBeNull();

    target.shell.root.editor.handleInput?.("\r");
    expect(target.engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
    target.shell.root.editor.handleInput?.("\t");
    expect(target.shell.root.editor.getText()).toBe("go ahead and merge it");
    expect(target.engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
    target.shell.root.editor.handleInput?.("\r");
    await nextImmediate();
    expect(target.engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:go ahead and merge it"]);
    await target.shell.dispose();
  });

  it("reveals a still-current suggestion immediately when its result arrives after settlement", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    let finish: ((text: string) => void) | undefined;
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: request => new Promise(resolve => { finish = text => resolve({ identity: request.identity, text }); }),
    };
    const target = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator, enabled: () => true, onChange: () => () => {},
    });
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).not.toContain("run the tests");
    finish?.("run the tests");
    await nextImmediate();
    expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).toContain("❯ run the tests");
    await target.shell.dispose();
  });

  it("applies the prompt-suggestion setting live without generating retroactively", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    let settingListener: ((value: boolean) => void) | undefined;
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, text: "run the tests" })),
    };
    const target = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator,
      enabled: () => true,
      onChange: listener => { settingListener = listener; return () => { settingListener = undefined; }; },
    });
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    await nextImmediate();
    expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).toContain("run the tests");

    settingListener?.(false);
    expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).not.toContain("run the tests");
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    expect(generator.generate).toHaveBeenCalledTimes(1);

    settingListener?.(true);
    expect(generator.generate).toHaveBeenCalledTimes(1);
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    await nextImmediate();
    expect(generator.generate).toHaveBeenCalledTimes(2);
    await target.shell.dispose();
  });

  it("does not install prompt suggestions on the comparison shell even if options are supplied", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, text: "run the tests" })),
    };
    const target = await fixture(messages, [], false, undefined, undefined, undefined, undefined, {
      generator, enabled: () => true, onChange: () => () => {},
    });
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    expect(generator.generate).not.toHaveBeenCalled();
    expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).not.toContain("❯");
    await target.shell.dispose();
  });

  it("cancels pending suggestion work on typing and suppresses tool continuations and replacement input", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    let finish: ((text: string) => void) | undefined;
    let observedSignal: AbortSignal | undefined;
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: request => {
        observedSignal = request.signal;
        return new Promise(resolve => { finish = text => resolve({ identity: request.identity, text }); });
      },
    };
    const suggestionOptions = { generator, enabled: () => true, onChange: () => () => {} };
    const typing = await fixture(messages, [], true, undefined, undefined, undefined, undefined, suggestionOptions);
    typing.engine.session.emit({ type: "agent_start" });
    typing.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    await typing.adapter.flushEvents();
    typing.shell.root.editor.handleInput?.("x");
    expect(observedSignal?.aborted).toBe(true);
    finish?.("run the tests");
    await nextImmediate();
    expect(typing.shell.root.editor.getText()).toBe("x");
    expect(stripTerminalSequences(typing.shell.root.editor.render(50).join("\n"))).not.toContain("run the tests");
    await typing.shell.dispose();

    const blockedGenerator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, text: "run the tests" })),
    };
    const blocked = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator: blockedGenerator, enabled: () => true, onChange: () => () => {},
    });
    blocked.shell.root.setInputSurface({ render: () => ["replacement"], invalidate() {}, handleInput() {} });
    blocked.engine.session.emit({ type: "agent_start" });
    blocked.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    blocked.engine.session.emit({ type: "agent_settled" });
    await blocked.adapter.flushEvents();
    expect(blockedGenerator.generate).not.toHaveBeenCalled();
    await blocked.shell.dispose();

    const toolGenerator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, text: "continue" })),
    };
    const tools = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator: toolGenerator, enabled: () => true, onChange: () => () => {},
    });
    tools.engine.session.emit({ type: "agent_start" });
    tools.engine.session.emit({
      type: "message_end",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Checking" }, { type: "toolCall", id: "tool-1", name: "read", arguments: {} }],
        stopReason: "toolUse",
      },
    });
    await tools.adapter.flushEvents();
    expect(toolGenerator.generate).not.toHaveBeenCalled();
    await tools.shell.dispose();
  });

  it("coordinates rapid bare-A1 editor input into one latest-state dock frame while pinned input stays synchronous", async () => {
    const scheduler = new InputImmediateScheduler();
    const phases: Array<{ phase: string; revision: number }> = [];
    const custom = await fixture([], [], true, undefined, undefined, undefined, {
      scheduler,
      onEvent: event => phases.push(event),
    });
    await nextImmediate();
    const before = custom.shell.root.viewportCompositionEvidence();

    custom.terminal.input("a");
    custom.terminal.input("e\u0301");
    expect(custom.shell.root.editor.getText()).toBe("");
    expect(scheduler.callbacks.size).toBe(1);
    scheduler.flush();
    await nextImmediate();

    expect(custom.shell.root.editor.getText()).toBe("ae\u0301");
    expect(custom.shell.root.viewportFrameDescriptor()?.cause).toBe("dock-input");
    expect(custom.shell.root.viewportCompositionEvidence()).toEqual({
      full: before.full,
      dockOnly: before.dockOnly + 1,
    });
    expect(phases.filter(event => event.phase === "semantic-end").map(event => event.revision)).toEqual([1, 2]);
    await custom.shell.dispose();

    const pinned = await fixture();
    pinned.terminal.input("p");
    expect(pinned.shell.root.editor.getText()).toBe("p");
    await pinned.shell.dispose();
  });

  it("applies repeated owned-surface navigation in order and treats opaque extension input as a barrier", async () => {
    const scheduler = new InputImmediateScheduler();
    const custom = await fixture([], [], true, undefined, undefined, undefined, { scheduler });
    const navigation = {
      selected: 0,
      render() { return [`selected:${this.selected}`, "instructions"]; },
      handleInput(data: string) { if (data === "\u001b[B") this.selected += 1; },
      invalidate() {},
      setFocused() {},
    };
    custom.shell.root.setInputSurface(navigation);
    custom.shell.runtime.renderNow();
    const before = custom.shell.root.viewportCompositionEvidence();
    custom.terminal.input("\u001b[B");
    custom.terminal.input("\u001b[B");
    custom.terminal.input("\u001b[B");
    expect(navigation.selected).toBe(0);
    scheduler.flush();
    await nextImmediate();
    expect(navigation.selected).toBe(3);
    expect(custom.shell.root.viewportCompositionEvidence()).toEqual({ full: before.full, dockOnly: before.dockOnly + 1 });

    const opaqueInputs: string[] = [];
    const opaque = { render: () => ["opaque", "instructions"], handleInput: (data: string) => opaqueInputs.push(data), invalidate() {}, setFocused() {} };
    custom.shell.root.setInputSurface(opaque, true, "opaque");
    custom.terminal.input("x");
    expect(opaqueInputs).toEqual(["x"]);
    expect(scheduler.callbacks.size).toBe(0);
    await custom.shell.dispose();
  });

  it("forces the custom bare-A1 surface to fullscreen without changing pinned mode policy", async () => {
    const custom = await fixture([], [], true);
    expect(custom.shell.runtime.mode).toBe("fullscreen");
    await custom.shell.dispose();

    const pinned = await fixture();
    expect(pinned.shell.runtime.mode).toBe("regular");
    await pinned.shell.dispose();
  });

  it("restores fullscreen before printing the bounded final transcript", async () => {
    const { shell, terminal } = await fixture([
      { role: "user", content: [{ type: "text", text: "exit user" }] },
      { role: "assistant", content: [{ type: "text", text: "exit answer" }] },
    ], [], true);
    await shell.dispose();
    const bytes = terminal.writes.join("");
    expect(bytes.indexOf("\x1b[?1049l")).toBeGreaterThanOrEqual(0);
    expect(bytes.lastIndexOf("exit answer")).toBeGreaterThan(bytes.lastIndexOf("\x1b[?1049l"));
    expect(bytes.slice(bytes.lastIndexOf("\x1b[?1049l"))).not.toContain("\x1b[?1049h");
  });

  it("prints styled transcript and a dim compact resume hint only after restoration", async ({ onTestFinished }) => {
    const directory = await mkdtemp(join(tmpdir(), "a1-hint-"));
    onTestFinished(() => rm(directory, { recursive: true, force: true }));
    const path = join(directory, "raw-session-file.jsonl");
    await writeFile(path, "persisted session fixture");
    const { shell, engine, terminal } = await fixture([
      { role: "user", content: [{ type: "text", text: "styled exit user" }], timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "styled exit answer" }], stopReason: "stop", timestamp: 2 },
    ], [], true);
    Object.assign(engine.session, {
      sessionManager: {
        isPersisted: () => true,
        getSessionFile: () => path,
        getSessionId: () => "compact-id",
        getSessionDir: () => "D:/default/sessions",
        usesDefaultSessionDir: () => true,
      },
    });
    await shell.dispose();
    const bytes = terminal.writes.join("");
    const restored = bytes.lastIndexOf("\u001b[?1049l");
    const parent = bytes.slice(restored);
    expect(parent).toContain("\u001b[");
    expect(parent).toContain("styled exit answer");
    expect(parent).toContain("\u001b[2mTo resume this session:\u001b[22m a1 --session compact-id");
    expect(parent).not.toContain("raw-session-file.jsonl");
  });

  it("formats pinned compact resume grammar for default and custom session directories", () => {
    expect(formatSessionResumeCommand({
      sessionId: "abc123",
      sessionDir: "D:/default/sessions",
      usesDefaultSessionDir: true,
    })).toBe("a1 --session abc123");
    expect(formatSessionResumeCommand({
      sessionId: "abc123",
      sessionDir: "D:/custom session's",
      usesDefaultSessionDir: false,
    })).toBe("a1 --session-dir 'D:/custom session'\\''s' --session abc123");
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
    expect(detached.some(row => row.includes("Jump to bottom (Ctrl+End) ↓"))).toBe(true);
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
    expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("1 new message (Ctrl+End) ↓"))).toBe(true);

    engine.session.emit({ type: "message_end", message: { role: "tool", content: [{ type: "text", text: "tool result" }] } });
    await shell.backend.flushEvents();
    expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("1 new message (Ctrl+End) ↓"))).toBe(true);

    // Compatibility: v2 resumes follow at the exact agent_start boundary, which also clears
    // the completed-message count on the next frame.
    engine.session.emit({ type: "agent_start" });
    await shell.backend.flushEvents();
    expect(shell.root.render(60).every(row => !stripTerminalSequences(row).includes("new message (Ctrl+End) ↓"))).toBe(true);
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

  it.each([true, false])("paints the first editor-then-hover frame with hovered=%s", async hovered => {
    await withPiParityColorMode("truecolor", async () => {
      applyPiTheme("dark", false, "truecolor");
      const messages = Array.from({ length: 20 }, (_, index) => ({
        role: "assistant", content: [{ type: "text", text: `hover-row-${index}` }], timestamp: index + 1,
      }));
      const scheduler = new InputImmediateScheduler();
      const { shell, terminal } = await fixture(messages, [], true, undefined, undefined, undefined, { scheduler });
      try {
        terminal.resize(60, 16);
        shell.runtime.renderNow();
        const row = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
        terminal.input(`\u001b[<64;${hovered ? 1 : 30};${row}M`);
        // Invariant: setup ends here. No diagnostic render is allowed after the interleaving.
        await nextImmediate();
        const before = terminal.writes.length;
        terminal.input("x");
        terminal.input(`\u001b[<35;${hovered ? 30 : 1};${row}M`);
        await nextImmediate();
        const firstPaint = terminal.writes.findIndex((write, index) => index >= before && write.includes("\u001b[?2026h"));
        expect(firstPaint).toBeGreaterThanOrEqual(before);
        const writes = terminal.writes.slice(0, firstPaint + 1).map((data, atMs) => ({ data, atMs }));
        const cells = await replayTerminalBackgroundCells(writes, { columns: 60, rows: 16 });
        // Provenance: the oracle is the pinned dark truecolor palette, not the production hover predicate.
        expect(cells.find(cell => cell.row === row && cell.column === 30)).toMatchObject({
          mode: "rgb", color: hovered ? 0x3a3a4a : 0x282832,
        });
        const [painted] = await replayTerminalCheckpoints(writes, [{ columns: 60, rows: 16, writeEnd: writes.length }]);
        expect(painted!.rows.slice(row).some(line => line.includes("x"))).toBe(true);
        expect(shell.root.editor.getText()).toBe("x");
        const reuseBefore = shell.root.viewportCompositionEvidence();
        const settledRenders = shell.root.transcriptRenderCount();
        const nextStart = terminal.writes.length;
        terminal.input("y"); scheduler.flush(); await nextImmediate();
        expect(shell.root.viewportCompositionEvidence()).toEqual({ full: reuseBefore.full, dockOnly: reuseBefore.dockOnly + 1 });
        expect(shell.root.transcriptRenderCount()).toBe(settledRenders);
        const dockPaint = classifyTerminalPaint(terminal.writes.slice(nextStart).map((data, atMs) => ({ data, atMs })));
        expect(dockPaint.fullScreenClears).toBe(0);
        expect(dockPaint.addressedRowWrites.every(paintedRow => paintedRow > row)).toBe(true);
        const nextCells = await replayTerminalBackgroundCells(terminal.writes.map((data, atMs) => ({ data, atMs })), { columns: 60, rows: 16 });
        expect(nextCells.find(cell => cell.row === row && cell.column === 30)?.color).toBe(hovered ? 0x3a3a4a : 0x282832);
      } finally { await shell.dispose(); }
    }, { hyperlinks: false });
  });

  it.each([60, 192].flatMap(columns => ["none", "assistant", "tool"].map(stream => ({
    columns, rows: columns === 60 ? 16 : 54, stream,
  }))))("paints scroll-only hover checkpoints at $columns x $rows during $stream output", async ({ columns, rows, stream }) => {
    await withPiParityColorMode("truecolor", async () => {
      applyPiTheme("dark", false, "truecolor");
      const messages = Array.from({ length: 80 }, (_, index) => ({
        role: "assistant", content: [{ type: "text", text: `settled-hover-${index}` }], timestamp: index + 1,
      }));
      const { shell, terminal, engine, adapter } = await fixture(messages, [], true);
      const trace = new BottomHoverEvidence({ enabled: true });
      const checkpoints: Array<{ name: string; end: number; start: number; expected: boolean | null; state: BottomHoverState }> = [];
      const paintedStates = new Map<number, BottomHoverState>();
      const route = shell.root.handleViewportPreInput.bind(shell.root);
      const inputSpy = vi.spyOn(shell.root, "handleViewportPreInput").mockImplementation((data, allowWheel, now) => {
        const routed = route(data, allowWheel, now);
        trace.input(data, routed.consumed, shell.root.viewportPresentationEvidence());
        return routed;
      });
      const writeSpy = vi.spyOn(terminal, "write").mockImplementation(data => {
        terminal.writes.push(data);
        if (!data.includes("\u001b[?2026h")) return;
        const state = shell.root.viewportPresentationEvidence();
        paintedStates.set(terminal.writes.length, state);
        trace.composition(state);
      });
      let captured: string[] = [];
      try {
        terminal.resize(columns, rows);
        shell.runtime.renderNow();
        await nextImmediate();
        vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
        const tick = async (ms = 16) => { await nextImmediate(); await vi.advanceTimersByTimeAsync(ms); };
        const assistant = (text: string, stopReason = "pending") => ({
          role: "assistant", content: [{ type: "text", text }], timestamp: 900, stopReason,
        });
        if (stream !== "none") {
          engine.session.emit({ type: "agent_start" });
          engine.session.emit(stream === "assistant"
            ? { type: "message_start", message: assistant("stream begins") }
            : { type: "tool_execution_start", toolCallId: "hover-tool", toolName: "bash", args: { command: "fixture" } });
          await adapter.flushEvents(); await tick();
        }
        const row = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
        const column = Math.floor(columns / 2);
        const mouse = (code: number, x = column) => terminal.input(`\u001b[<${code};${x};${row}M`);
        let chunks = 0;
        const burst = async () => {
          if (stream === "none") return;
          for (let index = 0; index < 3; index++) {
            const text = Array.from({ length: ++chunks }, (_, line) => `stream line ${line}`).join("\n");
            engine.session.emit(stream === "assistant"
              ? { type: "message_update", message: assistant(text), assistantMessageEvent: { type: "text_delta", delta: text } }
              : { type: "tool_execution_update", toolCallId: "hover-tool", toolName: "bash", partialResult: { content: [{ type: "text", text }] } });
            await adapter.flushEvents();
          }
        };
        const checkpoint = async (name: string, expected: boolean | null, action: () => void | Promise<void>) => {
          const start = terminal.writes.length;
          await action(); await tick();
          const firstPaint = terminal.writes.findIndex((data, index) => index >= start && data.includes("\u001b[?2026h"));
          expect(firstPaint, name).toBeGreaterThanOrEqual(start);
          const end = firstPaint + 1;
          const state = paintedStates.get(end)!;
          expect(state.composedRevision, name).toBe(state.currentRevision);
          expect(state.composedPointer, name).toEqual(state.currentPointer);
          checkpoints.push({ name, end, start, expected, state });
        };
        // Invariant: no editor input; streaming bursts precede hover, wheel reports own hide/reveal.
        await checkpoint("wheel-reveal", true, () => mouse(64));
        let top = shell.root.viewportPresentationEvidence().scrollTop;
        await checkpoint("hover-leave-with-stream-pending", false, async () => { await burst(); mouse(35, 1); });
        expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
        await checkpoint("hover-enter-with-stream-pending", true, async () => { await burst(); mouse(35); });
        expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
        for (let cycle = 0; cycle < 2; cycle++) {
          await checkpoint(`stationary-hide-${cycle}`, null, () => {
            const state = shell.root.viewportPresentationEvidence();
            for (let step = 0; step < Math.ceil((state.maxScroll - state.scrollTop) / 3); step++) mouse(65);
          });
          await checkpoint(`stationary-reveal-${cycle}`, true, () => mouse(64));
        }
        if (stream !== "none") {
          // Concurrency: advance status and coalescer timers without sending another pointer report.
          await checkpoint("spinner-and-stream-flush", true, () => tick(85));
          top = shell.root.viewportPresentationEvidence().scrollTop;
          await checkpoint("completion", true, async () => {
            engine.session.emit(stream === "assistant"
              ? { type: "message_end", message: assistant(Array.from({ length: chunks }, (_, line) => `stream line ${line}`).join("\n"), "stop") }
              : { type: "tool_execution_end", toolCallId: "hover-tool", toolName: "bash", result: { content: [{ type: "text", text: Array.from({ length: chunks }, (_, line) => `stream line ${line}`).join("\n") }] }, isError: false });
            await adapter.flushEvents();
          });
          expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
        }
        expect(shell.root.editor.getText()).toBe("");
        captured = [...terminal.writes];
      } finally {
        inputSpy.mockRestore(); writeSpy.mockRestore();
        await shell.dispose(); vi.useRealTimers();
      }
      const writes = captured.map((data, atMs) => ({ data, atMs }));
      for (const point of checkpoints) {
        const prefix = writes.slice(0, point.end);
        const cells = await replayTerminalBackgroundCells(prefix, { columns, rows });
        const target = cells.find(cell => cell.row === point.state.bottom?.row && cell.column === Math.floor(columns / 2));
        if (point.expected === null) expect(point.state.bottom, point.name).toBeNull();
        else expect(target, point.name).toMatchObject({ mode: "rgb", color: point.expected ? 0x3a3a4a : 0x282832 });
        trace.paint(point.state, point.expected === null ? null : target?.color === 0x3a3a4a);
        const damage = classifyTerminalPaint(writes.slice(point.start, point.end));
        if (point.name.startsWith("hover-")) {
          expect(damage.fullScreenClears, point.name).toBe(0);
          // Concurrency: damage from changing transcript/status rows is independent of hover.
          if (stream === "none") expect(damage.addressedRowWrites, point.name).toEqual([point.state.bottom!.row]);
        }
        const [text] = await replayTerminalCheckpoints(prefix, [{ columns, rows, writeEnd: prefix.length }]);
        if (point.expected === null) expect(text!.rows.join("\n")).not.toContain("Jump to bottom");
        else expect(text!.rows.join("\n")).toMatch(/Jump to bottom|new message/);
      }
      // Performance: replay one real hover transaction token-by-token in both synchronization modes.
      // Whole-session backgrounds above use complete-write replay; replaying every ANSI
      // token in every wheel full-frame would add irrelevant per-token timer overhead.
      const transition = checkpoints.find(point => point.name.startsWith("hover-"))!;
      const hoverWrites = writes.slice(transition.start, transition.end);
      const honored = await replayTerminalPaint(hoverWrites, { columns, rows, synchronizedUpdates: "honor" });
      const ignored = await replayTerminalPaint(hoverWrites, { columns, rows, synchronizedUpdates: "ignore" });
      expect(honored.final).toEqual(ignored.final);
      const evidence = trace.snapshot();
      expect(evidence.truncated).toBe(false);
      expect(evidence.events.some(event => event.phase === "input" && event.mouse?.kind === "motion")).toBe(true);
      expect(classifyBottomHoverFinding({ complete: !evidence.truncated, failureObserved: false,
        reportObserved: true, compositionMatches: true, paintMatches: true })).toBe("inconclusive");
    }, { hyperlinks: false });
  }, 20_000);

  it("hovers the first reappearing bottom-control frame beneath a stationary cursor", async () => {
    const messages = Array.from({ length: 20 }, (_, index) => ({
      role: "assistant", content: [{ type: "text", text: `reply ${index}` }], timestamp: Date.now() + index,
    }));
    const { terminal, shell } = await fixture(messages, [], true);
    try {
      terminal.resize(60, 12);
      shell.root.render(60);
      const row = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
      const label = " Jump to bottom (Ctrl+End) ↓ ";
      const expectControl = (hovered: boolean) => {
        const frame = shell.root.render(60);
        const control = frame.find(line => stripTerminalSequences(line).includes(label));
        expect(control).toContain(piTheme().bg(hovered ? "selectedBg" : "toolPendingBg", piTheme().fg("text", label)));
      };
      const expectHidden = () => expect(shell.root.render(60).some(line => stripTerminalSequences(line).includes(label))).toBe(false);

      // Invariant: no motion report precedes the first wheel or any of these hide/reveal cycles.
      for (let cycle = 0; cycle < 3; cycle += 1) {
        terminal.input(`\u001b[<64;30;${row}M`);
        expectControl(true);
        expect(shell.root.viewportFrameDescriptor()!.followingEnd).toBe(false);
        terminal.input(`\u001b[<65;30;${row}M`);
        expectHidden();
      }
      terminal.input("\u001b[1;5H");
      await nextImmediate();
      expectControl(true);
      terminal.input(`\u001b[<0;30;${row}M`);
      expectHidden();
      terminal.input(`\u001b[<0;30;${row}m`);
      // Invariant: an unclaimed non-motion report while hidden replaces the remembered position.
      terminal.input(`\u001b[<1;1;${row}M`);
      terminal.input("\u001b[1;5H");
      await nextImmediate();
      expectControl(false);
      terminal.input(`\u001b[<0;1;${row}M`);
      terminal.input(`\u001b[<0;1;${row}m`);
      expectControl(false);
      expect(shell.root.viewportFrameDescriptor()!.followingEnd).toBe(false);

      // Invariant: hover updates must survive the next same-height dock-only presentation.
      terminal.input(`\u001b[<35;30;${row}M`);
      expectControl(true);
      const before = shell.root.viewportCompositionEvidence();
      terminal.input("x");
      await nextImmediate();
      expect(shell.root.viewportCompositionEvidence().dockOnly).toBeGreaterThan(before.dockOnly);
      expectControl(true);
      terminal.input(`\u001b[<35;1;${row}M`);
      expectControl(false);
    } finally {
      await shell.dispose();
    }
  });

  it("reconciles bottom hover with dock movement and terminal resize without new pointer reports", async () => {
    const messages = Array.from({ length: 20 }, (_, index) => ({
      role: "assistant", content: [{ type: "text", text: `reply ${index}` }], timestamp: Date.now() + index,
    }));
    const { terminal, shell } = await fixture(messages, [], true);
    try {
      terminal.resize(60, 16);
      shell.root.render(60);
      const row = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
      const label = " Jump to bottom (Ctrl+End) ↓ ";
      const expectControl = (width: number, hovered: boolean) => {
        const frame = shell.root.render(width);
        const control = frame.find(line => stripTerminalSequences(line).includes(label));
        expect(control).toContain(piTheme().bg(hovered ? "selectedBg" : "toolPendingBg", piTheme().fg("text", label)));
      };
      terminal.input(`\u001b[<64;30;${row}M`);
      expectControl(60, true);
      shell.root.editor.setText("one\ntwo\nthree");
      expectControl(60, false);
      shell.root.editor.setText("");
      expectControl(60, true);
      terminal.resize(100, 16);
      expectControl(100, false);
      terminal.resize(60, 16);
      expectControl(60, true);
    } finally {
      await shell.dispose();
    }
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

  it("keeps transcript links dotted and non-interactive while LMB selection is held", async () => {
    await withPinnedHyperlinks(async () => {
      const label = "package.json";
      const target = "file:///D:/work/package.json";
      const { terminal, shell } = await fixture([
        { role: "assistant", content: [{ type: "text", text: `[${label}](${target})` }], timestamp: Date.now() },
      ], [], true);
      terminal.resize(100, 12);
      const initial = shell.root.render(100);
      const rowIndex = initial.findIndex(line => stripTerminalSequences(line).includes(label));
      const plain = stripTerminalSequences(initial[rowIndex] ?? "");
      const start = plain.indexOf(label) + 1;
      const end = start + label.length - 1;
      const row = rowIndex + 1;

      terminal.input(`\u001b[<0;${start};${row}M`);
      const held = shell.root.render(100)[rowIndex] ?? "";
      expect(held).not.toContain(`\u001b]8;;${target}\u001b\\`);
      expect(held).toContain("\u001b[4:4m");
      expect(held).toContain("p\uFE0Eackage.json");
      expect(getPinnedPiTuiLinkAtColumn(held, start - 1)).toBeUndefined();

      terminal.input(`\u001b[<32;${end + 1};${row}M`);
      terminal.input(`\u001b[<0;${end + 1};${row}m`);
      const released = shell.root.render(100)[rowIndex] ?? "";
      expect(released).toContain(`\u001b]8;;${target}\u001b\\`);
      terminal.input("\u0003");
      expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from(label).toString("base64")}\u0007`);
      await shell.dispose();
    });
  });

  it("keeps file hyperlinks cyan while web URLs use link blue", async () => {
    // Compatibility: the dark theme's accent and mdLink colors both quantize to ANSI 256 color
    // 109, so use truecolor when asserting which semantic color was selected.
    const themeName = piTheme().name ?? "dark";
    const themeMode = piTheme().getColorMode();
    applyPiTheme(themeName, false, "truecolor");
    try {
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
    } finally {
      applyPiTheme(themeName, false, themeMode);
    }
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

    const firstRowIndex = rows.findIndex(line => stripTerminalSequences(line).includes(first));
    const firstColumn = stripTerminalSequences(rows[firstRowIndex] ?? "").indexOf(first) + 1;
    shell.runtime.renderNow();
    const redrawsBeforeHover = shell.runtime.fullRedraws;
    terminal.input(`\u001b[<35;${firstColumn};${firstRowIndex + 1}M`);
    shell.runtime.renderNow();
    expect(shell.runtime.fullRedraws).toBe(redrawsBeforeHover);
    terminal.input(`\u001b[<35;1;${firstRowIndex + 1}M`);
    shell.runtime.renderNow();
    expect(shell.runtime.fullRedraws).toBe(redrawsBeforeHover);
    expect(shell.damagePresentationDecision()).toMatchObject({ reason: "hyperlink-cleanup", paintedRows: [firstRowIndex + 1] });

    terminal.input(`\u001b[<35;${firstColumn};${firstRowIndex + 1}M`);
    shell.runtime.renderNow();
    const redrawsBeforeShift = shell.runtime.fullRedraws;
    shell.root.appendWorkflowStatus("shift link away ".repeat(300));
    shell.runtime.requestRender();
    shell.runtime.renderNow();
    shell.runtime.renderNow();
    expect(shell.runtime.fullRedraws).toBe(redrawsBeforeShift);
    await shell.dispose();
  });

  it.each(["wheel", "keyboard", "scrollbar"] as const)("preserves a complete same-frame hyperlink cleanup during %s navigation", async navigation => {
    await withPinnedHyperlinks(async () => {
      for (const mode of ["explicit", "auto-detected"] as const) {
        const label = mode === "explicit" ? "hover-label" : "file:///C:/work/ghost-source.ts";
        const source = mode === "explicit" ? `[${label}](https://example.test/target)` : `\`${label}\``;
        const { terminal, shell } = await fixture([{
          role: "assistant", content: [{ type: "text", text: [source, ...Array.from({ length: 140 }, (_, index) => `plain row ${index}`)].join("\n\n") }], timestamp: 1,
        }], [], true);
        try {
          terminal.resize(192, 54);
          shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "normal" });
          shell.runtime.renderNow();
          terminal.input("\u001b[1;5H");
          shell.runtime.renderNow();
          const initial = shell.root.render(192);
          const row = initial.findIndex(line => stripTerminalSequences(line).includes(label));
          expect(row).toBeGreaterThanOrEqual(0);
          const column = stripTerminalSequences(initial[row]!).indexOf(label);
          if (mode === "auto-detected") expect(getPinnedPiTuiLinkAtColumn(initial[row]!, column)).toBeUndefined();
          terminal.input(`\u001b[<35;${column + 2};${row + 1}M`);
          shell.runtime.renderNow();
          const before = terminal.writes.length;
          if (navigation === "wheel") terminal.input("\u001b[<65;5;3M");
          else if (navigation === "keyboard") terminal.input("\u001b[1;5F");
          else {
            const bottom = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
            terminal.input(`\u001b[<0;192;${bottom}M\u001b[<0;192;${bottom}m`);
          }
          shell.runtime.renderNow();
          const paints = terminal.writes.slice(before).filter(write => write.includes("\u001b[?2026h"));
          expect(paints.length).toBeGreaterThan(0);
          const damage = classifyTerminalPaint(paints.map((data, atMs) => ({ data, atMs })));
          expect(damage.fullScreenClears).toBe(0);
          expect(damage.synchronizedUpdates.balanced).toBe(true);
          expect(damage.addressedRowWrites).toContain(row + 1);
          const viewportEnd = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
          expect(damage.addressedRowWrites.every(painted => painted <= viewportEnd)).toBe(true);
          const expected = shell.root.render(192).map(line => stripTerminalSequences(line).trimEnd());
          const replay = await replayTerminalPaint(terminal.writes.map((data, atMs) => ({ data, atMs })), {
            columns: 192, rows: 54, synchronizedUpdates: "honor",
          });
          expect(replay.final.rows.map(line => line.trimEnd())).toEqual(expected);
          expect(expected.some(line => line.includes(label))).toBe(false);
          expect(paints.at(-1)).not.toContain("https://example.test/target");
        } finally { await shell.dispose(); }
      }
    });
  });

  it("cleans a link covered by a downstream overlay and restores its actual target on close", async () => {
    await withPinnedHyperlinks(async () => {
      const { terminal, shell } = await fixture([{
        role: "assistant", content: [{ type: "text", text: "[hover-label](https://example.test/target)" }], timestamp: 1,
      }], [], true);
      try {
        terminal.resize(192, 54);
        shell.runtime.renderNow();
        const before = terminal.writes.length;
        const overlay = shell.runtime.showOverlay({
          render: width => Array.from({ length: 50 }, () => "covered".padEnd(width)), invalidate() {},
        }, { anchor: "top-left", width: 192 });
        shell.runtime.renderNow();
        const overlayWrites = terminal.writes.slice(before);
        expect(overlayWrites.some(write => write.includes("\u001b[2J"))).toBe(false);
        const cleanup = overlayWrites.find(write => write.includes("covered"));
        expect(cleanup).toBeDefined();
        expect(cleanup).toContain("covered");
        expect(cleanup).not.toContain("https://example.test/target");
        overlay.hide();
        shell.runtime.renderNow();
        expect(terminal.writes.at(-1)).toContain("https://example.test/target");
      } finally { await shell.dispose(); }
    });
  });

  it("coalesces followed streaming into a latest-state cleanup without waiting for mouse motion", async () => {
    const { engine, adapter, terminal, shell } = await fixture([], [], true);
    const assistant = (text: string) => ({ role: "assistant", content: [{ type: "text", text }], stopReason: "pending", timestamp: 5 });
    try {
      terminal.resize(192, 54);
      const first = "https://example.test/streaming";
      engine.session.emit({ type: "message_start", message: assistant(first) });
      await adapter.flushEvents();
      shell.runtime.renderNow();
      const before = terminal.writes.length;
      const tail = Array.from({ length: 90 }, (_, index) => `latest row ${index}`).join("\n\n");
      engine.session.emit({ type: "message_update", message: assistant(`${first}\n\n${tail}`), assistantMessageEvent: { delta: `\n\n${tail}` } });
      await adapter.flushEvents();
      shell.runtime.renderNow();
      const changed = terminal.writes.slice(before);
      expect(changed.some(write => write.includes("\u001b[2J"))).toBe(false);
      expect(changed.some(write => write.includes("latest row 89"))).toBe(true);
      expect(shell.root.render(192).join("\n")).not.toContain(first);
      const settled = terminal.writes.length;
      await nextImmediate();
      expect(terminal.writes.slice(settled).some(write => write.includes(first))).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each([[20, false], [500, false], [20, true], [500, true]] as const)(
    "keeps dock input bounded with %i settled paragraphs (linked=%s)", async (paragraphs, linked) => {
      const scheduler = new InputImmediateScheduler();
      const content = [...Array.from({ length: paragraphs }, (_, index) => `settled paragraph ${index}`),
        linked ? "https://example.test/visible-tail" : "plain visible tail"].join("\n\n");
      const { terminal, shell } = await fixture([{
        role: "assistant", content: [{ type: "text", text: content }], timestamp: 1,
      }], [], true, undefined, undefined, undefined, { scheduler });
      try {
        terminal.resize(192, 54);
        shell.runtime.renderNow();
        await nextImmediate();
        const compositions = shell.root.viewportCompositionEvidence();
        const blocks = shell.root.transcriptRenderCount();
        const before = terminal.writes.length;
        terminal.input("a"); terminal.input("b"); terminal.input("c");
        scheduler.flush();
        await nextImmediate();
        expect(shell.root.editor.getText()).toBe("abc");
        expect(shell.root.transcriptRenderCount()).toBe(blocks);
        expect(shell.root.viewportCompositionEvidence()).toEqual({ full: compositions.full, dockOnly: compositions.dockOnly + 1 });
        const frames = terminal.writes.slice(before).filter(write => write.includes("\u001b[?2026h"));
        expect(frames.some(write => write.includes("\u001b[2J"))).toBe(false);
        const dockStart = shell.root.viewportFrameDescriptor()!.dock!.rowStart;
        for (const write of frames) {
          const painted = classifyTerminalPaint([{ data: write, atMs: 0 }]).addressedRowWrites;
          expect(painted.every(row => row >= dockStart)).toBe(true);
        }
      } finally { await shell.dispose(); }
    },
  );

  it("preserves semantic link copy and cleanup through selection edge auto-scroll and release", async () => {
    const url = "https://example.test/source";
    const { terminal, shell } = await fixture(Array.from({ length: 40 }, (_, index) => ({
      role: "assistant", content: [{ type: "text", text: `selection row ${index} ${url}` }], timestamp: index + 1,
    })), [], true);
    try {
      terminal.resize(100, 20);
      shell.runtime.renderNow();
      terminal.input("\u001b[<0;5;3M");
      terminal.input("\u001b[<32;5;1M");
      shell.runtime.renderNow();
      const before = shell.root.viewportFrameDescriptor()!.nextDocumentRange.start;
      await new Promise(resolve => setTimeout(resolve, 75));
      shell.runtime.renderNow();
      expect(shell.root.viewportFrameDescriptor()!.nextDocumentRange.start).toBeLessThan(before);
      expect(shell.root.hasActiveSelection()).toBe(true);
      const releaseStart = terminal.writes.length;
      terminal.input("\u001b[<0;5;1m");
      shell.runtime.renderNow();
      const releaseWrites = terminal.writes.slice(releaseStart);
      expect(releaseWrites.some(write => write.includes("\u001b[2J"))).toBe(false);
      const release = releaseWrites.find(write => write.includes(`\u001b]8;;${url}\u001b\\`));
      expect(release).toContain(`\u001b]8;;${url}\u001b\\`);
      expect(release).not.toContain("\uFE0E");
      terminal.input("\u0003");
      const copyWrite = terminal.writes.findLast(write => write.startsWith("\u001b]52;c;"));
      expect(copyWrite).toBeDefined();
      const copied = Buffer.from(copyWrite!.slice("\u001b]52;c;".length, -1), "base64").toString("utf8");
      expect(copied).toContain(url);
      expect(copied).toContain("selection row");
      expect(copied).not.toContain("\u001b");
      expect(copied).not.toContain("\uFE0E");
    } finally { await shell.dispose(); }
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

  it("keeps an overflowing Working status in the scrollable tail while transcript text scrolls", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `Status transcript ${index}` }],
      timestamp: Date.now() + index,
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    try {
      terminal.resize(60, 12);
      engine.session.emit({ type: "agent_start" });
      await shell.backend.flushEvents();
      const workingFrame = shell.root.render(60);
      const workingRowIndex = workingFrame.findIndex(row => stripTerminalSequences(row).includes("Working"));
      const workingColumn = stripTerminalSequences(workingFrame[workingRowIndex] ?? "").indexOf("Working") + 1;
      expect(workingRowIndex).toBeGreaterThanOrEqual(0);
      expect(workingRowIndex).toBe(shell.root.viewportFrameDescriptor()!.transcript!.rowEnd - 1);
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
      const wheelWrites = terminal.writes.slice(writesBeforeWheel);
      expect(wheelWrites.length).toBeGreaterThan(0);
      expect(wheelWrites.some(write => write.includes("\u001b[2K"))).toBe(true);
      expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("Working"))).toBe(false);
      terminal.input("\u001b[1;5F");
      shell.runtime.renderNow();
      expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("Working"))).toBe(true);
    } finally {
      await shell.dispose();
    }
  });

  it("keeps Pi's queued steering order in the transient tail and scrolls it with Working", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: "assistant",
      content: [{ type: "text", text: `queue-transcript-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    try {
      terminal.resize(60, 18);
      engine.session.emit({ type: "agent_start" });
      engine.session.emit({ type: "queue_update", steering: ["first", "second"], followUp: [] });
      await shell.backend.flushEvents();

      const rows = shell.root.render(60).map(row => stripTerminalSequences(row));
      const first = rows.findIndex(row => row.includes("Steering: first"));
      const second = rows.findIndex(row => row.includes("Steering: second"));
      const hint = rows.findIndex(row => row.includes("Alt+Up to edit all queued messages"));
      const working = rows.findIndex(row => row.includes("Working"));
      const viewportEnd = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd - 1;
      expect(first).toBeGreaterThanOrEqual(0);
      expect(second).toBeGreaterThan(first);
      expect(hint).toBeGreaterThan(second);
      expect(working).toBeGreaterThan(hint);
      expect(working).toBe(viewportEnd);

      for (let index = 0; index < 6; index += 1) terminal.input("\u001b[<64;30;1M");
      const detached = shell.root.render(60).map(row => stripTerminalSequences(row));
      expect(detached.some(row => row.includes("Steering: first"))).toBe(false);
      expect(detached.some(row => row.includes("Steering: second"))).toBe(false);
      expect(detached.some(row => row.includes("Alt+Up to edit all queued messages"))).toBe(false);
      expect(detached.some(row => row.includes("Working"))).toBe(false);
      expect(detached.some(row => row.includes("Jump to bottom (Ctrl+End) ↓"))).toBe(true);
      terminal.input("\u001b[1;5F");
      const followed = shell.root.render(60).map(row => stripTerminalSequences(row));
      expect(followed.some(row => row.includes("Steering: first"))).toBe(true);
      expect(followed.some(row => row.includes("Working"))).toBe(true);
    } finally {
      await shell.dispose();
    }
  });

  it("keeps Working bottom-aligned while fitting and keeps true dock rows stable at overflow", async () => {
    const { engine, terminal, shell } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "fitting transcript" }], timestamp: 1 },
    ], [], true);
    try {
      terminal.resize(60, 18);
      const settledRows = shell.root.render(60).map(row => stripTerminalSequences(row));
      const settledTranscriptRow = settledRows.findIndex(row => row.includes("fitting transcript"));
      engine.session.emit({ type: "agent_start" });
      engine.session.emit({ type: "queue_update", steering: ["stable queue"], followUp: [] });
      await shell.backend.flushEvents();

      const positions = () => {
        const rows = shell.root.render(60).map(row => stripTerminalSequences(row));
        const descriptor = shell.root.viewportFrameDescriptor()!;
        return {
          rows,
          queue: rows.findIndex(row => row.includes("Steering: stable queue")),
          hint: rows.findIndex(row => row.includes("Alt+Up to edit all queued messages")),
          working: rows.findIndex(row => row.includes("Working")),
          viewportEnd: descriptor.transcript!.rowEnd - 1,
          dockStart: descriptor.dock!.rowStart - 1,
          alignmentGap: descriptor.transientAlignmentGapRows,
        };
      };
      const fitting = positions();
      expect(fitting.rows.findIndex(row => row.includes("fitting transcript"))).toBe(settledTranscriptRow);
      expect(fitting.queue).toBeGreaterThanOrEqual(0);
      expect(fitting.hint).toBeGreaterThan(fitting.queue);
      expect(fitting.working).toBe(fitting.viewportEnd);
      expect(fitting.working).toBeLessThan(fitting.dockStart);
      expect(fitting.alignmentGap).toBeGreaterThan(0);

      engine.session.emit({
        type: "message_start",
        message: { role: "assistant", content: [{ type: "text", text: "another fitting row" }], timestamp: 2 },
      });
      await shell.backend.flushEvents();
      const grownButFitting = positions();
      expect(grownButFitting.working).toBe(fitting.working);
      expect(grownButFitting.dockStart).toBe(fitting.dockStart);
      expect(grownButFitting.alignmentGap).toBeLessThan(fitting.alignmentGap);

      for (let index = 0; index < 16; index += 1) {
        engine.session.emit({
          type: "message_start",
          message: { role: "user", content: [{ type: "text", text: `overflow prompt ${index}` }], timestamp: 10 + index },
        });
      }
      await shell.backend.flushEvents();
      const overflowing = positions();
      expect(overflowing.dockStart).toBe(fitting.dockStart);
      expect(overflowing.alignmentGap).toBe(0);
      expect(overflowing.working).toBe(overflowing.viewportEnd);
      expect(overflowing.queue).toBeGreaterThanOrEqual(0);
      expect(overflowing.hint).toBeGreaterThan(overflowing.queue);
      expect(overflowing.rows.filter(row => row.includes("Steering: stable queue"))).toHaveLength(1);
      expect(overflowing.rows.filter(row => row.includes("Working"))).toHaveLength(1);

      engine.session.emit({ type: "queue_update", steering: [], followUp: [] });
      await shell.backend.flushEvents();
      const cleared = positions();
      expect(cleared.queue).toBe(-1);
      expect(cleared.hint).toBe(-1);
      expect(cleared.working).toBe(cleared.viewportEnd);
      expect(cleared.rows.filter(row => row.includes("Working"))).toHaveLength(1);
    } finally {
      await shell.dispose();
    }
  });

  it("keeps the live working tail current through completion, reset, and working replacements", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: "assistant",
      content: [{ type: "text", text: `tail-transcript-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    try {
      terminal.resize(60, 12);
      engine.session.emit({ type: "agent_start" });
      await shell.backend.flushEvents();
      const plainRows = () => shell.root.render(60).map(row => stripTerminalSequences(row));
      expect(plainRows().some(row => row.includes("Working..."))).toBe(true);
      shell.root.setExtensionWorking("Indexing sources");
      shell.runtime.renderNow();
      expect(plainRows().some(row => row.includes("Indexing sources..."))).toBe(true);
      expect(plainRows().some(row => row.includes("Working..."))).toBe(false);

      terminal.input("\u001b[<64;30;1M");
      shell.runtime.renderNow();
      const detached = plainRows();
      expect(detached.some(row => row.includes("Indexing sources"))).toBe(false);
      expect(detached.some(row => row.includes("Working"))).toBe(false);
      shell.root.setExtensionWorking("Still indexing");
      shell.runtime.renderNow();
      expect(plainRows().some(row => row.includes("Still indexing"))).toBe(false);
      expect(plainRows().some(row => row.includes("Indexing sources"))).toBe(false);
      terminal.input("\u001b[1;5F");
      shell.runtime.renderNow();
      expect(plainRows().some(row => row.includes("Still indexing..."))).toBe(true);

      engine.session.emit({ type: "message_end", message: {
        role: "assistant",
        content: [{ type: "text", text: "tail completion" }],
        timestamp: Date.now(),
      } });
      engine.session.emit({ type: "agent_settled" });
      await shell.backend.flushEvents();
      const completed = plainRows();
      expect(completed.some(row => row.includes("Still indexing"))).toBe(false);
      expect(completed.some(row => row.includes("Working"))).toBe(false);
      expect(engine.session.messages.some((message: unknown) =>
        String((message as { content?: Array<{ text?: unknown }> } | undefined)?.content?.[0]?.text ?? "").includes("Working")
      )).toBe(false);

      shell.root.setExtensionWorking("Indexing sources");
      terminal.input("\u001b[<64;30;1M");
      shell.runtime.renderNow();
      await engine.newSession();
      shell.runtime.renderNow();
      const replaced = plainRows();
      expect(replaced.some(row => row.includes("Indexing sources"))).toBe(false);
      expect(replaced.some(row => row.includes("Working"))).toBe(false);
      expect(replaced.some(row => row.includes("tail completion"))).toBe(false);
    } finally {
      await shell.dispose();
    }
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

  it.each([1, -1])("selects and copies adjacent transcript characters at 192x54 in direction %i", async direction => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "One character" }], timestamp: Date.now() },
    ];
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(192, 54);
    const frame = shell.root.render(192).map(row => stripTerminalSequences(row));
    const rowIndex = frame.findIndex(row => row.includes("One character"));
    const column = (frame[rowIndex] ?? "").indexOf("character") + 1;
    const row = rowIndex + 1;

    terminal.input(`\u001b[<0;${column};${row}M`);
    terminal.input(`\u001b[<32;${column + direction};${row}M`);
    terminal.input(`\u001b[<0;${column + direction};${row}m`);
    const selected = shell.root.render(192)[rowIndex] ?? "";
    expect(selected).toContain("\u001b[48;2;38;79;120m");
    terminal.input("\u0003");
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from(direction === 1 ? "ch" : " c").toString("base64")}\u0007`);
    await shell.dispose();
  });

  it.each([1, -1])("paints return-to-anchor reversal without deselection at 192x54 (direction=%i)", async direction => {
    const { terminal, shell } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "abcde" }], timestamp: 1 },
    ], [], true);
    try {
      terminal.resize(192, 54);
      shell.runtime.renderNow();
      const frame = shell.root.render(192).map(row => stripTerminalSequences(row));
      const rowIndex = frame.findIndex(row => row.includes("abcde"));
      expect(rowIndex).toBeGreaterThanOrEqual(0);
      const column = frame[rowIndex]!.indexOf("abcde") + 3;
      const row = rowIndex + 1;
      const selectedCells = async () => (await replayTerminalBackgroundCells(
        terminal.writes.map((data, atMs) => ({ data, atMs })),
        { columns: 192, rows: 54 },
      )).filter(cell => cell.mode === "rgb" && cell.color === 0x264f78)
        .map(cell => ({ row: cell.row, column: cell.column }));

      terminal.input(`\u001b[<0;${column};${row}M`);
      shell.runtime.renderNow();
      expect(await selectedCells()).toEqual([]);
      for (const offset of [direction, 0, -direction, 0, 0]) {
        // Protocol: preserve the held selection through no-button motion reports as well.
        terminal.input(`\u001b[<35;${column + offset};${row}M`);
        shell.runtime.renderNow();
        expect(shell.root.hasActiveSelection()).toBe(true);
        expect(await selectedCells()).toEqual(Array.from({ length: Math.abs(offset) + 1 }, (_, index) => ({
          row, column: column + Math.min(0, offset) + index,
        })));
      }
      terminal.input(`\u001b[<0;${column};${row}m`);
      shell.runtime.renderNow();
      expect(await selectedCells()).toEqual([{ row, column }]);
      terminal.input("\u0003");
      shell.runtime.renderNow();
      expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("c").toString("base64")}\u0007`);
      expect(shell.root.hasActiveSelection()).toBe(false);
      expect(await selectedCells()).toEqual([]);
    } finally {
      await shell.dispose();
    }
  });

  it.each([false, true])("paints and copies both multiline block endpoints at 192x54 (reverse=%s)", async reverse => {
    const { terminal, shell } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "```\nabcd\nefgh\n```" }], timestamp: 1 },
    ], [], true);
    try {
      terminal.resize(192, 54);
      shell.runtime.renderNow();
      const frame = shell.root.render(192).map(row => stripTerminalSequences(row));
      const firstRow = frame.findIndex(row => row.trim() === "abcd") + 1;
      const lastRow = frame.findIndex(row => row.trim() === "efgh") + 1;
      expect(firstRow).toBeGreaterThan(0);
      expect(lastRow).toBe(firstRow + 1);
      const firstColumn = frame[firstRow - 1]!.indexOf("abcd") + 1;
      const lastColumn = frame[lastRow - 1]!.indexOf("efgh") + 4;
      const start = reverse ? [lastColumn, lastRow] : [firstColumn, firstRow];
      const end = reverse ? [firstColumn, firstRow] : [lastColumn, lastRow];
      terminal.input(`\u001b[<0;${start[0]};${start[1]}M`);
      terminal.input(`\u001b[<32;${end[0]};${end[1]}M`);
      terminal.input(`\u001b[<0;${end[0]};${end[1]}m`);
      shell.runtime.renderNow();
      const cells = (await replayTerminalBackgroundCells(
        terminal.writes.map((data, atMs) => ({ data, atMs })),
        { columns: 192, rows: 54 },
      )).filter(cell => cell.mode === "rgb" && cell.color === 0x264f78)
        .map(cell => ({ row: cell.row, column: cell.column }));
      expect(cells).toEqual([
        ...Array.from({ length: 193 - firstColumn }, (_, index) => ({ row: firstRow, column: firstColumn + index })),
        ...Array.from({ length: lastColumn }, (_, index) => ({ row: lastRow, column: index + 1 })),
      ]);
      terminal.input("\u0003");
      const clipboardWrite = terminal.writes.findLast(write => write.startsWith("\u001b]52;c;"));
      expect(clipboardWrite).toBeDefined();
      // Invariant: preserve the code renderer's source-row indentation, but not viewport right padding.
      expect(Buffer.from(clipboardWrite!.slice(7, -1), "base64").toString("utf8")).toBe("abcd\n   efgh");
      expect(shell.root.hasActiveSelection()).toBe(false);
    } finally {
      await shell.dispose();
    }
  });

  it.each([
    ["\u001b[H", "\u001b[F"], ["\u001bOH", "\u001bOF"],
    ["\u001b[1~", "\u001b[4~"], ["\u001b[7~", "\u001b[8~"],
    ["\u001b[1;1H", "\u001b[1;1F"], ["\u001b[1;1:1H", "\u001b[1;1:1F"],
  ])("keeps Home/End and A1 editing aliases in the prompt (%j, %j)", async (home, end) => {
    const { terminal, shell } = await fixture([], [], true);
    try {
      terminal.resize(60, 12);
      shell.root.render(60);
      shell.root.editor.setText("alpha beta");
      terminal.input(home); terminal.input("start ");
      terminal.input(end); terminal.input(" end");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("start alpha beta end");
      terminal.input("\u001b[127;5u");
      expect(shell.root.editor.getText()).toBe("start alpha beta ");
      terminal.input(home); terminal.input("\u001b[3;5~");
      expect(shell.root.editor.getText()).toBe(" alpha beta ");
      terminal.input("\u001a");
      expect(shell.root.editor.getText()).toBe("start alpha beta ");
    } finally { await shell.dispose(); }
  });

  it("paints standalone prompt Home/End without requiring subsequent typing", async () => {
    const { terminal, shell } = await fixture([], [], true);
    try {
      terminal.resize(60, 12);
      shell.root.editor.setText("standalone cursor movement");
      shell.runtime.renderNow();
      const atEnd = shell.root.editor.render(60);
      for (const input of ["\u001b[H", "\u001b[F"]) {
        const before = terminal.writes.length;
        terminal.input(input);
        await vi.waitFor(() => expect(terminal.writes.length).toBeGreaterThan(before));
        expect(shell.root.editor.getText()).toBe("standalone cursor movement");
        if (input.endsWith("H")) expect(shell.root.editor.render(60)).not.toEqual(atEnd);
        else expect(shell.root.editor.render(60)).toEqual(atEnd);
      }
    } finally { await shell.dispose(); }
  });

  it.each(["first\nmiddle line\nlast", "one long logical line that wraps across several terminal rows"])("uses logical prompt boundaries without navigating detached content: %s", async draft => {
    const { terminal, shell } = await fixture(Array.from({ length: 20 }, (_, index) => ({
      role: "assistant", content: [{ type: "text", text: `content-${index}` }], timestamp: index + 1,
    })), [], true);
    try {
      terminal.resize(30, 16);
      shell.root.editor.setText(draft);
      shell.root.render(30);
      terminal.input("\u001b[1;5H");
      shell.root.render(30);
      if (draft.includes("\n")) terminal.input("\u001b[A");
      const before = shell.root.viewportFrameDescriptor()!;
      terminal.input("\u001b[H"); terminal.input("!");
      terminal.input("\u001b[F"); terminal.input("?");
      await nextImmediate();
      shell.root.render(30);
      expect(shell.root.editor.getText()).toBe(draft.includes("\n") ? "first\n!middle line?\nlast" : `!${draft}?`);
      expect(shell.root.viewportFrameDescriptor()!.nextDocumentRange.start).toBe(before.nextDocumentRange.start);
      expect(shell.root.viewportFrameDescriptor()!.followingEnd).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each([
    ["\u001b[1;5H", "\u001b[1;5F"], ["\u001b[7;5~", "\u001b[8;5~"],
    ["\u001b[1;5:1H", "\u001b[1;5:1F"],
  ])("navigates content with Ctrl+Home/End while preserving the draft and cursor (%j, %j)", async (home, end) => {
    for (const length of [0, 1, 20]) {
      const { terminal, shell, engine } = await fixture(Array.from({ length }, (_, index) => ({
        role: "assistant", content: [{ type: "text", text: `content-${index}` }], timestamp: index + 1,
      })), [], true);
      try {
        terminal.resize(60, 12);
        shell.root.editor.setText("keep this draft");
        terminal.input("\u001b[D");
        await nextImmediate();
        shell.root.render(60);
        const cursor = shell.root.editor.render(60);
        for (let press = 0; press < 2; press += 1) {
          terminal.input(home); shell.root.render(60);
          expect(shell.root.viewportFrameDescriptor()!.nextDocumentRange.start).toBe(0);
          expect(shell.root.editor.render(60)).toEqual(cursor);
        }
        if (length === 20) {
          engine.session.emit({ type: "message_start", message: {
            role: "assistant", content: [{ type: "text", text: "new streamed content" }], timestamp: 50,
          } });
          await shell.backend.flushEvents();
          shell.root.render(60);
          expect(shell.root.viewportFrameDescriptor()!.nextDocumentRange.start).toBe(0);
          expect(shell.root.viewportFrameDescriptor()!.followingEnd).toBe(false);
        }
        for (let press = 0; press < 2; press += 1) {
          terminal.input(end); shell.root.render(60);
          expect(shell.root.viewportFrameDescriptor()!.followingEnd).toBe(true);
          expect(shell.root.editor.render(60)).toEqual(cursor);
        }
        terminal.input("!");
        await nextImmediate();
        expect(shell.root.editor.getText()).toBe("keep this draf!t");
      } finally { await shell.dispose(); }
    }
  });

  it.each(["\u001b[1;2H", "\u001b[1;3F", "\u001b[1;6H", "\u001b[1;7F"])("does not confuse additional modifiers with content shortcuts: %j", async data => {
    const { shell } = await fixture([], [], true);
    try { expect(shell.root.handleViewportPreInput(data)).toEqual({ data, consumed: false }); }
    finally { await shell.dispose(); }
  });

  it.each(["replacement", "overlay"])("leaves boundary shortcuts with the active %s", async surfaceKind => {
    const { terminal, shell } = await fixture([], [], true);
    try {
      const received: string[] = [];
      const surface = { render: () => ["active selector/dialog"], invalidate() {}, handleInput: (data: string) => { received.push(data); } };
      if (surfaceKind === "replacement") shell.root.setInputSurface(surface);
      else shell.runtime.showOverlay(surface, { anchor: "top-left", width: 30 });
      const inputs = ["\u001b[H", "\u001b[F", "\u001b[1;5H", "\u001b[1;5F"];
      for (const input of inputs) terminal.input(input);
      expect(received).toEqual(inputs);
    } finally { await shell.dispose(); }
  });

  it("keeps comparison Ctrl+Home/End editor bindings unchanged", async () => {
    const { terminal, shell } = await fixture();
    try {
      shell.root.editor.setText("draft");
      terminal.input("\u001b[1;5H"); terminal.input("start ");
      terminal.input("\u001b[1;5F"); terminal.input(" end");
      expect(shell.root.editor.getText()).toBe("start draft end");
    } finally { await shell.dispose(); }
  });

  it.each([false, true])("shows the effective boundary shortcuts in hotkeys (custom=%s)", async custom => {
    const { terminal, shell } = await fixture([], [], custom);
    try {
      terminal.resize(160, 100);
      shell.root.appendWorkflowResult({ command: "hotkeys", outcome: "completed", message: "" });
      const text = stripTerminalSequences(shell.root.render(160).join("\n"));
      expect(text.includes("Start of content")).toBe(custom);
      expect(text.includes("Start of prompt line")).toBe(custom);
      expect(text).toContain("Ctrl+Home");
    } finally { await shell.dispose(); }
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

    terminal.input("\u0001"); // Protocol: Ctrl+A
    expect(shell.root.render(60).join("\n")).toContain("\u001b[48;2;38;79;120m");
    terminal.input("\u0003"); // Protocol: Ctrl+C
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("alpha beta").toString("base64")}\u0007`);
    expect(shell.root.render(60).join("\n")).not.toContain("\u001b[48;2;38;79;120m");

    terminal.input("\u0001"); // Invariant: select again because copying collapses the selection.
    terminal.input("\u0018"); // Protocol: Ctrl+X
    expect(shell.root.editor.getText()).toBe("");
    terminal.input("\u001a"); // Protocol: Ctrl+Z
    expect(shell.root.editor.getText()).toBe("alpha beta");
    terminal.input("\u0019"); // Protocol: Ctrl+Y
    expect(shell.root.editor.getText()).toBe("");

    terminal.input("\u0016"); // Concurrency: Ctrl+V immediately follows copying or cutting.
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
    terminal.input("\u001b[1;2D"); // Protocol: Shift+Left selects d.
    terminal.input("\u001b[1;2D"); // Protocol: Shift+Left extends selection to cd.
    terminal.input("\u001b[1;2C"); // Protocol: Shift+Right shrinks selection to d.
    terminal.input("\u0003");
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("d").toString("base64")}\u0007`);

    terminal.input("X");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe("abcdX");
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toBe("abcd");

    await shell.dispose();
  });

  it("pastes URLs and clipboard images as atomic chips and expands them for copy and submission", async () => {
    let clipboardText = "https://example.com/a/very/useful/resource";
    let clipboardImage: { readonly data: string; readonly mimeType: string } | null = null;
    const { engine, adapter, terminal, shell } = await fixture([], [], true, undefined, {
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

    terminal.input("\u001b[D"); // Invariant: Left focuses the adjacent chip as one item.
    await nextImmediate();
    const focusedChip = shell.root.render(60).find(row => stripTerminalSequences(row).includes("https://example.com")) ?? "";
    expect(focusedChip).toContain("\u001b[7m");
    expect(focusedChip).toContain("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\");
    expect(focusedChip).not.toContain(CURSOR_MARKER);
    expect(stripTerminalSequences(focusedChip)).toContain(urlChip);
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe("https://example.com/a/very/useful/resource"));
    const writesBeforeChipDelete = terminal.writes.length;
    terminal.input("\u007f");
    await nextImmediate();
    shell.runtime.renderNow();
    const chipDeletionWrites = terminal.writes.slice(writesBeforeChipDelete);
    // Invariant: deleting the last chip overwrites its former link row in the current
    // transaction without clearing unrelated transcript rows.
    expect(chipDeletionWrites.some(write => write.includes("\u001b[2J"))).toBe(false);
    const cleanupWrites = chipDeletionWrites.filter(write => write.includes("\u001b[2K"));
    expect(cleanupWrites.length).toBeGreaterThan(0);
    expect(cleanupWrites.every(write => write.startsWith("\u001b[?2026h") && write.endsWith("\u001b[?2026l"))).toBe(true);
    expect(chipDeletionWrites.some(write => write.includes("\u001b[2K"))).toBe(true);
    expect(shell.root.editor.getText()).toBe("");
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toContain("[🔗 https://example.com/");

    terminal.input("\u001b[1;5C"); // Invariant: Ctrl+Right treats the chip as one item.
    await nextImmediate();
    expect(shell.root.render(60).join("\n")).toContain("\u001b[7m");
    terminal.input("\u001b[1;5C"); // Invariant: collapse at the chip's far edge.
    terminal.input("\u001b[1;5D"); // Invariant: Ctrl+Left selects the whole chip, never its interior.
    await nextImmediate();
    expect(shell.root.render(60).join("\n")).toContain("\u001b[7m");
    terminal.input("\u001b[1;5D"); // Invariant: collapse at its near edge before the mouse check.
    await nextImmediate();

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
    expect(terminal.writes.slice(writesBeforeRelease).some(write => write.includes("\u001b[2J"))).toBe(false);
    expect(terminal.writes.slice(writesBeforeRelease).some(write => write.includes("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\"))).toBe(true);
    expect(draggedChip).toContain("\u001b[27m\u001b[48;2;38;79;120m");
    expect(draggedChip).toContain("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\");
    terminal.input("\u007f");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe("");

    const imageBytes = screenshotPng(16, 16, false);
    const canonicalImageData = imageBytes.toString("base64");
    clipboardImage = { data: canonicalImageData.replace(/=+$/u, ""), mimeType: "image/png" };
    shell.root.editor.setText("");
    terminal.input("\u0016");
    const imageTag = shell.root.editor.getText();
    expect(imageTag).toMatch(/^\[📷 screenshot-[a-f0-9]+\]$/u);
    await vi.waitFor(() => expect(shell.root.hasPendingPastes(imageTag)).toBe(false));
    expect(shell.root.editor.getText()).toBe(imageTag);
    terminal.input("\u001b[D");
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(imageTag));
    await shell.submit(imageTag);
    expect(engine.session.calls).toContain(`prompt:${imageTag}`);
    expect(engine.session.promptOptions.at(-1)).toMatchObject({
      images: [{ type: "image", data: canonicalImageData, mimeType: "image/png" }],
    });
    expect(Buffer.from(canonicalImageData, "base64")).toEqual(imageBytes);

    engine.session.emit({ type: "agent_start" });
    await adapter.flushEvents();
    await shell.submit(imageTag);
    expect(engine.session.promptOptions.at(-1)).toMatchObject({
      streamingBehavior: "steer",
      images: [{ type: "image", data: canonicalImageData, mimeType: "image/png" }],
    });

    shell.root.editor.setText(imageTag);
    await shell.queueFollowUp();
    expect(engine.session.promptOptions.at(-1)).toMatchObject({
      streamingBehavior: "followUp",
      images: [{ type: "image", data: canonicalImageData, mimeType: "image/png" }],
    });

    await shell.dispose();
  });

  it("falls back to text or leaves the editor unchanged for malformed clipboard images", async () => {
    let clipboardText: string | null = "text fallback";
    const readText = vi.fn(async () => clipboardText);
    const readImage = vi.fn(async () => ({ data: "data:image/png;base64,invalid!", mimeType: "image/png" }));
    const { engine, terminal, shell } = await fixture([], [], true, undefined, { readText, readImage });

    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("text fallback"));
    expect(shell.root.editor.getText()).not.toContain("[📷");
    expect(engine.session.calls.some(call => call.startsWith("prompt:"))).toBe(false);

    shell.root.editor.setText("unchanged");
    clipboardText = null;
    terminal.input("\u0016");
    await vi.waitFor(() => expect(readText).toHaveBeenCalledTimes(2));
    expect(shell.root.editor.getText()).toBe("unchanged");

    await shell.submit("unchanged");
    expect(engine.session.promptOptions.at(-1)).toBeUndefined();
    expect(readImage).toHaveBeenCalledTimes(2);
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
    await nextImmediate();

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
    await nextImmediate();
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

    terminal.input("\u001b[D"); // Invariant: focus the second chip.
    terminal.input(" "); // Invariant: insert before atomic focus; neither chip is replaced.
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe(spaced);
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(secondUrl));
    terminal.input("\u001b[C");

    shell.root.editor.setText(adjacent);
    terminal.input("\u001b[H"); // Invariant: focus the first chip through the native cursor.
    terminal.input(" ");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe(` ${adjacent}`);
    terminal.input("\u001b[C");
    terminal.input("\u001b[C");
    await nextImmediate();
    shell.root.editor.setText(adjacent);

    terminal.input("\u001b[D"); // Invariant: focus the second chip.
    terminal.input("\u001b[D"); // Invariant: the adjacent first chip is one atomic item left.
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(firstUrl));
    expect(shell.root.editor.hasSelection()).toBe(false);

    shell.root.editor.setText(adjacent);
    terminal.input("\u001b[H"); // Invariant: native editor cursor starts at the first atomic segment.
    await nextImmediate();
    expect(shell.root.editor.hasSelection()).toBe(true);
    terminal.input("\u001b[C"); // Invariant: move to the second chip rather than reselecting the first.
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(secondUrl));
    expect(shell.root.editor.hasSelection()).toBe(false);

    shell.root.editor.setText(spaced);
    terminal.input("\u001b[D"); // Invariant: focus the second chip.
    terminal.input("\u001b[D"); // Invariant: move one character left onto the separator.
    terminal.input("X");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe(spaced.replace("] [", "]X ["));

    shell.root.editor.setText(spaced);
    terminal.input("\u001b[D"); // Invariant: focus the second chip.
    terminal.input("\u001b[D"); // Protocol: separator.
    terminal.input("\u001b[D"); // Protocol: first chip.
    terminal.input("\u001b[C"); // Protocol: separator.
    terminal.input("\u001b[C"); // Protocol: second chip.
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(secondUrl));

    const imageRun = "[📷 first.png][📷 second.png][📷 third.png]";
    shell.root.editor.setText(`words ${imageRun}`);
    terminal.input("\u001b[1;5D"); // Invariant: Ctrl+Left crosses the adjacent run and stops on its separator.
    terminal.input("X");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe(`wordsX ${imageRun}`);

    shell.root.editor.setText(`words tail${imageRun}`);
    terminal.input("\u001b[1;5D"); // Invariant: an attached chip run also crosses its word to the separator.
    terminal.input("X");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe(`wordsX tail${imageRun}`);

    shell.root.editor.setText("doio ddh did d diud");
    terminal.input("\u001b[1;5D"); // Invariant: Ctrl+Left stops on the separator before an ordinary word.
    terminal.input("X");
    await nextImmediate();
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

  it("uses Ctrl+Home/End for transcript boundaries and Shift+Up/Down between prompts", async () => {
    const messages = ["one", "two", "three"].flatMap((prompt, index) => [
      { role: "user", content: [{ type: "text", text: prompt }], timestamp: Date.now() + index * 2 },
      { role: "assistant", content: [{ type: "text", text: Array.from({ length: 15 }, (_, row) => `reply-${prompt}-${row + 1}`).join("\n") }], timestamp: Date.now() + index * 2 + 1 },
    ]);
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    shell.root.editor.setText("keep this draft");
    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "normal" });
    const rows = () => shell.root.render(60).map(row => stripTerminalSequences(row));
    const top = () => rows()[0] ?? "";
    const bottomRows = rows();
    terminal.input("\u001b[1;5H");
    expect(top().trim()).toBe("");
    expect(rows()[1]).toContain("❯ one");

    terminal.input("\u001b[1;2B");
    await nextImmediate();
    expect(top()).toContain("❯ two");
    terminal.input("\u001b[1;2B");
    await nextImmediate();
    expect(top()).toContain("❯ three");
    expect(rows()).not.toEqual(bottomRows);
    terminal.input("\u001b[1;2B");
    await nextImmediate();
    expect(rows()).toEqual(bottomRows);
    expect(shell.root.editor.getText()).toBe("keep this draft");
    terminal.input("\u001b[1;2B");
    await nextImmediate();
    expect(rows()).toEqual(bottomRows);

    terminal.input("\u001b[1;2A");
    await nextImmediate();
    expect(top()).toContain("❯ three");
    expect(rows()).not.toEqual(bottomRows);
    terminal.input("\u001b[1;2A");
    await nextImmediate();
    expect(top()).toContain("❯ two");
    terminal.input("\u001b[1;2A");
    await nextImmediate();
    expect(top().trim()).toBe("");
    expect(rows()[1]).toContain("❯ one");
    terminal.input("\u001b[1;2A");
    await nextImmediate();
    expect(top().trim()).toBe("");
    expect(rows()[1]).toContain("❯ one");

    terminal.input("\u001b[1;5F");
    expect(rows()).toEqual(bottomRows);
    expect(shell.root.editor.getText()).toBe("keep this draft");

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

    // Rationale: leave enough room below for the faster direction to demonstrate its
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
    // Protocol: code 35 is motion with no button bits set.
    terminal.input(`\u001b[<35;${end + 1};${row}M`);
    terminal.input(`\u001b[<0;${end + 1};${row}m`);
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

    // Invariant: the screen is still up: ending the session has to restore the terminal anyway.
    await shell.dispose();
    expect(terminal.writes.some(write => write.includes("[?1003l"))).toBe(true);
    expect(terminal.writes.some(write => write.includes("[?1006l"))).toBe(true);
  });


  it("does not apply a queued partial after a full-view final presentation preempts it", async () => {
    const { shell, adapter, engine } = await fixture([], [], true);
    try {
      const message = { role: "assistant", timestamp: 100, content: [{ type: "text", text: "obsolete partial" }] };
      engine.session.emit({ type: "message_update", message });
      const partial = adapter.view().transcript[0]!;
      message.content[0]!.text = "complete final content";
      engine.session.emit({ type: "message_end", message });
      shell.root.update(adapter.view());
      shell.root.applyTranscriptBlock(partial);
      shell.runtime.renderNow();
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("complete final content");
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("obsolete partial");
      await adapter.flushEvents();
    } finally { await shell.dispose(); }
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
    // Invariant: the chunk went through the block it named without disturbing the order around it.
    expect(answer).toBeGreaterThan(question);
    await shell.dispose();
  });

  it("bounds custom-viewport terminal frames for a burst and flushes final content immediately", async () => {
    let now = 0;
    let nextTimer = 1;
    const scheduled = new Map<number, { readonly at: number; readonly callback: () => void }>();
    const scheduler = {
      now: () => now,
      setTimeout: (callback: () => void, delayMs: number) => {
        const timer = nextTimer++;
        scheduled.set(timer, { at: now + delayMs, callback });
        return timer as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: (timer: ReturnType<typeof setTimeout>) => { scheduled.delete(timer as unknown as number); },
    };
    const advancePresentation = (delayMs: number) => {
      now += delayMs;
      for (const [timer, task] of [...scheduled]) {
        if (task.at > now) continue;
        scheduled.delete(timer);
        task.callback();
      }
    };
    const { engine, adapter, terminal, shell } = await fixture(
      [], [], true, undefined, undefined, { scheduler },
    );
    const assistant = (text: string, stopReason = "pending") => ({
      role: "assistant",
      content: [{ type: "text", text }],
      stopReason,
      timestamp: 5,
    });
    const presentedFrames = () => terminal.writes.filter(write => write.includes("\u001b[?2026h")).length;
    shell.runtime.renderNow();
    terminal.writes.length = 0;

    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "message_start", message: assistant("one") });
    await adapter.flushEvents();
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(presentedFrames()).toBe(1);
    terminal.writes.length = 0;

    for (const text of ["one two", "one two three", "one two three four"]) {
      engine.session.emit({
        type: "message_update",
        message: assistant(text),
        assistantMessageEvent: { type: "text_delta", delta: text },
      });
      await adapter.flushEvents();
    }
    expect(presentedFrames()).toBe(0);
    advancePresentation(33);
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(presentedFrames()).toBe(1);
    expect(shell.root.render(80).join("\n")).toContain("one two three four");
    terminal.writes.length = 0;

    engine.session.emit({
      type: "message_update",
      message: assistant("one two three four five"),
      assistantMessageEvent: { type: "text_delta", delta: " five" },
    });
    await adapter.flushEvents();
    expect(presentedFrames()).toBe(0);
    const selectionFrame = shell.root.render(80).map(row => stripTerminalSequences(row));
    const selectionRow = selectionFrame.findIndex(row => row.includes("one two three four five"));
    const selectionColumn = (selectionFrame[selectionRow] ?? "").indexOf("one") + 1;
    terminal.input(`\u001b[<0;${selectionColumn};${selectionRow + 1}M`);
    terminal.input(`\u001b[<32;${selectionColumn + 1};${selectionRow + 1}M`);
    await new Promise(resolve => setTimeout(resolve, 25));
    const selectionFrames = presentedFrames();
    expect(selectionFrames).toBeGreaterThanOrEqual(1);
    expect(shell.root.render(80).join("\n")).toContain("\u001b[48;2;38;79;120m");
    terminal.input(`\u001b[<0;${selectionColumn + 1};${selectionRow + 1}m`);
    terminal.input("x");
    await new Promise(resolve => setTimeout(resolve, 25));
    const immediateFrames = presentedFrames();
    expect(immediateFrames).toBeGreaterThanOrEqual(selectionFrames);
    advancePresentation(33);
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(presentedFrames()).toBeLessThanOrEqual(immediateFrames + 1); // Concurrency: Working animation may tick independently.
    expect(shell.root.render(80).join("\n")).toContain("one two three four five");
    expect(shell.root.editor.getText()).toBe("x");
    terminal.writes.length = 0;

    engine.session.emit({ type: "message_end", message: assistant("one two three four final", "stop") });
    await adapter.flushEvents();
    await new Promise(resolve => setTimeout(resolve, 25));
    const finalFrames = presentedFrames();
    // Concurrency: final content contributes one immediate frame; a due Working animation
    // may contribute one independent status frame after the longer selection interaction.
    expect(finalFrames).toBeGreaterThanOrEqual(1);
    expect(finalFrames).toBeLessThanOrEqual(2);
    expect(terminal.writes.some(write => stripTerminalSequences(write).includes("final"))).toBe(true);
    expect(shell.root.render(80).join("\n")).toContain("final");
    await shell.dispose();
  }, 15_000);

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
    // Performance: a repeat frame at the same width shows the same content from the cached rows.
    expect(rowsOf(80)).toEqual(first);
    // Performance: a different width is a different render rather than a stale hit.
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

  it("retains the draft and local-only recall through exceptional delivery reconciliation", async () => {
    const history = memoryHistory();
    vi.mocked(history.store.record).mockResolvedValue("skipped");
    const { shell, terminal, adapter, engine } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
      { store: history.store, limit: 100 });
    try {
      await shell.submit("local survivor"); shell.root.editor.setText("draft");
      await adapter.flushEvents();
      const binding = adapter.sessionBindingGeneration;
      for (let index = 0; index < 2048; index++) engine.session.emit({ type: "agent_start" });
      await expect(adapter.flushEvents()).rejects.toThrow("Engine delivery did not complete");
      expect(adapter.sessionBindingGeneration).toBe(binding);
      expect(shell.root.editor.getText()).toBe("draft");
      terminal.input("\u001b[A"); terminal.input("\u001b[A");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("local survivor"));
      terminal.input("\u001b[B");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("draft"));
    } finally { await shell.dispose(); }
  });

  it("keeps every classified history outcome and rejected shutdown out of normal output", async () => {
    const history = memoryHistory();
    const { shell, terminal, adapter } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
      { store: history.store, limit: 100 });
    const notify = vi.spyOn(shell.root, "addExtensionNotification");
    vi.mocked(history.store.record).mockResolvedValue("skipped");
    try {
      await shell.submit("local only");
      for (const code of ["busy", "unavailable", "capacity", "oversized", "schema", "corrupt", "shutdown"] as const) history.fail(code);
      vi.mocked(history.store.close).mockImplementation(async () => { history.fail("shutdown"); throw new Error("private sentinel"); });
      await shell.dispose();
      expect(notify).not.toHaveBeenCalled();
      expect(JSON.stringify([terminal.writes, adapter.view().status, adapter.view().diagnostics])).not.toMatch(/history|private sentinel|recover|capacity|unavailable|shutdown/i);
    } finally { await shell.dispose(); }
  });

  it("captures eligible user input once and never persists replay or workflow navigation", async () => {
    const history = memoryHistory();
    const { shell, engine } = await fixture([{ role: "user", content: "loaded", timestamp: 1 }], [], true,
      undefined, undefined, undefined, undefined, undefined, { store: history.store, limit: 100 });
    try {
      expect(history.store.start).toHaveBeenCalledOnce();
      expect(history.submitted).toHaveLength(0);
      await shell.submit("ordinary");
      await shell.submit("!echo test");
      await shell.submit("/skill:test arg");
      shell.root.editor.setText("follow up"); await shell.queueFollowUp();
      await shell.submit("/session");
      expect(history.submitted.map(item => [item.kind, item.text])).toEqual([
        ["prompt", "ordinary"], ["bash", "!echo test"], ["slash", "/skill:test arg"], ["follow-up", "follow up"],
      ]);
      expect(engine.session.calls).toContain("prompt:ordinary");
    } finally { await shell.dispose(); }
    expect(history.store.close).toHaveBeenCalledOnce();
  });

  it("records streaming and compaction inputs once while excluding generated backend prompts", async () => {
    const history = memoryHistory();
    const { shell, engine, adapter } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
      { store: history.store, limit: 100 });
    try {
      await adapter.execute({ type: "prompt", correlationId: "generated-input", sessionId: adapter.sessionId, text: "generated input" });
      expect(history.submitted).toHaveLength(0);
      engine.session.emit({ type: "agent_start" }); await adapter.flushEvents();
      await shell.submit("streaming steer");
      engine.session.emit({ type: "compaction_start", reason: "manual" }); await adapter.flushEvents();
      await shell.submit("queued steer");
      shell.root.editor.setText("queued follow"); await shell.queueFollowUp();
      expect(history.submitted.map(item => item.kind)).toEqual(["steer", "steer", "follow-up"]);
      engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
      await adapter.flushEvents(); await nextImmediate();
      expect(history.submitted).toHaveLength(3);
      const dispatch = vi.spyOn(adapter, "execute").mockRejectedValueOnce(new Error("private provider sentinel"));
      await shell.submit("recover me");
      expect(history.submitted.filter(item => item.text === "recover me")).toHaveLength(1);
      expect(stripTerminalSequences(shell.root.render(80).join("\n"))).not.toContain("private provider sentinel");
      dispatch.mockRestore();
    } finally { await shell.dispose(); }
  });

  it("preserves a typed draft while saved history refreshes and replacement surfaces suspend synchronization", async () => {
    const history = memoryHistory();
    const { shell, terminal, engine } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
      { store: history.store, limit: 100 });
    try {
      shell.root.editor.setText("draft"); history.emit(["newest", "older"]);
      terminal.input("\x1b[A"); terminal.input("\x1b[A");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("newest"));
      expect(stripTerminalSequences(shell.root.editor.render(80)[0]!)).toMatch(/^─── 2\/2 /u);
      history.emit(["remote", "newest", "older"]);
      expect(shell.root.editor.recall?.position()).toEqual({ index: 0, total: 2 });
      terminal.input("\x1b[B");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("draft"));
      const ui = (engine.session.extensionBindings as { uiContext: ExtensionUIContext }).uiContext;
      ui.setEditorComponent(tui => new Editor(tui, {
        borderColor: text => text,
        selectList: { selectedPrefix: text => text, selectedText: text => text, description: text => text, scrollInfo: text => text, noMatch: text => text },
      }));
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      history.emit(["custom-session update"]);
      expect(shell.root.editor.recall?.position().total).toBe(3);
      ui.setEditorComponent(undefined);
      expect(shell.root.editor.recall?.position().total).toBe(1);
      expect(shell.root.editor.getText()).toBe("draft");
      expect(history.submitted).toHaveLength(0);
    } finally { await shell.dispose(); }
  });

  it("does not initialize history for the pinned comparison editor", async () => {
    const history = memoryHistory();
    const { shell } = await fixture([], [], false, undefined, undefined, undefined, undefined, undefined,
      { store: history.store, limit: 100 });
    try {
      expect(shell.root.editor.recall).toBeUndefined();
      await shell.submit("local only");
      expect(history.store.start).not.toHaveBeenCalled();
      expect(history.submitted).toHaveLength(0);
    } finally { await shell.dispose(); }
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

  it("renders empty fork and logout outcomes as pinned statuses", async () => {
    const { adapter, shell } = await fixture();
    vi.spyOn(adapter, "pinnedForkOptions").mockReturnValue([]);
    vi.spyOn(adapter, "pinnedLogoutOptions").mockResolvedValue([]);

    shell.showForkSelector();
    const forkFrame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(forkFrame).toContain("No messages to fork from");
    expect(forkFrame).not.toContain("Error: No messages to fork from");

    await shell.showLogoutSelector();
    const logoutFrame = stripTerminalSequences(shell.root.render(200).join("\n"));
    expect(logoutFrame).toContain("No stored credentials to remove. /logout only removes credentials saved by /login; environment variables and models.json config are unchanged.");
    expect(logoutFrame).not.toContain("No authenticated providers available.");
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

  it("cycles levels only in the owned agent input and keeps model selection command-accessible", async () => {
    const { terminal, shell } = await fixture([], [], true);
    const cycle = vi.spyOn(shell, "cycleThinkingLevel");
    const select = vi.spyOn(shell, "showModelSelector");
    try {
      shell.root.editor.setText("draft");
      terminal.input("\u001b[Z");
      expect(cycle).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
      expect(shell.root.editor.getText()).toBe("draft");
      terminal.input("\u000c");
      await vi.waitFor(() => expect(cycle).toHaveBeenCalledOnce());
      expect(select).not.toHaveBeenCalled();
      await shell.submit("/model");
      expect(select).toHaveBeenCalledOnce();
      const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
      expect(frame).toContain("gpt-5");
      cycle.mockClear();
      terminal.input("\u000c");
      await nextImmediate();
      expect(cycle).not.toHaveBeenCalled();
      terminal.input("\u001b");
      await nextImmediate();
      terminal.input("\u000c");
      await vi.waitFor(() => expect(cycle).toHaveBeenCalledOnce());
    } finally { await shell.dispose(); }
  });

  it("opens the model selector with the original search after a command-owned refresh misses", async () => {
    const { adapter, shell } = await fixture();
    vi.spyOn(adapter, "executeWorkflow").mockResolvedValue({
      command: "model",
      outcome: "requires-selection",
      message: "Select a model",
      detail: "openai/missing",
      messageKind: "silent",
      messages: [
        { kind: "status", message: "Refreshing model catalogs…" },
        { kind: "warning", message: "Could not refresh openai; searching cached models." },
      ],
    });
    const show = vi.spyOn(shell, "showModelSelector");

    await shell.runWorkflow({ command: "model", argument: "openai/missing" });
    expect(show).toHaveBeenCalledWith("openai/missing");
    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame).toContain("Warning: Could not refresh openai; searching cached models.");
    expect(frame).not.toContain("Owned controller missing for model");
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

  it.each(["steer", "follow-up"])("rejects an invalid deferred %s once and continues valid queued work", async type => {
    const { engine, adapter, shell } = await fixture([], [], true);
    try {
      engine.session.emit({ type: "compaction_start", reason: "manual" });
      await adapter.flushEvents();
      const attachment = { type: "image" as const, data: "aA==", mimeType: "image/png" };
      const preparation = vi.spyOn(shell.root, "preparePromptSubmission").mockReturnValueOnce({ text: "bad later", images: [attachment] });
      if (type === "follow-up") { shell.root.editor.setText("bad later"); await shell.queueFollowUp(); }
      else await shell.submit("bad later");
      preparation.mockRestore();
      await shell.submit("good later");
      attachment.data = "invalid!";
      engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
      await adapter.flushEvents();
      await nextImmediate();
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:good later"]);
      expect(shell.root.editor.getText()).toBe("bad later");
      expect(stripTerminalSequences(shell.root.render(100).join("\n")).match(/Image data is invalid/g)).toHaveLength(1);
    } finally { await shell.dispose(); }
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

  it("cancels the share operation through its loader without rendering late success", async () => {
    const { adapter, terminal, shell } = await fixture();
    const execute = vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => {
      if (request.command !== "share" || !request.signal) return { command: request.command, outcome: "completed", message: "done" };
      await new Promise<void>(resolve => request.signal?.addEventListener("abort", () => resolve(), { once: true }));
      return { command: "share", outcome: "cancelled", message: "Share cancelled", messageKind: "status" };
    });

    const share = shell.runWorkflow({ command: "share", argument: "" });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Creating gist...");
    terminal.input("\x1b");
    await share;
    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(execute.mock.calls[0]?.[0].signal?.aborted).toBe(true);
    expect(frame).toContain("Share cancelled");
    expect(frame).not.toContain("Share URL:");
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
    const working = rows.findIndex(row => row.includes("Working..."));
    expect(working).toBeGreaterThan(-1);
    expect(rows[working + 1]?.trim()).toBe("");
    expect(rows[working + 2]).toMatch(/^─+$/);

    shell.root.setExtensionWorking("Extension indexing source");
    rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.some(row => row.includes("Extension indexing source..."))).toBe(true);
    expect(rows.some(row => row.includes("Working..."))).toBe(false);

    shell.root.setExtensionWorking("Legacy extension…");
    rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.some(row => row.includes("Legacy extension..."))).toBe(true);
    expect(rows.some(row => row.includes("Legacy extension…"))).toBe(false);

    shell.root.setExtensionWorking(undefined);
    rows = shell.root.render(100).map(row => stripTerminalSequences(row).trimEnd());
    expect(rows.some(row => row.includes("Legacy extension"))).toBe(false);
    expect(rows.some(row => row.includes("Working..."))).toBe(true);

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

  it("renders explicit ordered partial-success messages without prefix inference", async () => {
    const { shell } = await fixture();
    shell.root.appendWorkflowResult({
      command: "login",
      outcome: "completed",
      message: "Saved API key for OpenAI Codex",
      messages: [
        { kind: "status", message: "Saved API key for OpenAI Codex. Credentials saved to D:/auth.json" },
        { kind: "error", message: "Saved API key for OpenAI Codex, but no models are available for that provider. Use /model to select a model." },
      ],
    });
    shell.root.appendWorkflowResult({
      command: "name",
      outcome: "failed",
      message: "Usage: /name <name>",
      messageKind: "warning",
    });
    shell.root.appendWorkflowResult({ command: "fork", outcome: "cancelled", message: "Fork cancelled", messageKind: "silent" });

    const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
    expect(frame.indexOf("Saved API key for OpenAI Codex. Credentials saved")).toBeLessThan(frame.indexOf("Error: Saved API key"));
    expect(frame).toContain("Warning: Usage: /name <name>");
    expect(frame).not.toContain("Fork cancelled");
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
      .mockResolvedValueOnce({ command: "import", outcome: "requires-confirmation", message: "Replace current session with fixture.jsonl?" })
      .mockResolvedValueOnce({ command: "import", outcome: "cancelled", message: "Import cancelled", messageKind: "status" })
      .mockResolvedValueOnce({ command: "import", outcome: "requires-confirmation", message: "Replace current session with fixture.jsonl?" })
      .mockResolvedValueOnce({ command: "import", outcome: "completed", message: "Session imported" });

    const cancelled = shell.runWorkflow({ command: "import", argument: "fixture.jsonl" });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(shell.root.render(80).join("\n")).toContain("Import session");
    expect(shell.root.render(80).join("\n")).toContain("Replace current session");
    terminal.input("\x1b");
    await cancelled;
    expect(workflow).toHaveBeenNthCalledWith(1, { command: "import", argument: "fixture.jsonl" });
    expect(workflow).toHaveBeenNthCalledWith(2, { command: "import", argument: "fixture.jsonl", confirmed: false });

    const confirmed = shell.runWorkflow({ command: "import", argument: "fixture.jsonl" });
    await new Promise(resolve => setTimeout(resolve, 0));
    terminal.input("\r");
    await confirmed;
    expect(workflow).toHaveBeenNthCalledWith(3, { command: "import", argument: "fixture.jsonl" });
    expect(workflow).toHaveBeenNthCalledWith(4, { command: "import", argument: "fixture.jsonl", confirmed: true });
    await shell.dispose();
  });

  it("continues import through the missing-cwd recovery confirmation", async () => {
    const { adapter, terminal, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow")
      .mockResolvedValueOnce({ command: "import", outcome: "requires-confirmation", message: "Replace current session with fixture.jsonl?" })
      .mockResolvedValueOnce({
        command: "import",
        outcome: "requires-confirmation",
        message: "cwd from session file does not exist\nD:/missing\n\ncontinue in current cwd\nD:/work",
        detail: "D:/work",
      })
      .mockResolvedValueOnce({ command: "import", outcome: "completed", message: "Session imported from: fixture.jsonl" });

    const operation = shell.runWorkflow({ command: "import", argument: "fixture.jsonl" });
    await new Promise(resolve => setTimeout(resolve, 0));
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Session cwd not found");
    terminal.input("\r");
    await operation;
    expect(workflow).toHaveBeenNthCalledWith(3, {
      command: "import",
      argument: "fixture.jsonl",
      confirmed: true,
      cwdOverride: "D:/work",
    });
    expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Session imported from: fixture.jsonl");
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
