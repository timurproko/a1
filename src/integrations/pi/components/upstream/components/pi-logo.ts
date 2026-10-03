/**
 * Provenance: @earendil-works/pi-coding-agent 1.0.0 (MIT), commit a13d35a742c6ef8462812a28fbe1d8c8b7431c32,
 * packages/coding-agent/src/modes/interactive/components/pi-logo.ts.
 * Modifications: Remapped the private theme import to A1's public-backed adapter and composed the
 * fixed-color logo into the owned startup header.
 * Deviations: none.
 */
<<<<<<< a1
import { backgroundAnsi, foregroundAnsi, rgbColor } from "@earendil-works/pi-tui";
import { piTheme } from "../../theme.js";
||||||| pi 0.99.2
import { backgroundAnsi, foregroundAnsi, rgbColor } from "@earendil-works/pi-tui";
import { theme } from "../theme/theme.ts";
=======
import { backgroundAnsi, foregroundAnsi, isAppleTerminalSession, rgbColor } from "@earendil-works/pi-tui";
import { theme } from "../theme/theme.ts";
>>>>>>> pi 1.0.0

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

/**
 * Whether the terminal renders the half-block logo correctly. Apple Terminal draws gaps between rows and
 * misaligns the half blocks, so it gets the text wordmark instead.
 */
export function supportsPiLogo(): boolean {
	return !isAppleTerminalSession();
}

/** Text fallback for the logo: "Pi" with the logo's coral and yellow. */
export function piWordmark(): string {
	const mode = theme.getColorMode();
	return `${foregroundAnsi(CORAL, mode)}P${RESET}${foregroundAnsi(YELLOW, mode)}i${RESET}`;
}
