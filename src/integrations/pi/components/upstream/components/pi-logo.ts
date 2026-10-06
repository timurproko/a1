/**
 * Provenance: @earendil-works/pi-coding-agent 1.0.4 (MIT), commit 7c10bd4337495ee613f2224843ecdf349b80d1df,
 * packages/coding-agent/src/modes/interactive/components/pi-logo.ts.
 * Modifications: Remapped the private theme import to A1's public-backed adapter and composed the
 * fixed-color logo into the owned startup header.
 * Deviations: none.
 */
import {
  backgroundAnsi,
  foregroundAnsi,
  isAppleTerminalSession,
  rgbColor,
} from "@earendil-works/pi-tui";
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

/** Whether the terminal can render the half-block logo without gaps or misalignment. */
export function supportsPiLogo(): boolean {
  return !isAppleTerminalSession();
}

/** Text fallback for terminals that cannot render the fixed-color logo. */
export function piWordmark(): string {
  const mode = piTheme().getColorMode();
  return `${foregroundAnsi(CORAL, mode)}P${RESET}${foregroundAnsi(YELLOW, mode)}i${RESET}`;
}
