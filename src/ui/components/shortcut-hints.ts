import {
  DIALOG_CLOSE_SHORTCUT_HINT,
  renderSemanticShortcutHints,
  type SemanticShortcutHint,
} from "../../contracts/presentation/index.js";
import { displayWidth, truncateToWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

export type ShortcutHintEntry = SemanticShortcutHint;

/** Returns an unstyled modal instruction row for width-aware clipping. */
export function shortcutHintsText(entries: readonly ShortcutHintEntry[], indent = 0): string {
  return renderSemanticShortcutHints(entries, { key: text => text, action: text => text }, indent);
}

/** Paints one modal instruction row without decorative separator glyphs. */
export function renderShortcutHints(
  entries: readonly ShortcutHintEntry[],
  theme: Pick<UiTheme, "fg">,
  indent = 0,
): string {
  return renderSemanticShortcutHints(entries, {
    key: text => theme.fg("dim", text),
    action: text => theme.fg("muted", text),
  }, indent);
}

/** Clips preceding guidance first so a final canonical close entry remains complete whenever it fits. */
export function renderShortcutHintsWithClose(
  entries: readonly ShortcutHintEntry[],
  theme: Pick<UiTheme, "fg">,
  width: number,
  indent = 0,
): string {
  const hasClose = entries.at(-1)?.key === DIALOG_CLOSE_SHORTCUT_HINT.key
    && entries.at(-1)?.action === DIALOG_CLOSE_SHORTCUT_HINT.action;
  if (!hasClose) return truncateToWidth(renderShortcutHints(entries, theme, indent), width);
  const withoutClose = entries.slice(0, -1);
  const close = renderShortcutHints([DIALOG_CLOSE_SHORTCUT_HINT], theme);
  const closeWidth = displayWidth(close);
  if (width <= closeWidth) return truncateToWidth(close, width);
  const bodyWidth = Math.max(0, width - closeWidth - 2);
  const body = bodyWidth < 3 ? "" : truncateToWidth(renderShortcutHints(withoutClose, theme, indent), bodyWidth);
  return displayWidth(body) === 0 ? close : `${body}  ${close}`;
}
