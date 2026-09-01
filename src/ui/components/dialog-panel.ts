import { displayWidth, truncateToWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

/**
 * The panel a value with parts is edited in: at the foot of the screen, over the
 * surface it was opened from, ruled off above and below. It shows every part,
 * marks the one in hand, says what that part does, and says how to change it.
 */

export interface DialogRow {
  readonly label: string;
  readonly value: string;
  /** What this part does, shown while it is the one in hand. */
  readonly description?: string;
}

export interface DialogPanelState {
  readonly rows: readonly DialogRow[];
  /** The row in hand. */
  readonly index: number;
  /** How to change it, in the words the engine uses. */
  readonly hint: string;
}

/** Where the panel sits, for reading a pointer against its rows. */
export interface DialogPanelFrame {
  /** Screen row the panel's first row is drawn on. */
  readonly firstRow: number;
  readonly rows: number;
  /** Column the values start at, so a label stays a label. */
  readonly valueColumn: number;
}

const LABEL_COLUMN_CAP = 30;

/** The column values start at: past the widest label, capped so one long name cannot push them off. */
export function dialogValueColumn(rows: readonly DialogRow[]): number {
  const widest = Math.min(LABEL_COLUMN_CAP, Math.max(0, ...rows.map(row => displayWidth(row.label))));
  return 2 + widest + 2;
}

/**
 * The panel's lines. The first line is its rule, so the row at index N is drawn
 * one line below the panel's top.
 */
export function renderDialogPanel(state: DialogPanelState, width: number, theme: UiTheme): readonly string[] {
  const labelColumn = Math.min(LABEL_COLUMN_CAP, Math.max(0, ...state.rows.map(row => displayWidth(row.label))));
  const rule = theme.fg("border", "─".repeat(Math.max(0, width)));

  const rows = state.rows.map((row, index) => {
    const selected = index === state.index;
    const padded = `${row.label}${" ".repeat(Math.max(0, labelColumn - displayWidth(row.label)))}`;
    const cursor = selected ? "→ " : "  ";
    const raw = `${cursor}${padded}  ${row.value}`;
    // Compatibility: match pinned SettingsList: selected cursor, label, and value all use the
    // accent role; an unselected label is plain and its value is muted.
    const painted = selected
      ? `${theme.fg("accent", cursor)}${theme.fg("accent", padded)}  ${theme.fg("accent", row.value)}`
      : `${cursor}${padded}  ${theme.fg("muted", row.value)}`;
    return pad(truncateToWidth(painted, width), width, raw);
  });

  const description = state.rows[state.index]?.description ?? "";
  return [
    rule,
    ...rows,
    "",
    pad(truncateToWidth(theme.fg("dim", `  ${description}`), width), width, `  ${description}`),
    "",
    pad(truncateToWidth(theme.fg("dim", `  ${state.hint}`), width), width, `  ${state.hint}`),
    rule,
  ];
}

/** The row a pointer report lands on, or null when it is not on one. */
export function dialogRowAt(frame: DialogPanelFrame, row: number, column: number, valueWidth: number): number | null {
  const at = row - frame.firstRow;
  if (at < 0 || at >= frame.rows) return null;
  const start = frame.valueColumn + 1;
  return column >= start && column < start + valueWidth ? at : null;
}

function pad(line: string, width: number, raw: string): string {
  const visible = displayWidth(raw);
  return visible >= width ? line : line + " ".repeat(width - visible);
}
