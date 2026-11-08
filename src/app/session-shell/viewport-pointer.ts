import type { OwnedUiShellEditorPort, OwnedUiViewportSettings } from "../../contracts/owned-ui/index.js";
import type { TerminalPointerSurface } from "../../contracts/presentation/index.js";
import { routeMouseInput, type RoutedMouseInput } from "../../ui/components/mouse.js";
import type { PaneMouseEvent } from "../../ui/components/pane.js";
import { scrollForThumbRow, scrollForTrackPage, scrollbarWheelRows } from "../../ui/components/scrollbar.js";
import type { SelectionCopySnapshot } from "../../ui/components/selection-copy.js";
import type { TranscriptViewport, TranscriptViewportFrame } from "../../ui/components/transcript-viewport.js";
import { readVisibleHyperlinks } from "../../ui/components/visible-hyperlinks.js";

/** One-based, inclusive terminal cells of a clickable viewport-tail control. */
export interface TailControlRegion {
  readonly rowStart: number;
  readonly rowEnd: number;
  readonly columnStart: number;
  readonly columnEnd: number;
}

export type TailControl = TailControlRegion & { readonly activate: () => void };

export function withinTailControl(region: TailControlRegion, column: number, row: number): boolean {
  return row >= region.rowStart && row <= region.rowEnd && column >= region.columnStart && column <= region.columnEnd;
}

export interface ViewportPointerPorts {
  readonly viewport: TranscriptViewport;
  readonly editor: OwnedUiShellEditorPort;
  config(): OwnedUiViewportSettings;
  copyOnSelect(): boolean;
  /** False while replacement input or overlay bounds have not been painted yet. */
  inputGeometryReady(): boolean;
  /** The topmost overlay or input surface under a cell. */
  modalAt(column: number, row: number): TerminalPointerSurface | undefined;
  /** The editor rows of the most recent composition. */
  editorFrame(): { readonly rowStart: number; readonly rowEnd: number } | undefined;
  tailControl(): TailControl | undefined;
  clearTailControl(): void;
  requestRender(): void;
  requestHyperlinkCleanup(rows?: readonly number[]): void;
  updateSelectionAutoScroll(column: number, row: number, viewportHeight: number, frameHeight: number): void;
  stopSelectionAutoScroll(): void;
  /** A right-click on the editor pastes the clipboard. */
  pasteFromPointer(): void;
}

/** How one input chunk's mouse reports changed the viewport. */
export interface ViewportPointerOutcome {
  repaint: boolean;
  forceRepaint: boolean;
  activity: boolean;
  completedCopy: SelectionCopySnapshot | undefined;
}

interface PointerCall {
  readonly allowWheel: boolean;
  readonly now: number;
  readonly editorActive: boolean;
}

interface PointerTarget {
  readonly frame: TranscriptViewportFrame;
  readonly overRail: boolean;
  readonly overSticky: boolean;
  readonly overBottom: boolean;
  readonly tailControl: TailControl | undefined;
  readonly overTailControl: boolean;
}

/**
 * The pointer gestures of the session viewport: which surface a gesture is latched to, the
 * suppression of a gesture begun on the dock or a control, the editor click that waits for drag
 * or release, the rail drag offset, the pointer position and the hovered link. Each report is
 * routed in the same order of checks, and its effect is reported as an outcome.
 */
export class ViewportPointerGestures {
  readonly #ports: ViewportPointerPorts;
  #dragGrabOffset: number | null = null;
  #owner: TerminalPointerSurface | "viewport" | "drain" | undefined;
  // Invariant: a right-click editor gesture remains owned by the dock.
  #dockSuppressed = false;
  // Invariant: a gesture begun on an explicit control remains owned by that control.
  #tailSuppressed = false;
  // Invariant: editor selection remains true only while its left button is held.
  #editorSelecting = false;
  // Invariant: no-drag editor presses replay on release; distinct motion promotes frame selection.
  #pendingEditorClick: { readonly column: number; readonly row: number } | undefined;
  #position: { readonly column: number; readonly row: number } | undefined;
  #hoveredHyperlinkKey: string | undefined;

  constructor(ports: ViewportPointerPorts) {
    this.#ports = ports;
  }

  get position(): { readonly column: number; readonly row: number } | undefined {
    return this.#position;
  }

  get editorSelecting(): boolean {
    return this.#editorSelecting;
  }

  /** A gesture is latched to a surface or a selection is being dragged. */
  get held(): boolean {
    return this.#owner !== undefined || this.#ports.viewport.selectionActive || this.#editorSelecting;
  }

  /** No pointer position or hovered link is remembered. */
  get idle(): boolean {
    return this.#position === undefined && this.#hoveredHyperlinkKey === undefined;
  }

  /** Forget every latch. */
  clear(): void {
    this.#dragGrabOffset = null;
    this.#dockSuppressed = false;
    this.#tailSuppressed = false;
    this.#editorSelecting = false;
    this.#pendingEditorClick = undefined;
    this.#position = undefined;
    this.#hoveredHyperlinkKey = undefined;
    this.#owner = undefined;
  }

  /** Swallow the rest of a held gesture until its release. */
  drain(): void {
    this.#owner = "drain";
  }

  /** Before the first paint, a left press and its motion and release belong to no surface. */
  routeUnpainted(data: string): RoutedMouseInput {
    // Invariant: a not-yet-painted A1 screen is not Pi's selection surface.
    return routeMouseInput(data, event => {
      if (event.kind === "press" && event.button === 0) this.#tailSuppressed = true;
      if (event.kind === "release") this.#tailSuppressed = false;
      return event.kind === "motion" || event.kind === "release" || (event.kind === "press" && event.button === 0);
    });
  }

  route(data: string, frame: TranscriptViewportFrame, call: PointerCall): { readonly routed: RoutedMouseInput; readonly outcome: ViewportPointerOutcome } {
    const outcome: ViewportPointerOutcome = { repaint: false, forceRepaint: false, activity: false, completedCopy: undefined };
    const routed = routeMouseInput(data, (event, report) => this.#report(event, report, frame, call, outcome));
    return { routed, outcome };
  }

  /** A newly composed frame may move a link away from a stationary pointer. */
  refreshHover(frame: TranscriptViewportFrame): void {
    const pointer = this.#position;
    if (pointer === undefined || this.#ports.viewport.selectionActive || this.#editorSelecting) return;
    const next = hyperlinkKeyAt(frame, pointer.column, pointer.row);
    if (this.#hoveredHyperlinkKey !== undefined && next !== this.#hoveredHyperlinkKey) {
      // Platform: Windows Terminal can leave its solid native-hover underline behind
      // when a following viewport moves the link away from a stationary pointer.
      this.#ports.requestHyperlinkCleanup([pointer.row]);
      this.#ports.requestRender();
    }
    this.#hoveredHyperlinkKey = next;
  }

  #report(event: PaneMouseEvent, report: string, frame: TranscriptViewportFrame, call: PointerCall, outcome: ViewportPointerOutcome): boolean {
    const viewport = this.#ports.viewport;
    const hits = frame.hits;
    const overModal = this.#ports.modalAt(event.column, event.row);
    const wheel = event.kind === "wheel-up" || event.kind === "wheel-down";
    // Invariant: latch each gesture to one surface.
    if (this.#owner === "drain" || !this.#ports.inputGeometryReady()) {
      if (event.kind === "release") this.#owner = undefined;
      else if (event.kind === "press") this.#owner = "drain";
      return true;
    }
    const owner = !wheel && this.#owner !== undefined ? this.#owner : overModal;
    if (owner !== undefined && owner !== "viewport") {
      if (event.kind === "press") this.#owner = owner;
      if (event.kind === "release") this.#owner = undefined;
      if (event.kind === "press" && viewport.clearSelection()) outcome.repaint = true;
      viewport.setRailHovered(false);
      viewport.setStickyHovered(false);
      this.#position = undefined;
      owner.component.handleInput?.(report);
      outcome.repaint = true;
      return true;
    }
    if (event.kind === "press") this.#owner = "viewport";
    if (event.kind === "release") this.#owner = undefined;
    const tailControl = this.#ports.tailControl();
    const target: PointerTarget = {
      frame,
      overRail: overModal === undefined && hits.rail !== null
        && event.column === hits.rail.column
        && event.row >= hits.rail.rowStart
        && event.row < hits.rail.rowStart + hits.rail.trackHeight,
      overSticky: overModal === undefined && hits.sticky !== null && event.row === hits.sticky.row && event.column <= hits.sticky.width,
      overBottom: overModal === undefined && hits.bottom !== null && event.row === hits.bottom.row
        && event.column >= hits.bottom.columnStart && event.column <= hits.bottom.columnEnd,
      tailControl,
      overTailControl: overModal === undefined && tailControl !== undefined
        && withinTailControl(tailControl, event.column, event.row),
    };
    this.#track(event, target, outcome);
    switch (event.kind) {
      case "motion": return this.#motion(event, target, call, outcome);
      case "wheel-up":
      case "wheel-down": return this.#wheel(event, frame, call, outcome);
      case "press": return this.#press(event, target, call, outcome);
      case "release": return this.#release(event, call, outcome);
    }
  }

  // Rationale: every report updates the pointer position, the hover of the bottom and tail controls, and the hovered link.
  #track(event: PaneMouseEvent, target: PointerTarget, outcome: ViewportPointerOutcome): void {
    const hits = target.frame.hits;
    const tailControl = target.tailControl;
    const previousPointer = this.#position;
    const wasOverBottom = hits.bottom !== null && previousPointer !== undefined
      && previousPointer.row === hits.bottom.row
      && previousPointer.column >= hits.bottom.columnStart && previousPointer.column <= hits.bottom.columnEnd;
    // Invariant: every report updates the pointer position.
    this.#position = { column: event.column, row: event.row };
    outcome.repaint ||= wasOverBottom !== target.overBottom;
    const wasOverTailControl = tailControl !== undefined && previousPointer !== undefined
      && withinTailControl(tailControl, previousPointer.column, previousPointer.row);
    outcome.repaint ||= wasOverTailControl !== target.overTailControl;
    if (!this.#ports.viewport.selectionActive && !this.#editorSelecting) {
      const nextHyperlink = hyperlinkKeyAt(target.frame, event.column, event.row);
      if (this.#hoveredHyperlinkKey !== undefined && nextHyperlink !== this.#hoveredHyperlinkKey) {
        // Platform: overwrite Windows Terminal's cached native-hover underline exactly once.
        this.#ports.requestHyperlinkCleanup(previousPointer === undefined ? undefined : [previousPointer.row]);
        outcome.repaint = true;
      }
      this.#hoveredHyperlinkKey = nextHyperlink;
    }
  }

  #motion(event: PaneMouseEvent, target: PointerTarget, call: PointerCall, outcome: ViewportPointerOutcome): boolean {
    const viewport = this.#ports.viewport;
    const { frame } = target;
    const hits = frame.hits;
    viewport.setRailHovered(target.overRail);
    viewport.setStickyHovered(target.overSticky);
    outcome.repaint = true;
    const editorFrame = this.#ports.editorFrame();
    if (call.editorActive && this.#editorSelecting && editorFrame !== undefined) {
      this.#ports.editor.handlePointer({
        kind: "motion",
        button: event.button,
        column: event.column,
        row: event.row - editorFrame.rowStart + 1,
      });
      return true;
    }
    if (this.#dockSuppressed || this.#tailSuppressed) return true;
    const pendingEditorClick = this.#pendingEditorClick;
    if (pendingEditorClick !== undefined) {
      if (event.column === pendingEditorClick.column && event.row === pendingEditorClick.row) return true;
      this.#pendingEditorClick = undefined;
      const activeEditorFrame = call.editorActive ? editorFrame : undefined;
      if (activeEditorFrame !== undefined && this.#ports.editor.handlePointer({ kind: "press", button: 0, column: pendingEditorClick.column, row: pendingEditorClick.row - activeEditorFrame.rowStart + 1 })) {
        this.#editorSelecting = true;
        this.#ports.editor.handlePointer({ kind: "motion", button: event.button, column: event.column, row: event.row - activeEditorFrame.rowStart + 1 });
        return true;
      }
      viewport.pressSelection(pendingEditorClick.column, pendingEditorClick.row, call.now, { continueMultiClick: false });
      viewport.extendSelection(event.column, event.row, call.now, false);
      this.#ports.updateSelectionAutoScroll(event.column, event.row, hits.viewportHeight, frame.rows.length);
      outcome.activity = true;
      return true;
    }
    if (viewport.selectionActive) {
      viewport.extendSelection(event.column, event.row, call.now, false);
      this.#ports.updateSelectionAutoScroll(event.column, event.row, hits.viewportHeight, frame.rows.length);
      outcome.activity = true;
      return true;
    }
    if (this.#dragGrabOffset !== null && hits.rail !== null) {
      const scroll = scrollForThumbRow(hits.rail.geometry, event.row - hits.rail.rowStart - this.#dragGrabOffset);
      viewport.scrollTo(scroll, call.now);
      outcome.activity = true;
      return true;
    }
    return target.overRail || target.overSticky || target.overBottom || target.overTailControl;
  }

  #wheel(event: PaneMouseEvent, frame: TranscriptViewportFrame, call: PointerCall, outcome: ViewportPointerOutcome): boolean {
    if (!call.allowWheel || event.row < 1 || event.row > frame.hits.viewportHeight) return false;
    const distance = scrollbarWheelRows(this.#ports.config().scrollbarSpeed);
    this.#ports.viewport.scrollBy(event.kind === "wheel-up" ? -distance : distance, call.now);
    outcome.activity = true;
    outcome.repaint = true;
    outcome.forceRepaint = true;
    return true;
  }

  #press(event: PaneMouseEvent, target: PointerTarget, call: PointerCall, outcome: ViewportPointerOutcome): boolean {
    const viewport = this.#ports.viewport;
    const { frame } = target;
    const hits = frame.hits;
    const editorFrame = call.editorActive ? this.#ports.editorFrame() : undefined;
    if (event.button === 2 && editorFrame !== undefined
      && event.row >= editorFrame.rowStart && event.row <= editorFrame.rowEnd) {
      this.#ports.stopSelectionAutoScroll();
      if (viewport.clearSelection()) outcome.repaint = true;
      this.#ports.pasteFromPointer();
      this.#dockSuppressed = true;
      outcome.repaint = true;
      return true;
    }
    if (event.button !== 0) return false;
    this.#dockSuppressed = false;
    this.#tailSuppressed = false;
    this.#pendingEditorClick = undefined;
    this.#ports.stopSelectionAutoScroll();
    if (viewport.clearSelection()) outcome.repaint = true;
    if (target.overTailControl && target.tailControl !== undefined) {
      this.#ports.clearTailControl();
      target.tailControl.activate();
      this.#tailSuppressed = true;
      outcome.repaint = true;
      return true;
    }
    if (target.overBottom) {
      viewport.scrollToEnd(call.now);
      this.#tailSuppressed = true;
      outcome.activity = true;
      outcome.repaint = true;
      return true;
    }
    if (target.overSticky && hits.sticky !== null) {
      viewport.scrollTo(hits.sticky.target, call.now);
      this.#tailSuppressed = true;
      outcome.activity = true;
      outcome.repaint = true;
      return true;
    }
    if (target.overRail && hits.rail !== null) {
      const trackRow = event.row - hits.rail.rowStart;
      const geometry = hits.rail.geometry;
      if (trackRow >= geometry.thumbTop && trackRow < geometry.thumbTop + geometry.thumbHeight) {
        this.#dragGrabOffset = trackRow - geometry.thumbTop;
        viewport.setRailDragging(true);
      } else {
        viewport.scrollTo(scrollForTrackPage(geometry, trackRow, frame.scrollTop, hits.viewportHeight), call.now);
        this.#tailSuppressed = true;
      }
      outcome.activity = true;
      outcome.repaint = true;
      return true;
    }
    if (event.row >= 1 && event.row <= frame.rows.length && event.column <= frame.descriptor.width) {
      if (editorFrame !== undefined && event.row >= editorFrame.rowStart && event.row <= editorFrame.rowEnd) {
        // Invariant: no-drag clicks remain editor-owned; first motion latches an editor drag.
        this.#pendingEditorClick = { column: event.column, row: event.row };
      } else {
        viewport.pressSelection(event.column, event.row, call.now);
      }
      outcome.repaint = true;
      return true;
    }
    this.#tailSuppressed = true;
    return true;
  }

  #release(event: PaneMouseEvent, call: PointerCall, outcome: ViewportPointerOutcome): boolean {
    const viewport = this.#ports.viewport;
    const editorFrame = this.#ports.editorFrame();
    if (call.editorActive && this.#editorSelecting && editorFrame !== undefined) {
      this.#ports.editor.handlePointer({
        kind: "release",
        button: event.button,
        column: event.column,
        row: event.row - editorFrame.rowStart + 1,
      });
      this.#editorSelecting = false;
      outcome.forceRepaint = true;
      outcome.repaint = true;
      return true;
    }
    const pendingEditorClick = this.#pendingEditorClick;
    if (pendingEditorClick !== undefined) {
      this.#pendingEditorClick = undefined;
      if (editorFrame !== undefined) {
        const editorRow = pendingEditorClick.row - editorFrame.rowStart + 1;
        this.#ports.editor.handlePointer({ kind: "press", button: 0, column: pendingEditorClick.column, row: editorRow });
        this.#ports.editor.handlePointer({ kind: "release", button: 0, column: pendingEditorClick.column, row: editorRow });
      }
      outcome.forceRepaint = true;
      outcome.repaint = true;
      return true;
    }
    if (viewport.releaseSelection()) {
      this.#ports.stopSelectionAutoScroll();
      if (this.#ports.copyOnSelect()) outcome.completedCopy = viewport.captureSelectedText() ?? undefined;
      // Platform: restore OSC 8 links only after the held-button selection paint has
      // ended, then overwrite any terminal-cached hover cells immediately.
      outcome.forceRepaint = true;
      outcome.repaint = true;
      return true;
    }
    if (this.#dragGrabOffset !== null) {
      this.#dragGrabOffset = null;
      viewport.setRailDragging(false);
      outcome.repaint = true;
      return true;
    }
    if (this.#dockSuppressed) {
      this.#dockSuppressed = false;
      return true;
    }
    if (this.#tailSuppressed) {
      this.#tailSuppressed = false;
      return true;
    }
    return false;
  }
}

function hyperlinkKeyAt(frame: TranscriptViewportFrame, column: number, row: number): string | undefined {
  if (row < 1 || row > frame.rows.length || column < 1) return undefined;
  const range = readVisibleHyperlinks(frame.rows[row - 1] ?? "").ranges
    .find(candidate => column - 1 >= candidate.from && column - 1 < candidate.to);
  return range === undefined ? undefined : JSON.stringify([row, range]);
}
