import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import {
  PINNED_PI_LAYOUT,
  OwnedPiThemeController,
  adaptPiAssistantMessage,
  adaptPiUserMessage,
  applyPiTheme,
  createPiShellSelector,
  detectPiTerminalBackgroundFromEnv,
  getAvailablePiThemes,
  loadPiTheme,
  onPiThemeChange,
  piTheme,
  stopPiThemeWatcher,
  type PiTerminalTheme,
} from "../../../../src/integrations/pi/components/index.js";
import { capturePinnedTheme } from "./pinned-theme-upstream-fixture.js";

const FOREGROUNDS = [
  "accent", "border", "borderAccent", "borderMuted", "success", "error", "warning", "muted", "dim", "text",
  "thinkingText", "userMessageText", "customMessageText", "customMessageLabel", "toolTitle", "toolOutput",
  "mdHeading", "mdLink", "mdLinkUrl", "mdCode", "mdCodeBlock", "mdCodeBlockBorder", "mdQuote", "mdQuoteBorder",
  "mdHr", "mdListBullet", "toolDiffAdded", "toolDiffRemoved", "toolDiffContext", "syntaxComment", "syntaxKeyword",
  "syntaxFunction", "syntaxVariable", "syntaxString", "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation",
  "thinkingOff", "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh", "thinkingXhigh", "thinkingMax", "bashMode",
] as const;
const BACKGROUNDS = ["selectedBg", "scrollbarThumb", "userMessageBg", "customMessageBg", "toolPendingBg", "toolSuccessBg", "toolErrorBg"] as const;

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

describe("pinned Pi theme and layout parity", () => {
  it.each(["dark", "light"] as const)("matches every pinned %s ANSI token and fixed-width component row", async themeName => {
    for (const width of [24, 40, 80]) {
      const upstream = await capturePinnedTheme(themeName, width);
      expect(applyPiTheme(themeName)).toMatchObject({ success: true, name: themeName });
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
      expect(actual).toEqual(upstream);
    }
  });

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
        if (notifications === 2) resolveReload();
      });
      expect(applyPiTheme("ocean", true, "truecolor").success).toBe(true);
      source.vars.brand = "#040506";
      await writeFile(join(themes, "ocean.json"), JSON.stringify(source));
      await reloaded;
      expect(piTheme().fg("accent", "x")).toBe("\u001b[38;2;4;5;6mx\u001b[39m");
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
