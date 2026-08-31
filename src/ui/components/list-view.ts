import { displayWidth, truncateToWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

/**
 * A list of things that each carry a label and a value. It owns where a value
 * starts, how a row reads when it is selected or pointed at, and which part of a
 * row the pointer is on — so a screen decides what a row means and this decides
 * how it looks and where it can be touched.
 */

/** The part of a row the pointer is over. A label selects; a value acts. */
export type ListRegion = "label" | "value" | "minus" | "plus";

/** Columns a stepper's controls occupy on either side of the value. */
export const STEPPER_RESERVE = 2;

export interface ListViewRow {
  /** Identity of the row, as the screen knows it. */
  readonly key: string;
  readonly label: string;
  /** The value as it should read. Formatting belongs to the screen. */
  readonly value: string;
  /** Trailing note, such as where a value came from. */
  readonly suffix?: string;
  /**
   * Present when the value is stepped. Each end says whether it can still act;
   * an end that cannot is drawn as unavailable rather than explaining itself.
   */
  readonly stepper?: { readonly lower: boolean; readonly raise: boolean };
}

export interface ListRowState {
  /** The keyboard's row. */
  readonly selected: boolean;
  /** The pointer's row, and where on it the pointer is. */
  readonly hovered: boolean;
  readonly region: ListRegion;
}

/** Where a row was drawn, so a later pointer report can be read against it. */
export interface ListRowPlacement {
  readonly key: string;
  readonly screenRow: number;
  readonly valueColumn: number;
  readonly valueWidth: number;
  readonly stepper: boolean;
}

/**
 * The column every value begins at: past the widest label, with room to breathe,
 * and with the stepper's columns reserved for every row when any row has one, so
 * a number does not shift its own value out of the column it shares.
 */
export function valueColumnFor(rows: readonly ListViewRow[], indent = 2, gap = 2): number {
  const widest = Math.min(30, Math.max(0, ...rows.map(row => displayWidth(row.label))));
  const stepper = rows.some(row => row.stepper !== undefined) ? STEPPER_RESERVE : 0;
  return indent + widest + gap + stepper;
}

/** A group's name, above the rows that belong to it. */
export function renderGroupHeader(title: string, width: number, theme: UiTheme): string {
  return truncateToWidth(theme.fg("accent", theme.bold(title)), width);
}

/**
 * One row, painted. The label carries the selection, the value carries the
 * pointer, and the stepper appears only when the pointer is on the value it
 * belongs to — an affordance, not decoration.
 */
export function renderListRow(
  row: ListViewRow,
  state: ListRowState,
  valueColumn: number,
  width: number,
  theme: UiTheme,
): string {
  const cursor = state.selected ? "→ " : "  ";
  const labelColumn = Math.max(displayWidth(row.label), valueColumn - 4 - (row.stepper === undefined ? 0 : STEPPER_RESERVE));
  const labelPadded = `${row.label}${" ".repeat(Math.max(0, labelColumn - displayWidth(row.label)))}`;
  const leftRaw = `${cursor}${labelPadded}`;
  const left = state.selected
    ? `${theme.fg("accent", cursor)}${theme.fg("accent", labelPadded)}`
    : `${cursor}${theme.plain(labelPadded)}`;
  const gap = Math.max(2, valueColumn - displayWidth(leftRaw));

  // Pinned SettingsList gives the selected label and value the same accent
  // role. Pointer hover may brighten an unselected value without changing the
  // keyboard selection.
  const valueHovered = state.hovered && state.region !== "label";
  const stepper = row.stepper !== undefined && valueHovered;
  const value = state.selected
    ? theme.fg("accent", row.value)
    : valueHovered ? theme.plain(row.value) : theme.fg("muted", row.value);

  const minus = stepper
    ? row.stepper?.lower === true
      ? state.region === "minus" ? theme.plain("- ") : theme.fg("dim", "- ")
      : theme.disabled("- ")
    : "";
  const plus = stepper
    ? row.stepper?.raise === true
      ? state.region === "plus" ? theme.plain(" +") : theme.fg("dim", " +")
      : theme.disabled(" +")
    : "";

  const indent = Math.max(2, stepper ? gap - STEPPER_RESERVE : gap);
  const suffix = row.suffix === undefined ? "" : theme.fg("dim", `  ${row.suffix}`);
  return truncateToWidth(`${left}${" ".repeat(indent)}${minus}${value}${plus}${suffix}`, width);
}

/** A line that stands in for rows: why a group has none, or what it is waiting on. */
export function renderNote(text: string, width: number, theme: UiTheme): string {
  return truncateToWidth(theme.fg("muted", `    ${text}`), width);
}

/** Where the value of a row starts and ends, for reading a pointer against it. */
export function placementFor(
  row: ListViewRow,
  screenRow: number,
  valueColumn: number,
  hovered: boolean,
): ListRowPlacement {
  const stepper = row.stepper !== undefined && hovered;
  return {
    key: row.key,
    screenRow,
    valueColumn: stepper ? valueColumn - STEPPER_RESERVE : valueColumn,
    valueWidth: displayWidth(row.value),
    stepper,
  };
}

/**
 * The part of a row a column falls on. The stepper's controls sit in the columns
 * reserved before and after the value, so they are only reachable while drawn.
 */
export function regionAt(placement: ListRowPlacement, column: number): ListRegion {
  const start = placement.valueColumn + 1;
  const end = start + placement.valueWidth;
  if (column >= start && column <= end) return "value";
  if (placement.stepper && column >= start - STEPPER_RESERVE && column < start) return "minus";
  if (placement.stepper && column > end && column <= end + STEPPER_RESERVE) return "plus";
  return "label";
}
