/**
 * Provenance: @earendil-works/pi-coding-agent 0.99.2 (MIT), commit 005af57d88ee23b33778f343a9595b32e67ff788,
 * packages/coding-agent/src/modes/interactive/components/pi-logo.ts.
 * Modifications: Remapped the private theme import to A1's public-backed adapter and composed the
 * fixed-color logo into the owned startup header.
 * Deviations: none.
 */
import { backgroundAnsi, foregroundAnsi, rgbColor } from "@earendil-works/pi-tui";
import { piTheme } from "../../theme.js";

const CORAL = rgbColor(228, 138, 122);
const BLUE = rgbColor(79, 142, 179);
const YELLOW = rgbColor(234, 182, 93);
const RESET = "\x1b[0m";

/** The fixed-color, four-cell by two-line pinned Pi logo. */
export function piLogoLines(): [string, string] {
  const mode = piTheme().getColorMode();
  const fg = (color: typeof CORAL) => foregroundAnsi(color, mode);
  const top = `${fg(CORAL)}${backgroundAnsi(BLUE, mode)}▀${RESET}${fg(CORAL)}▀█${RESET} `;
  const bottom = `${fg(BLUE)}█▀${RESET} ${fg(YELLOW)}█${RESET}`;
  return [top, bottom];
}
