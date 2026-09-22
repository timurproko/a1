import type { UiTheme } from "./theme.js";

export interface ShortcutHintEntry {
  readonly key?: string;
  readonly action: string;
  readonly actionFirst?: boolean;
}

/** Returns an unstyled modal instruction row for width-aware clipping. */
export function shortcutHintsText(entries: readonly ShortcutHintEntry[], indent = 0): string {
  return `${" ".repeat(Math.max(0, indent))}${entries.flatMap(entry => {
    if (entry.key === "" || (entry.key !== undefined && entry.key.trim().length === 0)) return [];
    if (entry.key === undefined) return entry.action.length === 0 ? [] : [entry.action];
    return [entry.actionFirst ? `${entry.action} ${entry.key}` : `${entry.key} ${entry.action}`];
  }).join("  ")}`;
}

/** Paints one modal instruction row without decorative separator glyphs. */
export function renderShortcutHints(
  entries: readonly ShortcutHintEntry[],
  theme: Pick<UiTheme, "fg">,
  indent = 0,
): string {
  const rendered = entries.flatMap(entry => {
    if (entry.key === "" || (entry.key !== undefined && entry.key.trim().length === 0)) return [];
    if (entry.key === undefined) return entry.action.length === 0 ? [] : [theme.fg("muted", entry.action)];
    const key = theme.fg("dim", entry.key);
    const action = theme.fg("muted", entry.action);
    return [entry.actionFirst ? `${action} ${key}` : `${key} ${action}`];
  });
  return `${" ".repeat(Math.max(0, indent))}${rendered.join("  ")}`;
}
