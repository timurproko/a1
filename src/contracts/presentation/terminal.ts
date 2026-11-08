import type { PresentationComponentPort, PresentationPointerSurface } from "./component.js";

// Invariant: the vendor-neutral terminal runtime vocabulary the application shell speaks. The Pi TUI runtime
// adapter implements it; its own names are aliases of these.

/** A program-status report for terminals that show one (OSC 9;4 style); `clear` removes it. */
export interface TerminalProgramStatus {
  state: "idle" | "working" | "blocked" | "done" | "error" | "clear";
  app?: string;
  kind?: "permission" | "question" | "auth";
}

/** Lines one wheel notch scrolls, or `auto` to follow wheel velocity. */
export type TerminalWheelScrollLines = number | "auto";

/** Whether queued input may be applied immediately or must wait for the current presentation. */
export type TerminalInputCoordinationDecision = "safe" | "barrier";
/** What kind of surface owns the keyboard when input arrives. */
export type TerminalInputSurfaceKind = "editor" | "owned" | "opaque";

export interface TerminalInputCoordinationScheduler {
  scheduleImmediate(callback: () => void): ReturnType<typeof setImmediate>;
  cancelImmediate(handle: ReturnType<typeof setImmediate>): void;
}

export type TerminalRuntimeState = "idle" | "running" | "stopping" | "stopped" | "failed";

export interface TerminalViewport {
  readonly columns: number;
  readonly rows: number;
}

export type TerminalPointerSurface = PresentationPointerSurface;

export interface TerminalComponentPort extends PresentationComponentPort {
  readonly wantsKeyRelease?: boolean;
}

export interface TerminalPort {
  start(onInput: (data: string) => void, onResize: () => void): void;
  stop(): void;
  drainInput(maxMs?: number, idleMs?: number): Promise<void>;
  write(data: string): void;
  readonly columns: number;
  readonly rows: number;
  readonly kittyProtocolActive: boolean;
  moveBy(lines: number): void;
  hideCursor(): void;
  showCursor(): void;
  clearLine(): void;
  clearFromCursor(): void;
  clearScreen(): void;
  setTitle(title: string): void;
  setProgress(active: boolean): void;
  /** Optional for neutral test/decorator ports; the vendor adapter always supplies it. */
  setProgramStatus?(status: TerminalProgramStatus): void;
  /**
   * Optional synchronous last-resort mode restore that the runtime invokes from a process `exit` handler when
   * `stop()` did not run; the runtime adapter binds it to the undecorated terminal, so decorators need not forward it.
   */
  restoreOnExit?(before: string, after: string): void;
}

export type TerminalSizeValue = number | `${number}%`;
export type TerminalOverlayAnchor =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center"
  | "left-center"
  | "right-center";

export interface TerminalOverlayMargin {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
}

export interface TerminalOverlayOptions {
  readonly width?: TerminalSizeValue;
  readonly minWidth?: number;
  readonly maxHeight?: TerminalSizeValue;
  readonly anchor?: TerminalOverlayAnchor;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly row?: TerminalSizeValue;
  readonly col?: TerminalSizeValue;
  readonly margin?: TerminalOverlayMargin | number;
  readonly visible?: (columns: number, rows: number) => boolean;
  readonly nonCapturing?: boolean;
  /** A1-owned input scheduling declaration; omitted extension overlays fail closed. */
  readonly inputCoordination?: Exclude<TerminalInputSurfaceKind, "editor">;
}

export interface TerminalOverlayUnfocusOptions {
  readonly target: TerminalComponentPort | null;
}

export interface TerminalOverlayHandle {
  hide(): void;
  setHidden(hidden: boolean): void;
  isHidden(): boolean;
  focus(): void;
  unfocus(options?: TerminalOverlayUnfocusOptions): void;
  isFocused(): boolean;
  /** The most recently rendered terminal-relative rectangle of a visible overlay. */
  getBounds(): { readonly row: number; readonly col: number; readonly width: number; readonly height: number } | undefined;
}

export interface TerminalInputListenerResult {
  readonly consume?: boolean;
  readonly data?: string;
}

export type TerminalInputListener = (data: string) => TerminalInputListenerResult | undefined;
/** Runs at the terminal bridge before the runtime receives physical input. */
export type TerminalPreInputListener = TerminalInputListener;

export interface TerminalLayoutEntry {
  readonly node: TerminalLayoutNode;
  readonly basis?: number | "auto";
  readonly grow?: number;
  readonly shrink?: number;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly visible?: (viewport: TerminalViewport) => boolean;
}

export type TerminalLayoutNode =
  | { readonly type: "component"; readonly component: TerminalComponentPort }
  | {
    readonly type: "stack";
    readonly direction: "vertical" | "horizontal";
    readonly children: readonly TerminalLayoutEntry[];
    readonly gap?: number;
    readonly align?: "stretch" | "start" | "center" | "end";
  }
  | {
    readonly type: "scroll";
    readonly id: string;
    readonly child: TerminalLayoutNode;
    readonly follow?: "none" | "end";
    readonly primary?: boolean;
    readonly overscroll?: "chain" | "contain";
    readonly scrollbar?: "hidden" | "auto" | "always";
    /** Styles the scrollbar track; the pinned runtime draws it as foreground text. */
    readonly scrollbarTrackStyle?: (text: string) => string;
    /** Styles the scrollbar thumb; the pinned runtime draws it as foreground text. */
    readonly scrollbarThumbStyle?: (text: string) => string;
    readonly scrollbarHideDelayMs?: number;
  };

export type TerminalInputDiagnosticsPhase =
  | "receipt"
  | "semantic-start"
  | "semantic-end"
  | "composition-start"
  | "composition-end"
  | "write-start"
  | "write-end";

export interface TerminalInputDiagnosticsEvent {
  readonly phase: TerminalInputDiagnosticsPhase;
  readonly revision: number;
  readonly atMs: number;
  readonly pendingDepth: number;
  readonly pendingPresentationDepth: 0 | 1;
  readonly appliedRevision: number;
}

export interface TerminalRuntimeOptions {
  readonly root: TerminalComponentPort;
  /** Bare viewport only: painted overlays in back-to-front order; null while geometry is stale. */
  readonly onOverlayGeometry?: (surfaces: readonly TerminalPointerSurface[] | null) => void;
  readonly mode?: "regular" | "fullscreen";
  readonly layoutRoot?: TerminalLayoutNode;
  readonly terminal?: TerminalPort;
  /** A1-owned public-boundary decorator; comparison paths omit it. */
  readonly decorateTerminal?: (terminal: TerminalPort) => TerminalPort;
  /** Bare-custom-viewport scheduling policy; comparison paths omit it. */
  readonly inputCoordination?: {
    readonly classify: (
      data: string,
      focusedOverlay?: Exclude<TerminalInputSurfaceKind, "editor">,
    ) => TerminalInputCoordinationDecision;
    readonly onReceipt?: () => void;
    readonly scheduler?: TerminalInputCoordinationScheduler;
  };
  /** Optional bounded evidence hook. Production composition omits it. */
  readonly inputDiagnostics?: {
    readonly onEvent: (event: TerminalInputDiagnosticsEvent) => void;
    readonly now?: () => number;
  };
  readonly hardwareCursor?: boolean;
  readonly mouse?: boolean;
  /** Consume residual SGR mouse reports after every pre-input listener has run. */
  readonly consumeUnhandledMouse?: boolean;
  readonly wheelScrollLines?: TerminalWheelScrollLines;
  readonly openUrl?: (url: string) => void;
  readonly onRightClickPaste?: () => void;
  readonly logDirectory?: string;
}

export interface TerminalStopOptions {
  readonly preserveScreen?: boolean;
  readonly drainInput?: boolean;
  readonly drainMaxMs?: number;
  readonly drainIdleMs?: number;
}

export interface TerminalDamageFrameDescriptor {
  /**
   * Frame ids are compared only within one presentation epoch; absent means the current epoch. A
   * presenter switch starts a new epoch, because each presenter numbers its own frames.
   */
  readonly epoch?: number;
  readonly frameId: number;
  readonly width: number;
  readonly height: number;
  readonly transcript: { readonly rowStart: number; readonly rowEnd: number } | null;
  readonly dock: { readonly rowStart: number; readonly rowEnd: number } | null;
  /**
   * Visible rows owned by the block that is currently streaming. A live block repaints
   * every row it owns when it reflows, so the allowed damage follows the declared tail
   * instead of assuming a one-row tail.
   */
  readonly liveTailRows?: number;
  readonly verticalShiftRows: number;
  readonly safeVerticalShift: boolean;
  readonly cause: string;
}

export interface TerminalDamageFrameSafety {
  readonly overlayActive: boolean;
  readonly selectionActive: boolean;
  readonly replacementSurfaceActive: boolean;
}

export type TerminalDamageDecisionReason =
  | "transformed"
  | "suppressed-redundant-clear"
  | "hyperlink-cleanup"
  | "pending-hyperlink-cleanup"
  | "not-armed"
  | "unsafe-frame"
  | "stale-frame"
  | "unsupported-region-scroll"
  | "geometry-mismatch"
  | "grammar-mismatch"
  | "unsafe-terminal-content"
  | "incomplete-prior-frame"
  | "excessive-real-damage";

export interface TerminalDamageDecision {
  readonly frameId: number | null;
  readonly transformed: boolean;
  readonly reason: TerminalDamageDecisionReason;
  readonly shiftRows: number;
  readonly paintedRows: readonly number[];
}

/** What the shell's hyperlink analysis reports for one visible row. */
export interface TerminalHyperlinkInspection {
  readonly ranges: readonly unknown[];
  readonly hasExplicitLink: boolean;
  readonly signature: string;
  readonly replaySafe: boolean;
  readonly width: number;
}

export interface TerminalDamageOptions {
  readonly regionalScroll: boolean;
  /** The shell supplies visible-row analysis; the terminal layer owns no UI parser. */
  readonly inspectHyperlinks: (content: string) => TerminalHyperlinkInspection;
  readonly onResize?: () => void;
  readonly onHyperlinkCleanupRequired?: () => void;
}

/** A terminal decorator that repaints only the rows a frame declares changed. */
export interface TerminalDamagePort extends TerminalPort {
  readonly lastDecision: TerminalDamageDecision;
  readonly canvasBackgroundAnsi: string | null;
  readonly presentationEpoch: number;
  invalidatePresentation(): void;
  /** Returns true when the background changed and a full repaint is needed. */
  setCanvasBackground(ansi: string | null): boolean;
  presentedRows(): readonly string[];
  requestHyperlinkCleanup(rows?: readonly number[]): void;
  arm(descriptor: TerminalDamageFrameDescriptor, safety: TerminalDamageFrameSafety): void;
}

/** The terminal runtime the shell drives: one root, overlays, input listeners, and modes. */
export interface TerminalRuntimePort {
  readonly state: TerminalRuntimeState;
  readonly active: boolean;
  readonly mode: "regular" | "fullscreen";
  /** Full repaints since start, for rendering evidence. */
  readonly fullRedraws: number;
  readonly presentationHeld: boolean;
  viewport(): TerminalViewport;
  start(): void;
  showOverlay(component: TerminalComponentPort, options?: TerminalOverlayOptions): TerminalOverlayHandle;
  hasOverlay(): boolean;
  hasFocusedOverlay(): boolean;
  writeControl(data: string): void;
  freezePresentation(): void;
  beginPresentationHold(): () => void;
  addPreInputListener(listener: TerminalPreInputListener): () => void;
  addInputListener(listener: TerminalInputListener): () => void;
  switchMode(mode: "regular" | "fullscreen"): boolean;
  setHardwareCursor(enabled: boolean): void;
  setClearOnShrink(enabled: boolean): void;
  setWheelScrollLines(lines: TerminalWheelScrollLines): void;
  setTerminalProgress(active: boolean): void;
  setProgramStatus(status: TerminalProgramStatus): void;
  setTitle(title: string): void;
  writeAfterStop(text: string): void;
  invalidate(): void;
  requestRender(force?: boolean): void;
  renderNow(force?: boolean): void;
  stop(options?: TerminalStopOptions): Promise<void>;
  dispose(options?: TerminalStopOptions): Promise<void>;
}

/** Builds the terminal runtime and its helpers; the vendor TUI adapter implements it. */
export interface TerminalRuntimeFactory {
  createRuntime(options: TerminalRuntimeOptions): TerminalRuntimePort;
  createDamageTerminal(terminal: TerminalPort, options: TerminalDamageOptions): TerminalDamagePort;
  /** Whether input on a surface may be applied before the current presentation completes. */
  classifyInput(data: string, surface: TerminalInputSurfaceKind): TerminalInputCoordinationDecision;
  /** Decodes an enhanced-keyboard sequence to the legacy byte form, or "" for a key release. */
  legacyKeyInput(data: string): string;
  /** Rebases a painted row's default background onto the given background sequence. */
  rebaseDefaultBackground(content: string, backgroundAnsi: string): string;
}
