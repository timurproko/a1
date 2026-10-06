import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import {
  renderSemanticShortcutHints,
  type SemanticShortcutHint,
} from "../../../contracts/presentation/index.js";
import { piTheme } from "./upstream/theme/theme.js";

export * from "./upstream/theme/theme.js";

export type PiModalShortcutHint = SemanticShortcutHint;

/**
 * One standard bare-A1 list row. Selected rows fill their complete content rectangle with the
 * same low-intensity purple surface as Session Tree while retaining the row's semantic foregrounds.
 */
export function renderPiModalListRow(content: string, width: number, selected: boolean): string {
  const boundedWidth = Math.max(0, width);
  const clipped = truncateToWidth(content, boundedWidth, "");
  if (!selected) return clipped;
  const padded = clipped + " ".repeat(Math.max(0, boundedWidth - visibleWidth(clipped)));
  return piTheme().bg("customMessageBg", padded);
}

/** The common bare-A1 modal footer: quiet display-cased keys, muted names, and whitespace-only gaps. */
export function renderPiModalShortcutHints(entries: readonly PiModalShortcutHint[], indent = 0): string {
  const theme = piTheme();
  return renderSemanticShortcutHints(entries, {
    key: text => theme.fg("dim", text),
    action: text => theme.fg("muted", text),
  }, indent);
}
