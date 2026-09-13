import { displayWidth, truncateToWidth } from "./text.js";
import { PLAIN_THEME, type UiTheme } from "./theme.js";

export const PROMPT_GLYPH = "❯ ";
export const PROMPT_PREFIX_WIDTH = 2;

export function promptRuleText(text: string): string {
  return `\u001b[38;2;154;160;166m${text}\u001b[39m`;
}

export function promptRule(width: number): string {
  return promptRuleText("─".repeat(Math.max(0, width)));
}

export function promptArrow(text: string, theme: Pick<UiTheme, "fg">): string {
  return theme.fg("muted", text);
}

export interface PromptInputBody {
  readonly rows: readonly string[];
  /** Semantic border fragments retain editor history and scroll annotations. */
  readonly topRule?: string | undefined;
  readonly bottomRule?: string | undefined;
  readonly after?: readonly string[];
}

export interface PromptInputMetrics {
  readonly measure: (text: string) => number;
  readonly truncate: (text: string, width: number) => string;
}

/** Composes shared input chrome around controller-owned body rows without owning editing state. */
export class PromptInput {
  constructor(
    readonly theme: Pick<UiTheme, "fg"> = PLAIN_THEME,
    readonly metrics: PromptInputMetrics = { measure: displayWidth, truncate: truncateToWidth },
  ) {}

  styleRule(text: string): string { return promptRuleText(text); }

  geometry(width: number, padding = 0) {
    const prefixWidth = Math.min(PROMPT_PREFIX_WIDTH, Math.max(0, width));
    // Compatibility: editor wrapping needs room for a two-cell grapheme plus its cursor cell.
    // Lay out against a safe virtual width, then clip only at the shared frame boundary.
    const innerWidth = Math.max(3 + padding * 2, width - prefixWidth);
    const paddingX = Math.min(padding, Math.max(0, Math.floor((innerWidth - 1) / 2)));
    const contentWidth = Math.max(1, innerWidth - paddingX * 2);
    return { prefixWidth, innerWidth, paddingX, contentWidth, layoutWidth: Math.max(1, contentWidth - (paddingX ? 0 : 1)) };
  }

  render(width: number, renderBody: (innerWidth: number) => PromptInputBody, ruled = true, padding = 0): string[] {
    if (width <= 0) return [];
    const { prefixWidth, innerWidth } = this.geometry(width, padding);
    const body = renderBody(innerWidth);
    const fit = (row: string): string => {
      const clipped = this.metrics.truncate(row, width);
      return clipped + " ".repeat(Math.max(0, width - this.metrics.measure(clipped)));
    };
    const rows = body.rows.map((row, index) => fit(`${index === 0
      ? promptArrow(PROMPT_GLYPH, this.theme)
      : " ".repeat(prefixWidth)}${row}`));
    const rule = (fragment?: string): string => fragment === undefined
      ? promptRule(width)
      : fit(fragment + promptRule(Math.max(0, width - this.metrics.measure(fragment))));
    return [
      ...(ruled ? [rule(body.topRule)] : []),
      ...rows,
      ...(ruled ? [rule(body.bottomRule)] : []),
      ...(body.after ?? []).map(row => fit(`${" ".repeat(prefixWidth)}${row}`)),
    ];
  }
}
