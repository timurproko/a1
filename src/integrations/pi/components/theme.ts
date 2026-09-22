import { piTheme } from "./upstream/theme/theme.js";

export * from "./upstream/theme/theme.js";

export interface PiModalShortcutHint {
  readonly key?: string;
  readonly action: string;
  readonly actionFirst?: boolean;
}

/** The common bare-A1 modal footer: quiet keys, muted names, and whitespace-only gaps. */
export function renderPiModalShortcutHints(entries: readonly PiModalShortcutHint[], indent = 0): string {
  const theme = piTheme();
  return `${" ".repeat(Math.max(0, indent))}${entries.flatMap(entry => {
    if (entry.key === "" || (entry.key !== undefined && entry.key.trim().length === 0)) return [];
    if (entry.key === undefined) return entry.action ? [theme.fg("muted", entry.action)] : [];
    const key = theme.fg("dim", entry.key);
    const action = theme.fg("muted", entry.action);
    return [entry.actionFirst ? `${action} ${key}` : `${key} ${action}`];
  }).join("  ")}`;
}
