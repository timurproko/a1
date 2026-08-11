import type Headless from "@xterm/headless";
import type { TerminalCell, TerminalColor, TerminalModes, TerminalSurface } from "../../domain/index.js";
import { TERMINAL_ATTRIBUTES } from "../../domain/index.js";

type HeadlessTerminal = InstanceType<(typeof Headless)["Terminal"]>;

export interface ResidentTerminalMetadata {
  readonly cursorVisible: boolean;
  readonly cursorStyle: TerminalSurface["cursor"]["style"];
  readonly cursorBlinking: boolean;
  readonly modes: TerminalModes;
}

/**
 * Maintains a bounded resident surface while reusing unchanged rows. Each
 * capture reads the viewport for correctness but allocates cells only for rows
 * that changed, and appends only newly scrolled lines to the scrollback ring.
 */
export class ResidentTerminalState {
  #rows: readonly (readonly TerminalCell[])[] = [];
  #scrollback: readonly (readonly TerminalCell[])[] = [];
  #columns = 0;
  #rowCount = 0;
  #activeScreen: "normal" | "alternate" = "normal";
  #scrollbackBase = 0;

  constructor(
    private readonly terminal: HeadlessTerminal,
    private readonly maxScrollbackLines = 500,
  ) {}

  capture(sequence: number, revision: number, final: boolean, metadata: ResidentTerminalMetadata): TerminalSurface {
    const buffer = this.terminal.buffer.active;
    const activeScreen = buffer === this.terminal.buffer.alternate ? "alternate" as const : "normal" as const;
    const dimensionsChanged = this.#columns !== this.terminal.cols || this.#rowCount !== this.terminal.rows;
    const screenChanged = this.#activeScreen !== activeScreen;
    const priorRows = !dimensionsChanged && !screenChanged ? this.#rows : [];
    const scrollRows = activeScreen === "normal" && !dimensionsChanged && !screenChanged
      ? Math.max(0, buffer.baseY - this.#scrollbackBase)
      : 0;

    let scrollback = activeScreen === "normal" ? this.#scrollback : [];
    if (activeScreen === "normal") {
      if (priorRows.length === 0) {
        const count = Math.min(this.maxScrollbackLines, buffer.baseY);
        scrollback = Array.from({ length: count }, (_, index) => this.#captureRow(buffer.baseY - count + index));
      } else if (scrollRows > 0) {
        const count = Math.min(this.maxScrollbackLines, scrollRows);
        const newlyScrolled = Array.from({ length: count }, (_, index) => this.#captureRow(buffer.baseY - count + index));
        scrollback = [...scrollback, ...newlyScrolled].slice(-this.maxScrollbackLines);
      }
    }

    const reusableRows = scrollRows > 0 && scrollRows < priorRows.length
      ? [...priorRows.slice(scrollRows), ...Array.from({ length: scrollRows }, () => undefined)]
      : priorRows;
    const rows = Array.from({ length: this.terminal.rows }, (_, rowIndex) => {
      const previous = reusableRows[rowIndex];
      const lineIndex = buffer.viewportY + rowIndex;
      return previous && this.#lineEquals(lineIndex, previous) ? previous : this.#captureRow(lineIndex);
    });

    this.#rows = rows;
    this.#scrollback = scrollback;
    this.#columns = this.terminal.cols;
    this.#rowCount = this.terminal.rows;
    this.#activeScreen = activeScreen;
    this.#scrollbackBase = activeScreen === "normal" ? buffer.baseY : 0;

    return {
      columns: this.terminal.cols,
      rows: this.terminal.rows,
      cells: rows,
      scrollbackCells: scrollback,
      cursor: {
        column: buffer.cursorX,
        row: buffer.cursorY,
        visible: metadata.cursorVisible,
        style: metadata.cursorStyle,
        blinking: metadata.cursorBlinking,
      },
      activeScreen,
      modes: metadata.modes,
      scrollbackBase: this.#scrollbackBase,
      outputSequence: sequence,
      revision,
      final,
    };
  }

  #captureRow(lineIndex: number): readonly TerminalCell[] {
    const line = this.terminal.buffer.active.getLine(lineIndex);
    return Array.from({ length: this.terminal.cols }, (_, columnIndex) => terminalCell(line?.getCell(columnIndex)));
  }

  #lineEquals(lineIndex: number, previous: readonly TerminalCell[]): boolean {
    if (previous.length !== this.terminal.cols) return false;
    const line = this.terminal.buffer.active.getLine(lineIndex);
    for (let column = 0; column < this.terminal.cols; column++) {
      if (!xtermCellEquals(line?.getCell(column), previous[column])) return false;
    }
    return true;
  }
}

type XtermCell = ReturnType<NonNullable<ReturnType<HeadlessTerminal["buffer"]["active"]["getLine"]>>["getCell"]>;

function terminalCell(cell: XtermCell | undefined): TerminalCell {
  if (!cell) return { character: " ", width: 1, attributes: 0 };
  const attributes =
    (cell.isBold() ? TERMINAL_ATTRIBUTES.bold : 0)
    | (cell.isItalic() ? TERMINAL_ATTRIBUTES.italic : 0)
    | (cell.isUnderline() ? TERMINAL_ATTRIBUTES.underline : 0)
    | (cell.isInverse() ? TERMINAL_ATTRIBUTES.inverse : 0)
    | (cell.isDim() ? TERMINAL_ATTRIBUTES.dim : 0)
    | (cell.isBlink() ? TERMINAL_ATTRIBUTES.blink : 0)
    | (cell.isInvisible() ? TERMINAL_ATTRIBUTES.invisible : 0)
    | (cell.isStrikethrough() ? TERMINAL_ATTRIBUTES.strikethrough : 0)
    | (cell.isOverline() ? TERMINAL_ATTRIBUTES.overline : 0);
  const foreground = color(cell.isFgDefault(), cell.isFgRGB(), cell.getFgColor());
  const background = color(cell.isBgDefault(), cell.isBgRGB(), cell.getBgColor());
  return {
    character: cell.getChars() || " ",
    width: cell.getWidth(),
    ...(foreground ? { foreground } : {}),
    ...(background ? { background } : {}),
    attributes,
  };
}

function xtermCellEquals(cell: XtermCell | undefined, previous: TerminalCell | undefined): boolean {
  if (!cell || !previous) return false;
  const foreground = color(cell.isFgDefault(), cell.isFgRGB(), cell.getFgColor());
  const background = color(cell.isBgDefault(), cell.isBgRGB(), cell.getBgColor());
  const attributes =
    (cell.isBold() ? TERMINAL_ATTRIBUTES.bold : 0)
    | (cell.isItalic() ? TERMINAL_ATTRIBUTES.italic : 0)
    | (cell.isUnderline() ? TERMINAL_ATTRIBUTES.underline : 0)
    | (cell.isInverse() ? TERMINAL_ATTRIBUTES.inverse : 0)
    | (cell.isDim() ? TERMINAL_ATTRIBUTES.dim : 0)
    | (cell.isBlink() ? TERMINAL_ATTRIBUTES.blink : 0)
    | (cell.isInvisible() ? TERMINAL_ATTRIBUTES.invisible : 0)
    | (cell.isStrikethrough() ? TERMINAL_ATTRIBUTES.strikethrough : 0)
    | (cell.isOverline() ? TERMINAL_ATTRIBUTES.overline : 0);
  return (cell.getChars() || " ") === previous.character
    && cell.getWidth() === previous.width
    && attributes === previous.attributes
    && foreground?.mode === previous.foreground?.mode
    && foreground?.value === previous.foreground?.value
    && background?.mode === previous.background?.mode
    && background?.value === previous.background?.value;
}

function color(isDefault: boolean, isRgb: boolean, value: number): TerminalColor | undefined {
  return isDefault ? undefined : { mode: isRgb ? "rgb" : "palette", value };
}
