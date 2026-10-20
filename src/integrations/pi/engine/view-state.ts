import type {
  OwnedUiDiagnostics,
  OwnedUiEditorState,
  OwnedUiModelInfo,
  OwnedUiSessionViewModel,
  OwnedUiStatusView,
  OwnedUiTerminalSurface,
  OwnedUiThinkingLevel,
  OwnedUiUsageView,
} from "../../../contracts/owned-ui/index.js";

const DEFAULT_SURFACE: OwnedUiTerminalSurface = {
  columns: 100,
  rows: 32,
  focusedRegion: "editor",
  hardwareCursor: false,
};

const MAX_DIAGNOSTICS = 100;
const MAX_STATUS_DIAGNOSTICS = 8;

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
  readonly #diagnostics: OwnedUiDiagnostics[] = [];

  get revision(): number { return this.#revision; }
  get editor(): OwnedUiEditorState { return this.#editor; }
  get status(): OwnedUiStatusView { return this.#status; }
  get terminal(): OwnedUiTerminalSurface { return this.#terminal; }
  get diagnostics(): readonly OwnedUiDiagnostics[] { return this.#diagnostics; }

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

  recordDiagnostic(
    severity: OwnedUiDiagnostics["severity"],
    code: string,
    message: string,
    recoverable: boolean,
  ): OwnedUiDiagnostics {
    const diagnostic: OwnedUiDiagnostics = { sequence: this.#diagnostics.length, code, severity, message, recoverable };
    this.#diagnostics.push(diagnostic);
    if (this.#diagnostics.length > MAX_DIAGNOSTICS) this.#diagnostics.shift();
    this.#status = {
      ...this.#status,
      diagnostics: [...this.#status.diagnostics, message].slice(-MAX_STATUS_DIAGNOSTICS),
    };
    return diagnostic;
  }
}
