import { displayWidth, truncateToWidth } from "./text.js";

export type UiTimeFormat = "20:00" | "8:00 PM";

/** Deterministic local hour/minute presentation shared by A1-owned time labels. */
export function formatLocalTime(source: Date | number, format: UiTimeFormat = "8:00 PM"): string | null {
  const date = source instanceof Date ? source : new Date(source);
  if (!Number.isFinite(date.getTime())) return null;
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  if (format === "20:00") return `${String(hour).padStart(2, "0")}:${minute}`;
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
}

/** Visible width of the submitted-prompt prefix (`❯ `). */
export const SUBMITTED_PROMPT_PREFIX_WIDTH = 2;
const TIMESTAMP_MARGIN = 3;
const MIN_USEFUL_CONTENT_WIDTH = 8;

export interface SubmittedPromptStyle {
  readonly prefix?: (text: string) => string;
  readonly timestamp?: (text: string) => string;
}

export interface SubmittedPromptLayout {
  readonly contentWidth: number;
  readonly timestamp: string | null;
}

/** Formats transcript metadata, never render time, in the active A1 time format. */
export function formatSubmittedPromptTime(
  source: Date | number,
  format: UiTimeFormat = "8:00 PM",
): string | null {
  return formatLocalTime(source, format);
}

/**
 * Computes the width at which the prompt's Markdown body must be rendered.
 * The timestamp is omitted rather than allowing it to crowd useful content.
 */
export function submittedPromptLayout(
  width: number,
  source?: Date | number | null,
  format: UiTimeFormat = "8:00 PM",
): SubmittedPromptLayout {
  const boundedWidth = Math.max(1, width);
  const timestamp = source === undefined || source === null ? null : formatSubmittedPromptTime(source, format);
  const timestampReserve = timestamp === null ? 0 : displayWidth(timestamp) + TIMESTAMP_MARGIN;
  const canShowTimestamp = timestamp !== null
    && boundedWidth - SUBMITTED_PROMPT_PREFIX_WIDTH - timestampReserve >= MIN_USEFUL_CONTENT_WIDTH;
  return {
    contentWidth: Math.max(1, boundedWidth - SUBMITTED_PROMPT_PREFIX_WIDTH - (canShowTimestamp ? timestampReserve : 0)),
    timestamp: canShowTimestamp ? timestamp : null,
  };
}

/**
 * Composes already-rendered prompt content into the compact submitted bar.
 * Continuations align below the content, not below the prefix, and no row can
 * exceed the supplied terminal width even when the content renderer misbehaves.
 */
export function composeSubmittedPromptRows(
  contentRows: readonly string[],
  width: number,
  source?: Date | number | null,
  style: SubmittedPromptStyle = {},
  format: UiTimeFormat = "8:00 PM",
): readonly string[] {
  if (width <= 0) return [];
  const layout = submittedPromptLayout(width, source, format);
  const prefix = (style.prefix ?? identity)("❯ ");
  const rows = (contentRows.length === 0 ? [""] : contentRows).map((row, index) => {
    const content = truncateToWidth(row, layout.contentWidth);
    return `${index === 0 ? prefix : " ".repeat(SUBMITTED_PROMPT_PREFIX_WIDTH)}${content}`;
  });
  if (layout.timestamp !== null && rows[0] !== undefined) {
    const gap = Math.max(1, width - displayWidth(rows[0]) - displayWidth(layout.timestamp));
    rows[0] = `${rows[0]}${" ".repeat(gap)}${(style.timestamp ?? identity)(layout.timestamp)}`;
  }
  return rows.map(row => truncateToWidth(row, width));
}

function identity(text: string): string {
  return text;
}
