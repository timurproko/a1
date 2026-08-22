import { describe, expect, it } from "vitest";
import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { AUTOMATIC_THEME, PiSettingsIntegration, parseAutomaticTheme } from "../../../src/foundation/pi-engine-adapter/index.js";

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

  it("keeps the appearances out of the way until the theme follows the terminal", async () => {
    expect(await keys(integration("dark"))).not.toContain("themeLight");
    const automatic = await keys(integration("light/dark"));
    expect(automatic).toContain("themeLight");
    expect(automatic).toContain("themeDark");
  });

  it("reads an automatic theme as its parts", async () => {
    const target = integration("light/dark");
    expect(await target.readSetting("theme")).toBe(AUTOMATIC_THEME);
    expect(await target.readSetting("themeLight")).toBe("light");
    expect(await target.readSetting("themeDark")).toBe("dark");
  });

  it("starts automatic from the theme already in use", async () => {
    const target = integration("light");
    await target.writeSetting("theme", AUTOMATIC_THEME);
    expect(await target.readSetting("themeLight")).toBe("light");
    expect(await target.readSetting("themeDark")).toBe("light");
  });

  it("writes a part back as the pair it belongs to", async () => {
    const target = integration("light/dark");
    await target.writeSetting("themeDark", "ocean");
    expect(await target.readSetting("themeDark")).toBe("ocean");
    expect(await target.readSetting("themeLight")).toBe("light");
  });

  it("returns to a single theme", async () => {
    const target = integration("light/dark");
    await target.writeSetting("theme", "ocean");
    expect(await target.readSetting("theme")).toBe("ocean");
    expect(await keys(target)).not.toContain("themeLight");
  });

  it("offers no automatic option when nothing lists the themes", async () => {
    const bare = new PiSettingsIntegration(SettingsManager.inMemory({ theme: "dark" }));
    const theme = (await bare.listSettings()).find(descriptor => descriptor.key === "theme");
    expect(theme?.choices).toBeUndefined();
  });
});
