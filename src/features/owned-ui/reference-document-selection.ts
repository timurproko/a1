import {
  backgroundSgrSpan,
  displayWidth,
  extendTextSelection,
  orderedTextSelection,
  padToWidth,
  pressTextSelection,
  releaseTextSelection,
  stripAnsi,
  textSelectionLineExtendColumn,
  textSelectionPointAt,
  textSelectionText,
  usefulTextLineContent,
  type PaneMouseEvent,
  type TextSelection,
  type TextSelectionClick,
  type UiTheme,
} from "../../ui/components/index.js";

const INTERRUPT = "\u0003";
const HIGHLIGHT_MARKER = "\u{e000}";

export interface ReferenceDocumentSelectionOptions {
  readonly copyOnSelect: () => boolean;
  readonly copyText: (text: string) => void;
}

interface ReferenceSelectionFrame {
  readonly bodyRowStart: number;
  readonly contentWidth: number;
  readonly documentRows: readonly string[];
  readonly visibleDocumentRows: readonly (number | undefined)[];
}

/** Selection state for an opted-in read-only reference document. */
export class ReferenceDocumentSelection {
  readonly #copyOnSelect: () => boolean;
  readonly #copyText: (text: string) => void;
  #selection: TextSelection | undefined;
  #click: TextSelectionClick | undefined;
  #frame: ReferenceSelectionFrame | undefined;

  constructor(options: ReferenceDocumentSelectionOptions) {
    this.#copyOnSelect = options.copyOnSelect;
    this.#copyText = options.copyText;
  }

  get selecting(): boolean {
    return this.#selection?.selecting === true;
  }

  get hasSelection(): boolean {
    return orderedTextSelection(this.#selection) !== undefined;
  }

  updateFrame(frame: ReferenceSelectionFrame): void {
    const previous = this.#frame;
    if (this.#selection !== undefined && previous !== undefined && !selectionStillMaps(
      this.#selection,
      previous.documentRows,
      frame.documentRows,
    )) {
      this.#selection = undefined;
      this.#click = undefined;
    }
    this.#frame = frame;
  }

  paintVisibleRow(visibleRow: number, line: string, theme: UiTheme): string {
    const frame = this.#frame;
    const documentRow = frame?.visibleDocumentRows[visibleRow];
    const ordered = orderedTextSelection(this.#selection);
    const width = frame?.contentWidth ?? 0;
    const padded = padToWidth(line, width);
    if (documentRow === undefined || ordered === undefined
      || documentRow < ordered.start.line || documentRow > ordered.end.line) return padded;
    const from = documentRow === ordered.start.line ? ordered.start.column : 0;
    const to = documentRow === ordered.end.line ? ordered.end.column : width;
    return paintSelection(padded, Math.max(0, from), Math.min(width, to), theme);
  }

  handleInput(data: string): { readonly consumed: boolean; readonly cleared: boolean } {
    if (data === INTERRUPT && this.hasSelection) {
      this.#submitSelection();
      this.#selection = undefined;
      this.#click = undefined;
      return { consumed: true, cleared: true };
    }
    if (this.#selection === undefined) return { consumed: false, cleared: false };
    this.#selection = undefined;
    this.#click = undefined;
    return { consumed: false, cleared: true };
  }

  handleMouse(event: PaneMouseEvent): { readonly consumed: boolean; readonly changed: boolean } {
    const frame = this.#frame;
    if (frame === undefined) return { consumed: false, changed: false };
    if (event.kind === "motion" && this.selecting) {
      const row = documentRowAt(frame, event.row, true);
      if (row === undefined) return { consumed: true, changed: false };
      this.#extend(row, event.column);
      return { consumed: true, changed: true };
    }
    if (event.kind === "release" && this.selecting) {
      this.#selection = releaseTextSelection(this.#selection);
      if (this.hasSelection && this.#copyOnSelect()) this.#submitSelection();
      return { consumed: true, changed: true };
    }
    if (event.kind !== "press" || event.button !== 0) return { consumed: false, changed: false };
    const row = documentRowAt(frame, event.row, false);
    if (row === undefined || event.column < 1 || event.column > frame.contentWidth) {
      const changed = this.#selection !== undefined;
      this.#selection = undefined;
      this.#click = undefined;
      return { consumed: false, changed };
    }
    const source = frame.documentRows[row] ?? "";
    const pressed = pressTextSelection({
      line: row,
      column: event.column,
      contentWidth: frame.contentWidth,
      lineText: source,
      lineContent: usefulTextLineContent(source),
      ...(this.#click === undefined ? {} : { previousClick: this.#click }),
    });
    this.#selection = pressed.selection;
    this.#click = pressed.click;
    return { consumed: true, changed: true };
  }

  clear(): void {
    this.#selection = undefined;
    this.#click = undefined;
    this.#frame = undefined;
  }

  #extend(row: number, column: number): void {
    const selection = this.#selection;
    const frame = this.#frame;
    if (selection?.selecting !== true || frame === undefined) return;
    const targetColumn = selection.fullRow
      ? textSelectionLineExtendColumn(selection, row, frame.contentWidth)
      : Math.max(1, Math.min(column, frame.contentWidth));
    this.#selection = extendTextSelection(
      selection,
      selection.fullRow
        ? { line: row, column: targetColumn }
        : textSelectionPointAt(row, targetColumn, frame.documentRows[row] ?? ""),
    );
  }

  #submitSelection(): void {
    const frame = this.#frame;
    const ordered = orderedTextSelection(this.#selection);
    if (frame === undefined || ordered === undefined) return;
    const text = textSelectionText(
      ordered,
      frame.documentRows,
      line => usefulTextLineContent(frame.documentRows[line] ?? ""),
    ).trim();
    if (text.length > 0) this.#copyText(text);
  }
}

function documentRowAt(frame: ReferenceSelectionFrame, screenRow: number, clampToDocument: boolean): number | undefined {
  const visible = frame.visibleDocumentRows;
  let index = screenRow - frame.bodyRowStart;
  if (!clampToDocument) return visible[index];
  index = Math.max(0, Math.min(index, visible.length - 1));
  if (visible[index] !== undefined) return visible[index];
  const defined = visible.flatMap(row => row === undefined ? [] : [row]);
  if (defined.length === 0) return undefined;
  return screenRow < frame.bodyRowStart ? defined[0] : defined.at(-1);
}

function selectionStillMaps(selection: TextSelection, previous: readonly string[], next: readonly string[]): boolean {
  const first = Math.min(selection.anchor.line, selection.head.line);
  const last = Math.max(selection.anchor.line, selection.head.line);
  if (last >= previous.length || last >= next.length) return false;
  for (let line = first; line <= last; line += 1) {
    if (stripAnsi(previous[line] ?? "") !== stripAnsi(next[line] ?? "")) return false;
  }
  return true;
}

function paintSelection(line: string, from: number, to: number, theme: UiTheme): string {
  if (to <= from || from >= displayWidth(line)) return line;
  const sample = theme.highlight(HIGHLIGHT_MARKER);
  const marker = sample.indexOf(HIGHLIGHT_MARKER);
  if (marker < 0) return line;
  return backgroundSgrSpan(
    line,
    from,
    to,
    sample.slice(0, marker),
    sample.slice(marker + HIGHLIGHT_MARKER.length),
  );
}
