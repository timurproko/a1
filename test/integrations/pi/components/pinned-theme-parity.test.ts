import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { colorToOkhsl, okhslColor } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import {
  PINNED_PI_LAYOUT,
  OwnedPiThemeController,
  adaptPiAssistantMessage,
  adaptPiUserMessage,
  applyPiTheme,
  applyPiThemeInstance,
  createPiShellSelector,
  currentPiAccentColor,
  derivePiAccentProjection,
  derivePiCanvasBackground,
  detectPiTerminalBackgroundFromEnv,
  getAvailablePiThemes,
  getPiSelectListTheme,
  loadPiTheme,
  onPiThemeChange,
  piCanvasBackgroundAnsi,
  piTheme,
  setPiAccentColor,
  setPiPackageBorderProjectionEnabled,
  stopPiThemeWatcher,
  type PiTerminalTheme,
} from "../../../../src/integrations/pi/components/index.js";
import { renderPiAccentPreview } from "../../../../src/integrations/pi/components/upstream/theme/theme.js";
import { DynamicBorder } from "../../../../src/integrations/pi/startup-public.js";
import { capturePinnedTheme } from "./pinned-theme-upstream-fixture.js";
import {
  PI_PARITY_COLOR_MODES,
  withPiParityColorMode,
} from "../../../support/pi-terminal-capabilities.js";

const FOREGROUNDS = [
  "accent", "border", "borderAccent", "borderMuted", "success", "error", "warning", "muted", "dim", "text", "scrollbarTrack", "scrollbarThumb",
  "thinkingText", "userMessageText", "customMessageText", "customMessageLabel", "toolTitle", "toolOutput",
  "mdHeading", "mdLink", "mdLinkUrl", "mdCode", "mdCodeBlock", "mdCodeBlockBorder", "mdQuote", "mdQuoteBorder",
  "mdHr", "mdListBullet", "toolDiffAdded", "toolDiffRemoved", "toolDiffContext", "syntaxComment", "syntaxKeyword",
  "syntaxFunction", "syntaxVariable", "syntaxString", "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation",
  "thinkingOff", "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh", "thinkingXhigh", "thinkingMax", "bashMode",
] as const;
const BACKGROUNDS = ["selectedBg", "userMessageBg", "customMessageBg", "toolPendingBg", "toolSuccessBg", "toolErrorBg"] as const;

function block(kind: "user" | "assistant", text: string): OwnedUiTranscriptBlock {
  return { id: `${kind}-theme`, kind, status: "finalized", revision: 1, title: null, text, payload: {} };
}

class ThemeRuntime {
  readonly invalidate = vi.fn();
  readonly requestRender = vi.fn();
  readonly setTerminalColorSchemeNotifications = vi.fn();
  listener: ((theme: PiTerminalTheme) => void) | undefined;
  background: { r: number; g: number; b: number } | undefined;
  scheme: PiTerminalTheme | undefined;
  async queryTerminalBackgroundColor() { return this.background; }
  async queryTerminalColorScheme() { return this.scheme; }
  onTerminalColorSchemeChange(listener: (theme: PiTerminalTheme) => void) {
    this.listener = listener;
    return () => { if (this.listener === listener) this.listener = undefined; };
  }
}

class ThemeSettings {
  setting: string | undefined;
  readonly setTheme = vi.fn((theme: string) => { this.setting = theme; });
  readonly flush = vi.fn(async () => {});
  getThemeSetting() { return this.setting; }
}

afterEach(() => {
  setPiPackageBorderProjectionEnabled(true);
  setPiAccentColor("purple");
  stopPiThemeWatcher();
});

describe("pinned Pi theme and layout parity", () => {
  it.each(PI_PARITY_COLOR_MODES.flatMap(mode => (["dark", "light"] as const).map(theme => [mode, theme] as const)))(
    "matches every non-accent pinned %s %s ANSI token and assistant row",
    async (mode, themeName) => await withPiParityColorMode(mode, async () => {
      for (const width of [24, 40, 80]) {
        const upstream = await capturePinnedTheme(themeName, width);
        expect(applyPiTheme(themeName, false, mode)).toMatchObject({ success: true, name: themeName });
        const theme = piTheme();
        const actual = {
          foregrounds: Object.fromEntries(FOREGROUNDS.map(color => [color, theme.fg(color, "probe")])),
          backgrounds: Object.fromEntries(BACKGROUNDS.map(color => [color, theme.bg(color, "probe")])),
          styles: { bold: theme.bold("probe"), italic: theme.italic("probe"), colorMode: theme.getColorMode() },
          rows: {
            user: adaptPiUserMessage(block("user", "User theme probe"), width),
            assistant: adaptPiAssistantMessage(block("assistant", "Assistant **theme** probe"), width),
            selector: createPiShellSelector({
              options: [
                { id: "one", label: "One", description: "First option" },
                { id: "two", label: "Two", description: "Second option" },
              ],
              maxVisible: 2,
            }).render(width),
          },
        };
        expect(theme.getColorMode()).toBe(mode);
        for (const color of FOREGROUNDS) {
          if (["accent", "border", "mdHeading", "mdListBullet"].includes(color)) continue;
          expect(actual.foregrounds[color], color).toBe(upstream.foregrounds[color]);
        }
        for (const color of BACKGROUNDS) {
          if (["selectedBg", "userMessageBg"].includes(color)) continue;
          expect(actual.backgrounds[color], color).toBe(upstream.backgrounds[color]);
        }
        expect(actual.styles).toEqual(upstream.styles);
        expect(actual.rows.assistant).toEqual(upstream.rows.assistant);
      }
    }),
  );

  it("pins spacing defaults to independently recorded upstream source", async () => {
    const [interactiveMap, settingsMap] = await Promise.all([
      readFile("node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/interactive-mode.js.map", "utf8"),
      readFile("node_modules/@earendil-works/pi-coding-agent/dist/core/settings-manager.js.map", "utf8"),
    ]);
    const interactive = JSON.parse(interactiveMap).sourcesContent[0] as string;
    const settings = JSON.parse(settingsMap).sourcesContent[0] as string;
    expect(interactive).toContain("private outputPad = 1;");
    expect(interactive).toContain("this.headerContainer.addChild(new Spacer(1))");
    expect(settings).toContain("return this.settings.editorPaddingX ?? 0;");
    expect(settings).toContain("return this.settings.outputPad === 0 ? 0 : 1;");
    expect(settings).toContain("return this.settings.autocompleteMaxVisible ?? 5;");
    expect(PINNED_PI_LAYOUT).toMatchObject({
      editorPaddingX: 0,
      outputPad: 1,
      autocompleteMaxVisible: 5,
      contentPaddingX: 1,
      messagePaddingY: 1,
      sectionSpacing: 1,
    });
  });

  it.each(PI_PARITY_COLOR_MODES)("projects the named accent family in %s without changing another role", mode => {
    const base = loadPiTheme("dark", mode);
    applyPiTheme("dark", false, mode);
    const baseAccent = base.fg("accent", "probe");
    const baseBorder = base.fg("border", "probe");
    const baseHeading = base.fg("mdHeading", "probe");
    const baseSelection = base.bg("selectedBg", "probe");
    const baseMuted = base.fg("muted", "probe");
    const baseMessageBackground = base.bg("userMessageBg", "probe");
    const baseCustomBackground = base.bg("customMessageBg", "probe");

    const projectedAccents = new Set<string>();
    for (const color of ["purple", "blue", "cyan", "green", "orange", "pink"] as const) {
      setPiAccentColor(color);
      const rendered = piTheme().fg("accent", "probe");
      if (color === "purple") expect(rendered).toBe(baseAccent);
      else expect(rendered).not.toBe(baseAccent);
      expect(piTheme().fg("border", "probe")).not.toBe(baseBorder);
      expect(piTheme().fg("mdHeading", "probe")).not.toBe(baseHeading);
      expect(piTheme().fg("mdHeading", "probe")).not.toBe(rendered);
      expect(piTheme().fg("mdListBullet", "probe")).toBe(piTheme().fg("mdHeading", "probe"));
      expect(piTheme().colors.selectedBg).not.toEqual(base.colors.selectedBg);
      expect(piTheme().colors.userMessageBg).not.toEqual(base.colors.userMessageBg);
      if (mode === "truecolor") {
        expect(piTheme().bg("selectedBg", "probe")).not.toBe(baseSelection);
        expect(piTheme().bg("userMessageBg", "probe")).not.toBe(baseMessageBackground);
      }
      projectedAccents.add(rendered);
    }
    expect(projectedAccents.size).toBe(6);
    setPiAccentColor("cyan");

    expect(currentPiAccentColor()).toBe("cyan");
    expect(piTheme().fg("accent", "probe")).not.toBe(baseAccent);
    expect(piTheme().fg("border", "probe")).not.toBe(baseBorder);
    expect(piTheme().fg("border", "probe")).not.toBe(piTheme().fg("accent", "probe"));
    expect(piTheme().fg("mdHeading", "probe")).not.toBe(baseHeading);
    expect(piTheme().fg("mdHeading", "probe")).not.toBe(piTheme().fg("accent", "probe"));
    expect(piTheme().colors.selectedBg).not.toEqual(base.colors.selectedBg);
    if (mode === "truecolor") expect(piTheme().bg("selectedBg", "probe")).not.toBe(baseSelection);
    expect(piTheme().fg("muted", "probe")).toBe(baseMuted);
    expect(piTheme().fg("mdListBullet", "probe")).toBe(piTheme().fg("mdHeading", "probe"));
    expect(piTheme().colors.mdListBullet).toEqual(piTheme().colors.mdHeading);
    expect(adaptPiAssistantMessage(block("assistant", "# Secondary"), 40).join("\n"))
      .toContain(piTheme().fg("mdHeading", "Secondary"));
    expect(adaptPiAssistantMessage(block("assistant", "1. one\n2. two"), 40).join("\n"))
      .toContain(piTheme().fg("mdListBullet", "1. "));
    expect(piTheme().colors.userMessageBg).not.toEqual(base.colors.userMessageBg);
    expect(piTheme().bg("customMessageBg", "probe")).toBe(baseCustomBackground);
    expect(piTheme().colors.accent).not.toEqual(base.colors.accent);
    expect(piTheme().colors.border).not.toEqual(base.colors.border);
    expect(piTheme().colors.selectedBg).not.toEqual(base.colors.selectedBg);
    expect(piTheme().colors.userMessageBg).not.toEqual(base.colors.userMessageBg);
    expect(piTheme().style("probe", { fg: "accent", bold: true })).toContain(piTheme().getFgAnsi("accent"));
    expect(piTheme().style("probe", { fg: "border" })).toContain(piTheme().getFgAnsi("border"));
    expect(piTheme().style("probe", { bg: "selectedBg" })).toContain(piTheme().getBgAnsi("selectedBg"));
    expect(piTheme().style("probe", { bg: "userMessageBg" })).toContain(piTheme().getBgAnsi("userMessageBg"));
    expect(renderPiAccentPreview("purple", "■")).toBe(base.fg("accent", "■"));
    expect(renderPiAccentPreview("cyan", "■")).toBe(piTheme().fg("accent", "■"));
    expect(renderPiAccentPreview("unknown", "■")).toBeNull();
    expect(getPiSelectListTheme().selectedText("probe")).toBe(piTheme().fg("accent", "probe"));

    setPiAccentColor("purple");
    expect(piTheme().fg("accent", "probe")).toBe(baseAccent);
    expect(piTheme().fg("border", "probe")).not.toBe(baseBorder);
    expect(piTheme().fg("mdHeading", "probe")).not.toBe(baseHeading);
    expect(piTheme().fg("mdListBullet", "probe")).toBe(piTheme().fg("mdHeading", "probe"));
    expect(piTheme().bg("selectedBg", "probe")).not.toBe(baseSelection);
    expect(piTheme().bg("userMessageBg", "probe")).not.toBe(baseMessageBackground);
    expect(piTheme().colors.accent).toEqual(base.colors.accent);
  });

  it.each(["dark", "light"] as const)("derives the full %s semantic family from an arbitrary custom accent", appearance => {
    const accent = okhslColor(123, 0.64, appearance === "dark" ? 0.67 : 0.47);
    const projection = derivePiAccentProjection(accent, appearance);
    const border = colorToOkhsl(projection.border);
    const heading = colorToOkhsl(projection.secondaryHeading);
    const selection = colorToOkhsl(projection.selectedBg);
    const message = colorToOkhsl(projection.userMessageBg);
    expect(projection.accent).toBe(accent);
    expect(Math.abs(border.h - 143)).toBeLessThan(2);
    expect(Math.abs(heading.h - 88)).toBeLessThan(2);
    expect(Math.abs(selection.h - 123)).toBeLessThan(20);
    expect(selection.s).toBeLessThan(0.18);
    expect(message.s).toBeLessThan(selection.s);
    expect(appearance === "dark" ? message.l < selection.l : message.l > selection.l).toBe(true);
  });

  it("derives transparent, accent-grey, and fixed-dark canvas colors", () => {
    const custom = okhslColor(123, 0.64, 0.67);
    expect(derivePiCanvasBackground("transparent", custom)).toBeNull();
    const accent = colorToOkhsl(derivePiCanvasBackground("accent", custom)!);
    const dark = colorToOkhsl(derivePiCanvasBackground("dark", custom)!);
    expect(Math.abs(accent.h - 123)).toBeLessThan(20);
    expect(accent.s).toBeCloseTo(0.12, 1);
    expect(accent.l).toBeCloseTo(0.12, 1);
    expect(dark.s).toBeLessThan(0.05);
    expect(dark.l).toBeCloseTo(0.12, 1);

    applyPiTheme("dark", false, "truecolor");
    expect(piCanvasBackgroundAnsi("transparent")).toBeNull();
    const fixed = new Set<string>();
    const tinted = new Set<string>();
    for (const color of ["purple", "blue", "cyan", "green", "orange", "pink"] as const) {
      setPiAccentColor(color);
      fixed.add(piCanvasBackgroundAnsi("dark")!);
      tinted.add(piCanvasBackgroundAnsi("accent")!);
    }
    expect(fixed.size).toBe(1);
    expect(tinted.size).toBe(6);
  });

  it.each(PI_PARITY_COLOR_MODES)("emits every palette canvas through the supported %s boundary", mode => {
    applyPiTheme("dark", false, mode);
    const expected = mode === "truecolor" ? /^\u001b\[48;2;/u : /^\u001b\[48;5;/u;
    for (const color of ["purple", "blue", "cyan", "green", "orange", "pink"] as const) {
      setPiAccentColor(color);
      expect(piCanvasBackgroundAnsi("dark")).toMatch(expected);
      expect(piCanvasBackgroundAnsi("accent")).toMatch(expected);
    }
  });

  it.each(["dark", "light"] as const)("keeps %s hierarchy distinct with half-strength selected rows", appearance => {
    applyPiTheme(appearance, false, "truecolor");
    for (const color of ["purple", "blue", "cyan", "green", "orange", "pink"] as const) {
      setPiAccentColor(color);
      const accent = colorToOkhsl(piTheme().colors.accent);
      const border = colorToOkhsl(piTheme().colors.border);
      const heading = colorToOkhsl(piTheme().colors.mdHeading);
      const selection = colorToOkhsl(piTheme().colors.selectedBg);
      const message = colorToOkhsl(piTheme().colors.userMessageBg);
      const borderHueDistance = Math.min(Math.abs(accent.h - border.h), 360 - Math.abs(accent.h - border.h));
      const headingHueDistance = Math.min(Math.abs(accent.h - heading.h), 360 - Math.abs(accent.h - heading.h));
      expect(borderHueDistance).toBeGreaterThan(15);
      expect(borderHueDistance).toBeLessThan(25);
      expect(headingHueDistance).toBeGreaterThan(color === "purple" || color === "blue" ? 45 : 20);
      expect(headingHueDistance).toBeLessThan(60);
      expect(Math.min(Math.abs(accent.h - selection.h), 360 - Math.abs(accent.h - selection.h))).toBeLessThan(20);
      expect(border.s).toBeLessThan(accent.s);
      expect(border.l).toBeLessThan(accent.l);
      expect(accent.l - border.l).toBeGreaterThan(appearance === "dark" ? 0.14 : 0.08);
      expect(appearance === "dark" ? heading.l : 1 - heading.l).toBeGreaterThan(appearance === "dark" ? accent.l : 1 - accent.l);
      expect(selection.s).toBeLessThan(accent.s);
      expect(selection.s).toBeLessThan(0.18);
      expect(message.s).toBeLessThan(selection.s);
      expect(selection.l).toBeGreaterThan(appearance === "dark" ? 0.23 : 0.95);
      expect(appearance === "dark" ? selection.l : 1 - selection.l).toBeLessThan(appearance === "dark" ? 0.27 : 0.06);
      expect(appearance === "dark" ? message.l : 1 - message.l).toBeLessThan(0.3);
    }
  });

  it("removes the complete A1 projection for comparison mode", () => {
    const base = loadPiTheme("dark", "truecolor");
    applyPiTheme("dark", false, "truecolor");
    setPiAccentColor("green");
    expect(new DynamicBorder().render(8)[0]).toBe(piTheme().fg("border", "─".repeat(8)));

    setPiPackageBorderProjectionEnabled(false);
    for (const token of ["accent", "border", "mdHeading", "mdListBullet"] as const) {
      expect(piTheme().fg(token, "probe"), token).toBe(base.fg(token, "probe"));
    }
    for (const token of ["selectedBg", "userMessageBg"] as const) {
      expect(piTheme().bg(token, "probe"), token).toBe(base.bg(token, "probe"));
    }
    expect(new DynamicBorder().render(8)[0]).toBe(base.fg("border", "─".repeat(8)));
    const markdown = adaptPiAssistantMessage(block("assistant", "# Heading\n\n- item"), 40).join("\n");
    expect(markdown).toContain(base.fg("mdHeading", "Heading"));
    expect(markdown).toContain(base.fg("mdListBullet", "- "));
  });

  it("restores exact projected identity when a scoped in-memory theme is reverted", () => {
    applyPiTheme("dark", false, "truecolor");
    setPiAccentColor("cyan");
    const original = piTheme();
    try {
      applyPiThemeInstance(loadPiTheme("light", "truecolor"));
      expect(piTheme()).not.toBe(original);
      applyPiThemeInstance(original);
      expect(piTheme()).toBe(original);
    } finally {
      applyPiThemeInstance(original);
    }
  });

  it("reapplies the selected accent when an in-memory base theme is replaced", () => {
    const replacement = loadPiTheme("light", "truecolor");
    const baseAccent = replacement.fg("accent", "probe");
    const baseBorder = replacement.fg("border", "probe");
    const baseSelection = replacement.bg("selectedBg", "probe");
    const baseMessageBackground = replacement.bg("userMessageBg", "probe");
    setPiAccentColor("orange");

    expect(applyPiThemeInstance(replacement)).toEqual({ success: true, name: "light" });
    expect(piTheme().fg("accent", "probe")).not.toBe(baseAccent);
    expect(piTheme().fg("border", "probe")).not.toBe(baseBorder);
    expect(piTheme().bg("selectedBg", "probe")).not.toBe(baseSelection);
    expect(piTheme().bg("userMessageBg", "probe")).not.toBe(baseMessageBackground);
    setPiAccentColor("purple");
    expect(piTheme()).not.toBe(replacement);
    expect(piTheme().fg("accent", "probe")).toBe(baseAccent);
    expect(piTheme().fg("border", "probe")).not.toBe(baseBorder);
    expect(piTheme().bg("selectedBg", "probe")).not.toBe(baseSelection);
    expect(piTheme().bg("userMessageBg", "probe")).not.toBe(baseMessageBackground);
  });

  it("loads built-in themes from owned attributed resources", () => {
    const themes = getAvailablePiThemes();
    expect(themes.find(theme => theme.name === "dark")?.path).toBe("owned:builtin-theme/dark");
    expect(themes.find(theme => theme.name === "light")?.path).toBe("owned:builtin-theme/light");
  });

  it("loads and validates pinned custom theme variables and fallbacks", async () => {
    const directory = await mkdtemp(join(tmpdir(), "a1-pi-theme-"));
    const original = process.env.PI_CODING_AGENT_DIR;
    process.env.PI_CODING_AGENT_DIR = directory;
    try {
      const themes = join(directory, "themes");
      await mkdir(themes);
      const source = JSON.parse(await readFile(
        "node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/dark.json",
        "utf8",
      ));
      source.name = "ocean";
      source.vars = { ...source.vars, brand: "#010203" };
      source.colors.accent = "brand";
      delete source.colors.thinkingMax;
      delete source.colors.scrollbarThumb;
      await writeFile(join(themes, "ocean.json"), JSON.stringify(source));
      const loaded = loadPiTheme("ocean", "truecolor");
      expect(loaded.fg("accent", "x")).toBe("\u001b[38;2;1;2;3mx\u001b[39m");
      expect(loaded.getThinkingBorderColor("max")("x")).toBe(loaded.getThinkingBorderColor("xhigh")("x"));
      expect(getAvailablePiThemes().map(theme => theme.name)).toContain("ocean");

      let notifications = 0;
      let resolveReload!: () => void;
      const reloaded = new Promise<void>(resolve => { resolveReload = resolve; });
      const unsubscribe = onPiThemeChange(() => {
        notifications += 1;
        if (notifications === 3) resolveReload();
      });
      expect(applyPiTheme("ocean", true, "truecolor").success).toBe(true);
      setPiAccentColor("pink");
      const projected = piTheme().fg("accent", "x");
      expect(projected).not.toBe("\u001b[38;2;1;2;3mx\u001b[39m");
      source.vars.brand = "#040506";
      await writeFile(join(themes, "ocean.json"), JSON.stringify(source));
      await reloaded;
      expect(piTheme().fg("accent", "x")).toBe(projected);
      setPiAccentColor("purple");
      expect(piTheme().fg("accent", "x")).not.toBe("\u001b[38;2;4;5;6mx\u001b[39m");
      unsubscribe();
      stopPiThemeWatcher();

      delete source.colors.accent;
      await writeFile(join(themes, "ocean.json"), JSON.stringify(source));
      expect(() => loadPiTheme("ocean")).toThrow("missing required color accent");
      source.colors.accent = "first";
      source.vars = { ...source.vars, first: "second", second: "first" };
      await writeFile(join(themes, "ocean.json"), JSON.stringify(source));
      expect(() => loadPiTheme("ocean")).toThrow("Circular variable reference");
    } finally {
      stopPiThemeWatcher();
      if (original === undefined) delete process.env.PI_CODING_AGENT_DIR;
      else process.env.PI_CODING_AGENT_DIR = original;
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("matches pinned environment and terminal background theme detection", async () => {
    expect(detectPiTerminalBackgroundFromEnv({ COLORFGBG: "15;0" }).theme).toBe("dark");
    expect(detectPiTerminalBackgroundFromEnv({ COLORFGBG: "0;15" }).theme).toBe("light");
    expect(detectPiTerminalBackgroundFromEnv({}).confidence).toBe("low");

    const runtime = new ThemeRuntime();
    runtime.background = { r: 250, g: 250, b: 250 };
    const settings = new ThemeSettings();
    const changed = vi.fn();
    const controller = new OwnedPiThemeController(runtime, settings, vi.fn(), changed);
    await controller.applyFromSettings();
    expect(controller.getTerminalTheme()).toBe("light");
    expect(settings.setTheme).toHaveBeenCalledWith("light");
    expect(settings.flush).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenCalled();
    controller.dispose();
    expect(runtime.listener).toBeUndefined();
  });

  it("tracks automatic terminal scheme changes and reports invalid themes with dark fallback", async () => {
    const runtime = new ThemeRuntime();
    runtime.scheme = "light";
    const settings = new ThemeSettings();
    settings.setting = "light/dark";
    const showError = vi.fn();
    const controller = new OwnedPiThemeController(runtime, settings, showError, vi.fn());
    await controller.applyFromSettings();
    expect(controller.getTerminalTheme()).toBe("light");
    expect(runtime.setTerminalColorSchemeNotifications).toHaveBeenCalledWith(true);
    runtime.listener?.("dark");
    expect(controller.getTerminalTheme()).toBe("dark");

    expect(controller.setThemeName("missing-theme", true)).toMatchObject({ success: false, name: "dark" });
    expect(showError).toHaveBeenCalledWith(expect.stringContaining("Fell back to dark theme"));
    controller.dispose();
  });
});
