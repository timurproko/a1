import type { OwnedUiViewportSettings } from "../../../contracts/owned-ui/index.js";
import {
  TranscriptViewport,
  routeMouseInput,
  scrollForTrackPage,
  scrollForThumbRow,
  scrollbarSelectionRows,
  scrollbarWheelRows,
  type TranscriptViewportFrame,
  type TranscriptViewportFrameInput,
} from "../../../ui/components/index.js";
import type { PiShellEditorPort } from "../components/index.js";

export interface SessionViewportControllerOptions {
  readonly enabled: boolean;
  readonly editor: PiShellEditorPort;
  readonly requestRender: (force?: boolean) => void;
  /** Whether mutable editor URL chips need an immediate forced repaint on deletion. */
  readonly hasEditorLinks?: () => boolean;
}

export interface SessionViewportInputResult {
  readonly data: string;
  readonly consumed: boolean;
  readonly copyText?: string;
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
  readonly #viewport = new TranscriptViewport();
  #config: OwnedUiViewportSettings = {
    scrollbarAppearance: "auto",
    scrollbarStyle: "thin",
    scrollbarSpeed: "normal",
  };
  #dragGrabOffset: number | null = null;
  /** A left-button sequence begun in status/editor/footer chrome is swallowed. */
  #dockPointerSuppressed = false;
  /** True only while the editor owns a held left mouse button. */
  #editorPointerSelecting = false;
  /** Last composed terminal rows occupied by the default prompt editor. */
  #editorPointerFrame: { readonly rowStart: number; readonly rowEnd: number } | undefined;
  #selectionAutoScrollTimer: ReturnType<typeof setTimeout> | undefined;
  #selectionAutoScrollPointer: { readonly column: number; readonly row: number } | undefined;
  #activityTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: SessionViewportControllerOptions) {
    this.#enabled = options.enabled;
    this.#editor = options.editor;
    this.#requestRender = options.requestRender;
    this.#hasEditorLinks = options.hasEditorLinks ?? (() => false);
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

  setEditorPointerFrame(frame: { readonly rowStart: number; readonly rowEnd: number } | undefined): void {
    this.#editorPointerFrame = frame;
  }

  compose(input: TranscriptViewportFrameInput): TranscriptViewportFrame {
    this.#viewport.setConfig(this.#config);
    return this.#viewport.compose(input);
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
    this.#clearActivityTimer();
    this.#stopSelectionAutoScroll();
    this.#editorPointerSelecting = false;
    this.#editorPointerFrame = undefined;
    this.#viewport.reset();
  }

  clearPointerState(): void {
    this.#clearActivityTimer();
    this.#dragGrabOffset = null;
    this.#dockPointerSuppressed = false;
    this.#editorPointerSelecting = false;
    this.#editorPointerFrame = undefined;
    this.#stopSelectionAutoScroll();
    this.#viewport.clearSelection();
    this.#viewport.clearTransient();
  }

  handlePreInput(data: string, allowWheel = true, now = Date.now()): SessionViewportInputResult {
    if (!this.#enabled) return { data, consumed: false };
    // Pi components share one keybinding manager. Restore bare A1's aliases
    // before the focused vanilla editor handles this input.
    this.#editor.activateKeybindings();
    // Handle the physical paste chord at the pre-input boundary. Windows
    // terminals vary between forwarding Ctrl+V and terminal-owned bracketed paste.
    if (this.#editor.matchesTerminalKey(data, "ctrl+v") && this.#editor.pasteClipboard()) {
      return { data: "", consumed: true };
    }
    // URL chip deletion must overwrite terminal link cells in the same frame.
    if (EDITOR_LINK_DELETION_INPUTS.has(data) && this.#hasEditorLinks()) this.#requestRender(true);
    if (this.#viewport.frame === null) return { data, consumed: false };
    if (data === "\u0003") {
      if (this.#editor.hasSelection()) {
        if (this.#viewport.clearSelection()) this.#requestRender();
      } else {
        const copyText = this.#viewport.selectedText();
        if (copyText !== null && copyText.length > 0) {
          this.#viewport.clearSelection();
          this.#requestRender();
          return { data: "", consumed: true, copyText };
        }
      }
    }
    if (allowWheel && this.#editor.matchesTerminalKey(data, "home")) {
      if (this.#viewport.scrollTo(0, now)) {
        this.#scheduleActivityExpiry();
        this.#requestRender();
      }
      return { data: "", consumed: true };
    }
    if (allowWheel && this.#editor.matchesTerminalKey(data, "end")) {
      if (!this.#viewport.followingEnd) {
        this.#viewport.scrollToEnd(now);
        this.#scheduleActivityExpiry();
        this.#requestRender();
      }
      return { data: "", consumed: true };
    }
    if (allowWheel && (SHIFT_UP_INPUTS.has(data) || SHIFT_DOWN_INPUTS.has(data))) {
      const scrolled = SHIFT_UP_INPUTS.has(data)
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
    const routed = routeMouseInput(data, event => {
      const hits = frame.hits;
      const overRail = hits.rail !== null
        && event.column === hits.rail.column
        && event.row >= hits.rail.rowStart
        && event.row < hits.rail.rowStart + hits.rail.trackHeight;
      const overSticky = hits.sticky !== null && event.row === hits.sticky.row && event.column <= hits.sticky.width;
      const overBottom = hits.bottom !== null && event.row === hits.bottom.row
        && event.column >= hits.bottom.columnStart && event.column <= hits.bottom.columnEnd;

      if (event.kind === "motion") {
        this.#viewport.setRailHovered(overRail);
        this.#viewport.setStickyHovered(overSticky);
        this.#viewport.setBottomHovered(overBottom);
        repaint = true;
        if (this.#editor.ownsPointer() && this.#editorPointerFrame !== undefined) {
          this.#editor.handlePointer({
            kind: "motion",
            button: event.button,
            column: event.column,
            row: event.row - this.#editorPointerFrame.rowStart + 1,
          });
          return true;
        }
        if (this.#dockPointerSuppressed) return true;
        if (this.#viewport.selectionActive) {
          this.#viewport.extendSelection(event.column, event.row, now, false);
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
        const editorFrame = this.#editorPointerFrame;
        if (event.button === 2 && editorFrame !== undefined
          && event.row >= editorFrame.rowStart && event.row <= editorFrame.rowEnd) {
          this.#stopSelectionAutoScroll();
          if (this.#viewport.clearSelection()) repaint = true;
          this.#editor.pasteClipboard();
          this.#dockPointerSuppressed = true;
          repaint = true;
          return true;
        }
        if (event.button !== 0) return false;
        this.#stopSelectionAutoScroll();
        if (this.#viewport.clearSelection()) repaint = true;
        if (overBottom) {
          this.#viewport.scrollToEnd(now);
          activity = true;
          repaint = true;
          return true;
        }
        if (overSticky && hits.sticky !== null) {
          this.#viewport.scrollTo(hits.sticky.target, now);
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
          }
          activity = true;
          repaint = true;
          return true;
        }
        if (editorFrame !== undefined && event.row >= editorFrame.rowStart && event.row <= editorFrame.rowEnd) {
          const handled = this.#editor.handlePointer({
            kind: "press",
            button: event.button,
            column: event.column,
            row: event.row - editorFrame.rowStart + 1,
          });
          if (!handled) this.#dockPointerSuppressed = true;
          this.#editorPointerSelecting = handled;
          repaint = true;
          return true;
        }
        if (event.row > hits.viewportHeight) {
          this.#dockPointerSuppressed = true;
          return true;
        }
        if (event.row >= 1 && event.row <= hits.viewportHeight && event.column <= frame.contentWidth) {
          this.#viewport.pressSelection(event.column, event.row, now);
          repaint = true;
          return true;
        }
        return false;
      }
      if (event.kind === "release") {
        if (this.#editor.ownsPointer() && this.#editorPointerFrame !== undefined) {
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
          // Restore OSC 8 links only after the held-button selection paint has
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
      }
      return false;
    });
    if (activity) this.#scheduleActivityExpiry();
    if (repaint) this.#requestRender(forceRepaint);
    return routed;
  }

  #updateSelectionAutoScroll(column: number, row: number, viewportHeight: number): void {
    const beyondEdge = row <= 1 || row > viewportHeight;
    if (!beyondEdge) {
      this.#stopSelectionAutoScroll();
      return;
    }
    this.#selectionAutoScrollPointer = { column, row };
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
      this.#viewport.extendSelection(pointer.column, pointer.row);
      if (this.#viewport.scrollTop === previous) break;
    }
    if (this.#viewport.scrollTop === before) {
      this.#stopSelectionAutoScroll();
      return;
    }
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
