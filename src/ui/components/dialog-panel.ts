import { LineInput, renderInputRow } from "./line-input.js";
import { renderShortcutHints, renderShortcutHintsWithClose, shortcutHintsText, type ShortcutHintEntry } from "./shortcut-hints.js";
import { displayWidth, truncateToWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

/**
 * The panel a value with parts is edited in: at the foot of the screen, over the
 * surface it was opened from, ruled off above and below. It shows every part,
 * marks the one in hand, says what that part does, and says how to change it.
 */

export interface DialogRow {
  readonly label: string;
  readonly labelSuffix?: string;
  readonly value: string;
  /** What this part does, shown while it is the one in hand. */
  readonly description?: string;
}

export interface DialogPanelState {
  readonly title: string;
  readonly rows: readonly DialogRow[];
  /** The row in hand. */
  readonly index: number;
  /** How to change it, in the words the engine uses. */
  readonly hint: string | readonly ShortcutHintEntry[];
}

/** Where the panel sits, for reading a pointer against its rows. */
export interface DialogPanelFrame {
  /** Screen row the panel's first row is drawn on. */
  readonly firstRow: number;
  readonly rows: number;
  /** Column the values start at, so a label stays a label. */
  readonly valueColumn: number;
}

export interface SteppedDialogPanelState {
  readonly title: string;
  readonly step: number;
  readonly steps: number;
  readonly description: string;
  readonly input?: LineInput;
  readonly rows: readonly DialogRow[];
  readonly index: number;
  readonly hint: readonly ShortcutHintEntry[];
}

const LABEL_COLUMN_CAP = 30;
const STEPPED_LABEL_COLUMN_CAP = 46;

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
  const contentPadding = Math.min(1, Math.max(0, width));
  const contentWidth = Math.max(0, width - contentPadding);
  const inset = " ".repeat(contentPadding);
  const contentRow = (painted: string, raw: string): string =>
    `${inset}${pad(truncateToWidth(painted, contentWidth), contentWidth, raw)}`;

  const rows = state.rows.map((row, index) => {
    const selected = index === state.index;
    const padded = `${row.label}${" ".repeat(Math.max(0, labelColumn - displayWidth(row.label)))}`;
    const cursor = selected ? "→ " : "  ";
    const raw = `${cursor}${padded}  ${row.value}`;
    const content = selected
      ? `${theme.fg("accent", cursor)}${theme.fg("text", padded)}  ${theme.fg("muted", row.value)}`
      : `${cursor}${padded}  ${theme.fg("muted", row.value)}`;
    const painted = selected ? theme.highlight(content) : content;
    return contentRow(painted, raw);
  });

  const description = state.rows[state.index]?.description ?? "";
  const hint = typeof state.hint === "string"
    ? theme.fg("dim", state.hint)
    : renderShortcutHintsWithClose(state.hint, theme, contentWidth, 0);
  const plainHint = typeof state.hint === "string" ? state.hint : " ".repeat(displayWidth(hint));
  return [
    rule,
    contentRow(theme.bold(theme.fg("accent", state.title)), state.title),
    contentRow(theme.fg("dim", description), description),
    "",
    ...rows,
    "",
    contentRow(hint, plainHint),
    rule,
  ];
}

/** Owned stepped-selector composition for structured settings with nested choices. */
export function renderSteppedDialogPanel(
  state: SteppedDialogPanelState,
  width: number,
  theme: UiTheme,
): readonly string[] {
  const rule = theme.fg("border", "─".repeat(Math.max(0, width)));
  const contentPadding = Math.min(1, Math.max(0, width));
  const contentWidth = Math.max(0, width - contentPadding);
  const inset = " ".repeat(contentPadding);
  const contentRow = (painted: string, raw: string): string =>
    `${inset}${pad(truncateToWidth(painted, contentWidth), contentWidth, raw)}`;
  const labelColumn = Math.min(
    STEPPED_LABEL_COLUMN_CAP,
    Math.max(0, ...state.rows.map(row => displayWidth(`${row.label}${row.labelSuffix ?? ""}`))),
  );
  const rows = state.rows.map((row, index) => {
    const selected = index === state.index;
    const completeLabel = `${row.label}${row.labelSuffix ?? ""}`;
    const padding = " ".repeat(Math.max(0, labelColumn - displayWidth(completeLabel)));
    const suffix = row.value.length === 0 ? "" : `  ${row.value}`;
    const cursor = selected ? "→ " : "  ";
    const raw = `${cursor}${completeLabel}${padding}${suffix}`;
    const label = `${theme.fg("text", row.label)}${theme.fg("muted", row.labelSuffix ?? "")}${padding}`;
    const content = selected
      ? `${theme.fg("accent", cursor)}${label}${theme.fg("muted", suffix)}`
      : `${cursor}${label}${theme.fg("muted", suffix)}`;
    return contentRow(selected ? theme.highlight(content) : content, raw);
  });
  const input = state.input === undefined
    ? []
    : [...renderInputRow(state.input, width, { ruled: false, theme }).lines, ""];
  const step = `(step ${state.step}/${state.steps})`;
  const title = `${state.title} ${step}`;
  const paintedTitle = `${theme.bold(theme.fg("accent", state.title))} ${theme.fg("dim", step)}`;
  return [
    rule,
    contentRow(paintedTitle, title),
    contentRow(theme.fg("dim", state.description), state.description),
    "",
    ...input,
    ...rows,
    "",
    renderSteppedHint(state.hint, width, theme),
    rule,
  ];
}

function renderSteppedHint(entries: readonly ShortcutHintEntry[], width: number, theme: UiTheme): string {
  const raw = shortcutHintsText(entries, 1, " · ");
  const painted = renderShortcutHints(entries, theme, 1, theme.fg("dim", " · "));
  return `${truncateToWidth(painted, width)}${" ".repeat(Math.max(0, width - displayWidth(raw)))}`;
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
