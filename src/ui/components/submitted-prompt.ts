import { displayWidth, truncateToWidth } from "./text.js";

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

/** Formats transcript metadata, never render time, as local 24-hour HH:mm. */
export function formatSubmittedPromptTime(source: Date | number): string | null {
  const date = source instanceof Date ? source : new Date(source);
  if (!Number.isFinite(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Computes the width at which the prompt's Markdown body must be rendered.
 * The timestamp is omitted rather than allowing it to crowd useful content.
 */
export function submittedPromptLayout(width: number, source?: Date | number | null): SubmittedPromptLayout {
  const boundedWidth = Math.max(1, width);
  const timestamp = source === undefined || source === null ? null : formatSubmittedPromptTime(source);
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
): readonly string[] {
  if (width <= 0) return [];
  const layout = submittedPromptLayout(width, source);
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
