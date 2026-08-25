import { displayWidth, truncateToWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

/**
 * The one line a screen speaks on. It says the standing hint until there is
 * something to report, and what is reported stands until it is superseded — one
 * thing at a time, so a reader never has to work out which of two lines is now.
 */
export interface StatusLineInput {
  /** What the screen always offers: its keys, usually. */
  readonly hint: string;
  /** Something that happened and would not otherwise be known. */
  readonly report?: string | null;
}

/** What the line says: the report when there is one, else the hint. */
export function statusText(input: StatusLineInput): string {
  const report = input.report ?? null;
  return report === null || report.length === 0 ? input.hint : report;
}

/** The line as drawn: quiet, and set against the right edge. */
export function renderStatusLine(input: StatusLineInput, width: number, theme: UiTheme): string {
  const text = statusText(input);
  const painted = theme.fg("dim", text);
  if (displayWidth(text) >= width) return truncateToWidth(painted, width);
  return `${" ".repeat(width - displayWidth(text))}${painted}`;
}
