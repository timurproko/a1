import { finiteNumber, isRecord, readModel, readThinkingLevel } from "./message-values.js";
import type { AgentSession, AgentSessionRuntime } from "../startup-public.js";
import type { PiEngineRuntime } from "./session-runtime.js";
import type {
  OwnedUiDiagnostics,
  OwnedUiEditorState,
  OwnedUiModelInfo,
  OwnedUiSessionViewModel,
  OwnedUiStatusView,
  OwnedUiTerminalSurface,
  OwnedUiThinkingLevel,
  OwnedUiTranscriptBlock,
  OwnedUiUsageView,
} from "../../../contracts/owned-ui/index.js";

/** Bounded structured notices; acknowledgements never inspect terminal cells or touch Agent work. */
class EngineDiagnostics {
  readonly #values: OwnedUiDiagnostics[] = [];
  #messages: string[] = [];
  #sequence = 0;
  get values(): readonly OwnedUiDiagnostics[] { return this.#values; }
  get messages(): readonly string[] { return this.#messages; }
  record(severity: OwnedUiDiagnostics["severity"], code: string, message: string, recoverable: boolean): OwnedUiDiagnostics {
    const diagnostic = { sequence: this.#sequence++, code, severity, message, recoverable };
    this.#values.push(diagnostic); if (this.#values.length > 100) this.#values.shift();
    this.#messages = [...this.#messages, message].slice(-8);
    return diagnostic;
  }
  clearCodes(codes: readonly string[]): boolean {
    const selected = new Set(codes);
    return this.#remove(diagnostic => selected.has(diagnostic.code));
  }
  #remove(predicate: (diagnostic: OwnedUiDiagnostics) => boolean): boolean {
    const removed = new Set<string>();
    for (let index = this.#values.length - 1; index >= 0; index--) {
      const diagnostic = this.#values[index]!;
      if (predicate(diagnostic)) { removed.add(diagnostic.message); this.#values.splice(index, 1); }
    }
    if (removed.size === 0) return false;
    this.#messages = this.#messages.filter(message => !removed.has(message) || this.#values.some(diagnostic => diagnostic.message === message));
    return true;
  }
}

const DEFAULT_SURFACE: OwnedUiTerminalSurface = {
  columns: 100,
  rows: 32,
  focusedRegion: "editor",
  hardwareCursor: false,
};

/**
 * The engine adapter's own view-model state: lifecycle, editor, status, terminal surface, active
 * model, thinking level, the usage cache, diagnostics, and the view revision. Every change that
 * touches more than one field is one named mutator, so the adapter and its collaborators never
 * rebuild these objects inline.
 */
export class EngineViewState {
  #revision = 0;
  #editor: OwnedUiEditorState = {
    text: "",
    queuedSubmissions: [],
    selection: null,
    cursorOffset: 0,
    historyRevision: 0,
    submitEnabled: false,
  };
  #status: OwnedUiStatusView = {
    title: "Pi",
    workingMessage: null,
    diagnostics: [],
    badges: [],
  };
  #terminal: OwnedUiTerminalSurface = DEFAULT_SURFACE;
  lifecycle: OwnedUiSessionViewModel["lifecycle"] = "starting";
  activeModel: OwnedUiModelInfo | null = null;
  thinkingLevel: OwnedUiThinkingLevel = "medium";
  #usage: OwnedUiUsageView | undefined;
  readonly diagnosticsState = new EngineDiagnostics();

  get revision(): number { return this.#revision; }
  get editor(): OwnedUiEditorState { return this.#editor; }
  get status(): OwnedUiStatusView { return { ...this.#status, diagnostics: this.diagnosticsState.messages }; }
  get terminal(): OwnedUiTerminalSurface { return this.#terminal; }
  get diagnostics(): readonly OwnedUiDiagnostics[] { return this.diagnosticsState.values; }

  /** Any emitted event advances the revision. */
  advance(): void {
    this.#revision += 1;
  }

  /** A full view is about to be published: usage is recomputed and the revision advances. */
  invalidate(): void {
    this.#usage = undefined;
    this.#revision += 1;
  }

  invalidateUsage(): void {
    this.#usage = undefined;
  }

  /** The cached usage view, computed once per published view. */
  usage(read: () => OwnedUiUsageView): OwnedUiUsageView {
    return this.#usage ??= read();
  }

  /** The engine started: the session is ready and accepts submissions. */
  markReady(): void {
    this.lifecycle = "ready";
    this.#editor = { ...this.#editor, submitEnabled: true };
  }

  /** A run started with `message` as its working status; true when the session was already busy. */
  enterWork(message: string): boolean {
    const wasBusy = this.lifecycle === "busy";
    this.lifecycle = "busy";
    this.#status = { ...this.#status, workingMessage: message, workingProgress: null };
    return wasBusy;
  }

  leaveWork(): void {
    this.lifecycle = "ready";
    this.#status = { ...this.#status, workingMessage: null, workingProgress: null };
  }

  /** Records compaction or retry progress; false when it did not change. */
  setWorkProgress(percent: Exclude<OwnedUiStatusView["workingProgress"], undefined>): boolean {
    if (this.#status.workingProgress === percent) return false;
    this.#status = { ...this.#status, workingProgress: percent };
    return true;
  }

  setQueuedSubmissions(queuedSubmissions: readonly string[]): void {
    this.#editor = { ...this.#editor, queuedSubmissions: [...queuedSubmissions], historyRevision: this.#editor.historyRevision + 1 };
  }

  /** Fills an empty editor with `text`, as tree navigation does for the selected branch's prompt. */
  offerEditorText(text: string): void {
    if (!this.#editor.text.trim()) {
      this.#editor = { ...this.#editor, text, selection: null, cursorOffset: text.length };
    }
  }

  setHardwareCursor(hardwareCursor: boolean): void {
    this.#terminal = { ...this.#terminal, hardwareCursor };
  }

  setTerminal(surface: OwnedUiTerminalSurface): void {
    this.#terminal = { ...surface };
  }

  /** A replaced session starts with an empty editor that accepts submissions and no working status. */
  replaceSession(): void {
    this.#editor = {
      text: "",
      queuedSubmissions: [],
      selection: null,
      cursorOffset: 0,
      historyRevision: this.#editor.historyRevision + 1,
      submitEnabled: true,
    };
    this.#status = { ...this.#status, workingMessage: null, workingProgress: null, badges: [] };
  }

  /** Delivery overload ended the run: ready when it can resume, stopped once disposed, otherwise failed. */
  settleOverload(canResume: boolean, disposed: boolean): void {
    this.#status = { ...this.#status, workingMessage: null, workingProgress: null };
    this.lifecycle = disposed ? "stopped" : canResume ? "ready" : "failed";
    this.#editor = { ...this.#editor, submitEnabled: canResume && !disposed };
    this.#revision += 1;
  }
}

/** Token, cost, cache, and context usage summed from the session's entries for the status footer. */
function readUsageView(session: AgentSession | undefined, runtime: AgentSessionRuntime | undefined, activeModel: OwnedUiModelInfo | null): OwnedUiUsageView {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let cost = 0;
  let latestCacheHitRate: number | null = null;
  let latestPrompt: OwnedUiUsageView["latestPrompt"] = null;
  const entries: readonly unknown[] = session?.sessionManager?.getEntries?.()
    ?? (session?.messages ?? []).map(message => ({ type: "message", message }));
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const message = entry.type === "message" && isRecord(entry.message) ? entry.message : undefined;
    const usage = message !== undefined && isRecord(message.usage)
      ? message.usage
      : (entry.type === "usage" || entry.type === "branch_summary" || entry.type === "compaction") && isRecord(entry.usage) ? entry.usage : undefined;
    if (usage === undefined) continue;
    input += finiteNumber(usage.input);
    output += finiteNumber(usage.output);
    cacheRead += finiteNumber(usage.cacheRead);
    cacheWrite += finiteNumber(usage.cacheWrite);
    cost += isRecord(usage.cost) ? finiteNumber(usage.cost.total) : 0;
    if (message?.role === "assistant") {
      latestPrompt = {
        input: finiteNumber(usage.input),
        cacheRead: finiteNumber(usage.cacheRead),
        cacheWrite: finiteNumber(usage.cacheWrite),
      };
      const promptTokens = latestPrompt.input + latestPrompt.cacheRead + latestPrompt.cacheWrite;
      latestCacheHitRate = promptTokens > 0 ? (latestPrompt.cacheRead / promptTokens) * 100 : null;
    }
  }
  const context = session?.getContextUsage?.();
  const providerId = activeModel?.providerId;
  const usingSubscription = providerId === "kimi-coding"
    || (providerId !== undefined && runtime?.services.modelRuntime.isUsingSubscription?.(providerId) === true);
  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    cost,
    latestCacheHitRate,
    latestPrompt,
    contextAvailable: context !== undefined,
    contextTokens: context?.tokens ?? null,
    contextWindow: context?.contextWindow ?? 0,
    contextPercent: context?.percent ?? null,
    usingSubscription,
    autoCompactEnabled: runtime?.services.settingsManager?.getCompactionEnabled?.() ?? true,
  };
}

/** What the session view is projected from: the adapter's view state, the bound engine, the transcript and the running commands. */
export interface PiSessionViewSource {
  readonly sessionId: string;
  readonly state: EngineViewState;
  readonly engine: PiEngineRuntime;
  readonly transcript: readonly OwnedUiTranscriptBlock[];
  readonly activeCommandIds: readonly string[];
  readonly nameReveal?: { readonly id: string; readonly from: string } | undefined;
}

/** The owned UI session view model, copied so a published view never aliases adapter state. */
export function projectSessionView({ sessionId, state, engine, transcript, activeCommandIds, nameReveal }: PiSessionViewSource): OwnedUiSessionViewModel {
  const routed = engine.session?.routedModel;
  const routedModel = routed === undefined ? null : readModel(routed.model);
  return {
    contractVersion: 1,
    sessionId,
    revision: state.revision,
    lifecycle: state.lifecycle,
    transcript,
    editor: { ...state.editor, queuedSubmissions: [...state.editor.queuedSubmissions] },
    status: {
      ...state.status,
      diagnostics: [...state.status.diagnostics],
      badges: [...state.status.badges],
      usage: state.usage(() => readUsageView(engine.session, engine.runtime, state.activeModel)),
      footer: {
        branch: engine.repository.branch,
        repositoryPath: engine.repository.cwd,
        repositoryRevision: engine.repository.revision,
        ...(nameReveal === undefined ? {} : { sessionNameReveal: nameReveal }),
        pullRequest: engine.repository.pullRequest,
        sessionName: engine.session?.sessionManager?.getSessionName() ?? null,
        availableProviderCount: new Set(engine.runtime?.services.modelRuntime.getAvailableSnapshot?.().map(model => model.provider).filter(provider => provider !== undefined) ?? []).size,
        extensionStatuses: [],
      },
    },
    terminal: { ...state.terminal },
    activeModel: state.activeModel === null ? null : { ...state.activeModel },
    routedModel: routedModel === null ? null : {
      model: routedModel,
      ...(routed?.thinkingLevel === undefined ? {} : { thinkingLevel: readThinkingLevel(routed.thinkingLevel) }),
    },
    thinkingLevel: state.thinkingLevel,
    activeCommandIds: [...activeCommandIds],
    dialog: null,
    overlay: null,
    customizations: [],
    diagnostics: state.diagnostics.map(diagnostic => ({ ...diagnostic })),
  };
}
