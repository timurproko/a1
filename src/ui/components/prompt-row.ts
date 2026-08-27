import { overlaySpan } from "./spans.js";

export interface TimestampedPromptRowsInput {
  readonly width: number;
  readonly sourceTimestamp: number | Date;
  readonly render: (contentWidth: number) => readonly string[];
  /** Styles the reserved suffix while keeping policy independent of a vendor theme. */
  readonly decorateSuffix?: (text: string, firstRow: boolean) => string;
  readonly minimumWidth?: number;
}

export function formatPromptTimestamp(source: number | Date): string | null {
  const date = source instanceof Date ? source : new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Reserves timestamp columns before wrapping, so the clock never overwrites
 * prompt content. At narrow widths the same renderer is used without a clock.
 */
export function composeTimestampedPromptRows(input: TimestampedPromptRowsInput): readonly string[] {
  const timestamp = formatPromptTimestamp(input.sourceTimestamp);
  if (timestamp === null || input.width < (input.minimumWidth ?? 20)) return input.render(input.width);
  const suffixWidth = timestamp.length + 2;
  const contentWidth = Math.max(1, input.width - suffixWidth);
  const decorate = input.decorateSuffix ?? ((text: string) => text);
  return input.render(contentWidth).map((row, index) => overlaySpan(
    row,
    contentWidth,
    input.width,
    decorate(index === 0 ? `  ${timestamp}` : " ".repeat(suffixWidth), index === 0),
  ));
}
