import type { OwnedUiShellEditorPort } from "../../contracts/owned-ui/index.js";
import type { TerminalPointerSurface } from "../../contracts/presentation/index.js";
import { samePointerSurfaces } from "../../contracts/presentation/index.js";
import type { OwnedUiViewportSettings } from "../../contracts/owned-ui/index.js";
import { TranscriptViewport, type TranscriptViewportFrame, type TranscriptViewportFrameInput } from "../../ui/components/transcript-viewport.js";
import { scrollbarSelectionRows } from "../../ui/components/scrollbar.js";
import type { SelectionCopySnapshot } from "../../ui/components/selection-copy.js";
import type { PasteEvent } from "./paste-protocol.js";
import { ViewportPointerGestures, withinTailControl, type TailControl, type TailControlRegion } from "./viewport-pointer.js";


interface SessionViewportControllerOptions {
  readonly enabled: boolean;
  readonly editor: OwnedUiShellEditorPort;
  readonly requestRender: (force?: boolean) => void;
  readonly requestHyperlinkCleanup?: (rows?: readonly number[]) => void;
  /** Whether mutable editor URL chips need targeted link-cell cleanup on deletion. */
  readonly hasEditorLinks?: () => boolean;
  /** Payload-free first-use paste routing observations. */
  readonly pasteDiagnostics?: (event: PasteEvent) => void;
  readonly nextPasteDiagnosticRequest?: () => number;
}

export interface SessionViewportInputResult {
  readonly data: string;
  readonly consumed: boolean;
  readonly copySelection?: SelectionCopySnapshot;
  readonly copyLastMessage?: true;
}

/**
 * Owns the stateful interaction policy of the bare-A1 session viewport. The
 * shell root supplies semantic rows and dock geometry; this controller owns
 * follow state, selection, pointer latches, timers, and input routing.
 */
export class SessionViewportController {
  readonly #enabled: boolean;
  readonly #editor: OwnedUiShellEditorPort;
  readonly #requestRender: (force?: boolean) => void;
  readonly #hasEditorLinks: () => boolean;
  readonly #requestHyperlinkCleanup: (rows?: readonly number[]) => void;
  readonly #pasteDiagnostics: ((event: PasteEvent) => void) | undefined;
  readonly #nextPasteDiagnosticRequest: () => number;
  #pasteDiagnosticRequest = 0;
  readonly #viewport = new TranscriptViewport();
  #config: OwnedUiViewportSettings = {
    scrollbarAppearance: "auto",
    scrollbarStyle: "thin",
    scrollbarSpeed: "normal",
  };
  #inputSurface: TerminalPointerSurface | undefined;
  #inputSurfacePending = false;
  #overlays: readonly TerminalPointerSurface[] | null = [];
  // Invariant: pointer routing uses the most recently composed editor rows.
  #editorPointerFrame: { readonly rowStart: number; readonly rowEnd: number } | undefined;
  // Invariant: one clickable region in the viewport tail, located by the most recent composition.
  #tailControl: TailControl | undefined;
  #selectionAutoScrollTimer: ReturnType<typeof setTimeout> | undefined;
  #selectionAutoScrollPointer: { readonly column: number; readonly row: number; readonly direction: -1 | 1 } | undefined;
  readonly #gestures: ViewportPointerGestures;
  #lastRequestedSelectionRevision = -1;
  #presentationRevision = 0;
  #copyOnSelect = true;
  #activityTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: SessionViewportControllerOptions) {
    this.#enabled = options.enabled;
    this.#editor = options.editor;
    this.#requestRender = force => {
      this.#presentationRevision += 1;
      options.requestRender(force);
    };
    this.#hasEditorLinks = options.hasEditorLinks ?? (() => false);
    this.#requestHyperlinkCleanup = options.requestHyperlinkCleanup ?? (() => {});
    this.#pasteDiagnostics = options.pasteDiagnostics;
    this.#nextPasteDiagnosticRequest = options.nextPasteDiagnosticRequest ?? (() => --this.#pasteDiagnosticRequest);
    this.#gestures = new ViewportPointerGestures({
      viewport: this.#viewport,
      editor: this.#editor,
      config: () => this.#config,
      copyOnSelect: () => this.#copyOnSelect,
      inputGeometryReady: () => this.inputGeometryReady,
      modalAt: (column, row) => this.#modalAt(column, row),
      editorFrame: () => this.#editorPointerFrame,
      tailControl: () => this.#tailControl,
      clearTailControl: () => { this.#tailControl = undefined; },
      requestRender: () => { this.#requestRender(); },
      requestHyperlinkCleanup: rows => { this.#requestHyperlinkCleanup(rows); },
      updateSelectionAutoScroll: (column, row, viewportHeight, frameHeight) => { this.#updateSelectionAutoScroll(column, row, viewportHeight, frameHeight); },
      stopSelectionAutoScroll: () => { this.#stopSelectionAutoScroll(); },
      pasteFromPointer: () => {
        const request = this.#nextPasteDiagnosticRequest();
        if (this.#editor.pasteClipboard()) this.#emitPasteRoute(request, "pointer-admitted");
      },
    });
  }

  get config(): OwnedUiViewportSettings {
    return this.#config;
  }

  get editorPointerSelecting(): boolean {
    return this.#gestures.editorSelecting;
  }

  get transcriptPointerSelecting(): boolean {
    return this.#viewport.selectionActive;
  }

  get hasSelection(): boolean {
    return this.#viewport.hasSelection;
  }

  get selectionRevision(): number {
    return this.#viewport.selectionRevision;
  }

  get presentationRevision(): number {
    return this.#presentationRevision;
  }

  /** Latest reported coordinates; exposed without rendering for frame provenance and evidence. */
  get pointerPosition(): { readonly column: number; readonly row: number } | undefined {
    return this.#gestures.position;
  }

  setCopyOnSelect(enabled: boolean): void {
    this.#copyOnSelect = enabled;
  }

  get frame(): TranscriptViewportFrame | null {
    return this.#viewport.frame;
  }

  setEditorPointerFrame(frame: { readonly rowStart: number; readonly rowEnd: number } | undefined): void {
    this.#editorPointerFrame = frame;
  }

  /** The visible close control of a viewport-tail notice, or undefined when none is on screen. */
  setTailControl(control: TailControl | undefined): void {
    this.#tailControl = control;
  }

  /** Whether the pointer currently rests on the tail control; drives its hover paint. */
  tailControlHovered(target: TailControlRegion | undefined): boolean {
    const pointer = this.#gestures.position;
    return target !== undefined && pointer !== undefined && withinTailControl(target, pointer.column, pointer.row);
  }

  /** Replacement input changed before its new bounds have been painted. */
  invalidateInputSurface(): void {
    this.#inputSurfacePending = true;
    this.#cancelGesture();
  }

  setInputSurfaceFrame(surface: TerminalPointerSurface | undefined): void {
    if (!samePointerSurfaces(this.#inputSurface === undefined ? [] : [this.#inputSurface], surface === undefined ? [] : [surface])) {
      this.#cancelGesture();
    }
    this.#inputSurface = surface;
    this.#inputSurfacePending = false;
  }

  setOverlaySurfaces(surfaces: readonly TerminalPointerSurface[] | null): void {
    if (surfaces === this.#overlays || surfaces !== null && this.#overlays !== null && samePointerSurfaces(surfaces, this.#overlays)) return;
    this.#cancelGesture();
    this.#overlays = surfaces;
  }

  get inputGeometryReady(): boolean {
    return !this.#inputSurfacePending && this.#overlays !== null;
  }

  compose(input: Omit<TranscriptViewportFrameInput, "pointerPosition">): TranscriptViewportFrame {
    const previous = this.#viewport.frame;
    if ((this.#inputSurface !== undefined || this.#overlays === null || this.#overlays.length > 0)
      && previous !== null && (previous.rows.length !== input.height || previous.descriptor.width !== input.width
      || previous.hits.viewportHeight !== Math.max(0, input.height - input.dockRows.length))) this.#cancelGesture();
    this.#viewport.setConfig(this.#config);
    const selectionRevision = this.#viewport.selectionRevision;
    const coveredSurfaces = [
      ...(this.#overlays ?? []),
      ...(this.#inputSurface === undefined ? [] : [this.#inputSurface]),
    ];
    const coveredCells = coveredSurfaces.flatMap(surface =>
      Array.from({ length: Math.max(0, surface.rowEnd - surface.rowStart + 1) }, (_value, index) => ({
        row: surface.rowStart + index,
        columnStart: surface.columnStart,
        columnEnd: surface.columnEnd,
      })));
    const frame = this.#viewport.compose({
      ...input,
      ...(this.#gestures.position === undefined ? {} : { pointerPosition: this.#gestures.position }),
      ...(coveredCells.length === 0 ? {} : { coveredCells }),
    });
    // Concurrency: if selection changed during composition, this frame truthfully carries
    // the older revision and exactly one ordinary follow-up render publishes the latest.
    if (this.#viewport.selectionRevision !== selectionRevision
      && this.#lastRequestedSelectionRevision < this.#viewport.selectionRevision) {
      this.#lastRequestedSelectionRevision = this.#viewport.selectionRevision;
      this.#requestRender();
    }
    this.#gestures.refreshHover(frame);
    return frame;
  }

  composeDockOnly(
    dockRows: readonly string[],
    width: number,
    height: number,
    copyableDockRows: TranscriptViewportFrameInput["copyableDockRows"] = [],
  ): TranscriptViewportFrame | null {
    return this.#viewport.composeDockOnly(dockRows, width, height, copyableDockRows);
  }

  /** Returns true when document wrapping may have changed. */
  setConfig(config: OwnedUiViewportSettings): boolean {
    const layoutChanged = config.scrollbarAppearance !== this.#config.scrollbarAppearance;
    this.#config = config;
    this.#viewport.setConfig(config);
    this.#requestRender();
    return layoutChanged;
  }

  resumeFollowing(): void {
    if (!this.#enabled) return;
    this.#stopSelectionAutoScroll();
    const selectionChanged = this.#viewport.clearSelection();
    const scrolled = this.#viewport.scrollToEnd();
    if (scrolled) this.#scheduleActivityExpiry();
    if (scrolled || selectionChanged) this.#requestRender();
  }

  noteCompletedAssistantMessage(): void {
    if (!this.#enabled || !this.#viewport.noteNewMessage()) return;
    this.#requestRender();
  }

  reset(): void {
    this.#presentationRevision += 1;
    this.#clearActivityTimer();
    this.#stopSelectionAutoScroll();
    this.#gestures.clear();
    this.#editorPointerFrame = undefined;
    this.#viewport.reset();
  }

  clearPointerState(): void {
    this.#presentationRevision += 1;
    this.#clearActivityTimer();
    this.#gestures.clear();
    this.#editorPointerFrame = undefined;
    this.#stopSelectionAutoScroll();
    this.#viewport.clearSelection();
    this.#viewport.clearTransient();
  }

  #emitPasteRoute(request: number, phase: Extract<PasteEvent["phase"], "shortcut-received" | "shortcut-matched" | "shortcut-admitted" | "pointer-admitted">): void {
    try { this.#pasteDiagnostics?.({ request, phase, atMs: performance.now(), pending: 0 }); }
    catch { /* Invariant: payload-free diagnostics cannot interfere with input routing. */ }
  }

  #cancelGesture(): void {
    const held = this.#gestures.held;
    const repaint = this.#viewport.hasSelection || held;
    if (!repaint && this.#gestures.idle) return;
    const editorFrame = this.#editorPointerFrame;
    this.clearPointerState();
    this.#editorPointerFrame = editorFrame;
    if (held) this.#gestures.drain();
    if (repaint) this.#requestRender();
  }

  handlePreInput(data: string, allowWheel = true, now = Date.now(), editorActive = true): SessionViewportInputResult {
    if (!this.#enabled) return { data, consumed: false };
    let pasteRequest: number | undefined;
    if (editorActive && data === "\u0016") {
      pasteRequest = this.#nextPasteDiagnosticRequest();
      this.#emitPasteRoute(pasteRequest, "shortcut-received");
    }
    // Invariant: activate A1 aliases before editor input.
    if (editorActive) this.#editor.activateKeybindings();
    // Protocol: bracketed paste is opaque input, even if its text resembles mouse reports.
    if (data.startsWith("\u001b[200~")) return { data, consumed: false };
    // Platform: Windows terminals may forward Ctrl+V or terminal-owned paste.
    if (editorActive && this.#editor.matchesTerminalKey(data, "ctrl+v")) {
      pasteRequest ??= this.#nextPasteDiagnosticRequest();
      if (data !== "\u0016") this.#emitPasteRoute(pasteRequest, "shortcut-received");
      this.#emitPasteRoute(pasteRequest, "shortcut-matched");
      if (this.#editor.pasteClipboard()) {
        this.#emitPasteRoute(pasteRequest, "shortcut-admitted");
        return { data: "", consumed: true };
      }
    }
    // Platform: URL chip deletion must overwrite terminal link cells in the same frame.
    if (editorActive && EDITOR_LINK_DELETION_INPUTS.has(data) && this.#hasEditorLinks()) {
      this.#requestHyperlinkCleanup();
      this.#requestRender();
    }
    // Invariant: viewport shortcuts skip the prompt; Home/End do not.
    if (editorActive && allowWheel && this.#editor.matchesTerminalKey(data, "ctrl+home")) {
      if (this.#viewport.scrollTo(0, now)) {
        this.#scheduleActivityExpiry();
        this.#requestRender();
      }
      return { data: "", consumed: true };
    }
    if (editorActive && allowWheel && this.#editor.matchesTerminalKey(data, "ctrl+end")) {
      if (!this.#viewport.followingEnd) {
        this.#viewport.scrollToEnd(now);
        this.#scheduleActivityExpiry();
        this.#requestRender();
      }
      return { data: "", consumed: true };
    }
    if (data === "\u0018" && editorActive && !this.#viewport.hasSelection && !this.#editor.hasSelection()) {
      return { data: "", consumed: true, copyLastMessage: true };
    }
    if (this.#viewport.frame === null) return this.#gestures.routeUnpainted(data);
    if ((data === "\u0003" || data === "\u0018") && this.#viewport.hasSelection) {
      // Invariant: the newest frame selection wins over an older editor selection.
      const copySelection = this.#viewport.captureSelectedText();
      this.#viewport.clearSelection();
      this.#stopSelectionAutoScroll();
      this.#requestRender();
      return copySelection === null
        ? { data: "", consumed: true }
        : { data: "", consumed: true, copySelection };
    }
    const previousPrompt = PROMPT_UP_INPUTS.has(data) || this.#editor.matchesTerminalKey(data, "alt+home");
    if (editorActive && allowWheel && (previousPrompt || PROMPT_DOWN_INPUTS.has(data))) {
      const scrolled = previousPrompt
        ? this.#viewport.scrollToPreviousPrompt(now)
        : this.#viewport.scrollToNextPrompt(now);
      if (scrolled) {
        this.#scheduleActivityExpiry();
        this.#requestRender();
      }
      return { data: "", consumed: true };
    }
    if (!data.includes("\u001b[<") && data !== "\u0003" && this.#viewport.clearSelection()) {
      this.#requestRender();
    }

    const { routed, outcome } = this.#gestures.route(data, this.#viewport.frame, { allowWheel, now, editorActive });
    if (outcome.activity) this.#scheduleActivityExpiry();
    if (outcome.repaint) {
      this.#lastRequestedSelectionRevision = this.#viewport.selectionRevision;
      this.#requestRender(outcome.forceRepaint);
    }
    return outcome.completedCopy === undefined ? routed : { ...routed, copySelection: outcome.completedCopy };
  }

  #modalAt(column: number, row: number): TerminalPointerSurface | undefined {
    const contains = (surface: TerminalPointerSurface) => column >= surface.columnStart && column <= surface.columnEnd
      && row >= surface.rowStart && row <= surface.rowEnd;
    const overlay = this.#overlays?.findLast(contains);
    return overlay ?? (this.#inputSurface !== undefined && contains(this.#inputSurface) ? this.#inputSurface : undefined);
  }

  #updateSelectionAutoScroll(column: number, row: number, viewportHeight: number, frameHeight: number): void {
    // Invariant: the last content row stays selectable; only the pointer below it scrolls,
    // unless no row exists below. The top row scrolls because nothing lies above it. A
    // dock-originated gesture never moves the transcript behind the fixed dock.
    const beyondEdge = this.#viewport.selectionFromContent
      && (row <= 1 || row > viewportHeight || row >= frameHeight);
    if (!beyondEdge) {
      this.#stopSelectionAutoScroll();
      return;
    }
    this.#selectionAutoScrollPointer = { column, row, direction: row <= 1 ? -1 : 1 };
    if (this.#selectionAutoScrollTimer !== undefined) return;
    this.#selectionAutoScrollTimer = setTimeout(() => this.#selectionAutoScrollTick(), SELECTION_AUTO_SCROLL_INTERVAL_MS);
    this.#selectionAutoScrollTimer.unref?.();
  }

  #selectionAutoScrollTick(): void {
    this.#selectionAutoScrollTimer = undefined;
    const pointer = this.#selectionAutoScrollPointer;
    if (pointer === undefined || !this.#viewport.selectionActive) {
      this.#stopSelectionAutoScroll();
      return;
    }
    const before = this.#viewport.scrollTop;
    const rowsPerTick = scrollbarSelectionRows(this.#config.scrollbarSpeed);
    for (let row = 0; row < rowsPerTick; row += 1) {
      const previous = this.#viewport.scrollTop;
      this.#viewport.scrollBy(pointer.direction);
      this.#viewport.extendSelection(pointer.column, pointer.row, undefined, false);
      if (this.#viewport.scrollTop === previous) break;
    }
    if (this.#viewport.scrollTop === before) {
      this.#stopSelectionAutoScroll();
      return;
    }
    this.#lastRequestedSelectionRevision = this.#viewport.selectionRevision;
    this.#requestRender();
    this.#scheduleActivityExpiry();
    this.#selectionAutoScrollTimer = setTimeout(() => this.#selectionAutoScrollTick(), SELECTION_AUTO_SCROLL_INTERVAL_MS);
    this.#selectionAutoScrollTimer.unref?.();
  }

  #stopSelectionAutoScroll(): void {
    if (this.#selectionAutoScrollTimer !== undefined) clearTimeout(this.#selectionAutoScrollTimer);
    this.#selectionAutoScrollTimer = undefined;
    this.#selectionAutoScrollPointer = undefined;
  }

  #clearActivityTimer(): void {
    if (this.#activityTimer !== undefined) clearTimeout(this.#activityTimer);
    this.#activityTimer = undefined;
  }

  #scheduleActivityExpiry(): void {
    this.#clearActivityTimer();
    this.#activityTimer = setTimeout(() => {
      this.#activityTimer = undefined;
      this.#requestRender();
    }, 925);
    this.#activityTimer.unref?.();
  }
}

const SELECTION_AUTO_SCROLL_INTERVAL_MS = 30;
const EDITOR_LINK_DELETION_INPUTS = new Set(["\b", "\u007f", "\u001b[3~"]);
// Platform: Windows Terminal may consume Shift+Arrow for native selection. Ctrl+Arrow matches
// A1's Windows binding while retaining Shift+Arrow whenever the terminal delivers it.
const PROMPT_UP_INPUTS = new Set(["\u001b[1;2A", "\u001b[1;5A"]);
const PROMPT_DOWN_INPUTS = new Set(["\u001b[1;2B", "\u001b[1;5B"]);
