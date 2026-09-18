/**
 * Shared doubles and fixtures for the OwnedUiSessionShell suites. The session and runtime doubles stand in
 * for pinned Pi; `fixture` composes a shell over them with the seams each suite needs.
 */
import { selectionCopyRowText } from "../../../../src/ui/components/index.js";
import { type AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { getCapabilities as getPinnedPiTuiCapabilities, setCapabilities as setPinnedPiTuiCapabilities } from "@earendil-works/pi-tui";
import { describe, expect, it, onTestFailed, onTestFinished, vi } from "vitest";
import { NativeRegressionTrace } from "../../../support/native-regression-trace.js";
// Performance: this integration file exercises real cold emitted entries; dedicated tests retain source-loader coverage.
vi.mock("../../../../src/integrations/pi/session-ui/paste-executor.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../src/integrations/pi/session-ui/paste-executor.js")>();
  const { coldPasteHelper } = await import("../../../support/cold-clipboard-entries.js");
  return { ...actual, startPasteExecutor: (...args: Parameters<typeof actual.startPasteExecutor>) =>
    actual.startPasteExecutor(args[0], args[1], args[2], coldPasteHelper(args[3])) };
});
vi.mock("node:worker_threads", async importOriginal => {
  const actual = await importOriginal<typeof import("node:worker_threads")>();
  const { coldClipboardWorker } = await import("../../../support/cold-clipboard-entries.js");
  return { ...actual, Worker: class extends actual.Worker {
    constructor(entry: string | URL, options?: import("node:worker_threads").WorkerOptions) {
      const selected = coldClipboardWorker(entry, options);
      super(selected.entry, selected.options);
    }
  } };
});
import { createPiEngineAdapter } from "../../../../src/integrations/pi/engine/index.js";
import { loadHistoryEditor } from "../../../../src/integrations/pi/components/index.js";
import {
  OwnedUiSessionShell,
  type OwnedUiShellDiagnosticOptions,
  type OwnedUiShellHistoryOptions,
  type OwnedUiShellPresentationOptions,
  type OwnedUiShellSuggestionOptions,
} from "../../../../src/integrations/pi/session-ui/index.js";
import { TestPresentationTerminal } from "../../../features/owned-ui/neutral-port-doubles.js";
import { ImageAttachmentError, type OwnedUiViewportSettingsPort } from "../../../../src/contracts/owned-ui/index.js";
import { startPasteExecutor } from "../../../../src/integrations/pi/session-ui/paste-executor.js";
import type { PasteExecutorStarter } from "../../../../src/integrations/pi/session-ui/paste-preparation-client.js";
import { PASTE_TEXT_BYTES, type PreparedPaste } from "../../../../src/integrations/pi/session-ui/paste-protocol.js";
import { preparePasteText } from "../../../../src/integrations/pi/session-ui/paste-text-preparation.js";

/** Text above this size keeps the forked helper, whose worker thread and probe deadline the in-process path cannot reproduce. */
const IN_PROCESS_PASTE_BYTES = 256 * 1024;

/**
 * Prepares ordinary text pastes in process with the forked helper's phases, limits, and classification, so the
 * shell suites measure admission and insertion rather than child startup. Images, native reads, and large
 * payloads still fork the real helper.
 */
export const inProcessPasteExecutor: PasteExecutorStarter = (content, signal, phase = () => {}, helper, pool) => {
  if (content?.kind !== "text" || content.text.length > IN_PROCESS_PASTE_BYTES) return startPasteExecutor(content, signal, phase, helper, pool);
  let canceled = false, finished = false;
  let resolve!: (value: PreparedPaste) => void, reject!: (error: ImageAttachmentError) => void, stopped!: () => void;
  const result = new Promise<PreparedPaste>((ok, fail) => { resolve = ok; reject = fail; });
  const exit = new Promise<void>(done => { stopped = done; });
  void result.catch(() => {});
  const finish = () => {
    if (finished) return;
    finished = true;
    signal.removeEventListener("abort", cancel);
    stopped();
    try { phase("cleanup"); } catch { /* Invariant: cleanup observation cannot retain an exited executor. */ }
  };
  const cancel = () => {
    if (canceled) return;
    canceled = true;
    reject(signal.reason instanceof ImageAttachmentError ? signal.reason : new ImageAttachmentError("image-canceled"));
    setImmediate(finish);
  };
  if (signal.aborted || content.text.length > PASTE_TEXT_BYTES) {
    if (signal.aborted) cancel();
    else { canceled = true; reject(new ImageAttachmentError("paste-size")); setImmediate(finish); }
    return { result, stopped: exit, cancel };
  }
  signal.addEventListener("abort", cancel, { once: true });
  setImmediate(() => {
    if (canceled) return;
    const size = Buffer.byteLength(content.text);
    try {
      phase("acquired-text", size);
      if (canceled) return;
      if (content.text === "") { phase("prepared", 0); resolve(null); setImmediate(finish); return; }
      phase("classifying", size);
      if (canceled) return;
      const prepared = preparePasteText(content.text, false, true);
      const bytes = prepared.kind === "paths" ? prepared.paths.reduce((sum, path) => sum + Buffer.byteLength(path.fullPath), 0)
        : Buffer.byteLength(prepared.kind === "url" ? prepared.url : prepared.text);
      phase("prepared", bytes);
      if (canceled) return;
      resolve(prepared);
    } catch (error) {
      canceled = true;
      reject(error instanceof ImageAttachmentError ? error : new ImageAttachmentError("paste-unavailable"));
    }
    setImmediate(finish);
  });
  return { result, stopped: exit, cancel };
};

export class Session {
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
  readonly queued: Array<{ mode: "steer" | "followUp"; text: string; images?: readonly unknown[] }> = [];
  #emitQueue(): void {
    this.emit({ type: "queue_update", steering: this.queued.filter(item => item.mode === "steer").map(item => item.text), followUp: this.queued.filter(item => item.mode === "followUp").map(item => item.text) });
  }
  async steer(text: string, images?: readonly unknown[]): Promise<void> {
    this.calls.push(`steer:${text}`);
    this.queued.push({ mode: "steer", text, ...(images === undefined ? {} : { images }) });
    this.#emitQueue();
  }
  async followUp(text: string, images?: readonly unknown[]): Promise<void> {
    this.calls.push(`followUp:${text}`);
    this.queued.push({ mode: "followUp", text, ...(images === undefined ? {} : { images }) });
    this.#emitQueue();
  }
  async abort(): Promise<void> { this.calls.push("abort"); }
  abortRetry(): void { this.calls.push("abortRetry"); }
  abortCompaction(): void { this.calls.push("abortCompaction"); }
  async compact(): Promise<void> { this.calls.push("compact"); }
  clearQueue(): { steering: string[]; followUp: string[] } {
    this.calls.push("clearQueue");
    const steering = this.queued.filter(item => item.mode === "steer").map(item => item.text);
    const followUp = this.queued.filter(item => item.mode === "followUp").map(item => item.text);
    this.queued.length = 0;
    this.#emitQueue();
    return { steering, followUp };
  }
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

export class Runtime {
  readonly session: Session;
  completeSuggestion: () => Promise<unknown> = async () => ({ content: [{ type: "text", text: "archive it" }] });
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
      completeSimple: vi.fn((_model: unknown, _context: unknown, _options: unknown) => this.completeSuggestion()),
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

export async function withPinnedHyperlinks<T>(run: () => Promise<T>): Promise<T> {
  const capabilities = getPinnedPiTuiCapabilities();
  setPinnedPiTuiCapabilities({ ...capabilities, hyperlinks: true });
  try {
    return await run();
  } finally {
    setPinnedPiTuiCapabilities(capabilities);
  }
}

export async function fixture(
  messages: readonly unknown[] = [],
  extensions: readonly unknown[] = [],
  customViewport = false,
  viewportSettings?: OwnedUiViewportSettingsPort,
  clipboard?: {
    readText(): Promise<string | null>;
    readImage?(): Promise<{ readonly data: string; readonly mimeType: string } | null>;
    writeText?(text: string): Promise<void>;
  },
  streamPresentation?: OwnedUiShellPresentationOptions["stream"],
  inputPresentation?: OwnedUiShellPresentationOptions["input"],
  promptSuggestions?: OwnedUiShellSuggestionOptions,
  promptHistory?: Omit<OwnedUiShellHistoryOptions, "editor">,
  configureEngine?: (engine: Runtime) => void,
  responseCopy?: OwnedUiShellDiagnosticOptions["responseCopy"] | "forked",
  pasteDiagnostics?: OwnedUiShellDiagnosticOptions["paste"],
  quitOutro?: OwnedUiShellPresentationOptions["quitOutro"],
  reloadPresentation?: OwnedUiShellPresentationOptions["reload"],
  pastePreparation: OwnedUiShellDiagnosticOptions["pastePreparation"] | "forked" = { execute: inProcessPasteExecutor },
) {
  const engine = new Runtime(messages);
  configureEngine?.(engine);
  engine.extensionResources = extensions;
  const adapter = await createPiEngineAdapter({ cwd: "D:/work", sessionId: "owned-shell", createRuntime: async () => engine as unknown as AgentSessionRuntime });
  const terminal = new TestPresentationTerminal();
  const shell = new OwnedUiSessionShell({
    engine: {
      backend: adapter,
      cwd: "D:/work",
      ...(customViewport ? { sessionLayout: "custom-viewport" as const } : {}),
    },
    presentation: {
      terminal,
      ...(viewportSettings === undefined ? {} : { viewportSettings }),
      ...(streamPresentation === undefined ? {} : { stream: streamPresentation }),
      ...(inputPresentation === undefined ? {} : { input: inputPresentation }),
      ...(quitOutro === undefined ? {} : { quitOutro }),
      // Rationale: the production hold is real wall-clock time; tests opt into it with injected seams.
      reload: reloadPresentation ?? { minVisibleMs: 0 },
    },
    diagnostics: {
      ...(clipboard === undefined ? {} : { clipboard }),
      ...(pasteDiagnostics === undefined ? {} : { paste: pasteDiagnostics }),
      ...(pastePreparation === "forked" ? {} : { pastePreparation }),
      responseCopy: responseCopy === "forked" ? {} : responseCopy ?? { execute: (snapshot, phase) => {
      const text = snapshot.rows.map((row, index) => selectionCopyRowText(snapshot, row, index)).join("\n");
      phase("extracted", Buffer.byteLength(text), "injected");
      phase("encoded", Buffer.byteLength(text), "injected");
      phase("submitting", Buffer.byteLength(text), "injected");
      terminal.write(`\u001b]52;c;${Buffer.from(text).toString("base64")}\u0007`);
      const result = (clipboard?.writeText?.(text) ?? Promise.resolve()).then(() => ({ outcome: "submitted-unverified" as const }));
      return { result, stopped: result.then(() => {}), cancel() {} };
    } },
    },
    ...(promptSuggestions === undefined ? {} : { suggestions: promptSuggestions }),
    ...(promptHistory === undefined ? {} : { history: { ...promptHistory, editor: await loadHistoryEditor() } }),
  });
  shell.start();
  shell.runtime.renderNow();
  return { engine, adapter, terminal, shell };
}

export async function observedPasteFixture(clipboard: NonNullable<Parameters<typeof fixture>[4]>) {
  const trace = new NativeRegressionTrace("shell-paste");
  const settlementWaiters: Array<(request: number) => void> = [];
  const settledRequests: number[] = [];
  const waitForPasteSettlement = () => {
    const settled = settledRequests.shift();
    return settled === undefined
      ? new Promise<number>(resolve => settlementWaiters.push(resolve))
      : Promise.resolve(settled);
  };
  onTestFailed(() => trace.report());
  let value: Awaited<ReturnType<typeof fixture>> | undefined;
  let disposal: Promise<void> | undefined;
  const dispose = () => disposal ??= value ? trace.measureAsync("dispose", () => value!.shell.dispose()) : Promise.resolve();
  onTestFinished(async () => {
    try { await dispose(); }
    finally { if (process.env.NATIVE_REGRESSION_DIAGNOSTICS === "1") trace.report(); }
  });
  value = await trace.measureAsync("setup", () => fixture([], [], true, undefined, clipboard,
    undefined, undefined, undefined, undefined, undefined, undefined,
    event => {
      trace.event(event.phase, { request: event.request, pending: event.pending });
      if (event.phase !== "settled") return;
      const waiter = settlementWaiters.shift();
      if (waiter) waiter(event.request); else settledRequests.push(event.request);
    }));
  return { ...value, trace, dispose, waitForPasteSettlement };
}

export class InputImmediateScheduler {
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

export async function nextImmediate(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve));
}
