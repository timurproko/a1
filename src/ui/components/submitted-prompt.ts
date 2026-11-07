import { truncateToWidth } from "./text.js";

/** Visible width of the submitted-prompt prefix (` ❯ `). */
export const SUBMITTED_PROMPT_PREFIX_WIDTH = 3;

export interface SubmittedPromptStyle {
  readonly prefix?: (text: string) => string;
}

export interface SubmittedPromptLayout {
  readonly contentWidth: number;
}

/** Computes the width at which the prompt's Markdown body must be rendered. */
export function submittedPromptLayout(width: number): SubmittedPromptLayout {
  return { contentWidth: Math.max(1, Math.max(1, width) - SUBMITTED_PROMPT_PREFIX_WIDTH) };
}

/**
 * Composes already-rendered prompt content into the compact submitted bar.
 * Continuations align below the content, not below the prefix, and no row can
 * exceed the supplied terminal width even when the content renderer misbehaves.
 */
export function composeSubmittedPromptRows(
  contentRows: readonly string[],
  width: number,
  style: SubmittedPromptStyle = {},
): readonly string[] {
  if (width <= 0) return [];
  const layout = submittedPromptLayout(width);
  const prefix = (style.prefix ?? identity)(" ❯ ");
  return (contentRows.length === 0 ? [""] : contentRows).map((row, index) => {
    const content = truncateToWidth(row, layout.contentWidth);
    return truncateToWidth(`${index === 0 ? prefix : " ".repeat(SUBMITTED_PROMPT_PREFIX_WIDTH)}${content}`, width);
  });
}

function identity(text: string): string {
  return text;
}
