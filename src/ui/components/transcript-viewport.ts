import {
  isThumbRow,
  scrollbarGeometry,
  scrollbarPresentation,
  type ScrollbarAppearance,
  type ScrollbarGeometry,
  type ScrollbarStyle,
} from "./scrollbar.js";
import { backgroundSgrSpan, overlaySpan } from "./spans.js";
import { faint, truncateToWidth, displayWidth, stripAnsi } from "./text.js";
import {
  extendTextSelection,
  orderedTextSelection,
  pressTextSelection,
  releaseTextSelection,
  textSelectionLineExtendColumn,
  textSelectionPointAt,
  textSelectionText,
  usefulTextLineContent,
  type OrderedTextSelection,
  type TextSelection,
  type TextSelectionClick,
  type TextSelectionLineContent,
} from "./text-selection.js";

export interface TranscriptPromptAnchor {
  readonly id: string;
  readonly firstRow: number;
  readonly lastRow: number;
  /** The source first row, including its submitted-prompt styling and timestamp. */
  readonly sourceRow: string;
}

export interface TranscriptViewportConfig {
  readonly scrollbarAppearance: ScrollbarAppearance;
  readonly scrollbarStyle: ScrollbarStyle;
}

export interface TranscriptViewportTheme {
  readonly track: (text: string) => string;
  readonly thumb: (text: string, active: boolean) => string;
  readonly sticky: (text: string, hovered: boolean) => string;
  readonly quietSticky: (text: string) => string;
  readonly bottomControl: (text: string, hovered: boolean) => string;
  readonly selection: (line: string, from: number, to: number) => string;
}

export interface TranscriptViewportFrameInput {
  readonly documentRows: readonly string[];
  /** Optional paint-only transform; semantic selection and copying keep documentRows exact. */
  readonly paintDocumentRow?: (row: string) => string;
  /** Leading document rows that participate in pointer selection and copying. */
  readonly selectableDocumentRowCount?: number;
  /** Final transient rows to bottom-align with unused viewport space while content fits. */
  readonly bottomAlignedTailRowCount?: number;
  readonly dockRows: readonly string[];
  readonly promptAnchors: readonly TranscriptPromptAnchor[];
  readonly width: number;
  readonly height: number;
  /**
   * Optional zero-based terminal row for the floating bottom control. The shell
   * supplies a stable anchor above its editor group so transient status and
   * notification rows cannot make the control jump vertically.
   */
  readonly bottomControlRow?: number;
  /** Latest reported one-based terminal coordinates; bottom hover uses this frame's hit region. */
  readonly pointerPosition?: { readonly column: number; readonly row: number };
  readonly now?: number;
  readonly theme?: TranscriptViewportTheme;
}

export interface TranscriptViewportHitRegions {
  readonly viewportHeight: number;
  readonly rail: {
    readonly column: number;
    /** One-based terminal row. The one-row top inset is intentionally excluded. */
    readonly rowStart: number;
    readonly trackHeight: number;
    readonly geometry: ScrollbarGeometry;
  } | null;
  readonly sticky: { readonly row: number; readonly target: number; readonly width: number } | null;
  readonly bottom: { readonly row: number; readonly columnStart: number; readonly columnEnd: number } | null;
  /** Transient non-selectable document-tail rows currently visible in the viewport. */
  readonly transientTail: readonly number[];
}

export interface TranscriptViewportFrameDescriptor {
  readonly frameId: number;
  readonly width: number;
  readonly height: number;
  readonly transcript: { readonly rowStart: number; readonly rowEnd: number } | null;
  readonly dock: { readonly rowStart: number; readonly rowEnd: number } | null;
  readonly previousDocumentRange: { readonly start: number; readonly end: number } | null;
  readonly nextDocumentRange: { readonly start: number; readonly end: number };
  readonly previousFollowingEnd: boolean | null;
  readonly followingEnd: boolean;
  /** Complete non-selectable suffix, including pending steering, alignment, and status rows. */
  readonly transientRowCount: number;
  /** Flexible rows inserted before the bottom-aligned live status while content fits. */
  readonly transientAlignmentGapRows: number;
  /** Live status rows at the end of the transient suffix. */
  readonly bottomAlignedTailRowCount: number;
  readonly verticalShiftRows: number;
  readonly safeVerticalShift: boolean;
  /** Monotonic interaction revision used to reject stale selection evidence. */
  readonly selectionRevision: number;
  /** One-based terminal rows whose source or normalized selection range changed. */
  readonly selectionDamagedRows: readonly number[];
  readonly cause: "initial" | "steady" | "dock-input" | "follow-shift" | "detached" | "geometry-change";
}

export interface TranscriptViewportFrame {
  readonly rows: readonly string[];
  readonly contentWidth: number;
  readonly scrollTop: number;
  readonly maxScroll: number;
  readonly followingEnd: boolean;
  readonly hits: TranscriptViewportHitRegions;
  readonly descriptor: TranscriptViewportFrameDescriptor;
  /** Deterministic evidence for bounded selection-only row composition. */
  readonly selectionDamage: {
    readonly revision: number;
    readonly recomputedRows: readonly number[];
    readonly reusedRows: readonly number[];
    readonly cacheEntries: number;
  };
}

const CONTROL_STYLE_RESET = "\u001b]8;;\u001b\\\u001b[0m";
const IDENTITY_ROW = (row: string): string => row;

const DEFAULT_CONFIG: TranscriptViewportConfig = {
  scrollbarAppearance: "auto",
  scrollbarStyle: "thin",
};
const PLAIN_THEME: TranscriptViewportTheme = {
  track: text => text,
  thumb: text => text,
  sticky: (text, hovered) => hovered ? `\u001b[7m${text}\u001b[27m` : text,
  quietSticky: faint,
  bottomControl: (text, hovered) => hovered ? `\u001b[7m${text}\u001b[27m` : `\u001b[7m${text}\u001b[27m`,
  selection: (line, from, to) => backgroundSgrSpan(line, from, to),
};

/**
 * A1-owned viewport state. It knows only rows and semantic prompt anchors; Pi
 * components and transcript payloads remain outside this neutral boundary.
 */
export class TranscriptViewport {
  #config: TranscriptViewportConfig = DEFAULT_CONFIG;
  #scrollTop = 0;
  #maxScroll = 0;
  #followingEnd = true;
  #newMessages = 0;
  #activeUntil = 0;
  #railHovered = false;
  #railDragging = false;
  #stickyHovered = false;
  #selection: TextSelection | undefined;
  #selectionClick: TextSelectionClick | undefined;
  #selectionRevision = 0;
  readonly #paintedRowCache = new Map<string, string>();
  readonly #baseRowCache = new Map<string, string>();
  readonly #selectedRowCache = new Map<string, string>();
  readonly #finalRowCache = new Map<string, string>();
  readonly #functionIds = new WeakMap<Function, number>();
  #nextFunctionId = 1;
  #previousVisibleStates: readonly string[] = [];
  #documentRows: readonly string[] = [];
  #selectableDocumentRowCount = 0;
  #promptAnchors: readonly TranscriptPromptAnchor[] = [];
  #contentWidth = 0;
  #frameId = 0;
  #frame: TranscriptViewportFrame | null = null;

  get scrollTop(): number { return this.#scrollTop; }
  get maxScroll(): number { return this.#maxScroll; }
  get followingEnd(): boolean { return this.#followingEnd; }
  get newMessages(): number { return this.#newMessages; }
  get frame(): TranscriptViewportFrame | null { return this.#frame; }
  get selectionRevision(): number { return this.#selectionRevision; }

  /** Counts one completed assistant reply while detached; tool rows never call this. */
  noteNewMessage(): boolean {
    if (this.#followingEnd) return false;
    this.#newMessages += 1;
    return true;
  }

  setConfig(config: TranscriptViewportConfig): void {
    this.#config = config;
    if (config.scrollbarAppearance === "hidden") {
      this.#railHovered = false;
      this.#railDragging = false;
    }
  }

  noteScrollActivity(now = Date.now(), lingerMs = 900): void {
    this.#activeUntil = Math.max(this.#activeUntil, now + lingerMs);
  }

  setRailHovered(hovered: boolean): void { this.#railHovered = hovered; }
  setRailDragging(dragging: boolean): void { this.#railDragging = dragging; }
  setStickyHovered(hovered: boolean): void { this.#stickyHovered = hovered; }

  get selectionActive(): boolean { return this.#selection?.selecting === true; }
  get hasSelection(): boolean { return orderedTextSelection(this.#selection) !== undefined; }

  pressSelection(column: number, viewportRow: number, now = Date.now()): boolean {
    const viewportHeight = this.#frame?.hits.viewportHeight ?? 0;
    if (viewportRow < 1 || viewportRow > viewportHeight || column < 1 || column > this.#contentWidth) return false;
    const line = clamp(this.#scrollTop + viewportRow - 1, 0, Math.max(0, this.#documentRows.length - 1));
    if (line >= this.#selectableDocumentRowCount) return false;
    const pressed = pressTextSelection({
      line,
      column,
      contentWidth: this.#contentWidth,
      lineText: this.#documentRows[line] ?? "",
      lineContent: this.#lineContentAt(line),
      ...(this.#selectionClick === undefined ? {} : { previousClick: this.#selectionClick }),
      now,
    });
    this.#selection = pressed.selection;
    this.#selectionClick = pressed.click;
    this.#selectionRevision += 1;
    return true;
  }

  extendSelection(column: number, viewportRow: number, now = Date.now(), autoScroll = true): boolean {
    const selection = this.#selection;
    const viewportHeight = this.#frame?.hits.viewportHeight ?? 0;
    if (selection?.selecting !== true || viewportHeight <= 0 || this.#documentRows.length === 0) return false;
    // Performance: pointer motion updates only the endpoint; the shell's fixed-cadence timer
    // owns edge scrolling. This option prevents high-rate motion reports from
    // adding irregular extra rows between timer ticks.
    if (autoScroll && viewportRow > viewportHeight) this.scrollBy(1, now);
    else if (autoScroll && viewportRow <= 1 && this.#scrollTop > 0) this.scrollBy(-1, now);
    const lastSelectableLine = Math.min(this.#documentRows.length, this.#selectableDocumentRowCount) - 1;
    if (lastSelectableLine < 0) return false;
    const visibleRow = clamp(viewportRow, 1, viewportHeight);
    const line = clamp(this.#scrollTop + visibleRow - 1, 0, lastSelectableLine);
    const targetColumn = selection.fullRow
      ? textSelectionLineExtendColumn(selection, line, this.#contentWidth)
      : clamp(column, 1, this.#contentWidth);
    const point = selection.fullRow
      ? { line, column: targetColumn }
      : textSelectionPointAt(line, targetColumn, this.#documentRows[line] ?? "");
    const next = extendTextSelection(selection, point);
    if (next !== selection) {
      this.#selection = next;
      this.#selectionRevision += 1;
    }
    return true;
  }

  releaseSelection(): boolean {
    if (this.#selection?.selecting !== true) return false;
    this.#selection = releaseTextSelection(this.#selection);
    this.#selectionRevision += 1;
    return true;
  }

  clearSelection(): boolean {
    if (this.#selection === undefined) return false;
    this.#selection = undefined;
    this.#selectionRevision += 1;
    return true;
  }

  selectedText(): string | null {
    const selection = orderedTextSelection(this.#selection);
    if (selection === undefined) return null;
    return textSelectionText(
      selection,
      this.#documentRows.slice(0, this.#selectableDocumentRowCount),
      line => this.#lineContentAt(line),
    );
  }

  scrollBy(lines: number, now = Date.now()): boolean {
    if (this.#maxScroll <= 0 || lines === 0) return false;
    const base = this.#followingEnd ? this.#maxScroll : this.#scrollTop;
    const next = clamp(base + lines, 0, this.#maxScroll);
    this.#scrollTop = next;
    this.#followingEnd = next >= this.#maxScroll;
    if (this.#followingEnd) this.#newMessages = 0;
    this.noteScrollActivity(now);
    return true;
  }

  scrollTo(position: number, now = Date.now()): boolean {
    const next = clamp(position, 0, this.#maxScroll);
    const changed = next !== this.#scrollTop || this.#followingEnd;
    this.#scrollTop = next;
    // Invariant: every scrolling path that reaches the final legal top row resumes follow.
    this.#followingEnd = next >= this.#maxScroll;
    if (this.#followingEnd) this.#newMessages = 0;
    this.noteScrollActivity(now);
    return changed;
  }

  scrollToEnd(now = Date.now()): boolean {
    const changed = !this.#followingEnd || this.#scrollTop !== this.#maxScroll;
    this.#followingEnd = true;
    this.#scrollTop = this.#maxScroll;
    this.#newMessages = 0;
    this.noteScrollActivity(now);
    return changed;
  }

  /** Jumps to the pinned prompt governing this position, then earlier prompts. */
  scrollToPreviousPrompt(now = Date.now()): boolean {
    let target = -1;
    let earliest = Number.POSITIVE_INFINITY;
    for (const anchor of this.#promptAnchors) {
      earliest = Math.min(earliest, anchor.firstRow);
      if (anchor.firstRow < this.#scrollTop && anchor.firstRow > target) target = anchor.firstRow;
    }
    // Invariant: the first prompt owns the document's opening breathing row. At that final
    // navigation stop, reveal the spacer too rather than pinning the prompt to
    // terminal row one as later prompt jumps do.
    const destination = target === earliest ? 0 : target;
    return target >= 0 && this.scrollTo(destination, now);
  }

  /** Jumps to the next submitted prompt, or resumes following at the bottom. */
  scrollToNextPrompt(now = Date.now()): boolean {
    if (this.#promptAnchors.length === 0) return false;
    const earliest = Math.min(...this.#promptAnchors.map(anchor => anchor.firstRow));
    // Invariant: scroll position zero is the first-prompt stop because it includes that
    // prompt's opening spacer. Do not spend an extra keypress moving one row.
    const after = this.#scrollTop === 0 ? earliest : this.#scrollTop;
    let target = Number.POSITIVE_INFINITY;
    for (const anchor of this.#promptAnchors) {
      if (anchor.firstRow > after && anchor.firstRow < target) target = anchor.firstRow;
    }
    return Number.isFinite(target) ? this.scrollTo(target, now) : this.scrollToEnd(now);
  }

  reset(): void {
    this.#scrollTop = 0;
    this.#maxScroll = 0;
    this.#followingEnd = true;
    this.#newMessages = 0;
    if (this.#selection !== undefined) this.#selectionRevision += 1;
    this.#selection = undefined;
    this.#selectionClick = undefined;
    this.#paintedRowCache.clear();
    this.#baseRowCache.clear();
    this.#selectedRowCache.clear();
    this.#finalRowCache.clear();
    this.#previousVisibleStates = [];
    this.#documentRows = [];
    this.#selectableDocumentRowCount = 0;
    this.#promptAnchors = [];
    this.#contentWidth = 0;
    this.clearTransient();
    this.#frame = null;
  }

  clearTransient(): void {
    this.#activeUntil = 0;
    this.#railHovered = false;
    this.#railDragging = false;
    this.#stickyHovered = false;
  }

  compose(input: TranscriptViewportFrameInput): TranscriptViewportFrame {
    const width = Math.max(1, input.width);
    const height = Math.max(0, input.height);
    const theme = input.theme ?? PLAIN_THEME;
    const previousDescriptor = this.#frame?.descriptor ?? null;
    const dock = input.dockRows.length > height ? input.dockRows.slice(-height) : [...input.dockRows];
    const viewportHeight = Math.max(0, height - dock.length);
    const bottomAlignedTailRowCount = clamp(
      input.bottomAlignedTailRowCount ?? 0,
      0,
      input.documentRows.length,
    );
    const transientAlignmentGapRows = bottomAlignedTailRowCount > 0
      ? Math.max(0, viewportHeight - input.documentRows.length)
      : 0;
    const tailStart = input.documentRows.length - bottomAlignedTailRowCount;
    const documentRows = transientAlignmentGapRows === 0
      ? input.documentRows
      : [
          ...input.documentRows.slice(0, tailStart),
          ...Array.from({ length: transientAlignmentGapRows }, () => ""),
          ...input.documentRows.slice(tailStart),
        ];
    this.#maxScroll = Math.max(0, documentRows.length - viewportHeight);
    if (this.#followingEnd) this.#scrollTop = this.#maxScroll;
    else this.#scrollTop = clamp(this.#scrollTop, 0, this.#maxScroll);
    if (this.#scrollTop >= this.#maxScroll) this.#followingEnd = true;
    if (this.#followingEnd) this.#newMessages = 0;

    const geometry = scrollbarGeometry({
      contentLength: documentRows.length,
      viewportHeight,
      scroll: this.#scrollTop,
      // Compatibility: the session rail deliberately starts one line below the viewport top.
      trackHeight: Math.max(0, viewportHeight - 1),
    });
    const presentation = scrollbarPresentation({
      geometry,
      appearance: this.#config.scrollbarAppearance,
      style: this.#config.scrollbarStyle,
      hovered: this.#railHovered,
      dragging: this.#railDragging,
      activeUntil: this.#activeUntil,
      now: input.now ?? Date.now(),
    });
    const contentWidth = presentation.reservesSpace ? Math.max(1, width - 1) : width;
    this.#documentRows = documentRows;
    this.#selectableDocumentRowCount = clamp(
      input.selectableDocumentRowCount ?? input.documentRows.length,
      0,
      input.documentRows.length,
    );
    this.#promptAnchors = input.promptAnchors;
    this.#contentWidth = contentWidth;
    const paintDocumentRow = input.paintDocumentRow ?? IDENTITY_ROW;
    const cacheLimit = Math.max(32, viewportHeight * 6);
    trimCache(this.#paintedRowCache, cacheLimit);
    trimCache(this.#baseRowCache, cacheLimit);
    trimCache(this.#selectedRowCache, cacheLimit);
    trimCache(this.#finalRowCache, cacheLimit);
    const paintId = this.#functionId(paintDocumentRow);
    const paintRecomputedRows = new Set<number>();
    const visible = documentRows
      .slice(this.#scrollTop, this.#scrollTop + viewportHeight)
      .map((row, index) => {
        const painted = cachedString(this.#paintedRowCache, `${paintId}\u0000${row}`, cacheLimit, () => paintDocumentRow(row));
        if (!painted.reused) paintRecomputedRows.add(index);
        return painted.value;
      });
    while (visible.length < viewportHeight) visible.push("");

    const governing = governingPrompt(input.promptAnchors, this.#scrollTop);
    const stickyActive = governing !== null && governing.firstRow < this.#scrollTop;
    if (stickyActive && visible.length > 0) {
      const quiet = this.#scrollTop > governing.lastRow;
      // Compatibility: sticky prompts use the same normal/hover surface roles as the bottom
      // control. Hover always starts from the full source row, so a quiet prompt
      // becomes prominent again with its timestamp intact.
      const source = cachedString(
        this.#paintedRowCache,
        `${paintId}\u0000${governing.sourceRow}`,
        cacheLimit,
        () => paintDocumentRow(governing.sourceRow),
      );
      if (!source.reused) paintRecomputedRows.add(0);
      const sticky = theme.sticky(source.value, this.#stickyHovered);
      visible[0] = quiet && !this.#stickyHovered ? theme.quietSticky(sticky) : sticky;
    }

    const selectionPainterId = this.#functionId(theme.selection);
    // Concurrency: a painter may synchronously route input in tests or host integrations.
    // Label this frame with the exact selection snapshot it began composing.
    const composingSelectionRevision = this.#selectionRevision;
    const orderedSelection = orderedTextSelection(this.#selection);
    const recomputedRows: number[] = [];
    const reusedRows: number[] = [];
    const selectionDamagedRows: number[] = [];
    const visibleStates: string[] = [];
    for (let row = 0; row < visible.length; row += 1) {
      const documentLine = this.#scrollTop + row;
      const painted = visible[row] ?? "";
      const base = cachedString(
        this.#baseRowCache,
        `${width}\u0000${painted}`,
        cacheLimit,
        () => padRowPreservingBackground(painted, width),
      );
      let rowRecomputed = paintRecomputedRows.has(row) || !base.reused;
      const range = stickyActive && row === 0
        ? null
        : selectionRangeForLine(orderedSelection, documentLine, this.#selectableDocumentRowCount, width);
      const rangeKey = range === null ? "-" : `${range.from}:${range.to}`;
      const selected = range === null
        ? { value: base.value, reused: true }
        : cachedString(
            this.#selectedRowCache,
            `${selectionPainterId}\u0000${rangeKey}\u0000${base.value}`,
            cacheLimit,
            () => theme.selection(base.value, range.from, range.to),
          );
      rowRecomputed ||= !selected.reused;

      // Invariant: paint the rail after selection. Full-row selection reaches the terminal
      // edge, while the foreground thumb/track remains visible above that
      // background instead of disappearing into it.
      let railCell = "";
      if (presentation.visible && geometry !== null && row > 0) {
        const trackRow = row - 1;
        const thumb = isThumbRow(geometry, trackRow);
        const glyph = thumb ? presentation.thumbGlyph : presentation.trackGlyph;
        railCell = thumb ? theme.thumb(glyph, this.#railHovered || this.#railDragging) : theme.track(glyph);
      }
      const final = cachedString(
        this.#finalRowCache,
        `${width}\u0000${railCell}\u0000${selected.value}`,
        cacheLimit,
        () => railCell.length === 0 ? selected.value : overlaySpan(selected.value, width - 1, width, railCell),
      );
      rowRecomputed ||= !final.reused;
      visible[row] = final.value;
      (rowRecomputed ? recomputedRows : reusedRows).push(row + 1);

      const state = `${width}\u0000${documentLine}\u0000${painted}\u0000${rangeKey}\u0000${range === null ? "" : selectionPainterId}\u0000${railCell}`;
      visibleStates.push(state);
      if (this.#previousVisibleStates[row] !== state) selectionDamagedRows.push(row + 1);
    }
    this.#previousVisibleStates = visibleStates;

    const frameRows = [...visible, ...dock].slice(0, height);
    let bottomHit: TranscriptViewportHitRegions["bottom"] = null;
    if (this.#maxScroll > 0 && !this.#followingEnd && frameRows.length > 0) {
      const genericLabel = " Jump to bottom (End) ";
      const countedLabel = this.#newMessages > 0
        ? ` ${this.#newMessages} new message${this.#newMessages === 1 ? "" : "s"} (End) `
        : genericLabel;
      const label = displayWidth(countedLabel) <= contentWidth ? countedLabel : genericLabel;
      const labelWidth = displayWidth(label);
      if (labelWidth <= contentWidth) {
        const fallbackRow = Math.max(0, viewportHeight - 1);
        const row = clamp(input.bottomControlRow ?? fallbackRow, 0, frameRows.length - 1);
        const left = Math.floor((contentWidth - labelWidth) / 2);
        bottomHit = { row: row + 1, columnStart: left + 1, columnEnd: left + labelWidth };
        // Invariant: appearance and hit testing share current geometry, even when no mouse moves.
        const pointer = input.pointerPosition;
        const bottomHovered = pointer !== undefined && pointer.row === bottomHit.row
          && pointer.column >= bottomHit.columnStart && pointer.column <= bottomHit.columnEnd;
        frameRows[row] = overlaySpan(
          padRowPreservingBackground(frameRows[row] ?? "", width),
          left,
          left + labelWidth,
          `${CONTROL_STYLE_RESET}${theme.bottomControl(label, bottomHovered)}`,
        );
      }
    }

    const nextDocumentRange = {
      start: this.#scrollTop,
      end: Math.min(documentRows.length, this.#scrollTop + viewportHeight),
    };
    const previousDocumentRange = previousDescriptor?.nextDocumentRange ?? null;
    const sameGeometry = previousDescriptor !== null
      && previousDescriptor.width === width
      && previousDescriptor.height === height
      && sameRectangle(previousDescriptor.transcript, viewportHeight === 0 ? null : { rowStart: 1, rowEnd: viewportHeight })
      && sameRectangle(previousDescriptor.dock, dock.length === 0 ? null : { rowStart: viewportHeight + 1, rowEnd: height });
    const verticalShiftRows = previousDocumentRange === null ? 0 : nextDocumentRange.start - previousDocumentRange.start;
    const safeVerticalShift = sameGeometry
      && previousDescriptor?.followingEnd === true
      && this.#followingEnd
      && this.#selection === undefined
      && verticalShiftRows > 0
      && verticalShiftRows < viewportHeight;
    const descriptor: TranscriptViewportFrameDescriptor = {
      frameId: ++this.#frameId,
      width,
      height,
      transcript: viewportHeight === 0 ? null : { rowStart: 1, rowEnd: viewportHeight },
      dock: dock.length === 0 ? null : { rowStart: viewportHeight + 1, rowEnd: height },
      previousDocumentRange,
      nextDocumentRange,
      previousFollowingEnd: previousDescriptor?.followingEnd ?? null,
      followingEnd: this.#followingEnd,
      transientRowCount: Math.max(0, documentRows.length - this.#selectableDocumentRowCount),
      transientAlignmentGapRows,
      bottomAlignedTailRowCount,
      verticalShiftRows,
      safeVerticalShift,
      selectionRevision: composingSelectionRevision,
      selectionDamagedRows,
      cause: previousDescriptor === null
        ? "initial"
        : !sameGeometry
          ? "geometry-change"
          : !this.#followingEnd
            ? "detached"
            : safeVerticalShift
              ? "follow-shift"
              : "steady",
    };
    assertTranscriptViewportFrameDescriptor(descriptor);

    const hits: TranscriptViewportHitRegions = {
      viewportHeight,
      rail: geometry === null || this.#config.scrollbarAppearance === "hidden" ? null : {
        column: width,
        rowStart: 2,
        trackHeight: Math.max(0, viewportHeight - 1),
        geometry,
      },
      sticky: stickyActive ? { row: 1, target: governing.firstRow, width: contentWidth } : null,
      bottom: bottomHit,
      transientTail: Array.from(
        { length: Math.max(0, Math.min(documentRows.length, this.#scrollTop + viewportHeight) - Math.max(this.#scrollTop, this.#selectableDocumentRowCount)) },
        (_row, index) => Math.max(this.#scrollTop, this.#selectableDocumentRowCount) - this.#scrollTop + index + 1,
      ),
    };
    const frame: TranscriptViewportFrame = {
      rows: frameRows,
      contentWidth,
      scrollTop: this.#scrollTop,
      maxScroll: this.#maxScroll,
      followingEnd: this.#followingEnd,
      hits,
      descriptor,
      selectionDamage: {
        revision: composingSelectionRevision,
        recomputedRows,
        reusedRows,
        cacheEntries: this.#paintedRowCache.size + this.#baseRowCache.size
          + this.#selectedRowCache.size + this.#finalRowCache.size,
      },
    };
    this.#frame = frame;
    return frame;
  }

  /** Reuses an established transcript frame when only same-height dock rows changed. */
  composeDockOnly(dockRows: readonly string[], width: number, height: number): TranscriptViewportFrame | null {
    const previous = this.#frame;
    const boundedWidth = Math.max(1, width);
    const boundedHeight = Math.max(0, height);
    if (previous === null || previous.descriptor.width !== boundedWidth || previous.descriptor.height !== boundedHeight
      || previous.descriptor.selectionRevision !== this.#selectionRevision) return null;
    const dock = dockRows.length > boundedHeight ? dockRows.slice(-boundedHeight) : [...dockRows];
    const viewportHeight = Math.max(0, boundedHeight - dock.length);
    const expectedDock = dock.length === 0 ? null : { rowStart: viewportHeight + 1, rowEnd: boundedHeight };
    const expectedTranscript = viewportHeight === 0 ? null : { rowStart: 1, rowEnd: viewportHeight };
    if (!sameRectangle(previous.descriptor.dock, expectedDock)
      || !sameRectangle(previous.descriptor.transcript, expectedTranscript)) return null;

    const descriptor: TranscriptViewportFrameDescriptor = {
      frameId: ++this.#frameId,
      width: boundedWidth,
      height: boundedHeight,
      transcript: expectedTranscript,
      dock: expectedDock,
      previousDocumentRange: previous.descriptor.nextDocumentRange,
      nextDocumentRange: previous.descriptor.nextDocumentRange,
      previousFollowingEnd: previous.followingEnd,
      followingEnd: previous.followingEnd,
      transientRowCount: previous.descriptor.transientRowCount,
      transientAlignmentGapRows: previous.descriptor.transientAlignmentGapRows,
      bottomAlignedTailRowCount: previous.descriptor.bottomAlignedTailRowCount,
      verticalShiftRows: 0,
      safeVerticalShift: false,
      selectionRevision: this.#selectionRevision,
      selectionDamagedRows: [],
      cause: "dock-input",
    };
    assertTranscriptViewportFrameDescriptor(descriptor);
    const frame: TranscriptViewportFrame = {
      rows: [...previous.rows.slice(0, viewportHeight), ...dock].slice(0, boundedHeight),
      contentWidth: previous.contentWidth,
      scrollTop: previous.scrollTop,
      maxScroll: previous.maxScroll,
      followingEnd: previous.followingEnd,
      hits: previous.hits,
      descriptor,
      selectionDamage: {
        revision: this.#selectionRevision,
        recomputedRows: [],
        reusedRows: Array.from({ length: viewportHeight }, (_, index) => index + 1),
        cacheEntries: previous.selectionDamage.cacheEntries,
      },
    };
    this.#frame = frame;
    return frame;
  }

  #functionId(value: Function): number {
    const existing = this.#functionIds.get(value);
    if (existing !== undefined) return existing;
    const id = this.#nextFunctionId;
    this.#nextFunctionId += 1;
    this.#functionIds.set(value, id);
    return id;
  }

  #lineContentAt(line: number): TextSelectionLineContent {
    const plain = stripAnsi(this.#documentRows[line] ?? "");
    const prompt = this.#promptAnchors.find(anchor => line >= anchor.firstRow && line <= anchor.lastRow);
    if (prompt !== undefined) {
      if (line === prompt.firstRow) {
        const timestamp = /\s+\d{2}:\d{2}\s*$/.exec(plain);
        if (timestamp !== null) return usefulTextLineContent(plain.slice(0, timestamp.index), 3);
      }
      return usefulTextLineContent(plain, 3);
    }
    const from = plain.trim().length === 0 || (plain.startsWith(" ") && !plain.startsWith("  ")) ? 2 : 1;
    const content = usefulTextLineContent(plain, from);
    if (plain.trim().length === 0) return { from, to: from + 1 };
    return content;
  }
}

function selectionRangeForLine(
  selection: OrderedTextSelection | undefined,
  documentLine: number,
  selectableRowCount: number,
  width: number,
): { readonly from: number; readonly to: number } | null {
  if (selection === undefined || documentLine >= selectableRowCount
    || documentLine < selection.start.line || documentLine > selection.end.line) return null;
  const fullVisualRow = selection.fullRow === true
    || (selection.start.line !== selection.end.line
      && documentLine !== selection.start.line
      && documentLine !== selection.end.line);
  const from = fullVisualRow || documentLine !== selection.start.line
    ? 0
    : selection.start.column;
  const throughFinalColumn = documentLine === selection.end.line && selection.throughFinalColumn === true;
  const to = fullVisualRow || documentLine !== selection.end.line || throughFinalColumn
    ? width
    : selection.end.column;
  const boundedFrom = clamp(from, 0, width);
  const boundedTo = clamp(to, boundedFrom, width);
  return boundedTo > boundedFrom ? { from: boundedFrom, to: boundedTo } : null;
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

function governingPrompt(anchors: readonly TranscriptPromptAnchor[], scrollTop: number): TranscriptPromptAnchor | null {
  let result: TranscriptPromptAnchor | null = null;
  for (const anchor of anchors) {
    if (anchor.firstRow > scrollTop) break;
    result = anchor;
  }
  return result;
}

function padRowPreservingBackground(line: string, width: number): string {
  const shown = displayWidth(line) > width ? truncateToWidth(line, width) : line;
  const padding = Math.max(0, width - displayWidth(shown));
  if (padding === 0) return shown;
  const background = /\u001b\[(?:4[0-8]|10[0-7]|48;(?:2;\d+;\d+;\d+|5;\d+))m/.exec(line)?.[0];
  const reverse = /\u001b\[(?:7(?:;[0-9]+)*|[0-9;]*;7(?:;[0-9]+)*)m/.exec(line)?.[0];
  if (background) return `${shown}${background}${" ".repeat(padding)}\u001b[49m`;
  if (reverse) return `${shown}${reverse}${" ".repeat(padding)}\u001b[27m`;
  return shown + " ".repeat(padding);
}

export function assertTranscriptViewportFrameDescriptor(descriptor: TranscriptViewportFrameDescriptor): void {
  if (!Number.isSafeInteger(descriptor.frameId) || descriptor.frameId < 1) throw new TypeError("viewport frame descriptor identity is invalid");
  if (!Number.isSafeInteger(descriptor.width) || descriptor.width < 1) throw new TypeError("viewport frame descriptor width is invalid");
  if (!Number.isSafeInteger(descriptor.height) || descriptor.height < 0) throw new TypeError("viewport frame descriptor height is invalid");
  assertRectangle(descriptor.transcript, descriptor.height, "transcript");
  assertRectangle(descriptor.dock, descriptor.height, "dock");
  if (descriptor.transcript !== null && descriptor.dock !== null && descriptor.transcript.rowEnd >= descriptor.dock.rowStart) {
    throw new TypeError("viewport frame descriptor regions overlap");
  }
  assertDocumentRange(descriptor.nextDocumentRange, "next");
  if (descriptor.previousDocumentRange !== null) assertDocumentRange(descriptor.previousDocumentRange, "previous");
  if (!Number.isSafeInteger(descriptor.transientRowCount) || descriptor.transientRowCount < 0
    || !Number.isSafeInteger(descriptor.transientAlignmentGapRows) || descriptor.transientAlignmentGapRows < 0
    || !Number.isSafeInteger(descriptor.bottomAlignedTailRowCount) || descriptor.bottomAlignedTailRowCount < 0
    || descriptor.transientAlignmentGapRows + descriptor.bottomAlignedTailRowCount > descriptor.transientRowCount) {
    throw new TypeError("viewport frame descriptor transient geometry is invalid");
  }
  if (!Number.isSafeInteger(descriptor.verticalShiftRows)) throw new TypeError("viewport frame descriptor shift is invalid");
  if (descriptor.previousDocumentRange === null && descriptor.verticalShiftRows !== 0) {
    throw new TypeError("viewport frame descriptor initial shift is invalid");
  }
  if (descriptor.previousDocumentRange !== null
    && descriptor.verticalShiftRows !== descriptor.nextDocumentRange.start - descriptor.previousDocumentRange.start) {
    throw new TypeError("viewport frame descriptor shift disagrees with document ranges");
  }
  if (descriptor.safeVerticalShift && (descriptor.verticalShiftRows <= 0
    || descriptor.previousFollowingEnd !== true
    || !descriptor.followingEnd
    || descriptor.cause !== "follow-shift")) {
    throw new TypeError("viewport frame descriptor marks an unsafe shift");
  }
  if (!Number.isSafeInteger(descriptor.selectionRevision) || descriptor.selectionRevision < 0) {
    throw new TypeError("viewport frame descriptor selection revision is invalid");
  }
  if (descriptor.selectionDamagedRows.some((row, index) => !Number.isSafeInteger(row)
    || row < 1 || row > descriptor.height || (index > 0 && row <= descriptor.selectionDamagedRows[index - 1]!))) {
    throw new TypeError("viewport frame descriptor selection damage is invalid");
  }
}

function assertRectangle(
  rectangle: TranscriptViewportFrameDescriptor["transcript"],
  height: number,
  label: string,
): void {
  if (rectangle === null) return;
  if (!Number.isSafeInteger(rectangle.rowStart) || !Number.isSafeInteger(rectangle.rowEnd)
    || rectangle.rowStart < 1 || rectangle.rowEnd < rectangle.rowStart || rectangle.rowEnd > height) {
    throw new TypeError(`viewport frame descriptor ${label} region is invalid`);
  }
}

function assertDocumentRange(range: { readonly start: number; readonly end: number }, label: string): void {
  if (!Number.isSafeInteger(range.start) || !Number.isSafeInteger(range.end) || range.start < 0 || range.end < range.start) {
    throw new TypeError(`viewport frame descriptor ${label} document range is invalid`);
  }
}

function sameRectangle(
  left: TranscriptViewportFrameDescriptor["transcript"],
  right: TranscriptViewportFrameDescriptor["transcript"],
): boolean {
  return left === null ? right === null : right !== null && left.rowStart === right.rowStart && left.rowEnd === right.rowEnd;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
