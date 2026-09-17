import { isThumbRow, type ScrollbarGeometry, type ScrollbarPresentation } from "./scrollbar.js";
import { displayWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

// Rationale: shared list chrome belongs here rather than in individual screens.

/** Columns the rail occupies: its own, plus the gap before it. */
export const RAIL_COLUMNS = 2;

export interface RailOptions {
  /** Rows at the top the rail does not run beside, such as a sticky header. */
  readonly topInset?: number;
  /** How the rail shows. Absent draws the thin rail whenever the content overflows. */
  readonly presentation?: ScrollbarPresentation;
}

/**
 * Draws the rail beside each row, padding the rows to a common width first.
 * A presentation that reserves no space returns the rows untouched.
 */
export function withScrollbarRail(
  lines: readonly string[],
  geometry: ScrollbarGeometry | null,
  contentWidth: number,
  theme: UiTheme,
  options: RailOptions = {},
): readonly string[] {
  const inset = options.topInset ?? 0;
  const presentation = options.presentation
    ?? { visible: geometry !== null, reservesSpace: true, trackGlyph: "│", thumbGlyph: "│" };
  if (!presentation.reservesSpace) return lines;
  const drawn = presentation.visible && geometry !== null;
  return lines.map((line, offset) => {
    const cell = offset < inset || !drawn
      ? " "
      : isThumbRow(geometry, offset - inset)
        ? theme.fg("accent", presentation.thumbGlyph)
        : theme.fg("dim", presentation.trackGlyph);
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
