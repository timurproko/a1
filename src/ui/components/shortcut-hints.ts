import {
  DIALOG_CLOSE_SHORTCUT_HINT,
  renderSemanticShortcutHints,
  type SemanticShortcutHint,
} from "../../contracts/presentation/index.js";
import { displayWidth, truncateToWidth } from "./text.js";
import type { UiTheme } from "./theme.js";

export type ShortcutHintEntry = SemanticShortcutHint;

/**
 * Enforces the owned-dialog hint grammar at the shared rendering boundary.
 * Pinned Pi surfaces use their separate adapter and retain upstream wording.
 */
export function assertOwnedShortcutHintConventions(entries: readonly ShortcutHintEntry[]): void {
  for (const entry of entries) {
    if (entry.key === undefined || entry.key.trim().length === 0) continue;
    if (entry.key !== entry.key.trim()) throw new TypeError("owned shortcut hint keys must not have surrounding whitespace");
    if (entry.action !== entry.action.trim() || entry.action.length === 0) {
      throw new TypeError("owned shortcut hint actions must be nonempty and have no surrounding whitespace");
    }
    if (/^to(?:\s|$)/iu.test(entry.action)) {
      throw new TypeError(`owned shortcut hint actions omit connective "to": ${entry.key} ${entry.action}`);
    }
  }
}

/** Returns an unstyled modal instruction row for width-aware clipping. */
export function shortcutHintsText(entries: readonly ShortcutHintEntry[], indent = 0, separator = "  "): string {
  assertOwnedShortcutHintConventions(entries);
  return renderSemanticShortcutHints(entries, { key: text => text, action: text => text }, indent, separator);
}

/** Paints one modal instruction row with shared key/action roles and caller-selected spacing. */
export function renderShortcutHints(
  entries: readonly ShortcutHintEntry[],
  theme: Pick<UiTheme, "fg">,
  indent = 0,
  separator = "  ",
): string {
  assertOwnedShortcutHintConventions(entries);
  return renderSemanticShortcutHints(entries, {
    key: text => theme.fg("dim", text),
    action: text => theme.fg("muted", text),
  }, indent, separator);
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
