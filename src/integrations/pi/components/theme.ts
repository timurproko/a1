import { visibleWidth } from "#pi-tui";
import { piTheme } from "./upstream/theme/theme.js";

export * from "./upstream/theme/theme.js";

/** Shades existing completion rows without changing their content or height. */
export function paintAutocompleteRow(row: string, width: number): string {
  const background = piTheme().getBgAnsi("toolPendingBg");
  const padded = row + " ".repeat(Math.max(0, width - visibleWidth(row)));
  // Invariant: restore the menu surface after SGR resets without changing foreground styles.
  const shaded = padded.replace(/\u001b\[[0-9;:]*m/gu, sequence => sequence + background);
  return `${background}${shaded}\u001b[49m`;
}
