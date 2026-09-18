import { existsSync, readFileSync, readdirSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import {
  getAgentDir,
  initTheme,
  Theme,
  type ThemeColor,
} from "@earendil-works/pi-coding-agent";
import { getCapabilities, type RgbColor } from "@earendil-works/pi-tui";
import { BUILTIN_THEME_RESOURCES, isBuiltinThemeName } from "../../resources/builtin-themes.js";

export const PINNED_PI_LAYOUT = Object.freeze({
  editorPaddingX: 0,
  outputPad: 1,
  autocompleteMaxVisible: 5,
  contentPaddingX: 1,
  messagePaddingY: 1,
  sectionSpacing: 1,
  selectorMaxVisible: 10,
} as const);

export type PiTerminalTheme = "dark" | "light";
export type PiThemeBackground =
  | "selectedBg"
  | "scrollbarThumb"
  | "userMessageBg"
  | "customMessageBg"
  | "toolPendingBg"
  | "toolSuccessBg"
  | "toolErrorBg";
export type PiColorMode = "truecolor" | "256color";
type ColorValue = string | number;

interface PiThemeJson {
  readonly name: string;
  readonly vars?: Readonly<Record<string, ColorValue>>;
  readonly colors: Readonly<Record<string, ColorValue>>;
}

export interface PiThemeResult {
  readonly success: boolean;
  readonly name: string;
  readonly error?: string;
}

export interface PiTerminalThemeDetection {
  readonly theme: PiTerminalTheme;
  readonly source: "terminal background" | "COLORFGBG" | "fallback";
  readonly detail: string;
  readonly confidence: "high" | "low";
}

export interface PiTerminalThemeDetector {
  queryTerminalBackgroundColor(options: { readonly timeoutMs: number }): Promise<RgbColor | undefined>;
  queryTerminalColorScheme?(options: { readonly timeoutMs: number }): Promise<PiTerminalTheme | undefined>;
}

const FOREGROUND_COLORS: readonly ThemeColor[] = [
  "accent", "border", "borderAccent", "borderMuted", "success", "error", "warning", "muted", "dim", "text",
  "thinkingText", "userMessageText", "customMessageText", "customMessageLabel", "toolTitle", "toolOutput",
  "mdHeading", "mdLink", "mdLinkUrl", "mdCode", "mdCodeBlock", "mdCodeBlockBorder", "mdQuote", "mdQuoteBorder",
  "mdHr", "mdListBullet", "toolDiffAdded", "toolDiffRemoved", "toolDiffContext", "syntaxComment", "syntaxKeyword",
  "syntaxFunction", "syntaxVariable", "syntaxString", "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation",
  "thinkingOff", "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh", "thinkingXhigh", "thinkingMax", "bashMode",
];
const BACKGROUND_COLORS: readonly PiThemeBackground[] = [
  "selectedBg", "scrollbarThumb", "userMessageBg", "customMessageBg", "toolPendingBg", "toolSuccessBg", "toolErrorBg",
];
let activeTheme: Theme | undefined;
let activeThemeName: string | undefined;
let activeThemeMode: PiColorMode | undefined;
let themeWatcher: FSWatcher | undefined;
let themeReloadTimer: NodeJS.Timeout | undefined;
const themeChangeListeners = new Set<() => void>();

export function ensurePiTheme(): Theme {
  if (activeTheme) return activeTheme;
  const detected = detectPiTerminalBackgroundFromEnv();
  applyPiTheme(detected.theme);
  return activeTheme!;
}

export function piTheme(): Theme {
  return ensurePiTheme();
}

export function currentPiThemeName(): string {
  ensurePiTheme();
  return activeThemeName!;
}

export function applyPiTheme(name: string, enableWatcher = false, mode?: PiColorMode): PiThemeResult {
  try {
    const loaded = loadPiTheme(name, mode);
    initTheme(name, false);
    activeTheme = loaded;
    activeThemeName = name;
    activeThemeMode = mode;
    if (enableWatcher) startPiThemeWatcher(name);
    notifyThemeChanged();
    return { success: true, name };
  } catch (error) {
    initTheme("dark", false);
    activeTheme = loadPiTheme("dark", mode);
    activeThemeName = "dark";
    activeThemeMode = mode;
    notifyThemeChanged();
    return { success: false, name: "dark", error: error instanceof Error ? error.message : String(error) };
  }
}

export function applyPiThemeInstance(theme: Theme): PiThemeResult {
  stopPiThemeWatcher();
  activeTheme = theme;
  activeThemeName = theme.name ?? "<in-memory>";
  activeThemeMode = theme.getColorMode();
  notifyThemeChanged();
  return { success: true, name: activeThemeName };
}

export function onPiThemeChange(listener: () => void): () => void {
  themeChangeListeners.add(listener);
  return () => themeChangeListeners.delete(listener);
}

export function stopPiThemeWatcher(): void {
  if (themeReloadTimer !== undefined) clearTimeout(themeReloadTimer);
  themeReloadTimer = undefined;
  themeWatcher?.close();
  themeWatcher = undefined;
}

export function loadPiTheme(name: string, mode?: PiColorMode): Theme {
  if (!name || name.includes("/")) throw new Error(`Invalid theme name: ${name}`);
  const builtin = isBuiltinThemeName(name);
  const path = builtin ? `owned:builtin-theme/${name}` : customThemePath(name);
  let parsed: unknown;
  if (builtin) {
    parsed = BUILTIN_THEME_RESOURCES[name];
  } else {
    const source = readFileSync(path, "utf8");
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      throw new Error(`Failed to parse theme ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const themeJson = validateThemeJson(path, parsed);
  const vars = themeJson.vars ?? {};
  const colors = { ...themeJson.colors };
  const thinkingMax = colors.thinkingMax ?? colors.thinkingXhigh;
  const scrollbarThumb = colors.scrollbarThumb ?? colors.selectedBg;
  if (thinkingMax !== undefined) colors.thinkingMax = thinkingMax;
  if (scrollbarThumb !== undefined) colors.scrollbarThumb = scrollbarThumb;
  const resolved = Object.fromEntries(Object.entries(colors).map(([key, value]) => [key, resolveVariable(value, vars)]));
  const foreground = Object.fromEntries(FOREGROUND_COLORS.map(key => [key, requiredColor(resolved, key, path)])) as Record<ThemeColor, ColorValue>;
  const backgrounds = Object.fromEntries(BACKGROUND_COLORS.map(key => [key, requiredColor(resolved, key, path)])) as Record<PiThemeBackground, ColorValue>;
  return new Theme(foreground, backgrounds, mode ?? (getCapabilities().trueColor ? "truecolor" : "256color"), {
    name: themeJson.name,
    sourcePath: path,
  });
}

export function getAvailablePiThemes(): readonly { readonly name: string; readonly path: string }[] {
  const available = new Map<string, string>();
  for (const name of ["dark", "light"] as const) available.set(name, `owned:builtin-theme/${name}`);
  const customDirectory = join(getAgentDir(), "themes");
  if (existsSync(customDirectory)) {
    for (const file of readdirSync(customDirectory)) {
      if (!file.endsWith(".json")) continue;
      const path = join(customDirectory, file);
      try {
        const parsed = validateThemeJson(path, JSON.parse(readFileSync(path, "utf8")));
        if (!available.has(parsed.name)) available.set(parsed.name, path);
      } catch {}
    }
  }
  return [...available].map(([name, path]) => ({ name, path })).sort((left, right) => left.name.localeCompare(right.name));
}

export function parsePiAutoThemeSetting(setting: string | undefined): { readonly lightTheme: string; readonly darkTheme: string } | undefined {
  if (!setting) return undefined;
  const slashIndex = setting.indexOf("/");
  if (slashIndex === -1 || setting.indexOf("/", slashIndex + 1) !== -1) return undefined;
  const lightTheme = setting.slice(0, slashIndex).trim();
  const darkTheme = setting.slice(slashIndex + 1).trim();
  return lightTheme && darkTheme ? { lightTheme, darkTheme } : undefined;
}

export function resolvePiThemeSetting(setting: string | undefined, terminalTheme: PiTerminalTheme): string | undefined {
  const automatic = parsePiAutoThemeSetting(setting);
  if (automatic) return terminalTheme === "light" ? automatic.lightTheme : automatic.darkTheme;
  if (setting?.includes("/")) return undefined;
  return setting;
}

export function detectPiTerminalBackgroundFromEnv(environment: NodeJS.ProcessEnv = process.env): PiTerminalThemeDetection {
  const parts = (environment.COLORFGBG ?? "").split(";");
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const background = Number.parseInt(parts[index]!.trim(), 10);
    if (!Number.isInteger(background) || background < 0 || background > 255) continue;
    return {
      theme: luminance(hexToRgb(ansi256ToHex(background))) >= 0.5 ? "light" : "dark",
      source: "COLORFGBG",
      detail: `background color index ${background}`,
      confidence: "high",
    };
  }
  return { theme: "dark", source: "fallback", detail: "no terminal background hint found", confidence: "low" };
}

export async function detectPiTerminalBackgroundTheme(
  ui: PiTerminalThemeDetector,
  timeoutMs: number,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<PiTerminalThemeDetection> {
  try {
    const rgb = await ui.queryTerminalBackgroundColor({ timeoutMs });
    if (rgb) {
      return {
        theme: luminance(rgb) >= 0.5 ? "light" : "dark",
        source: "terminal background",
        detail: `OSC 11 background rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        confidence: "high",
      };
    }
  } catch {}
  return detectPiTerminalBackgroundFromEnv(environment);
}

export async function detectPiTerminalThemeForAuto(
  ui: PiTerminalThemeDetector,
  timeoutMs: number,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<PiTerminalTheme> {
  let scheme: Promise<PiTerminalTheme | undefined> | undefined;
  try {
    scheme = ui.queryTerminalColorScheme?.({ timeoutMs });
  } catch {}
  const background = detectPiTerminalBackgroundTheme(ui, timeoutMs, environment);
  try {
    const value = await scheme;
    if (value) return value;
  } catch {}
  return (await background).theme;
}

function startPiThemeWatcher(name: string): void {
  stopPiThemeWatcher();
  if (isBuiltinThemeName(name)) return;
  const path = customThemePath(name);
  if (!existsSync(path)) return;
  themeWatcher = watch(path, () => {
    if (activeThemeName !== name) return;
    if (themeReloadTimer !== undefined) clearTimeout(themeReloadTimer);
    themeReloadTimer = setTimeout(() => {
      themeReloadTimer = undefined;
      if (activeThemeName !== name || !existsSync(path)) return;
      try {
        activeTheme = loadPiTheme(name, activeThemeMode);
        notifyThemeChanged();
      } catch {}
    }, 100);
  });
  themeWatcher.on("error", stopPiThemeWatcher);
}

function notifyThemeChanged(): void {
  for (const listener of themeChangeListeners) listener();
}

function customThemePath(name: string): string {
  return join(getAgentDir(), "themes", `${name}.json`);
}

function validateThemeJson(label: string, value: unknown): PiThemeJson {
  if (!isRecord(value) || typeof value.name !== "string" || !isRecord(value.colors)
    || (value.vars !== undefined && !isRecord(value.vars))) {
    throw new Error(`Invalid theme "${label}": expected name, colors, and optional vars objects`);
  }
  if (value.name.includes("/")) throw new Error(`Invalid theme name "${value.name}"`);
  for (const key of FOREGROUND_COLORS) {
    if (key !== "thinkingMax" && value.colors[key] === undefined) throw new Error(`Invalid theme "${label}": missing required color ${key}`);
  }
  for (const key of BACKGROUND_COLORS) {
    if (key !== "scrollbarThumb" && value.colors[key] === undefined) throw new Error(`Invalid theme "${label}": missing required color ${key}`);
  }
  const colors: Record<string, ColorValue> = {};
  for (const [key, color] of Object.entries(value.colors)) {
    validateColor(color, `${label}.colors.${key}`);
    colors[key] = color;
  }
  const vars: Record<string, ColorValue> = {};
  for (const [key, color] of Object.entries(value.vars ?? {})) {
    validateColor(color, `${label}.vars.${key}`);
    vars[key] = color;
  }
  return { name: value.name, colors, ...(Object.keys(vars).length === 0 ? {} : { vars }) };
}

function validateColor(value: unknown, label: string): asserts value is ColorValue {
  if (typeof value === "string") return;
  if (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 255) return;
  throw new Error(`Invalid theme color: ${label}`);
}

function resolveVariable(value: ColorValue, vars: Readonly<Record<string, ColorValue>>, visited = new Set<string>()): ColorValue {
  if (typeof value === "number" || value === "" || value.startsWith("#")) return value;
  if (visited.has(value)) throw new Error(`Circular variable reference detected: ${value}`);
  if (!(value in vars)) throw new Error(`Variable reference not found: ${value}`);
  visited.add(value);
  return resolveVariable(vars[value]!, vars, visited);
}

function requiredColor(colors: Readonly<Record<string, ColorValue>>, key: string, label: string): ColorValue {
  const value = colors[key];
  if (value === undefined) throw new Error(`Invalid theme "${label}": missing required color ${key}`);
  return value;
}

function luminance({ r, g, b }: RgbColor): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function hexToRgb(hex: string): RgbColor {
  const value = hex.slice(1);
  return { r: Number.parseInt(value.slice(0, 2), 16), g: Number.parseInt(value.slice(2, 4), 16), b: Number.parseInt(value.slice(4, 6), 16) };
}

function ansi256ToHex(index: number): string {
  const basic = [
    "#000000", "#800000", "#008000", "#808000", "#000080", "#800080", "#008080", "#c0c0c0",
    "#808080", "#ff0000", "#00ff00", "#ffff00", "#0000ff", "#ff00ff", "#00ffff", "#ffffff",
  ];
  if (index < 16) return basic[index]!;
  if (index < 232) {
    const cube = index - 16;
    const toHex = (value: number) => (value === 0 ? 0 : 55 + value * 40).toString(16).padStart(2, "0");
    return `#${toHex(Math.floor(cube / 36))}${toHex(Math.floor((cube % 36) / 6))}${toHex(cube % 6)}`;
  }
  const gray = (8 + (index - 232) * 10).toString(16).padStart(2, "0");
  return `#${gray}${gray}${gray}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Applies the theme the reader configured, as the engine does at startup. The
 * setting is either a theme's name or the `light/dark` pair meaning "follow the
 * terminal", and only the pair consults the terminal's own background. An
 * unreadable or absent setting falls back to that detection, which is what the
 * engine does with an unset theme.
 */
export function applyConfiguredPiTheme(setting: string | undefined): PiThemeResult {
  const detected = detectPiTerminalBackgroundFromEnv();
  const resolved = resolvePiThemeSetting(setting, detected.theme);
  return applyPiTheme(resolved ?? detected.theme);
}
