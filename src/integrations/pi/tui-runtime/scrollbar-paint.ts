import { sliceByColumn } from "@earendil-works/pi-tui";
import type { TerminalDamageFrameDescriptor, TerminalRailCell } from "../../../contracts/presentation/index.js";

const SGR_OR_LINK_CLOSE = /\u001b\[[0-9;:]*m|\u001b\]8;;(?:\u0007|\u001b\\)/gu;
const IMAGE = /\u001b_G[^\u001b]*\u001b\\|\u001b\]1337;File=[^\u0007\u001b]*(?:\u0007|\u001b\\)/gu;
const RESET = "\u001b[0m\u001b]8;;\u001b\\";
const SYNC_END = "\u001b[?2026l";
const CURSOR_SUFFIX = /(?:\u001b\[\d+;\d+H)?\u001b\[\?25[hl]\u001b\[\?2026l$/u;

/** Validates trusted owned rail metadata without interpreting arbitrary row terminal commands. */
export function validRailCells(descriptor: TerminalDamageFrameDescriptor): boolean {
  const cells = descriptor.railCells;
  if (cells === undefined || cells.length > descriptor.height) return false;
  let previous = 0;
  return cells.every(cell => {
    const valid = Number.isSafeInteger(cell.row) && cell.row > previous && descriptor.transcript !== null
      && cell.row >= descriptor.transcript.rowStart && cell.row <= descriptor.transcript.rowEnd
      && cell.column === descriptor.width && /^[ ┃▐]$/u.test(cell.text.replace(SGR_OR_LINK_CLOSE, ""));
    previous = cell.row;
    return valid;
  });
}

/** Reconstructs a snapshot cell without retransmitting images carried by the source row. */
function rowCell(row: string, column: number): string {
  return `${RESET}${sliceByColumn(row.replace(IMAGE, ""), column - 1, 1, true) || " "}${RESET}`;
}

/**
 * Addresses only dirty or changed gutter cells after row paint, in the same synchronized transaction.
 * Saving/restoring the cursor also preserves the pending-wrap state when Pi has no hardware cursor.
 * Both pinned ordinary and batched-image writes share this suffix; their image bytes stay untouched.
 */
export function paintScrollbarCells(
  output: string,
  descriptor: TerminalDamageFrameDescriptor,
  previous: readonly TerminalRailCell[],
  rows: ReadonlyMap<number, string>,
  dirtyRows: ReadonlySet<number> | null,
  shifted: boolean,
): string {
  if (!output.startsWith("\u001b[?2026h") || !output.endsWith(SYNC_END) || !validRailCells(descriptor)) return output;
  const suffix = output.match(CURSOR_SUFFIX);
  if (suffix?.index === undefined) return output;
  const prior = new Map(previous.map(cell => [cell.row, cell]));
  const next = new Set<number>();
  let paint = "";
  for (const cell of descriptor.railCells!) {
    next.add(cell.row);
    const old = prior.get(cell.row);
    if (shifted || dirtyRows === null || dirtyRows.has(cell.row) || old?.column !== cell.column || old.text !== cell.text) {
      paint += `\u001b[${cell.row};${cell.column}H${cell.text}`;
    }
  }
  for (const cell of previous) {
    if (next.has(cell.row) || cell.row > descriptor.height || cell.column > descriptor.width
      || dirtyRows === null || dirtyRows.has(cell.row)) continue;
    const content = rows.get(cell.row);
    if (content !== undefined) paint += `\u001b[${cell.row};${cell.column}H${rowCell(content, cell.column)}`;
  }
  if (!paint) return output;
  return `${output.slice(0, suffix.index)}\u001b7${paint}\u001b8${output.slice(suffix.index)}`;
}
