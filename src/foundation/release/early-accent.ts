import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { SHARED_PROGRESS_PALETTE } from "./progress-palette.generated.js";

const MAX_SETTINGS_BYTES = 256 * 1024;
type UiAccentColor = "blue" | "purple" | "cyan" | "green" | "orange" | "pink";
export type EarlyAccentAppearance = "dark" | "light";
export type EarlyAccentMode = "truecolor" | "256color";

/** Read only global profile data, never project settings or the interactive resource pipeline. */
export function resolveEarlyAccentColor(
  environment: NodeJS.ProcessEnv = process.env,
  home: () => string = homedir,
): UiAccentColor {
  try {
    const selectedHome = environment[PRODUCT_IDENTITY.environment.profileHome] ?? home();
    if (!isAbsolute(selectedHome) || selectedHome.includes("\0")) return "blue";
    const file = join(selectedHome, PRODUCT_IDENTITY.state.piAgentProfile, "settings.json");
    if (statSync(file).size > MAX_SETTINGS_BYTES) return "blue";
    const raw = readFileSync(file, "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_SETTINGS_BYTES) return "blue";
    const root: unknown = JSON.parse(raw.replace(/^\uFEFF/u, ""));
    if (!isRecord(root)) return "blue";
    const namespace = root[PRODUCT_IDENTITY.commandName];
    if (!isRecord(namespace)) return "blue";
    const value = namespace.accentColor;
    if (value === "default") return "purple"; // Compatibility: preserve explicitly saved legacy defaults.
    return isAccentColor(value) ? value : "blue";
  } catch {
    return "blue";
  }
}

export function earlyAccentPalette(
  color: UiAccentColor,
  appearance: EarlyAccentAppearance = "dark",
  mode: EarlyAccentMode = "truecolor",
): { readonly accent: string; readonly border: string } {
  return SHARED_PROGRESS_PALETTE[color][appearance][mode];
}

export function earlyTerminalAppearance(environment: NodeJS.ProcessEnv = process.env): EarlyAccentAppearance {
  const index = Number.parseInt((environment.COLORFGBG ?? "").split(";").at(-1) ?? "", 10);
  return Number.isInteger(index) && (index === 7 || index === 15 || index >= 231) ? "light" : "dark";
}

export function earlyTerminalColorMode(environment: NodeJS.ProcessEnv = process.env): EarlyAccentMode {
  if (environment.PI_TRUE_COLOR === "1") return "truecolor";
  if (environment.PI_TRUE_COLOR === "0") return "256color";
  const program = (environment.TERM_PROGRAM ?? "").toLowerCase();
  const known = ["kitty", "ghostty", "wezterm", "rex", "warpterminal", "iterm.app", "alacritty", "vscode", "zed"];
  const trueColor = /^(truecolor|24bit)$/iu.test(environment.COLORTERM ?? "")
    || (environment.TERM ?? "").endsWith("-direct")
    || process.platform === "win32" || environment.WT_SESSION !== undefined
    || known.includes(program);
  return trueColor ? "truecolor" : "256color";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAccentColor(value: unknown): value is UiAccentColor {
  return typeof value === "string" && Object.hasOwn(SHARED_PROGRESS_PALETTE, value);
}
