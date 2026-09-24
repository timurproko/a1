import { samePointerSurfaces } from "../../integrations/pi/tui-runtime/overlay-geometry.js";
import type { PiTuiPointerSurface } from "../../integrations/pi/tui-runtime/contracts.js";
import type { OwnedUiViewportSettings } from "../../contracts/owned-ui/index.js";
import { TranscriptViewport, type TranscriptViewportFrame, type TranscriptViewportFrameInput } from "../../ui/components/transcript-viewport.js";
import { readVisibleHyperlinks } from "../../ui/components/visible-hyperlinks.js";
import { routeMouseInput } from "../../ui/components/mouse.js";
import { scrollForTrackPage, scrollForThumbRow, scrollbarSelectionRows, scrollbarWheelRows } from "../../ui/components/scrollbar.js";
import type { SelectionCopySnapshot } from "../../ui/components/selection-copy.js";
import type { PiShellEditorPort } from "../../integrations/pi/components/shell-shared-facade.js";
import type { PasteEvent } from "./paste-protocol.js";

export interface SessionViewportControllerOptions {
  readonly enabled: boolean;
  readonly editor: PiShellEditorPort;
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
}

/**
 * Owns the stateful interaction policy of the bare-A1 session viewport. The
 * shell root supplies semantic rows and dock geometry; this controller owns
 * follow state, selection, pointer latches, timers, and input routing.
 */
export class SessionViewportController {
  readonly #enabled: boolean;
  readonly #editor: PiShellEditorPort;
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
  #dragGrabOffset: number | null = null;
  #inputSurface: PiTuiPointerSurface | undefined;
  #inputSurfacePending = false;
  #overlays: readonly PiTuiPointerSurface[] | null = [];
  #pointerOwner: PiTuiPointerSurface | "viewport" | "drain" | undefined;
  // Invariant: a right-click editor gesture remains owned by the dock.
  #dockPointerSuppressed = false;
  // Invariant: a gesture begun on an explicit control remains owned by that control.
  #tailPointerSuppressed = false;
  // Invariant: editor selection remains true only while its left button is held.
  #editorPointerSelecting = false;
  // Invariant: no-drag editor presses replay on release; distinct motion promotes frame selection.
  #pendingEditorClick: { readonly column: number; readonly row: number } | undefined;
  // Invariant: pointer routing uses the most recently composed editor rows.
  #editorPointerFrame: { readonly rowStart: number; readonly rowEnd: number } | undefined;
  #selectionAutoScrollTimer: ReturnType<typeof setTimeout> | undefined;
  #selectionAutoScrollPointer: { readonly column: number; readonly row: number; readonly direction: -1 | 1 } | undefined;
  #pointerPosition: { readonly column: number; readonly row: number } | undefined;
  #hoveredHyperlinkKey: string | undefined;
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
  }

  get config(): OwnedUiViewportSettings {
    return this.#config;
  }

  get editorPointerSelecting(): boolean {
    return this.#editorPointerSelecting;
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
    return this.#pointerPosition;
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

  /** Replacement input changed before its new bounds have been painted. */
  invalidateInputSurface(): void {
    this.#inputSurfacePending = true;
    this.#cancelGesture();
  }

  setInputSurfaceFrame(surface: PiTuiPointerSurface | undefined): void {
    if (!samePointerSurfaces(this.#inputSurface === undefined ? [] : [this.#inputSurface], surface === undefined ? [] : [surface])) {
      this.#cancelGesture();
    }
    this.#inputSurface = surface;
    this.#inputSurfacePending = false;
  }

  setOverlaySurfaces(surfaces: readonly PiTuiPointerSurface[] | null): void {
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
      ...(this.#pointerPosition === undefined ? {} : { pointerPosition: this.#pointerPosition }),
      ...(coveredCells.length === 0 ? {} : { coveredCells }),
    });
    // Concurrency: if selection changed during composition, this frame truthfully carries
    // the older revision and exactly one ordinary follow-up render publishes the latest.
    if (this.#viewport.selectionRevision !== selectionRevision
      && this.#lastRequestedSelectionRevision < this.#viewport.selectionRevision) {
      this.#lastRequestedSelectionRevision = this.#viewport.selectionRevision;
      this.#requestRender();
    }
    if (this.#pointerPosition !== undefined && !this.#viewport.selectionActive && !this.#editorPointerSelecting) {
      const next = this.#hyperlinkKeyAt(frame, this.#pointerPosition.column, this.#pointerPosition.row);
      if (this.#hoveredHyperlinkKey !== undefined && next !== this.#hoveredHyperlinkKey) {
        // Platform: Windows Terminal can leave its solid native-hover underline behind
        // when a following viewport moves the link away from a stationary pointer.
        this.#requestHyperlinkCleanup([this.#pointerPosition.row]);
        this.#requestRender();
      }
      this.#hoveredHyperlinkKey = next;
    }
    return frame;
  }

  composeDockOnly(dockRows: readonly string[], width: number, height: number): TranscriptViewportFrame | null {
    return this.#viewport.composeDockOnly(dockRows, width, height);
  }

  /** Returns true when document wrapping may have changed. */
  setConfig(config: OwnedUiViewportSettings): boolean {
    const appearanceChanged = config.scrollbarAppearance !== this.#config.scrollbarAppearance;
    this.#config = config;
    this.#viewport.setConfig(config);
    this.#requestRender();
    return appearanceChanged;
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
    this.#editorPointerSelecting = false;
    this.#pendingEditorClick = undefined;
    this.#editorPointerFrame = undefined;
    this.#pointerPosition = undefined;
    this.#hoveredHyperlinkKey = undefined;
    this.#viewport.reset();
    this.#pointerOwner = undefined;
    this.#dragGrabOffset = null;
    this.#dockPointerSuppressed = false;
    this.#tailPointerSuppressed = false;
  }

  clearPointerState(): void {
    this.#presentationRevision += 1;
    this.#clearActivityTimer();
    this.#dragGrabOffset = null;
    this.#dockPointerSuppressed = false;
    this.#tailPointerSuppressed = false;
    this.#editorPointerSelecting = false;
    this.#pendingEditorClick = undefined;
    this.#editorPointerFrame = undefined;
    this.#pointerPosition = undefined;
    this.#hoveredHyperlinkKey = undefined;
    this.#stopSelectionAutoScroll();
    this.#viewport.clearSelection();
    this.#viewport.clearTransient();
    this.#pointerOwner = undefined;
  }

  #emitPasteRoute(request: number, phase: Extract<PasteEvent["phase"], "shortcut-received" | "shortcut-matched" | "shortcut-admitted" | "pointer-admitted">): void {
    try { this.#pasteDiagnostics?.({ request, phase, atMs: performance.now(), pending: 0 }); }
    catch { /* Invariant: payload-free diagnostics cannot interfere with input routing. */ }
  }

  #cancelGesture(): void {
    const held = this.#pointerOwner !== undefined || this.#viewport.selectionActive || this.#editorPointerSelecting;
    const repaint = this.#viewport.hasSelection || held;
    if (!repaint && this.#pointerPosition === undefined && this.#hoveredHyperlinkKey === undefined) return;
    const editorFrame = this.#editorPointerFrame;
    this.clearPointerState();
    this.#editorPointerFrame = editorFrame;
    if (held) this.#pointerOwner = "drain";
    if (repaint) this.#requestRender();
  }

  handlePreInput(data: string, allowWheel = true, now = Date.now(), editorActive = true): SessionViewportInputResult {
    if (!this.#enabled) return { data, consumed: false };
    let pasteRequest: number | undefined;
    if (editorActive && data === "\u0016") {
      pasteRequest = this.#nextPasteDiagnosticRequest();
      this.#emitPasteRoute(pasteRequest, "shortcut-received");
    }
    // Compatibility: Pi components share one keybinding manager. Restore bare A1's aliases
    // before the focused vanilla editor handles this input.
    if (editorActive) this.#editor.activateKeybindings();
    // Protocol: bracketed paste is opaque input, even if its text resembles mouse reports.
    if (data.startsWith("\u001b[200~")) return { data, consumed: false };
    // Platform: handle the physical paste chord at the pre-input boundary. Windows
    // terminals vary between forwarding Ctrl+V and terminal-owned bracketed paste.
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
    // Invariant: content shortcuts never reach the prompt, even before the first frame
    // or when scrolling is a no-op. Plain Home/End remain editor line navigation.
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
    if (this.#viewport.frame === null) {
      // Invariant: a not-yet-painted A1 screen is not Pi's selection surface.
      return routeMouseInput(data, event => {
        if (event.kind === "press" && event.button === 0) this.#tailPointerSuppressed = true;
        if (event.kind === "release") this.#tailPointerSuppressed = false;
        return event.kind === "motion" || event.kind === "release" || (event.kind === "press" && event.button === 0);
      });
    }
    if (data === "\u0003") {
      if (editorActive && this.#editor.hasSelection()) {
        if (this.#viewport.clearSelection()) this.#requestRender();
      } else {
        const copySelection = this.#viewport.captureSelectedText();
        if (copySelection !== null) {
          this.#viewport.clearSelection();
          this.#stopSelectionAutoScroll();
          this.#requestRender();
          return { data: "", consumed: true, copySelection };
        }
      }
    }
    const previousPrompt = SHIFT_UP_INPUTS.has(data) || this.#editor.matchesTerminalKey(data, "alt+home");
    if (editorActive && allowWheel && (previousPrompt || SHIFT_DOWN_INPUTS.has(data))) {
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

    const frame = this.#viewport.frame;
    let repaint = false;
    let forceRepaint = false;
    let activity = false;
    let completedCopy: SelectionCopySnapshot | undefined;
    const routed = routeMouseInput(data, (event, report) => {
      const hits = frame.hits;
      const overModal = this.#modalAt(event.column, event.row);
      const wheel = event.kind === "wheel-up" || event.kind === "wheel-down";
      // Invariant: ownership is latched for a complete gesture. Modal reports bypass the outer
      // fullscreen selection layer without ever invoking the hidden ordinary editor.
      if (this.#pointerOwner === "drain" || !this.inputGeometryReady) {
        if (event.kind === "release") this.#pointerOwner = undefined;
        else if (event.kind === "press") this.#pointerOwner = "drain";
        return true;
      }
      const owner = !wheel && this.#pointerOwner !== undefined ? this.#pointerOwner : overModal;
      if (owner !== undefined && owner !== "viewport") {
        if (event.kind === "press") this.#pointerOwner = owner;
        if (event.kind === "release") this.#pointerOwner = undefined;
        if (event.kind === "press" && this.#viewport.clearSelection()) repaint = true;
        this.#viewport.setRailHovered(false);
        this.#viewport.setStickyHovered(false);
        this.#pointerPosition = undefined;
        owner.component.handleInput?.(report);
        repaint = true;
        return true;
      }
      if (event.kind === "press") this.#pointerOwner = "viewport";
      if (event.kind === "release") this.#pointerOwner = undefined;
      const overRail = overModal === undefined && hits.rail !== null
        && event.column === hits.rail.column
        && event.row >= hits.rail.rowStart
        && event.row < hits.rail.rowStart + hits.rail.trackHeight;
      const overSticky = overModal === undefined && hits.sticky !== null && event.row === hits.sticky.row && event.column <= hits.sticky.width;
      const overBottom = overModal === undefined && hits.bottom !== null && event.row === hits.bottom.row
        && event.column >= hits.bottom.columnStart && event.column <= hits.bottom.columnEnd;

      const previousPointer = this.#pointerPosition;
      const wasOverBottom = hits.bottom !== null && previousPointer !== undefined
        && previousPointer.row === hits.bottom.row
        && previousPointer.column >= hits.bottom.columnStart && previousPointer.column <= hits.bottom.columnEnd;
      // Invariant: every report locates the pointer, independently of which surface owns the action.
      // Keep this location while the control is hidden; composition resolves its next hit region.
      this.#pointerPosition = { column: event.column, row: event.row };
      repaint ||= wasOverBottom !== overBottom;
      if (!this.#viewport.selectionActive && !this.#editorPointerSelecting) {
        const nextHyperlink = this.#hyperlinkKeyAt(frame, event.column, event.row);
        if (this.#hoveredHyperlinkKey !== undefined && nextHyperlink !== this.#hoveredHyperlinkKey) {
          // Platform: overwrite Windows Terminal's cached native-hover underline exactly once.
          this.#requestHyperlinkCleanup(previousPointer === undefined ? undefined : [previousPointer.row]);
          repaint = true;
        }
        this.#hoveredHyperlinkKey = nextHyperlink;
      }

      if (event.kind === "motion") {
        this.#viewport.setRailHovered(overRail);
        this.#viewport.setStickyHovered(overSticky);
        repaint = true;
        if (editorActive && this.#editor.ownsPointer() && this.#editorPointerFrame !== undefined) {
          this.#editor.handlePointer({
            kind: "motion",
            button: event.button,
            column: event.column,
            row: event.row - this.#editorPointerFrame.rowStart + 1,
          });
          return true;
        }
        if (this.#dockPointerSuppressed || this.#tailPointerSuppressed) return true;
        if (this.#viewport.selectionActive) {
          this.#viewport.extendSelection(event.column, event.row, now, false);
          if (this.#pendingEditorClick !== undefined
            && (event.column !== this.#pendingEditorClick.column || event.row !== this.#pendingEditorClick.row)) {
            this.#pendingEditorClick = undefined;
          }
          this.#updateSelectionAutoScroll(event.column, event.row, hits.viewportHeight);
          activity = true;
          return true;
        }
        if (this.#dragGrabOffset !== null && hits.rail !== null) {
          const target = scrollForThumbRow(hits.rail.geometry, event.row - hits.rail.rowStart - this.#dragGrabOffset);
          this.#viewport.scrollTo(target, now);
          activity = true;
          return true;
        }
        return overRail || overSticky || overBottom;
      }
      if (event.kind === "wheel-up" || event.kind === "wheel-down") {
        if (!allowWheel || event.row < 1 || event.row > hits.viewportHeight) return false;
        const distance = scrollbarWheelRows(this.#config.scrollbarSpeed);
        this.#viewport.scrollBy(event.kind === "wheel-up" ? -distance : distance, now);
        activity = true;
        repaint = true;
        forceRepaint = true;
        return true;
      }
      if (event.kind === "press") {
        const editorFrame = editorActive ? this.#editorPointerFrame : undefined;
        if (event.button === 2 && editorFrame !== undefined
          && event.row >= editorFrame.rowStart && event.row <= editorFrame.rowEnd) {
          this.#stopSelectionAutoScroll();
          if (this.#viewport.clearSelection()) repaint = true;
          const request = this.#nextPasteDiagnosticRequest();
          if (this.#editor.pasteClipboard()) this.#emitPasteRoute(request, "pointer-admitted");
          this.#dockPointerSuppressed = true;
          repaint = true;
          return true;
        }
        if (event.button !== 0) return false;
        this.#dockPointerSuppressed = false;
        this.#tailPointerSuppressed = false;
        this.#pendingEditorClick = undefined;
        this.#stopSelectionAutoScroll();
        if (this.#viewport.clearSelection()) repaint = true;
        if (overBottom) {
          this.#viewport.scrollToEnd(now);
          this.#tailPointerSuppressed = true;
          activity = true;
          repaint = true;
          return true;
        }
        if (overSticky && hits.sticky !== null) {
          this.#viewport.scrollTo(hits.sticky.target, now);
          this.#tailPointerSuppressed = true;
          activity = true;
          repaint = true;
          return true;
        }
        if (overRail && hits.rail !== null) {
          const trackRow = event.row - hits.rail.rowStart;
          const geometry = hits.rail.geometry;
          if (trackRow >= geometry.thumbTop && trackRow < geometry.thumbTop + geometry.thumbHeight) {
            this.#dragGrabOffset = trackRow - geometry.thumbTop;
            this.#viewport.setRailDragging(true);
          } else {
            this.#viewport.scrollTo(scrollForTrackPage(geometry, trackRow, frame.scrollTop, hits.viewportHeight), now);
            this.#tailPointerSuppressed = true;
          }
          activity = true;
          repaint = true;
          return true;
        }
        if (event.row >= 1 && event.row <= frame.rows.length && event.column <= frame.descriptor.width) {
          if (editorFrame !== undefined && event.row >= editorFrame.rowStart && event.row <= editorFrame.rowEnd) {
            this.#pendingEditorClick = { column: event.column, row: event.row };
          }
          // Invariant: frame selection includes transient and dock rows without changing
          // semantic ownership; no-drag editor presses replay on release.
          this.#viewport.pressSelection(event.column, event.row, now);
          repaint = true;
          return true;
        }
        this.#tailPointerSuppressed = true;
        return true;
      }
      if (event.kind === "release") {
        if (editorActive && this.#editor.ownsPointer() && this.#editorPointerFrame !== undefined) {
          const wasEditorSelecting = this.#editorPointerSelecting;
          this.#editor.handlePointer({
            kind: "release",
            button: event.button,
            column: event.column,
            row: event.row - this.#editorPointerFrame.rowStart + 1,
          });
          this.#editorPointerSelecting = false;
          forceRepaint ||= wasEditorSelecting;
          repaint = true;
          return true;
        }
        if (this.#viewport.releaseSelection()) {
          this.#stopSelectionAutoScroll();
          const pendingEditorClick = this.#pendingEditorClick;
          this.#pendingEditorClick = undefined;
          if (pendingEditorClick !== undefined && this.#editorPointerFrame !== undefined) {
            this.#viewport.clearSelection();
            const editorRow = pendingEditorClick.row - this.#editorPointerFrame.rowStart + 1;
            this.#editor.handlePointer({ kind: "press", button: 0, column: pendingEditorClick.column, row: editorRow });
            this.#editor.handlePointer({ kind: "release", button: 0, column: pendingEditorClick.column, row: editorRow });
          } else if (this.#copyOnSelect) {
            completedCopy = this.#viewport.captureSelectedText() ?? undefined;
          }
          // Platform: restore OSC 8 links only after the held-button selection paint has
          // ended, then overwrite any terminal-cached hover cells immediately.
          forceRepaint = true;
          repaint = true;
          return true;
        }
        if (this.#dragGrabOffset !== null) {
          this.#dragGrabOffset = null;
          this.#viewport.setRailDragging(false);
          repaint = true;
          return true;
        }
        if (this.#dockPointerSuppressed) {
          this.#dockPointerSuppressed = false;
          return true;
        }
        if (this.#tailPointerSuppressed) {
          this.#tailPointerSuppressed = false;
          return true;
        }
      }
      return false;
    });
    if (activity) this.#scheduleActivityExpiry();
    if (repaint) {
      this.#lastRequestedSelectionRevision = this.#viewport.selectionRevision;
      this.#requestRender(forceRepaint);
    }
    return completedCopy === undefined ? routed : { ...routed, copySelection: completedCopy };
  }

  #modalAt(column: number, row: number): PiTuiPointerSurface | undefined {
    const contains = (surface: PiTuiPointerSurface) => column >= surface.columnStart && column <= surface.columnEnd
      && row >= surface.rowStart && row <= surface.rowEnd;
    const overlay = this.#overlays?.findLast(contains);
    return overlay ?? (this.#inputSurface !== undefined && contains(this.#inputSurface) ? this.#inputSurface : undefined);
  }

  #hyperlinkKeyAt(frame: TranscriptViewportFrame, column: number, row: number): string | undefined {
    if (row < 1 || row > frame.rows.length || column < 1) return undefined;
    const range = readVisibleHyperlinks(frame.rows[row - 1] ?? "").ranges
      .find(candidate => column - 1 >= candidate.from && column - 1 < candidate.to);
    return range === undefined ? undefined : JSON.stringify([row, range]);
  }

  #updateSelectionAutoScroll(column: number, row: number, frameHeight: number): void {
    const beyondEdge = row <= 1 || row >= frameHeight;
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
const SHIFT_UP_INPUTS = new Set(["\u001b[1;2A"]);
const SHIFT_DOWN_INPUTS = new Set(["\u001b[1;2B"]);
