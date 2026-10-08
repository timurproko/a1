import {
  DIALOG_CLOSE_SHORTCUT_HINT,
  displayShortcutKeyLabel,
  renderSemanticShortcutHints,
  type SemanticShortcutHint,
} from "../../../contracts/presentation/index.js";
import { stripTerminalSequences, truncateToWidth, type SelectListTheme } from "@earendil-works/pi-tui";
import { piTheme } from "./upstream/theme/theme.js";

export * from "./upstream/theme/theme.js";

export type PiModalShortcutHint = SemanticShortcutHint;
export { DIALOG_CLOSE_SHORTCUT_HINT, displayShortcutKeyLabel };

/** Select-list roles resolved through A1's active theme rather than Pi's package-global base theme. */
export function getPiSelectListTheme(): SelectListTheme {
  return {
    selectedPrefix: text => piTheme().fg("accent", text),
    selectedText: text => piTheme().fg("accent", text),
    description: text => piTheme().fg("muted", text),
    scrollInfo: text => piTheme().fg("muted", text),
    noMatch: text => piTheme().fg("muted", text),
  };
}

/** Paint one selected bare-A1 list item with the standard blue selection surface. */
export function renderPiListSelection(content: string): string {
  return piTheme().bg("selectedBg", content);
}

/** One standard bare-A1 modal row, clipped before its item-bounded selection is painted. */
export function renderPiModalListRow(content: string, width: number, selected: boolean): string {
  const clipped = truncateToWidth(content, Math.max(0, width), "");
  return selected ? renderPiListSelection(clipped) : clipped;
}

/** The common bare-A1 modal footer: quiet display-cased keys, muted names, and whitespace-only gaps. */
export function renderPiModalShortcutHints(entries: readonly PiModalShortcutHint[], indent = 0): string {
  const theme = piTheme();
  return renderSemanticShortcutHints(entries, {
    key: text => theme.fg("dim", text),
    action: text => theme.fg("muted", text),
  }, indent);
}

/** Adapts Pi's closed settings footer while reserving the canonical close suffix. */
export function canonicalizePiSettingsHint(row: string, width: number): string {
  const plain = stripTerminalSequences(row);
  const body = plain.includes("Type to search") ? "  Type to search · Enter/Space to change"
    : plain.includes("Enter/Space to change") ? "  Enter/Space to change"
      : plain.includes("Type to filter") ? "  Type to filter · Enter to select"
        : plain.includes("Enter to select") && plain.includes("Esc") ? "  Enter to select"
          : /^\s*(?:Type to|Enter(?:\/Space)? to)/u.test(plain) ? plain.replace(/\.{3}$/u, "") : null;
  if (body === null) return row;
  const close = `${displayShortcutKeyLabel(DIALOG_CLOSE_SHORTCUT_HINT.key)} ${DIALOG_CLOSE_SHORTCUT_HINT.action}`;
  if (width <= close.length) return piTheme().fg("dim", truncateToWidth(close, width, ""));
  const bodyWidth = width - close.length - 3;
  return piTheme().fg("dim", bodyWidth <= 0 ? close : `${truncateToWidth(body, bodyWidth, "…")} · ${close}`);
}
