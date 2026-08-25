import type { PaneInputResult, PaneMouseEvent } from "./pane.js";
import {
  ScrollbarRails,
  isThumbRow,
  scrollbarGeometry,
  scrollbarGlyph,
  scrollbarPresentation,
  scrollbarWheelLines,
  scrollForTrackPage,
  type RailPosition,
  type ScrollbarAppearance,
  type ScrollbarGeometry,
  type ScrollbarSpeed,
  type ScrollbarStyle,
} from "./scrollbar.js";
import { overlaySpan } from "./spans.js";
import { displayColumnSlice, displayWidth, displayWordColumnRange, padToWidth, stripAnsi } from "./text.js";

export interface TranscriptPromptAnchor {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  /** The already-rendered first row, including the source timestamp. */
  readonly firstRow: string;
}

export interface TranscriptViewportDocument {
  readonly rows: readonly string[];
  readonly prompts: readonly TranscriptPromptAnchor[];
}

export interface TranscriptViewportTheme {
  scrollbar(glyph: string, part: "track" | "thumb", state: "idle" | "hover" | "drag"): string;
  bottomControl(text: string, pointed: boolean): string;
  stickyPrompt(row: string, quiet: boolean): string;
}

export interface TranscriptViewportRenderInput {
  readonly width: number;
  readonly height: number;
  readonly dockRows: readonly string[];
  readonly renderDocument: (width: number) => TranscriptViewportDocument;
  readonly appearance: ScrollbarAppearance;
  readonly style: ScrollbarStyle;
  readonly speed: ScrollbarSpeed;
  readonly theme: TranscriptViewportTheme;
  readonly now?: number;
}

export interface TranscriptViewportInputResult extends PaneInputResult {
  /** Completed LMB selection, ready for the host clipboard bridge. */
  readonly copyText?: string;
}

export interface TranscriptViewportState {
  readonly scrollTop: number;
  readonly viewportHeight: number;
  readonly followingEnd: boolean;
  readonly overflowing: boolean;
  readonly scrollbarVisible: boolean;
}

interface FrameState {
  readonly width: number;
  readonly transcriptHeight: number;
  readonly maxScroll: number;
  readonly geometry: ScrollbarGeometry | null;
  readonly rail: RailPosition | null;
  readonly bottomControl: { readonly row: number; readonly from: number; readonly to: number } | null;
  readonly sticky: { readonly row: number; readonly anchor: TranscriptPromptAnchor } | null;
  readonly wheelLines: number;
  readonly contentWidth: number;
  readonly scrollTop: number;
  readonly documentRows: readonly string[];
}

interface SelectionPoint {
  readonly row: number;
  readonly column: number;
}

interface SelectionRange {
  readonly start: SelectionPoint;
  readonly end: SelectionPoint;
}

type SelectionGranularity = "character" | "word" | "line";

const RAIL_KEY = "session-transcript";
const BOTTOM_CONTROL = " ↓ latest ";
const MULTI_CLICK_MS = 500;
const SELECTION_ON = "\u001b[107;30m";
const SELECTION_OFF = "\u001b[39;49m";

/**
 * A vendor-neutral fixed transcript frame. It owns scroll and pointer state but
 * receives already-rendered document and dock rows from the integration.
 */
export class TranscriptViewport {
  readonly #rails = new ScrollbarRails();
  #scrollTop = 0;
  #followingEnd = true;
  #lastActivityAt: number | undefined;
  #bottomPointed = false;
  #frame: FrameState = {
    width: 1,
    transcriptHeight: 0,
    maxScroll: 0,
    geometry: null,
    rail: null,
    bottomControl: null,
    sticky: null,
    wheelLines: 3,
    contentWidth: 1,
    scrollTop: 0,
    documentRows: [],
  };
  #selectionAnchor: SelectionPoint | undefined;
  #selectionFocus: SelectionPoint | undefined;
  #selectionPressActive = false;
  #selectionGranularity: SelectionGranularity = "character";
  #selectionInitialRange: SelectionRange | undefined;
  #lastClick: { readonly at: number; readonly row: number; readonly from: number; readonly to: number; readonly count: number } | undefined;
  #state: TranscriptViewportState = {
    scrollTop: 0,
    viewportHeight: 0,
    followingEnd: true,
    overflowing: false,
    scrollbarVisible: false,
  };

  get state(): TranscriptViewportState {
    return this.#state;
  }

  render(input: TranscriptViewportRenderInput): readonly string[] {
    const width = Math.max(1, Math.floor(input.width));
    const height = Math.max(1, Math.floor(input.height));
    const visibleDock = input.dockRows.length > height
      ? input.dockRows.slice(input.dockRows.length - height)
      : input.dockRows;
    const transcriptHeight = Math.max(0, height - visibleDock.length);
    const now = input.now ?? Date.now();

    let contentWidth = width;
    let document = input.renderDocument(contentWidth);
    let overflowing = transcriptHeight > 0 && document.rows.length > transcriptHeight;
    if (overflowing && input.appearance !== "hidden" && width > 1) {
      contentWidth = width - 1;
      document = input.renderDocument(contentWidth);
      overflowing = document.rows.length > transcriptHeight;
    }

    const maxScroll = Math.max(0, document.rows.length - transcriptHeight);
    if (this.#followingEnd) this.#scrollTop = maxScroll;
    else this.#scrollTop = Math.min(Math.max(this.#scrollTop, 0), maxScroll);
    if (maxScroll === 0 || this.#scrollTop >= maxScroll) this.#followingEnd = true;

    const geometry = overflowing
      ? scrollbarGeometry({
          contentLength: document.rows.length,
          viewportHeight: transcriptHeight,
          scroll: this.#scrollTop,
          trackHeight: transcriptHeight,
        })
      : null;
    const rail: RailPosition | null = geometry === null || input.appearance === "hidden"
      ? null
      : { key: RAIL_KEY, column: width, rowStart: 1, trackHeight: transcriptHeight };
    const presentation = scrollbarPresentation({
      geometry,
      appearance: input.appearance,
      style: input.style,
      hovered: this.#rails.isHovered(RAIL_KEY),
      dragging: this.#rails.isDragging(RAIL_KEY),
      ...(this.#lastActivityAt === undefined ? {} : { lastActivityAt: this.#lastActivityAt }),
      now,
    });

    const transcriptRows = document.rows.slice(this.#scrollTop, this.#scrollTop + transcriptHeight);
    while (transcriptRows.length < transcriptHeight) transcriptRows.push("");
    for (let visibleRow = 0; visibleRow < transcriptRows.length; visibleRow += 1) {
      transcriptRows[visibleRow] = this.#paintSelectionRow(
        transcriptRows[visibleRow] ?? "",
        this.#scrollTop + visibleRow,
      );
    }

    const governingPrompt = findGoverningPrompt(document.prompts, this.#scrollTop);
    let sticky: FrameState["sticky"] = null;
    if (transcriptHeight > 0 && governingPrompt !== null && this.#scrollTop > governingPrompt.start) {
      const quiet = this.#scrollTop > governingPrompt.end;
      transcriptRows[0] = input.theme.stickyPrompt(governingPrompt.firstRow, quiet);
      sticky = { row: 1, anchor: governingPrompt };
    }

    let bottomControl: FrameState["bottomControl"] = null;
    if (transcriptHeight > 0 && overflowing && !this.#followingEnd) {
      const labelWidth = Math.min(displayWidth(BOTTOM_CONTROL), Math.max(1, contentWidth));
      const from = Math.max(0, contentWidth - labelWidth);
      const label = input.theme.bottomControl(BOTTOM_CONTROL.slice(BOTTOM_CONTROL.length - labelWidth), this.#bottomPointed);
      const row = transcriptHeight;
      transcriptRows[row - 1] = overlaySpan(transcriptRows[row - 1] ?? "", from, contentWidth, label);
      bottomControl = { row, from: from + 1, to: contentWidth };
    }

    if (presentation.visible && rail !== null && geometry !== null) {
      const state = this.#rails.isDragging(RAIL_KEY) ? "drag" : this.#rails.isHovered(RAIL_KEY) ? "hover" : "idle";
      for (let row = 0; row < transcriptHeight; row += 1) {
        const thumb = isThumbRow(geometry, row);
        const glyph = input.theme.scrollbar(
          scrollbarGlyph(input.style, thumb, state !== "idle"),
          thumb ? "thumb" : "track",
          state,
        );
        transcriptRows[row] = overlaySpan(transcriptRows[row] ?? "", width - 1, width, glyph);
      }
    }

    this.#frame = {
      width,
      transcriptHeight,
      maxScroll,
      geometry,
      rail,
      bottomControl,
      sticky,
      wheelLines: scrollbarWheelLines(input.speed),
      contentWidth,
      scrollTop: this.#scrollTop,
      documentRows: document.rows,
    };
    this.#state = {
      scrollTop: this.#scrollTop,
      viewportHeight: transcriptHeight,
      followingEnd: this.#followingEnd,
      overflowing,
      scrollbarVisible: presentation.visible,
    };

    const rows = [...transcriptRows, ...visibleDock];
    while (rows.length < height) rows.unshift("");
    return rows.map(row => displayWidth(row) > width ? padToWidth(row, width) : row);
  }

  onMouse(
    event: PaneMouseEvent,
    now = Date.now(),
    allowWheel = true,
    allowSelection = true,
  ): TranscriptViewportInputResult {
    const frame = this.#frame;
    const insideTranscript = event.row >= 1 && event.row <= frame.transcriptHeight
      && event.column >= 1 && event.column <= frame.width;

    if ((event.kind === "wheel-up" || event.kind === "wheel-down") && insideTranscript && allowWheel) {
      this.scrollBy(event.kind === "wheel-up" ? -frame.wheelLines : frame.wheelLines, now);
      return { consumed: true, render: true };
    }

    if (event.kind === "motion") {
      const wasRailHovered = this.#rails.isHovered(RAIL_KEY);
      const wasBottomPointed = this.#bottomPointed;
      const rail = frame.rail;
      this.#rails.notePointer(rail === null ? [] : [rail], event);
      this.#bottomPointed = hit(frame.bottomControl, event);
      if (rail !== null) {
        const dragged = this.#rails.dragTo(rail, frame.geometry, event);
        if (dragged !== null) {
          this.#setScroll(dragged);
          this.#lastActivityAt = now;
          return { consumed: true, render: true };
        }
      }
      if (this.#selectionPressActive && allowSelection) {
        this.#updateSelectionFocus(event);
        return { consumed: true, render: true };
      }
      return {
        consumed: false,
        render: wasRailHovered !== this.#rails.isHovered(RAIL_KEY) || wasBottomPointed !== this.#bottomPointed,
      };
    }

    if (event.kind === "release") {
      if (this.#rails.isDragging(RAIL_KEY)) {
        this.#rails.endDrag();
        this.#lastActivityAt = now;
        return { consumed: true, render: true };
      }
      if (!this.#selectionPressActive) return { consumed: false };
      this.#selectionPressActive = false;
      if (allowSelection) this.#updateSelectionFocus(event);
      const copyText = this.#selectionText();
      return copyText.length === 0
        ? { consumed: true, render: true }
        : { consumed: true, render: true, copyText };
    }

    if (event.kind !== "press" || event.button !== 0) return { consumed: false };
    const rail = frame.rail;
    if (rail !== null && event.column === rail.column
      && event.row >= rail.rowStart && event.row < rail.rowStart + rail.trackHeight) {
      if (this.#rails.beginDrag(rail, frame.geometry, event)) {
        this.#lastActivityAt = now;
        return { consumed: true, render: true };
      }
      const trackRow = event.row - rail.rowStart;
      this.#setScroll(scrollForTrackPage(frame.geometry, trackRow, this.#scrollTop, frame.transcriptHeight));
      this.#lastActivityAt = now;
      return { consumed: true, render: true };
    }
    if (hit(frame.bottomControl, event)) {
      this.returnToEnd(now);
      return { consumed: true, render: true };
    }
    if (frame.sticky !== null && event.row === frame.sticky.row && insideTranscript) {
      this.#setScroll(frame.sticky.anchor.start);
      this.#followingEnd = this.#scrollTop >= frame.maxScroll;
      this.#lastActivityAt = now;
      return { consumed: true, render: true };
    }
    if (allowSelection && insideTranscript && event.column <= frame.contentWidth) {
      this.#beginSelection(event, now);
      return { consumed: true, render: true };
    }
    return { consumed: false };
  }

  scrollBy(lines: number, now = Date.now()): void {
    this.#setScroll(this.#scrollTop + Math.trunc(lines));
    this.#lastActivityAt = now;
  }

  returnToEnd(now = Date.now()): void {
    this.#scrollTop = this.#frame.maxScroll;
    this.#followingEnd = true;
    this.#lastActivityAt = now;
    this.#state = { ...this.#state, scrollTop: this.#scrollTop, followingEnd: true };
  }

  reset(): void {
    this.#scrollTop = 0;
    this.#followingEnd = true;
    this.#lastActivityAt = undefined;
    this.clearSelection();
    this.clearTransient();
  }

  clearSelection(): void {
    this.#selectionAnchor = undefined;
    this.#selectionFocus = undefined;
    this.#selectionPressActive = false;
    this.#selectionGranularity = "character";
    this.#selectionInitialRange = undefined;
    this.#lastClick = undefined;
  }

  clearTransient(): void {
    this.#rails.clear();
    this.#bottomPointed = false;
    this.#selectionPressActive = false;
  }

  #selectionPoint(event: PaneMouseEvent): SelectionPoint {
    const frame = this.#frame;
    const visibleRow = Math.min(Math.max(event.row, 1), Math.max(1, frame.transcriptHeight)) - 1;
    const row = Math.min(
      Math.max(0, frame.scrollTop + visibleRow),
      Math.max(0, frame.documentRows.length - 1),
    );
    const lineWidth = displayWidth(frame.documentRows[row] ?? "");
    const column = Math.min(Math.max(event.column - 1, 0), Math.min(frame.contentWidth, lineWidth));
    return { row, column };
  }

  #wordSelection(point: SelectionPoint): SelectionRange | null {
    const range = displayWordColumnRange(this.#frame.documentRows[point.row] ?? "", point.column);
    if (range === null || range.to <= range.from) return null;
    return {
      start: { row: point.row, column: range.from },
      end: { row: point.row, column: range.to - 1 },
    };
  }

  #lineSelection(point: SelectionPoint): SelectionRange {
    const plain = stripAnsi(this.#frame.documentRows[point.row] ?? "").trimEnd();
    const width = displayWidth(plain);
    return {
      start: { row: point.row, column: 0 },
      end: { row: point.row, column: Math.max(0, width - 1) },
    };
  }

  #beginSelection(event: PaneMouseEvent, now: number): void {
    const point = this.#selectionPoint(event);
    const word = this.#wordSelection(point);
    const previous = this.#lastClick;
    const count = word !== null && previous !== undefined
      && now - previous.at <= MULTI_CLICK_MS
      && previous.row === point.row
      && previous.from === word.start.column
      && previous.to === word.end.column + 1
      ? (previous.count % 3) + 1
      : 1;
    this.#lastClick = word === null
      ? undefined
      : { at: now, row: point.row, from: word.start.column, to: word.end.column + 1, count };
    const range = count === 2 && word !== null
      ? word
      : count === 3
        ? this.#lineSelection(point)
        : { start: point, end: point };
    this.#selectionGranularity = count === 2 ? "word" : count === 3 ? "line" : "character";
    this.#selectionInitialRange = range;
    this.#selectionAnchor = range.start;
    this.#selectionFocus = range.end;
    this.#selectionPressActive = true;
  }

  #updateSelectionFocus(event: PaneMouseEvent): void {
    const point = this.#selectionPoint(event);
    const initial = this.#selectionInitialRange;
    if (this.#selectionGranularity === "character" || initial === undefined) {
      this.#selectionFocus = point;
      return;
    }
    const target = this.#selectionGranularity === "word"
      ? this.#wordSelection(point) ?? { start: point, end: point }
      : this.#lineSelection(point);
    const targetBefore = target.start.row < initial.start.row
      || (target.start.row === initial.start.row && target.start.column < initial.start.column);
    if (targetBefore) {
      this.#selectionAnchor = initial.end;
      this.#selectionFocus = target.start;
    } else {
      this.#selectionAnchor = initial.start;
      this.#selectionFocus = target.end;
    }
  }

  #selectionBounds(): { readonly start: SelectionPoint; readonly end: SelectionPoint } | null {
    const anchor = this.#selectionAnchor;
    const focus = this.#selectionFocus;
    if (anchor === undefined || focus === undefined) return null;
    if (anchor.row === focus.row && anchor.column === focus.column) return null;
    const anchorFirst = anchor.row < focus.row || (anchor.row === focus.row && anchor.column < focus.column);
    return anchorFirst ? { start: anchor, end: focus } : { start: focus, end: anchor };
  }

  #selectionColumns(row: number, line: string): { readonly from: number; readonly to: number } | null {
    const bounds = this.#selectionBounds();
    if (bounds === null || row < bounds.start.row || row > bounds.end.row) return null;
    const lineWidth = displayWidth(line);
    const from = row === bounds.start.row ? Math.min(bounds.start.column, lineWidth) : 0;
    const to = row === bounds.end.row ? Math.min(bounds.end.column + 1, lineWidth) : lineWidth;
    return to > from ? { from, to } : null;
  }

  #paintSelectionRow(line: string, row: number): string {
    const columns = this.#selectionColumns(row, line);
    if (columns === null) return line;
    const selected = displayColumnSlice(line, columns.from, columns.to);
    if (selected.to <= selected.from) return line;
    return overlaySpan(line, selected.from, selected.to, `${SELECTION_ON}${selected.text}${SELECTION_OFF}`);
  }

  #selectionText(): string {
    const bounds = this.#selectionBounds();
    if (bounds === null) return "";
    const lines: string[] = [];
    for (let row = bounds.start.row; row <= bounds.end.row; row += 1) {
      const line = this.#frame.documentRows[row] ?? "";
      const columns = this.#selectionColumns(row, line);
      if (columns === null) {
        lines.push("");
        continue;
      }
      lines.push(displayColumnSlice(line, columns.from, columns.to).text.trimEnd());
    }
    return lines.join("\n");
  }

  #setScroll(next: number): void {
    this.#scrollTop = Math.min(Math.max(next, 0), this.#frame.maxScroll);
    this.#followingEnd = this.#scrollTop >= this.#frame.maxScroll;
    this.#state = { ...this.#state, scrollTop: this.#scrollTop, followingEnd: this.#followingEnd };
  }
}

function findGoverningPrompt(
  prompts: readonly TranscriptPromptAnchor[],
  scrollTop: number,
): TranscriptPromptAnchor | null {
  let match: TranscriptPromptAnchor | null = null;
  for (const prompt of prompts) {
    if (prompt.start > scrollTop) break;
    match = prompt;
  }
  return match;
}

function hit(
  region: { readonly row: number; readonly from: number; readonly to: number } | null,
  event: PaneMouseEvent,
): boolean {
  return region !== null && event.row === region.row && event.column >= region.from && event.column <= region.to;
}
