import type { PaneRect } from "./frame.js";
import { LineInput, renderInputRow } from "./line-input.js";
import { renderShortcutHintsWithClose, type ShortcutHintEntry } from "./shortcut-hints.js";
import { overlaySpan } from "./spans.js";
import { displayWidth, padToWidth, truncateToWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

/**
 * Semantic content and overlay composition for Settings configure dialogs. The setting supplies
 * rows and behavior; this component owns compact geometry, backdrop dimming, and panel placement.
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
const CONFIGURE_MODAL_MAX_WIDTH = 60;
const CONFIGURE_MODAL_PADDING_X = 2;
const SGR = /\u001b\[[0-9;]*m/gu;

/** Canonical native-matching background for every owned floating dialog surface. */
export function renderFloatingDialogSurface(text: string, mode: "truecolor" | "256color"): string {
  const background = mode === "truecolor" ? "\u001b[48;2;38;38;38m" : "\u001b[48;5;235m";
  return `${background}${text}\u001b[49m`;
}

/** Existing raised-menu background, centralized beside the darker dialog surface. */
export function renderFloatingMenuSurface(text: string, mode: "truecolor" | "256color"): string {
  const background = mode === "truecolor" ? "\u001b[48;2;55;55;55m" : "\u001b[48;5;237m";
  return `${background}${text}\u001b[49m`;
}

interface DialogPanelLayout {
  readonly blank: string;
  readonly contentWidth: number;
  contentRow(painted: string, raw?: string, selected?: boolean): string;
}

/** The shared compact width used by Settings configure dialogs and native tab dialogs. */
export function configureDialogWidth(width: number): number {
  return Math.min(CONFIGURE_MODAL_MAX_WIDTH, Math.max(0, width));
}

/** Rows available to a selector after retaining its title, description, control, and guidance. */
export function configureDialogChoiceCapacity(height: number, hasInput: boolean, descriptionRows = 1): number {
  const wrappedDescriptionRows = Math.max(1, descriptionRows);
  return Math.max(1, Math.max(0, height) - (hasInput ? 9 : 7) - (wrappedDescriptionRows - 1));
}

/** Number of modal rows a plain description occupies at the shared content width. */
export function configureDialogTextRows(text: string, width: number): number {
  return wrapText(text, Math.max(0, configureDialogWidth(width) - CONFIGURE_MODAL_PADDING_X * 2)).length;
}

/** One frame path for every semantic row, regardless of which configure dialog supplies content. */
function dialogPanelLayout(width: number, theme: UiTheme): DialogPanelLayout {
  const frameWidth = Math.max(0, width);
  const left = Math.min(CONFIGURE_MODAL_PADDING_X, frameWidth);
  const right = Math.min(CONFIGURE_MODAL_PADDING_X, frameWidth - left);
  const contentWidth = Math.max(0, frameWidth - left - right);
  return {
    blank: " ".repeat(frameWidth),
    contentWidth,
    contentRow: (painted, raw = painted, selected = false) => {
      const content = pad(truncateToWidth(painted, contentWidth), contentWidth, raw);
      const rightPadding = " ".repeat(right);
      return `${" ".repeat(left)}${selected ? theme.highlight(content) : content}${
        selected ? theme.panel(rightPadding) : rightPadding
      }`;
    },
  };
}

/** Dims a completed screen and overlays one full-intensity panel without disturbing ANSI tails. */
export function renderCenteredDialogOverlay(
  frame: readonly string[],
  dialogRows: readonly string[],
  rect: PaneRect,
  theme: UiTheme,
): readonly string[] {
  const width = Math.max(0, rect.width);
  const height = Math.max(0, rect.height);
  const panelWidth = configureDialogWidth(width);
  const visibleDialog = dialogRows.slice(0, height);
  const top = Math.max(0, Math.floor((height - visibleDialog.length) / 2));
  const left = Math.max(0, Math.floor((width - panelWidth) / 2));

  return Array.from({ length: height }, (_, row) => {
    const backdrop = dimStyledLine(frame[row] ?? "", width);
    const dialogRow = visibleDialog[row - top];
    if (dialogRow === undefined || panelWidth === 0) return backdrop;
    const panel = `\u001b[22;39;49m${theme.panel(padToWidth(dialogRow, panelWidth))}`;
    return overlaySpan(backdrop, left, left + panelWidth, panel);
  });
}

/** The column values start at: past the widest label, capped so one long name cannot push them off. */
export function dialogValueColumn(rows: readonly DialogRow[]): number {
  const widest = Math.min(LABEL_COLUMN_CAP, Math.max(0, ...rows.map(row => displayWidth(row.label))));
  return 2 + widest + 2;
}

/** The semantic rows for one generic configure modal. */
export function renderDialogPanel(state: DialogPanelState, width: number, theme: UiTheme): readonly string[] {
  const labelColumn = Math.min(LABEL_COLUMN_CAP, Math.max(0, ...state.rows.map(row => displayWidth(row.label))));
  const layout = dialogPanelLayout(width, theme);

  const rows = state.rows.map((row, index) => {
    const selected = index === state.index;
    const padded = `${row.label}${" ".repeat(Math.max(0, labelColumn - displayWidth(row.label)))}`;
    const cursor = selected ? "→ " : "  ";
    const raw = `${cursor}${padded}  ${row.value}`;
    const content = selected
      ? `${theme.fg("accent", cursor)}${theme.fg("text", padded)}  ${theme.fg("muted", row.value)}`
      : `${cursor}${padded}  ${theme.fg("muted", row.value)}`;
    return layout.contentRow(content, raw, selected);
  });

  const description = state.rows[state.index]?.description ?? "";
  const descriptionRows = wrapText(description, layout.contentWidth);
  const hint = typeof state.hint === "string"
    ? theme.fg("dim", state.hint)
    : renderShortcutHintsWithClose(state.hint, theme, layout.contentWidth, 0);
  const plainHint = typeof state.hint === "string" ? state.hint : " ".repeat(displayWidth(hint));
  return [
    layout.blank,
    layout.contentRow(theme.bold(theme.fg("accent", state.title)), state.title),
    ...descriptionRows.map(line => layout.contentRow(theme.fg("dim", line), line)),
    layout.blank,
    ...rows,
    layout.blank,
    layout.contentRow(hint, plainHint),
    layout.blank,
  ];
}

/** Owned stepped-selector content for structured settings with nested choices. */
export function renderSteppedDialogPanel(
  state: SteppedDialogPanelState,
  width: number,
  theme: UiTheme,
): readonly string[] {
  const layout = dialogPanelLayout(width, theme);
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
    return layout.contentRow(content, raw, selected);
  });
  const input = state.input === undefined
    ? []
    : [
      ...renderInputRow(state.input, layout.contentWidth, {
        ruled: false,
        promptGlyph: "> ",
        promptRole: "accent",
        theme,
      }).lines.map(row => layout.contentRow(row)),
      layout.blank,
    ];
  const descriptionRows = wrapText(state.description, layout.contentWidth);
  const step = `(step ${state.step}/${state.steps})`;
  const title = `${state.title} ${step}`;
  const paintedTitle = `${theme.bold(theme.fg("accent", state.title))} ${theme.fg("dim", step)}`;
  return [
    layout.blank,
    layout.contentRow(paintedTitle, title),
    ...descriptionRows.map(line => layout.contentRow(theme.fg("dim", line), line)),
    layout.blank,
    ...input,
    ...rows,
    layout.blank,
    layout.contentRow(renderShortcutHintsWithClose(state.hint, theme, layout.contentWidth)),
    layout.blank,
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

function dimStyledLine(line: string, width: number): string {
  const padded = padToWidth(line, width);
  return `\u001b[2m${padded.replace(SGR, sequence => `${sequence}\u001b[2m`)}\u001b[22m`;
}

function wrapText(text: string, width: number): readonly string[] {
  if (text.length === 0 || width <= 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/u)) {
    const candidate = `${line}${line.length === 0 ? "" : " "}${word}`;
    if (line.length > 0 && displayWidth(candidate) > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line.length > 0) lines.push(truncateToWidth(line, width));
  return lines.length === 0 ? [""] : lines;
}
