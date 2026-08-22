import { describe, expect, it } from "vitest";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingsPort } from "../../src/foundation/agent-engine-contracts/index.js";
import { withInstalledThemes } from "../../src/composition/theme-settings.js";

function port(theme: string): { port: AgentSettingsPort; written: string[] } {
  const values: Record<string, AgentJsonValue> = { theme, autoCompact: true };
  const written: string[] = [];
  const descriptors: AgentSettingDescriptor[] = [
    { key: "theme", valueType: "string", writable: true },
    { key: "autoCompact", valueType: "boolean", writable: true },
  ];
  return {
    written,
    port: {
      capabilities: { write: true, flush: false },
      listSettings: async () => descriptors,
      readSetting: async key => values[key],
      writeSetting: async (key, value) => {
        written.push(`${key}=${String(value)}`);
        values[key] = value;
      },
    },
  };
}

describe("withInstalledThemes", () => {
  it("offers the installed themes and automatic as the theme's choices", async () => {
    const decorated = withInstalledThemes(port("dark").port);
    const theme = (await decorated!.listSettings()).find(descriptor => descriptor.key === "theme");
    expect(theme?.choices).toContain("dark");
    expect(theme?.choices).toContain("light");
    expect(theme?.choices?.at(-1)).toBe("automatic");
  });

  it("keeps the pair out of the way until the theme is automatic", async () => {
    const single = withInstalledThemes(port("dark").port);
    expect((await single!.listSettings()).map(descriptor => descriptor.key)).not.toContain("themeLight");

    const automatic = withInstalledThemes(port("light/dark").port);
    const keys = (await automatic!.listSettings()).map(descriptor => descriptor.key);
    expect(keys).toContain("themeLight");
    expect(keys).toContain("themeDark");
  });

  it("reads an automatic theme as its parts", async () => {
    const decorated = withInstalledThemes(port("light/dark").port)!;
    expect(await decorated.readSetting("theme")).toBe("automatic");
    expect(await decorated.readSetting("themeLight")).toBe("light");
    expect(await decorated.readSetting("themeDark")).toBe("dark");
  });

  it("starts automatic from the theme already in use", async () => {
    const backing = port("light");
    await withInstalledThemes(backing.port)!.writeSetting!("theme", "automatic");
    expect(backing.written).toEqual(["theme=light/light"]);
  });

  it("writes a part back as the pair it belongs to", async () => {
    const backing = port("light/dark");
    const decorated = withInstalledThemes(backing.port)!;
    await decorated.writeSetting!("themeDark", "ocean");
    expect(backing.written).toEqual(["theme=light/ocean"]);
  });

  it("leaves a plain theme and every other setting alone", async () => {
    const backing = port("light/dark");
    const decorated = withInstalledThemes(backing.port)!;
    await decorated.writeSetting!("theme", "dark");
    await decorated.writeSetting!("autoCompact", false);
    expect(backing.written).toEqual(["theme=dark", "autoCompact=false"]);
    expect(await decorated.readSetting("autoCompact")).toBe(false);
  });
});
