import { isThumbRow, type ScrollbarGeometry } from "./scrollbar.js";
import { displayWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

/**
 * The chrome around a list: the rail down its right edge, and what it shows when
 * there is nothing to list. Both are the same on any screen, so neither is a
 * screen's to draw.
 */

/** Columns the rail occupies: its own, plus the gap before it. */
export const RAIL_COLUMNS = 2;

export interface RailOptions {
  /** Rows at the top the rail does not run beside, such as a sticky header. */
  readonly topInset?: number;
}

/** Draws the rail beside each row, padding the rows to a common width first. */
export function withScrollbarRail(
  lines: readonly string[],
  geometry: ScrollbarGeometry | null,
  contentWidth: number,
  theme: UiTheme,
  options: RailOptions = {},
): readonly string[] {
  const inset = options.topInset ?? 0;
  return lines.map((line, offset) => {
    const cell = offset < inset || geometry === null
      ? " "
      : isThumbRow(geometry, offset - inset) ? theme.fg("accent", "│") : theme.fg("dim", "│");
    return `${pad(line, contentWidth)} ${cell}`;
  });
}

/**
 * What a list shows instead of rows: a mark and a line, both quiet, sitting in
 * the middle of the space the rows would have had.
 */
export function renderEmptyState(message: string, mark: string, height: number, width: number, theme: UiTheme): readonly string[] {
  const middle = Math.floor(height / 2);
  return Array.from({ length: Math.max(0, height) }, (_line, index) => {
    if (index === middle - 1) return centre(theme.fg("muted", mark), mark, width);
    return index === middle ? centre(theme.fg("muted", message), message, width) : "";
  });
}

function centre(painted: string, raw: string, width: number): string {
  return `${" ".repeat(Math.max(0, Math.floor((width - displayWidth(raw)) / 2)))}${painted}`;
}

function pad(line: string, width: number): string {
  const visible = displayWidth(line);
  return visible >= width ? line : line + " ".repeat(width - visible);
}
