import { isThumbRow, scrollbarGeometry, scrollbarPresentation, type ScrollbarGeometry } from "./scrollbar.js";
import { overlaySpan } from "./spans.js";
import { displayWidth, truncateToWidth } from "./text.js";
import type {
  TranscriptViewportConfig,
  TranscriptViewportFrameDescriptor,
  TranscriptViewportFrameInput,
  TranscriptViewportHitRegions,
  TranscriptViewportTheme,
} from "./transcript-viewport-types.js";

const CONTROL_STYLE_RESET = "\u001b]8;;\u001b\\\u001b[0m";
// Protocol: upstream OSC 133 zones are layout annotations, not fullscreen cursor commands.
// Styling/padding can move them away from the row prefix Pi strips; 133;A then advances a real
// terminal parser to a fresh line. The custom viewport owns prompt anchors separately.
export const VIEWPORT_PROMPT_ZONES = /\u001b\]133;[ABC](?:\u0007|\u001b\\)/gu;
// Invariant: scrollbar chrome closes source links and decoration without clearing
// the row surface painted beneath its dedicated, non-semantic gutter.
const GUTTER_DECORATION_RESET = "\u001b]8;;\u001b\\\u001b[22;23;24;25;27;28;29;39;54;55m";

type ScrollbarPresentation = ReturnType<typeof scrollbarPresentation>;

/** The document rows with the flexible gap that bottom-aligns the live tail while content fits. */
export function alignTailRows(
  sourceRows: readonly string[],
  requestedTailRows: number | undefined,
  viewportHeight: number,
): { readonly documentRows: readonly string[]; readonly bottomAlignedTailRowCount: number; readonly transientAlignmentGapRows: number } {
  const bottomAlignedTailRowCount = clamp(requestedTailRows ?? 0, 0, sourceRows.length);
  const transientAlignmentGapRows = bottomAlignedTailRowCount > 0
    ? Math.max(0, viewportHeight - sourceRows.length)
    : 0;
  const tailStart = sourceRows.length - bottomAlignedTailRowCount;
  const documentRows = transientAlignmentGapRows === 0
    ? sourceRows
    : [
        ...sourceRows.slice(0, tailStart),
        ...Array.from({ length: transientAlignmentGapRows }, () => ""),
        ...sourceRows.slice(tailStart),
      ];
  return { documentRows, bottomAlignedTailRowCount, transientAlignmentGapRows };
}

export function layoutScrollbar(input: {
  readonly contentLength: number;
  readonly viewportHeight: number;
  readonly scroll: number;
  readonly config: TranscriptViewportConfig;
  readonly hovered: boolean;
  readonly dragging: boolean;
  readonly activeUntil: number;
  readonly now: number;
}): { readonly geometry: ScrollbarGeometry | null; readonly presentation: ScrollbarPresentation } {
  const geometry = scrollbarGeometry({
    contentLength: input.contentLength,
    viewportHeight: input.viewportHeight,
    scroll: input.scroll,
    // Invariant: the rail keeps its top gap; the shell owns the spacing above the dock.
    trackHeight: Math.max(0, input.viewportHeight - 1),
  });
  const presentation = scrollbarPresentation({
    geometry,
    appearance: input.config.scrollbarAppearance,
    style: input.config.scrollbarStyle,
    hovered: input.hovered,
    dragging: input.dragging,
    activeUntil: input.activeUntil,
    now: input.now,
  });
  return { geometry, presentation };
}

export interface FloatingBottomControl {
  readonly hit: NonNullable<TranscriptViewportHitRegions["bottom"]>;
  readonly row: number;
  readonly left: number;
  readonly text: string;
}

/** The jump-to-bottom control while detached, placed on its anchor row and hovered from this frame's geometry. */
export function placeBottomControl(input: {
  readonly detached: boolean;
  readonly newMessages: number;
  readonly contentWidth: number;
  readonly viewportHeight: number;
  readonly frameRowCount: number;
  readonly anchorRow: number | undefined;
  readonly pointer: TranscriptViewportFrameInput["pointerPosition"];
  readonly theme: TranscriptViewportTheme;
}): FloatingBottomControl | undefined {
  if (!input.detached || input.frameRowCount === 0) return undefined;
  const genericLabel = " Jump to bottom (Ctrl+End) ↓ ";
  const countedLabel = input.newMessages > 0
    ? ` ${input.newMessages} new message${input.newMessages === 1 ? "" : "s"} (Ctrl+End) ↓ `
    : genericLabel;
  const label = displayWidth(countedLabel) <= input.contentWidth ? countedLabel : genericLabel;
  const labelWidth = displayWidth(label);
  if (labelWidth > input.contentWidth) return undefined;
  const fallbackRow = Math.max(0, input.viewportHeight - 1);
  const row = clamp(input.anchorRow ?? fallbackRow, 0, input.frameRowCount - 1);
  const left = Math.floor((input.contentWidth - labelWidth) / 2);
  const hit = { row: row + 1, columnStart: left + 1, columnEnd: left + labelWidth };
  // Invariant: appearance and hit testing share current geometry, even when no mouse moves.
  const pointer = input.pointer;
  const hovered = pointer !== undefined && pointer.row === hit.row
    && pointer.column >= hit.columnStart && pointer.column <= hit.columnEnd;
  return { hit, row, left, text: `${CONTROL_STYLE_RESET}${input.theme.bottomControl(label, hovered)}` };
}

/** Selection source rows with the cells under the floating control and covering surfaces blanked for copy. */
export function maskSelectionRows(
  rows: readonly string[],
  width: number,
  control: FloatingBottomControl | undefined,
  coveredCells: TranscriptViewportFrameInput["coveredCells"],
): string[] {
  const masked = [...rows];
  if (control !== undefined) {
    // Invariant: the control floats above selection; copy restores the text beneath it.
    const labelWidth = control.hit.columnEnd - control.left;
    masked[control.row] = overlaySpan(
      padRowPreservingBackground(masked[control.row] ?? "", width),
      control.left,
      control.left + labelWidth,
      " ".repeat(labelWidth),
    );
  }
  for (const covered of coveredCells ?? []) {
    const row = covered.row - 1;
    if (row < 0 || row >= masked.length) continue;
    const from = clamp(covered.columnStart - 1, 0, width);
    const to = clamp(covered.columnEnd, from, width);
    masked[row] = overlaySpan(
      padRowPreservingBackground(masked[row] ?? "", width),
      from,
      to,
      " ".repeat(to - from),
    );
  }
  return masked;
}

/** What every row of one frame is painted with. */
export interface FrameRowPaint {
  readonly width: number;
  readonly contentWidth: number;
  readonly viewportHeight: number;
  readonly cacheLimit: number;
  readonly theme: TranscriptViewportTheme;
  readonly selectionPainterId: number;
  readonly geometry: ScrollbarGeometry | null;
  readonly presentation: ScrollbarPresentation;
  readonly railActive: boolean;
  readonly overlay: TranscriptViewportFrameInput["frameOverlay"];
  readonly control: FloatingBottomControl | undefined;
}

/**
 * The bounded row caches behind frame composition: painted source rows, padded base rows,
 * selected rows and final rows, keyed by content and by the identity of the painter functions.
 */
export class ViewportRowCaches {
  readonly #painted = new Map<string, string>();
  readonly #base = new Map<string, string>();
  readonly #selected = new Map<string, string>();
  readonly #final = new Map<string, string>();
  readonly #functionIds = new WeakMap<Function, number>();
  #nextFunctionId = 1;

  get entries(): number {
    return this.#painted.size + this.#base.size + this.#selected.size + this.#final.size;
  }

  clear(): void {
    this.#painted.clear();
    this.#base.clear();
    this.#selected.clear();
    this.#final.clear();
  }

  trim(limit: number): void {
    trimCache(this.#painted, limit);
    trimCache(this.#base, limit);
    trimCache(this.#selected, limit);
    trimCache(this.#final, limit);
  }

  /** A stable id for a painter function, so cache keys change when the painter does. */
  functionId(value: Function): number {
    const existing = this.#functionIds.get(value);
    if (existing !== undefined) return existing;
    const id = this.#nextFunctionId;
    this.#nextFunctionId += 1;
    this.#functionIds.set(value, id);
    return id;
  }

  /** One document row through the paint-only transform. */
  painted(paintId: number, row: string, limit: number, paint: (row: string) => string): { readonly value: string; readonly reused: boolean } {
    return cachedString(this.#painted, `${paintId}\u0000${row}`, limit, () => paint(row));
  }

  /**
   * One frame row: padded to the frame, selection painted, then the rail, the floating control and
   * the overlay above it. `state` identifies everything the row was painted from.
   */
  paintRow(
    frame: FrameRowPaint,
    row: number,
    painted: string,
    range: { readonly from: number; readonly to: number } | null,
    paintRecomputed: boolean,
  ): { readonly text: string; readonly recomputed: boolean; readonly state: string } {
    const { width, contentWidth, viewportHeight, cacheLimit, theme, geometry, presentation } = frame;
    // Invariant: the reserved rail gutter is not a semantic selection or copy cell,
    // but a range that reaches the content boundary paints through it so the rail
    // floats above one continuous selection surface.
    const paintRange = range !== null && row < viewportHeight
      && contentWidth < width && range.to === contentWidth
      ? { from: range.from, to: width }
      : range;
    const padded = row < viewportHeight || paintRange !== null;
    const base = cachedString(
      this.#base,
      `${width}\u0000${contentWidth}\u0000${row < viewportHeight}\u0000${padded}\u0000${painted}`,
      cacheLimit,
      () => row < viewportHeight
        ? padViewportRowWithGutter(painted, contentWidth, width)
        : padded ? padRowPreservingBackground(painted, width) : painted,
    );
    let recomputed = row < viewportHeight && paintRecomputed || !base.reused;
    const rangeKey = paintRange === null ? "-" : `${paintRange.from}:${paintRange.to}`;
    const selected = paintRange === null
      ? { value: base.value, reused: true }
      : cachedString(
          this.#selected,
          `${frame.selectionPainterId}\u0000${rangeKey}\u0000${base.value}`,
          cacheLimit,
          () => theme.selection(base.value, paintRange.from, paintRange.to),
        );
    recomputed ||= !selected.reused;

    // Invariant: paint the rail after selection over the gutter's continued row
    // background. Source content and selection still end at the preceding cell.
    let railCell = "";
    if (row > 0 && row < viewportHeight && presentation.visible && geometry !== null) {
      const trackRow = row - 1;
      const thumb = isThumbRow(geometry, trackRow);
      const glyph = thumb ? presentation.thumbGlyph : presentation.trackGlyph;
      railCell = thumb ? theme.thumb(glyph, frame.railActive) : theme.track(glyph);
    }
    const overlayLimit = row < viewportHeight ? contentWidth : width;
    const overlayText = frame.overlay?.row === row + 1
      ? truncateToWidth(frame.overlay.text, overlayLimit)
      : "";
    const overlayWidth = displayWidth(overlayText);
    const control = frame.control;
    const rowControl = control?.row === row
      ? { left: control.left, right: control.hit.columnEnd, text: control.text }
      : null;
    const final = cachedString(
      this.#final,
      `${width}\u0000${railCell}\u0000${overlayText}\u0000${rowControl?.text ?? ""}\u0000${selected.value}`,
      cacheLimit,
      () => {
        const withRail = railCell.length === 0 ? selected.value : overlaySpan(
          selected.value,
          width - 1,
          width,
          `${GUTTER_DECORATION_RESET}${railCell}`,
          { inheritStartStyle: true },
        );
        // Invariant: floating control styling is applied only after the row and
        // gutter surfaces are resolved, so its inline background cannot leak.
        const withControl = rowControl === null ? withRail : overlaySpan(
          withRail,
          rowControl.left,
          rowControl.right,
          rowControl.text,
        );
        return overlayWidth === 0 ? withControl : overlaySpan(
          padRowPreservingBackground(withControl, width),
          overlayLimit - overlayWidth,
          overlayLimit,
          `${GUTTER_DECORATION_RESET}${overlayText}`,
          { inheritStartStyle: true },
        );
      },
    );
    recomputed ||= !final.reused;
    const state = `${width}\u0000${row}\u0000${painted}\u0000${rangeKey}\u0000${range === null ? "" : frame.selectionPainterId}\u0000${railCell}\u0000${overlayText}\u0000${rowControl?.text ?? ""}`;
    return { text: final.value.replace(VIEWPORT_PROMPT_ZONES, ""), recomputed, state };
  }
}

export interface FrameDescriptorInput {
  readonly frameId: number;
  readonly previous: TranscriptViewportFrameDescriptor | null;
  readonly width: number;
  readonly height: number;
  readonly viewportHeight: number;
  readonly dockRowCount: number;
  readonly documentRowCount: number;
  readonly selectableDocumentRowCount: number;
  readonly scrollTop: number;
  readonly followingEnd: boolean;
  readonly selecting: boolean;
  readonly transientAlignmentGapRows: number;
  readonly bottomAlignedTailRowCount: number;
  readonly liveTailStartRow: number | undefined;
  readonly selectionRevision: number;
  readonly selectionDamagedRows: readonly number[];
}

/** What changed since the previous frame, and why: geometry, follow shift, detachment or steady state. */
export function frameDescriptor(input: FrameDescriptorInput): TranscriptViewportFrameDescriptor {
  const { previous, width, height, viewportHeight, scrollTop, followingEnd } = input;
  const transcript = viewportHeight === 0 ? null : { rowStart: 1, rowEnd: viewportHeight };
  const dock = input.dockRowCount === 0 ? null : { rowStart: viewportHeight + 1, rowEnd: height };
  const nextDocumentRange = {
    start: scrollTop,
    end: Math.min(input.documentRowCount, scrollTop + viewportHeight),
  };
  const previousDocumentRange = previous?.nextDocumentRange ?? null;
  const sameGeometry = previous !== null
    && previous.width === width
    && previous.height === height
    && sameRectangle(previous.transcript, transcript)
    && sameRectangle(previous.dock, dock);
  const verticalShiftRows = previousDocumentRange === null ? 0 : nextDocumentRange.start - previousDocumentRange.start;
  const safeVerticalShift = sameGeometry
    && previous?.followingEnd === true
    && followingEnd
    && !input.selecting
    && verticalShiftRows > 0
    && verticalShiftRows < viewportHeight;
  return {
    frameId: input.frameId,
    width,
    height,
    transcript,
    dock,
    previousDocumentRange,
    nextDocumentRange,
    previousFollowingEnd: previous?.followingEnd ?? null,
    followingEnd,
    transientRowCount: Math.max(0, input.documentRowCount - input.selectableDocumentRowCount),
    transientAlignmentGapRows: input.transientAlignmentGapRows,
    bottomAlignedTailRowCount: input.bottomAlignedTailRowCount,
    liveTailRows: visibleLiveTailRows(input.liveTailStartRow, input.selectableDocumentRowCount, scrollTop, viewportHeight),
    verticalShiftRows,
    safeVerticalShift,
    selectionRevision: input.selectionRevision,
    selectionDamagedRows: input.selectionDamagedRows,
    cause: previous === null
      ? "initial"
      : !sameGeometry
        ? "geometry-change"
        : !followingEnd
          ? "detached"
          : safeVerticalShift
            ? "follow-shift"
            : "steady",
  };
}

/** Where the rail, the sticky prompt header, the bottom control and the transient tail sit in this frame. */
export function hitRegions(input: {
  readonly width: number;
  readonly contentWidth: number;
  readonly viewportHeight: number;
  readonly documentRowCount: number;
  readonly selectableDocumentRowCount: number;
  readonly scrollTop: number;
  readonly geometry: ScrollbarGeometry | null;
  readonly railHidden: boolean;
  readonly stickyTarget: number | null;
  readonly bottom: TranscriptViewportHitRegions["bottom"];
}): TranscriptViewportHitRegions {
  const { viewportHeight, scrollTop, geometry } = input;
  const tailStart = Math.max(scrollTop, input.selectableDocumentRowCount);
  return {
    viewportHeight,
    rail: geometry === null || input.railHidden ? null : {
      column: input.width,
      rowStart: 2,
      trackHeight: Math.max(0, viewportHeight - 1),
      geometry,
    },
    sticky: input.stickyTarget === null ? null : { row: 1, target: input.stickyTarget, width: input.contentWidth },
    bottom: input.bottom,
    transientTail: Array.from(
      { length: Math.max(0, Math.min(input.documentRowCount, scrollTop + viewportHeight) - tailStart) },
      (_row, index) => tailStart - scrollTop + index + 1,
    ),
  };
}

export function sameRectangle(
  left: TranscriptViewportFrameDescriptor["transcript"],
  right: TranscriptViewportFrameDescriptor["transcript"],
): boolean {
  return left === null ? right === null : right !== null && left.rowStart === right.rowStart && left.rowEnd === right.rowEnd;
}

function cachedString(
  cache: Map<string, string>,
  key: string,
  limit: number,
  create: () => string,
): { readonly value: string; readonly reused: boolean } {
  const existing = cache.get(key);
  if (existing !== undefined) {
    cache.delete(key);
    cache.set(key, existing);
    return { value: existing, reused: true };
  }
  const value = create();
  cache.set(key, value);
  while (cache.size > limit) cache.delete(cache.keys().next().value!);
  return { value, reused: false };
}

function trimCache(cache: Map<string, string>, limit: number): void {
  while (cache.size > limit) cache.delete(cache.keys().next().value!);
}

/**
 * Rows of the streaming block that the visible window actually shows. Gap insertion happens
 * after the selectable document, so live-block indices need no adjustment here.
 */
function visibleLiveTailRows(
  liveTailStartRow: number | undefined,
  selectableDocumentRowCount: number,
  scrollTop: number,
  viewportHeight: number,
): number {
  if (liveTailStartRow === undefined || !Number.isSafeInteger(liveTailStartRow)) return 0;
  const start = clamp(liveTailStartRow, 0, selectableDocumentRowCount);
  const visibleStart = Math.max(start, scrollTop);
  const visibleEnd = Math.min(selectableDocumentRowCount, scrollTop + viewportHeight);
  return Math.max(0, visibleEnd - visibleStart);
}

function padViewportRowWithGutter(line: string, contentWidth: number, frameWidth: number): string {
  const boundedContentWidth = Math.min(Math.max(1, contentWidth), frameWidth);
  const content = padRowPreservingBackground(line, boundedContentWidth);
  const gutterWidth = frameWidth - boundedContentWidth;
  if (gutterWidth === 0) return content;
  // Invariant: render no source glyph beyond contentWidth, but reuse the established
  // row-padding background before stripping source foreground, links, and emphasis.
  const gutterStyle = explicitBackgroundPaddingStyle(line);
  return `${content}${GUTTER_DECORATION_RESET}${gutterStyle?.on ?? ""}${" ".repeat(gutterWidth)}${gutterStyle?.off ?? ""}`;
}

function explicitBackgroundPaddingStyle(line: string): { readonly on: string; readonly off: string } | null {
  const background = /\u001b\[(?:4[0-8]|10[0-7]|48;(?:2;\d+;\d+;\d+|5;\d+))m/.exec(line)?.[0];
  return background === undefined ? null : { on: background, off: "\u001b[49m" };
}

function rowPaddingStyle(line: string): { readonly on: string; readonly off: string } | null {
  const background = explicitBackgroundPaddingStyle(line);
  if (background !== null) return background;
  const reverse = /\u001b\[(?:7(?:;[0-9]+)*|[0-9;]*;7(?:;[0-9]+)*)m/.exec(line)?.[0];
  return reverse === undefined ? null : { on: reverse, off: "\u001b[27m" };
}

function padRowPreservingBackground(line: string, width: number): string {
  const shown = displayWidth(line) > width ? truncateToWidth(line, width) : line;
  const padding = Math.max(0, width - displayWidth(shown));
  if (padding === 0) return shown;
  const style = rowPaddingStyle(line);
  return style === null
    ? shown + " ".repeat(padding)
    : `${shown}${style.on}${" ".repeat(padding)}${style.off}`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
