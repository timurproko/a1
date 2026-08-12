import type { TerminalCell, TerminalColor, TerminalDamage, TerminalModes, TerminalSurface } from "../domain/index.js";
import { TERMINAL_ATTRIBUTES } from "../domain/index.js";

export const RESET_TERMINAL_MODES = "\x1b[?1l\x1b[?9l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1004l\x1b[?1005l\x1b[?1006l\x1b[?1007l\x1b[?1015l\x1b[?2004l\x1b[?2026l\x1b[?9001l\x1b[?7h\x1b>";

export function renderTerminalSnapshot(surface: TerminalSurface, replaceBlankRows = false): string {
  // The outer screen belongs to AddOne. A child's active screen and input modes
  // affect its virtual state and input encoder, never the physical host.
  let output = "\x1b[?2026h\x1b[?25l";
  for (let row = 0; row < surface.rows; row++) {
    const cells = surface.cells[row] ?? [];
    if (isVisuallyBlankRow(cells)) {
      // A later snapshot is a complete replacement boundary. Its blank rows
      // must erase stale physical cells from a prior layout or resize; skipping
      // them leaves duplicated footers/status rows outside resident state.
      if (replaceBlankRows) output += `\x1b[${row + 1};1H\x1b[0m\x1b[2K`;
      continue;
    }
    output += `\x1b[${row + 1};1H`;
    let style = "";
    for (const cell of cells) {
      if (cell.width === 0) continue;
      const nextStyle = cellStyle(cell);
      if (nextStyle !== style) {
        output += nextStyle;
        style = nextStyle;
      }
      output += cell.character || " ";
    }
    // Every snapshot row already contains exactly surface.columns cells. EL at
    // the pending-wrap bottom-right position would erase the final cell.
    output += "\x1b[0m";
  }
  output += `${renderTerminalCursor(surface)}\x1b[?2026l`;
  return output;
}

export function renderTerminalNormalSnapshot(surface: TerminalSurface): string {
  const rows = [...(surface.scrollbackCells ?? []), ...surface.cells];
  let output = "\x1b[?2026h\x1b[?25l\x1b[?7l\x1b[H";
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    output += renderTerminalRow(rows[rowIndex] ?? []);
    if (rowIndex < rows.length - 1) output += "\r\n";
  }
  output += `${renderTerminalCursor(surface)}\x1b[?7h\x1b[?2026l`;
  return output;
}

/** First normal-screen handoff: append from the current physical cursor. */
export interface InitialNormalSnapshotRender {
  readonly output: string;
  readonly appendedRows: number;
}

export function renderTerminalInitialNormalSnapshot(surface: TerminalSurface): InitialNormalSnapshotRender {
  const lastOccupiedRow = Math.max(surface.cursor.row, lastVisuallyOccupiedRow(surface.cells));
  let output = "\x1b[?2026h\x1b[?25l\x1b[?7l";
  for (let row = 0; row <= lastOccupiedRow; row++) {
    // Direct first renders do not pad each line to the viewport width. Avoid a
    // pending-wrap edge and let CRLF produce the same natural row placement.
    output += renderTerminalRow(trimVisuallyBlankTail(surface.cells[row] ?? []));
    if (row < lastOccupiedRow) output += "\r\n";
  }
  const rowsBack = Math.max(0, lastOccupiedRow - surface.cursor.row);
  if (rowsBack > 0) output += `\x1b[${rowsBack}A`;
  output += `\r\x1b[${surface.cursor.column + 1}C${cursorStyle(surface.cursor.style, surface.cursor.blinking)}${surface.cursor.visible ? "\x1b[?25h" : "\x1b[?25l"}\x1b[?7h\x1b[?2026l`;
  return { output, appendedRows: lastOccupiedRow + 1 };
}

export function renderTerminalDamage(damage: TerminalDamage, rowOffset = 0): string {
  // The resident terminal publishes only committed damage. The host renderer
  // encloses this payload in its own synchronized-output transaction so cursor,
  // scroll, content, and fixed-row updates become visible as one frame.
  let output = "\x1b[?25l";
  for (const span of damage.spans) {
    const targetRow = span.row + rowOffset;
    if (targetRow < 0 || targetRow >= damage.dimensions.rows) continue;
    output += `\x1b[${targetRow + 1};${span.startColumn + 1}H`;
    let style = "";
    for (const cell of span.cells) {
      if (cell.width === 0) continue;
      const nextStyle = cellStyle(cell);
      if (nextStyle !== style) {
        output += nextStyle;
        style = nextStyle;
      }
      output += cell.character || " ";
    }
  }
  const row = Math.max(1, Math.min(damage.dimensions.rows, damage.cursor.row + rowOffset + 1));
  const column = Math.max(1, Math.min(damage.dimensions.columns, damage.cursor.column + 1));
  output += `\x1b[0m\x1b[${row};${column}H${cursorStyle(damage.cursor.style, damage.cursor.blinking)}${damage.cursor.visible ? "\x1b[?25h" : "\x1b[?25l"}`;
  return output;
}

export function renderTerminalNormalScroll(rows: number, scrollRows: number): string {
  return `\x1b[${rows};1H${"\r\n".repeat(scrollRows)}`;
}

export function renderTerminalCursor(surface: TerminalSurface): string {
  const row = Math.max(1, Math.min(surface.rows, surface.cursor.row + 1));
  const column = Math.max(1, Math.min(surface.columns, surface.cursor.column + 1));
  return `\x1b[${row};${column}H${cursorStyle(surface.cursor.style, surface.cursor.blinking)}${surface.cursor.visible ? "\x1b[?25h" : "\x1b[?25l"}`;
}

export function renderTerminalModes(modes: TerminalModes): string {
  let output = "";
  if (modes.applicationCursorKeys) output += "\x1b[?1h";
  if (modes.applicationKeypad) output += "\x1b=";
  if (modes.bracketedPaste) output += "\x1b[?2004h";
  if (modes.focusReporting) output += "\x1b[?1004h";
  if (modes.synchronizedOutput) output += "\x1b[?2026h";
  output += modes.wraparound ? "\x1b[?7h" : "\x1b[?7l";
  output += mouseTrackingSequence(modes.mouseTracking);
  if (modes.mouseTracking !== "none") output += mouseProtocolSequence(modes.mouseProtocol);
  return output;
}

function renderTerminalRow(cells: readonly TerminalCell[]): string {
  let output = "";
  let style = "";
  for (const cell of cells) {
    if (cell.width === 0) continue;
    const nextStyle = cellStyle(cell);
    if (nextStyle !== style) {
      output += nextStyle;
      style = nextStyle;
    }
    output += cell.character || " ";
  }
  return `${output}\x1b[0m`;
}

function trimVisuallyBlankTail(cells: readonly TerminalCell[]): readonly TerminalCell[] {
  let end = cells.length;
  while (end > 0 && isVisuallyBlankRow([cells[end - 1]!])) end -= 1;
  return cells.slice(0, end);
}

function lastVisuallyOccupiedRow(rows: readonly (readonly TerminalCell[])[]): number {
  for (let row = rows.length - 1; row >= 0; row--) if (!isVisuallyBlankRow(rows[row] ?? [])) return row;
  return 0;
}

function isVisuallyBlankRow(cells: readonly TerminalCell[]): boolean {
  return cells.every(cell => (cell.width === 0 || cell.character === "" || cell.character === " ")
    && cell.attributes === 0
    && !cell.foreground
    && !cell.background);
}

function cellStyle(cell: TerminalCell): string {
  const codes: string[] = ["0"];
  const attributes = cell.attributes;
  if (attributes & TERMINAL_ATTRIBUTES.bold) codes.push("1");
  if (attributes & TERMINAL_ATTRIBUTES.dim) codes.push("2");
  if (attributes & TERMINAL_ATTRIBUTES.italic) codes.push("3");
  if (attributes & TERMINAL_ATTRIBUTES.underline) codes.push("4");
  if (attributes & TERMINAL_ATTRIBUTES.blink) codes.push("5");
  if (attributes & TERMINAL_ATTRIBUTES.inverse) codes.push("7");
  if (attributes & TERMINAL_ATTRIBUTES.invisible) codes.push("8");
  if (attributes & TERMINAL_ATTRIBUTES.strikethrough) codes.push("9");
  if (attributes & TERMINAL_ATTRIBUTES.overline) codes.push("53");
  codes.push(colorCode(cell.foreground, true), colorCode(cell.background, false));
  return `\x1b[${codes.join(";")}m`;
}

function colorCode(color: TerminalColor | undefined, foreground: boolean): string {
  if (!color) return foreground ? "39" : "49";
  if (color.mode === "palette") return `${foreground ? 38 : 48};5;${color.value}`;
  const red = (color.value >> 16) & 0xff;
  const green = (color.value >> 8) & 0xff;
  const blue = color.value & 0xff;
  return `${foreground ? 38 : 48};2;${red};${green};${blue}`;
}

function mouseTrackingSequence(mode: TerminalModes["mouseTracking"]): string {
  if (mode === "x10") return "\x1b[?9h";
  if (mode === "vt200") return "\x1b[?1000h";
  if (mode === "drag") return "\x1b[?1002h";
  if (mode === "any") return "\x1b[?1003h";
  return "";
}

function mouseProtocolSequence(protocol: TerminalModes["mouseProtocol"]): string {
  if (protocol === "utf8") return "\x1b[?1005h";
  if (protocol === "sgr") return "\x1b[?1006h";
  if (protocol === "urxvt") return "\x1b[?1015h";
  return "";
}

function cursorStyle(style: TerminalSurface["cursor"]["style"], blinking: boolean): string {
  const value = style === "default" ? 0 : style === "bar" ? (blinking ? 5 : 6) : style === "underline" ? (blinking ? 3 : 4) : (blinking ? 1 : 2);
  return `\x1b[${value} q`;
}

