import { truncateToWidth } from "@earendil-works/pi-tui";
import {
  renderSemanticShortcutHints,
  type SemanticShortcutHint,
} from "../../../contracts/presentation/index.js";
import { piTheme } from "./upstream/theme/theme.js";

export * from "./upstream/theme/theme.js";

export type PiModalShortcutHint = SemanticShortcutHint;

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
