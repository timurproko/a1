import {
  renderSemanticShortcutHints,
  type SemanticShortcutHint,
} from "../../contracts/presentation/index.js";
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
