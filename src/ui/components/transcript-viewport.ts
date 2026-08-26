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
  textSelectionText,
  usefulTextLineContent,
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
}

export interface TranscriptViewportFrame {
  readonly rows: readonly string[];
  readonly contentWidth: number;
  readonly scrollTop: number;
  readonly maxScroll: number;
  readonly followingEnd: boolean;
  readonly hits: TranscriptViewportHitRegions;
}

const CONTROL_STYLE_RESET = "\u001b]8;;\u001b\\\u001b[0m";

const DEFAULT_CONFIG: TranscriptViewportConfig = {
  scrollbarAppearance: "hover",
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
  #bottomHovered = false;
  #selection: TextSelection | undefined;
  #selectionClick: TextSelectionClick | undefined;
  #documentRows: readonly string[] = [];
  #promptAnchors: readonly TranscriptPromptAnchor[] = [];
  #contentWidth = 0;
  #frame: TranscriptViewportFrame | null = null;

  get scrollTop(): number { return this.#scrollTop; }
  get maxScroll(): number { return this.#maxScroll; }
  get followingEnd(): boolean { return this.#followingEnd; }
  get newMessages(): number { return this.#newMessages; }
  get frame(): TranscriptViewportFrame | null { return this.#frame; }

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
  setBottomHovered(hovered: boolean): void { this.#bottomHovered = hovered; }

  get selectionActive(): boolean { return this.#selection?.selecting === true; }
  get hasSelection(): boolean { return orderedTextSelection(this.#selection) !== undefined; }

  pressSelection(column: number, viewportRow: number, now = Date.now()): boolean {
    const viewportHeight = this.#frame?.hits.viewportHeight ?? 0;
    if (viewportRow < 1 || viewportRow > viewportHeight || column < 1 || column > this.#contentWidth) return false;
    const line = clamp(this.#scrollTop + viewportRow - 1, 0, Math.max(0, this.#documentRows.length - 1));
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
    return true;
  }

  extendSelection(column: number, viewportRow: number, now = Date.now(), autoScroll = true): boolean {
    const selection = this.#selection;
    const viewportHeight = this.#frame?.hits.viewportHeight ?? 0;
    if (selection?.selecting !== true || viewportHeight <= 0 || this.#documentRows.length === 0) return false;
    // Pointer motion updates only the endpoint; the shell's fixed-cadence timer
    // owns edge scrolling. This option prevents high-rate motion reports from
    // adding irregular extra rows between timer ticks.
    if (autoScroll && viewportRow > viewportHeight) this.scrollBy(1, now);
    else if (autoScroll && viewportRow <= 1 && this.#scrollTop > 0) this.scrollBy(-1, now);
    const visibleRow = clamp(viewportRow, 1, viewportHeight);
    const line = clamp(this.#scrollTop + visibleRow - 1, 0, this.#documentRows.length - 1);
    const targetColumn = selection.fullRow
      ? textSelectionLineExtendColumn(selection, line, this.#contentWidth)
      : clamp(column, 1, this.#contentWidth);
    this.#selection = extendTextSelection(selection, { line, column: targetColumn });
    return true;
  }

  releaseSelection(): boolean {
    if (this.#selection?.selecting !== true) return false;
    this.#selection = releaseTextSelection(this.#selection);
    return true;
  }

  clearSelection(): boolean {
    if (this.#selection === undefined) return false;
    this.#selection = undefined;
    return true;
  }

  selectedText(): string | null {
    const selection = orderedTextSelection(this.#selection);
    if (selection === undefined) return null;
    return textSelectionText(selection, this.#documentRows, line => this.#lineContentAt(line));
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
    // Every scrolling path that reaches the final legal top row resumes follow.
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
    // The first prompt owns the document's opening breathing row. At that final
    // navigation stop, reveal the spacer too rather than pinning the prompt to
    // terminal row one as later prompt jumps do.
    const destination = target === earliest ? 0 : target;
    return target >= 0 && this.scrollTo(destination, now);
  }

  reset(): void {
    this.#scrollTop = 0;
    this.#maxScroll = 0;
    this.#followingEnd = true;
    this.#newMessages = 0;
    this.#selection = undefined;
    this.#selectionClick = undefined;
    this.#documentRows = [];
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
    this.#bottomHovered = false;
  }

  compose(input: TranscriptViewportFrameInput): TranscriptViewportFrame {
    const width = Math.max(1, input.width);
    const height = Math.max(0, input.height);
    const theme = input.theme ?? PLAIN_THEME;
    const dock = input.dockRows.length > height ? input.dockRows.slice(-height) : [...input.dockRows];
    const viewportHeight = Math.max(0, height - dock.length);
    this.#maxScroll = Math.max(0, input.documentRows.length - viewportHeight);
    if (this.#followingEnd) this.#scrollTop = this.#maxScroll;
    else this.#scrollTop = clamp(this.#scrollTop, 0, this.#maxScroll);
    if (this.#scrollTop >= this.#maxScroll) this.#followingEnd = true;
    if (this.#followingEnd) this.#newMessages = 0;

    const geometry = scrollbarGeometry({
      contentLength: input.documentRows.length,
      viewportHeight,
      scroll: this.#scrollTop,
      // The session rail deliberately starts one line below the viewport top.
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
    this.#documentRows = input.documentRows;
    this.#promptAnchors = input.promptAnchors;
    this.#contentWidth = contentWidth;
    const visible = input.documentRows.slice(this.#scrollTop, this.#scrollTop + viewportHeight);
    while (visible.length < viewportHeight) visible.push("");

    const governing = governingPrompt(input.promptAnchors, this.#scrollTop);
    const stickyActive = governing !== null && governing.firstRow < this.#scrollTop;
    if (stickyActive && visible.length > 0) {
      const quiet = this.#scrollTop > governing.lastRow;
      // Sticky prompts use the same normal/hover surface roles as the bottom
      // control. Hover always starts from the full source row, so a quiet prompt
      // becomes prominent again with its timestamp intact.
      const sticky = theme.sticky(governing.sourceRow, this.#stickyHovered);
      visible[0] = quiet && !this.#stickyHovered ? theme.quietSticky(sticky) : sticky;
    }

    const orderedSelection = orderedTextSelection(this.#selection);
    for (let row = 0; row < visible.length; row += 1) {
      let line = padRowPreservingBackground(visible[row] ?? "", width);
      if (orderedSelection !== undefined && !(stickyActive && row === 0)) {
        const documentLine = this.#scrollTop + row;
        if (documentLine >= orderedSelection.start.line && documentLine <= orderedSelection.end.line) {
          const fullVisualRow = orderedSelection.fullRow === true
            || (orderedSelection.start.line !== orderedSelection.end.line
              && documentLine !== orderedSelection.start.line
              && documentLine !== orderedSelection.end.line);
          const from = fullVisualRow || documentLine !== orderedSelection.start.line
            ? 0
            : orderedSelection.start.column - 1;
          const to = fullVisualRow || documentLine !== orderedSelection.end.line
            ? width
            : orderedSelection.end.column;
          if (to > from) line = theme.selection(line, from, Math.min(width, to));
        }
      }
      // Paint the rail after selection. Full-row selection reaches the terminal
      // edge, while the foreground thumb/track remains visible above that
      // background instead of disappearing into it.
      // Row zero is the intentional one-line breathing room above the rail.
      if (presentation.visible && geometry !== null && row > 0) {
        const trackRow = row - 1;
        const thumb = isThumbRow(geometry, trackRow);
        const glyph = thumb ? presentation.thumbGlyph : presentation.trackGlyph;
        const cell = thumb ? theme.thumb(glyph, this.#railHovered || this.#railDragging) : theme.track(glyph);
        line = overlaySpan(line, width - 1, width, cell);
      }
      visible[row] = line;
    }

    const frameRows = [...visible, ...dock].slice(0, height);
    let bottomHit: TranscriptViewportHitRegions["bottom"] = null;
    if (geometry !== null && !this.#followingEnd && frameRows.length > 0) {
      const genericLabel = " Jump to bottom (Alt+End) ";
      const countedLabel = this.#newMessages > 0
        ? ` ${this.#newMessages} new message${this.#newMessages === 1 ? "" : "s"} (Alt+End) `
        : genericLabel;
      const label = displayWidth(countedLabel) <= contentWidth ? countedLabel : genericLabel;
      const labelWidth = displayWidth(label);
      if (labelWidth <= contentWidth) {
        const fallbackRow = Math.max(0, viewportHeight - 1);
        const row = clamp(input.bottomControlRow ?? fallbackRow, 0, frameRows.length - 1);
        const left = Math.floor((contentWidth - labelWidth) / 2);
        frameRows[row] = overlaySpan(
          padRowPreservingBackground(frameRows[row] ?? "", width),
          left,
          left + labelWidth,
          `${CONTROL_STYLE_RESET}${theme.bottomControl(label, this.#bottomHovered)}`,
        );
        bottomHit = { row: row + 1, columnStart: left + 1, columnEnd: left + labelWidth };
      }
    }

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
    };
    const frame: TranscriptViewportFrame = {
      rows: frameRows,
      contentWidth,
      scrollTop: this.#scrollTop,
      maxScroll: this.#maxScroll,
      followingEnd: this.#followingEnd,
      hits,
    };
    this.#frame = frame;
    return frame;
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
