import {
  renderSemanticShortcutHints,
  type SemanticShortcutHint,
} from "../../../contracts/presentation/index.js";
import { piTheme } from "./upstream/theme/theme.js";

export * from "./upstream/theme/theme.js";

export type PiModalShortcutHint = SemanticShortcutHint;

/** The common bare-A1 modal footer: quiet display-cased keys, muted names, and whitespace-only gaps. */
export function renderPiModalShortcutHints(entries: readonly PiModalShortcutHint[], indent = 0): string {
  const theme = piTheme();
  return renderSemanticShortcutHints(entries, {
    key: text => theme.fg("dim", text),
    action: text => theme.fg("muted", text),
  }, indent);
}
