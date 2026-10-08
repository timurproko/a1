/**
 * Provenance: @earendil-works/pi-coding-agent 1.1.0 (MIT), commit abe508e1b89912adde45528136c3221eb69acdd7,
 * packages/coding-agent/src/modes/interactive/theme/theme.ts.
 * Modifications: Source-synchronized theme port: retain pinned theme schema, variable/color
 * resolution, built-in and custom loading, terminal detection, and layout defaults while constructing
 * the public package-root Theme class and projecting A1's optional semantic accent.
 * Deviations: theme-public-api-boundary, theme-owned-watcher-boundary, semantic-accent-projection.
 */
import { existsSync, readFileSync, readdirSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import {
  getAgentDir,
  initTheme,
  Theme,
  type ThemeColor,
} from "@earendil-works/pi-coding-agent";
export type { ThemeColor } from "@earendil-works/pi-coding-agent";
import {
  backgroundAnsi,
  colorToOkhsl,
  foregroundAnsi,
  getCapabilities,
  okhslColor,
  type Color,
  type RgbColor,
} from "@earendil-works/pi-tui";
import type { UiAccentColor } from "../../../../../contracts/owned-ui/index.js";
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
export type ThemeAppearance = PiTerminalTheme;
export type PiThemeBackground =
  | "selectedBg"
  | "searchMatchBg"
  | "userMessageBg"
  | "customMessageBg"
  | "toolPendingBg"
  | "toolSuccessBg"
  | "toolErrorBg";
export type ThemeBg = PiThemeBackground;
export type ThemeToken = ThemeColor | ThemeBg;
export type PiColorMode = "truecolor" | "256color";
type ColorValue = string | number;

interface PiThemeJson {
  readonly name: string;
  readonly appearance?: PiTerminalTheme;
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
  "accent", "border", "borderAccent", "borderMuted", "success", "error", "warning", "muted", "dim", "text", "scrollbarTrack", "scrollbarThumb", "searchMatchText",
  "thinkingText", "userMessageText", "customMessageText", "customMessageLabel", "toolTitle", "toolOutput",
  "mdHeading", "mdLink", "mdLinkUrl", "mdCode", "mdCodeBlock", "mdCodeBlockBorder", "mdQuote", "mdQuoteBorder",
  "mdHr", "mdListBullet", "toolDiffAdded", "toolDiffRemoved", "toolDiffContext", "syntaxComment", "syntaxKeyword",
  "syntaxFunction", "syntaxVariable", "syntaxString", "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation",
  "thinkingOff", "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh", "thinkingXhigh", "thinkingMax", "bashMode",
];
const BACKGROUND_COLORS: readonly PiThemeBackground[] = [
  "selectedBg", "searchMatchBg", "userMessageBg", "customMessageBg", "toolPendingBg", "toolSuccessBg", "toolErrorBg",
];
export interface PiAccentProjection {
  readonly accent: Color;
  readonly border: Color;
  readonly secondaryHeading: Color;
  readonly selectedBg: Color;
  readonly userMessageBg: Color;
}

const ACCENT_PALETTE: Readonly<Record<UiAccentColor, Readonly<Record<PiTerminalTheme, Color>>>> = Object.freeze({
  purple: Object.freeze({
    dark: Object.freeze({ kind: "rgb", r: 167, g: 152, b: 215 }),
    light: Object.freeze({ kind: "rgb", r: 116, g: 89, b: 180 }),
  }),
  blue: Object.freeze({ dark: okhslColor(232, 0.54, 0.67), light: okhslColor(231, 0.68, 0.47) }),
  cyan: Object.freeze({ dark: okhslColor(202, 0.58, 0.67), light: okhslColor(203, 0.73, 0.46) }),
  green: Object.freeze({ dark: okhslColor(159, 0.59, 0.67), light: okhslColor(159, 0.75, 0.46) }),
  orange: Object.freeze({ dark: okhslColor(48, 0.75, 0.67), light: okhslColor(48, 0.90, 0.47) }),
  pink: Object.freeze({ dark: okhslColor(337, 0.72, 0.67), light: okhslColor(337, 0.75, 0.48) }),
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function wrapHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/** Derive the complete semantic family from any primary accent, including future custom colors. */
export function derivePiAccentProjection(accent: Color, appearance: PiTerminalTheme): PiAccentProjection {
  const { h, s, l } = colorToOkhsl(accent);
  const warm = h < 90 || h >= 270;
  const magenta = h >= 270 && h < 325;
  const borderHue = wrapHue(h + (warm ? -20 : 20));
  const secondaryHue = wrapHue(h + (magenta ? 55 : warm ? 35 : -35));
  const dark = appearance === "dark";
  const selectedSaturation = clamp(s * (dark ? 0.25 : 0.16), dark ? 0.10 : 0.08, dark ? 0.16 : 0.11);
  const selectedLightness = dark ? l * 0.37 : 1 - (1 - l) * 0.075;
  return Object.freeze({
    accent,
    border: okhslColor(borderHue, clamp(s * 0.78, 0.30, 0.64), clamp(l - (dark ? 0.17 : 0.11), 0, 1)),
    secondaryHeading: okhslColor(
      secondaryHue,
      clamp(s + 0.20, 0.62, 0.82),
      clamp(l + (dark ? 0.09 : -0.09), 0, 1),
    ),
    selectedBg: okhslColor(h, selectedSaturation, selectedLightness),
    userMessageBg: okhslColor(
      h,
      selectedSaturation * 2 / 3,
      dark ? l * 0.34 : 1 - (1 - l) * 0.055,
    ),
  });
}
let activeBaseTheme: Theme | undefined;
let activeTheme: Theme | undefined;
let activeThemeName: string | undefined;
let activeThemeMode: PiColorMode | undefined;
let activeAccentColor: UiAccentColor = "purple";
let packageBorderProjectionEnabled = true;
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

export function currentPiAccentColor(): UiAccentColor {
  return activeAccentColor;
}

/** Paints one menu swatch from a named A1 palette entry. */
export function renderPiAccentPreview(color: string, text: string): string | null {
  ensurePiTheme();
  const base = activeBaseTheme!;
  if (!isAccentColor(color)) return null;
  const accent = ACCENT_PALETTE[color][base.appearance];
  return `${foregroundAnsi(accent, base.getColorMode())}${text}\u001b[39m`;
}

/** Keeps package-owned comparison UI unmodified while bare A1 projects package dialog rules. */
export function setPiPackageBorderProjectionEnabled(enabled: boolean): void {
  if (packageBorderProjectionEnabled === enabled) return;
  packageBorderProjectionEnabled = enabled;
  syncPiPackageBorderProjection();
}

/** Reprojects the active base theme; repeated changes never derive from an earlier projection. */
export function setPiAccentColor(color: UiAccentColor): void {
  if (activeAccentColor === color) return;
  activeAccentColor = color;
  if (activeBaseTheme === undefined) return;
  activeTheme = projectPiAccent(activeBaseTheme, color);
  syncPiPackageBorderProjection();
  notifyThemeChanged();
}

export function applyPiTheme(name: string, enableWatcher = false, mode?: PiColorMode): PiThemeResult {
  try {
    const loaded = loadPiTheme(name, mode);
    initTheme(name, false);
    activeBaseTheme = loaded;
    activeTheme = projectPiAccent(loaded, activeAccentColor);
    activeThemeName = name;
    activeThemeMode = mode;
    syncPiPackageBorderProjection();
    if (enableWatcher) startPiThemeWatcher(name);
    notifyThemeChanged();
    return { success: true, name };
  } catch (error) {
    initTheme("dark", false);
    activeBaseTheme = loadPiTheme("dark", mode);
    activeTheme = projectPiAccent(activeBaseTheme, activeAccentColor);
    activeThemeName = "dark";
    activeThemeMode = mode;
    syncPiPackageBorderProjection();
    notifyThemeChanged();
    return { success: false, name: "dark", error: error instanceof Error ? error.message : String(error) };
  }
}

export function applyPiThemeInstance(theme: Theme): PiThemeResult {
  stopPiThemeWatcher();
  activeBaseTheme = theme;
  activeTheme = projectPiAccent(theme, activeAccentColor);
  activeThemeName = theme.name ?? "<in-memory>";
  activeThemeMode = theme.getColorMode();
  syncPiPackageBorderProjection();
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
  const scrollbarThumb = colors.scrollbarThumb ?? colors.text;
  const scrollbarTrack = colors.scrollbarTrack ?? colors.muted;
  const searchMatchBg = colors.searchMatchBg ?? colors.selectedBg;
  const searchMatchText = colors.searchMatchText ?? colors.text;
  if (thinkingMax !== undefined) colors.thinkingMax = thinkingMax;
  if (scrollbarThumb !== undefined) colors.scrollbarThumb = scrollbarThumb;
  if (scrollbarTrack !== undefined) colors.scrollbarTrack = scrollbarTrack;
  if (searchMatchBg !== undefined) colors.searchMatchBg = searchMatchBg;
  if (searchMatchText !== undefined) colors.searchMatchText = searchMatchText;
  const resolved = Object.fromEntries(Object.entries(colors).map(([key, value]) => [key, resolveVariable(value, vars)]));
  const foreground = Object.fromEntries(FOREGROUND_COLORS.map(key => [key, requiredColor(resolved, key, path)])) as Record<ThemeColor, ColorValue>;
  const backgrounds = Object.fromEntries(BACKGROUND_COLORS.map(key => [key, requiredColor(resolved, key, path)])) as Record<PiThemeBackground, ColorValue>;
  return new Theme(foreground, backgrounds, mode ?? (getCapabilities().trueColor ? "truecolor" : "256color"), {
    name: themeJson.name,
    sourcePath: path,
    ...(themeJson.appearance === undefined ? {} : { appearance: themeJson.appearance }),
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
        activeBaseTheme = loadPiTheme(name, activeThemeMode);
        activeTheme = projectPiAccent(activeBaseTheme, activeAccentColor);
        syncPiPackageBorderProjection();
        notifyThemeChanged();
      } catch {}
    }, 100);
  });
  themeWatcher.on("error", stopPiThemeWatcher);
}

function notifyThemeChanged(): void {
  for (const listener of themeChangeListeners) listener();
}

function syncPiPackageBorderProjection(): void {
  if (activeBaseTheme === undefined || activeTheme === undefined) return;
  if (!packageBorderProjectionEnabled) {
    setPiPackageThemeInstance(activeBaseTheme);
    return;
  }
  const base = activeBaseTheme;
  const projected = activeTheme;
  setPiPackageThemeInstance(new Proxy(base, {
    get(target, property) {
      if (property === "colors") return Object.freeze({ ...target.colors, border: projected.colors.border });
      if (property === "fg") {
        return (token: ThemeColor, text: string) => token === "border"
          ? projected.fg(token, text)
          : target.fg(token, text);
      }
      if (property === "getFgAnsi") {
        return (token: ThemeColor) => token === "border"
          ? projected.getFgAnsi(token)
          : target.getFgAnsi(token);
      }
      if (property === "style") {
        return (text: string, options: Parameters<Theme["style"]>[1]) => target.style(text, {
          ...options,
          ...(options.fg === "border" ? { fg: projected.colors.border } : {}),
        });
      }
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }));
}

function setPiPackageThemeInstance(theme: Theme): void {
  Reflect.set(globalThis, Symbol.for("@earendil-works/pi-coding-agent:theme"), theme);
  Reflect.set(globalThis, Symbol.for("@mariozechner/pi-coding-agent:theme"), theme);
}

function isAccentColor(value: string): value is UiAccentColor {
  return Object.hasOwn(ACCENT_PALETTE, value);
}

/** A transparent Theme projection keeps every role outside the selected accent family on the base. */
function projectPiAccent(base: Theme, color: UiAccentColor): Theme {
  const tone = derivePiAccentProjection(ACCENT_PALETTE[color][base.appearance], base.appearance);
  const accentAnsi = foregroundAnsi(tone.accent, base.getColorMode());
  const foregrounds: Readonly<Partial<Record<ThemeColor, Color>>> = Object.freeze({
    accent: tone.accent,
    border: tone.border,
    mdHeading: tone.secondaryHeading,
    mdListBullet: tone.accent,
  });
  const foregroundSequences: Readonly<Partial<Record<ThemeColor, string>>> = Object.freeze({
    accent: accentAnsi,
    border: foregroundAnsi(tone.border, base.getColorMode()),
    mdHeading: foregroundAnsi(tone.secondaryHeading, base.getColorMode()),
    mdListBullet: accentAnsi,
  });
  const backgrounds: Readonly<Partial<Record<PiThemeBackground, Color>>> = Object.freeze({
    selectedBg: tone.selectedBg,
    userMessageBg: tone.userMessageBg,
  });
  const backgroundSequences: Readonly<Partial<Record<PiThemeBackground, string>>> = Object.freeze({
    selectedBg: backgroundAnsi(tone.selectedBg, base.getColorMode()),
    userMessageBg: backgroundAnsi(tone.userMessageBg, base.getColorMode()),
  });
  return new Proxy(base, {
    get(target, property) {
      if (property === "colors") return Object.freeze({
        ...target.colors,
        ...foregrounds,
        ...backgrounds,
      });
      if (property === "fg") {
        return (token: ThemeColor, text: string) => foregroundSequences[token] === undefined
          ? target.fg(token, text)
          : `${foregroundSequences[token]}${text}\u001b[39m`;
      }
      if (property === "bg") {
        return (token: PiThemeBackground, text: string) => backgroundSequences[token] === undefined
          ? target.bg(token, text)
          : `${backgroundSequences[token]}${text}\u001b[49m`;
      }
      if (property === "getFgAnsi") {
        return (token: ThemeColor) => foregroundSequences[token] ?? target.getFgAnsi(token);
      }
      if (property === "getBgAnsi") {
        return (token: PiThemeBackground) => backgroundSequences[token] ?? target.getBgAnsi(token);
      }
      if (property === "style") {
        return (text: string, options: Parameters<Theme["style"]>[1]) => target.style(text, {
          ...options,
          ...(typeof options.fg === "string" && foregrounds[options.fg] !== undefined ? { fg: foregrounds[options.fg] } : {}),
          ...(typeof options.bg === "string" && backgrounds[options.bg] !== undefined ? { bg: backgrounds[options.bg] } : {}),
        });
      }
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
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
  if (value.appearance !== undefined && value.appearance !== "dark" && value.appearance !== "light") {
    throw new Error(`Invalid theme "${label}": appearance must be dark or light`);
  }
  for (const key of FOREGROUND_COLORS) {
    if (key !== "thinkingMax" && key !== "scrollbarThumb" && key !== "scrollbarTrack" && key !== "searchMatchText" && value.colors[key] === undefined) throw new Error(`Invalid theme "${label}": missing required color ${key}`);
  }
  for (const key of BACKGROUND_COLORS) {
    if (key !== "searchMatchBg" && value.colors[key] === undefined) throw new Error(`Invalid theme "${label}": missing required color ${key}`);
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
  return {
    name: value.name,
    colors,
    ...(value.appearance === undefined ? {} : { appearance: value.appearance }),
    ...(Object.keys(vars).length === 0 ? {} : { vars }),
  };
}

function validateColor(value: unknown, label: string): asserts value is ColorValue {
  if (typeof value === "string") return;
  if (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 255) return;
  throw new Error(`Invalid theme color: ${label}`);
}

function resolveVariable(value: ColorValue, vars: Readonly<Record<string, ColorValue>>, visited = new Set<string>()): ColorValue {
  if (typeof value === "number" || value === "" || value.startsWith("#") || /^ok(lch|hsl)\(/i.test(value)) return value;
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
