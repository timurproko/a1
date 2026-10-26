import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import type { UiAccentColor } from "../../contracts/owned-ui/index.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { SHARED_PROGRESS_PALETTE } from "./progress-palette.generated.js";

type Appearance = "dark" | "light";
type ColorMode = "truecolor" | "256color";

/** Global settings only: project resources must remain unavailable until trust is resolved. */
export function readPreTrustAccent(environment: NodeJS.ProcessEnv = process.env): UiAccentColor {
  try {
    const home = environment[PRODUCT_IDENTITY.environment.profileHome] ?? homedir();
    if (!isAbsolute(home) || home.includes("\0")) return "blue";
    const file = join(home, PRODUCT_IDENTITY.state.piAgentProfile, "settings.json");
    if (statSync(file).size > 256 * 1024) return "blue";
    const raw = readFileSync(file, "utf8");
    if (Buffer.byteLength(raw, "utf8") > 256 * 1024) return "blue";
    const root: unknown = JSON.parse(raw.replace(/^\uFEFF/u, ""));
    if (root === null || typeof root !== "object" || Array.isArray(root)) return "blue";
    const namespace: unknown = (root as Record<string, unknown>)[PRODUCT_IDENTITY.commandName];
    if (namespace === null || typeof namespace !== "object" || Array.isArray(namespace)) return "blue";
    const value: unknown = (namespace as Record<string, unknown>).accentColor;
    if (value === "default") return "purple";
    return typeof value === "string" && Object.hasOwn(SHARED_PROGRESS_PALETTE, value) ? value as UiAccentColor : "blue";
  } catch { return "blue"; }
}

export function preTrustPalette(color: UiAccentColor, appearance: Appearance, mode: ColorMode) {
  return SHARED_PROGRESS_PALETTE[color][appearance][mode];
}

export function preTrustTerminalAppearance(environment: NodeJS.ProcessEnv = process.env): Appearance {
  const index = Number.parseInt((environment.COLORFGBG ?? "").split(";").at(-1) ?? "", 10);
  return Number.isInteger(index) && (index === 7 || index === 15 || index >= 231) ? "light" : "dark";
}

export function preTrustTerminalColorMode(environment: NodeJS.ProcessEnv = process.env): ColorMode {
  if (environment.PI_TRUE_COLOR === "1") return "truecolor";
  if (environment.PI_TRUE_COLOR === "0") return "256color";
  const program = (environment.TERM_PROGRAM ?? "").toLowerCase();
  const known = ["kitty", "ghostty", "wezterm", "rex", "warpterminal", "iterm.app", "alacritty", "vscode", "zed"];
  return /^(truecolor|24bit)$/iu.test(environment.COLORTERM ?? "") || (environment.TERM ?? "").endsWith("-direct")
    || process.platform === "win32" || environment.WT_SESSION !== undefined || known.includes(program)
    ? "truecolor" : "256color";
}
