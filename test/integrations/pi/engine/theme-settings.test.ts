import { describe, expect, it } from "vitest";
import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { AUTOMATIC_THEME, PiSettingsIntegration, parseAutomaticTheme } from "../../../../src/integrations/pi/engine/index.js";

const THEMES = ["dark", "light", "ocean"] as const;

function integration(theme: string): PiSettingsIntegration {
  return new PiSettingsIntegration(SettingsManager.inMemory({ theme }), {
    themes: () => THEMES,
    thinkingLevels: () => ["low", "high"],
  });
}

async function keys(target: PiSettingsIntegration): Promise<readonly string[]> {
  return (await target.listSettings()).map(descriptor => descriptor.key);
}

describe("the theme at the engine boundary", () => {
  it("reads a stored pair as one theme per terminal appearance", () => {
    expect(parseAutomaticTheme("light/dark")).toEqual({ light: "light", dark: "dark" });
    expect(parseAutomaticTheme("dark")).toBeNull();
    expect(parseAutomaticTheme("a/b/c")).toBeNull();
    expect(parseAutomaticTheme("/dark")).toBeNull();
  });

  it("offers following the terminal ahead of the installed themes", async () => {
    const descriptors = await integration("dark").listSettings();
    const theme = descriptors.find(descriptor => descriptor.key === "theme");
    expect(theme?.choices).toEqual([AUTOMATIC_THEME, ...THEMES]);
    expect(theme?.resolvedWhenRead).toBe(true);
  });

  it("resolves the thinking levels the session reports", async () => {
    const descriptors = await integration("dark").listSettings();
    const thinking = descriptors.find(descriptor => descriptor.key === "thinkingLevel");
    expect(thinking?.choices).toEqual(["low", "high"]);
    expect(thinking?.resolvedWhenRead).toBe(true);
  });

  // Following the terminal is one choice on the theme, not two further settings
  // a reader has to keep in step: the pair is the engine's grammar for it.
  it("never turns the appearances into settings of their own", async () => {
    expect(await keys(integration("dark"))).not.toContain("themeLight");
    const automatic = await keys(integration("light/dark"));
    expect(automatic).not.toContain("themeLight");
    expect(automatic).not.toContain("themeDark");
  });

  it("reads a stored pair as following the terminal", async () => {
    expect(await integration("light/dark").readSetting("theme")).toBe(AUTOMATIC_THEME);
  });

  it("stores following the terminal as the theme named for each appearance", async () => {
    const settings = SettingsManager.inMemory({ theme: "ocean" });
    const target = new PiSettingsIntegration(settings, { themes: () => THEMES, thinkingLevels: () => ["low"] });

    await target.writeSetting("theme", AUTOMATIC_THEME);

    expect(settings.getThemeSetting()).toBe("light/dark");
    expect(await target.readSetting("theme")).toBe(AUTOMATIC_THEME);
  });

  it("keeps the theme in use for both appearances when neither is installed", async () => {
    const settings = SettingsManager.inMemory({ theme: "ocean" });
    const target = new PiSettingsIntegration(settings, { themes: () => ["ocean"], thinkingLevels: () => ["low"] });

    await target.writeSetting("theme", AUTOMATIC_THEME);

    expect(settings.getThemeSetting()).toBe("ocean/ocean");
  });

  it("leaves an automatic theme alone when it is chosen again", async () => {
    const target = integration("light/ocean");
    await target.writeSetting("theme", AUTOMATIC_THEME);
    expect(await target.readSetting("theme")).toBe(AUTOMATIC_THEME);
  });

  it("returns to a single theme", async () => {
    const target = integration("light/dark");
    await target.writeSetting("theme", "ocean");
    expect(await target.readSetting("theme")).toBe("ocean");
  });

  it("offers no automatic option when nothing lists the themes", async () => {
    const bare = new PiSettingsIntegration(SettingsManager.inMemory({ theme: "dark" }));
    const theme = (await bare.listSettings()).find(descriptor => descriptor.key === "theme");
    expect(theme?.choices).toBeUndefined();
  });
});
