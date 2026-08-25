import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import {
  EXPOSED_SETTING_KEYS,
  PiSettingsIntegration,
} from "../../../src/integrations/pi/engine/index.js";

function integration(): PiSettingsIntegration {
  return new PiSettingsIntegration(SettingsManager.inMemory({
    compaction: { enabled: true },
  }));
}

describe("Pi settings integration", () => {
  it("covers every A1-exposed setting with an explicit descriptor", async () => {
    const port = integration();
    const descriptors = await port.listSettings();
    // Presented in the engine order, so the set is what is compared here.
    expect([...descriptors.map(value => value.key)].sort()).toEqual([...EXPOSED_SETTING_KEYS].sort());
    expect(descriptors[0]?.key).toBe("autoCompact");
    expect(descriptors.at(-1)?.key).toBe("theme");
    expect(descriptors.every(value => value.writable)).toBe(true);
    expect(new Set(descriptors.map(value => value.key)).size).toBe(EXPOSED_SETTING_KEYS.length);
  });

  it("reads, writes, and flushes through the documented settings manager", async () => {
    const port = integration();
    expect(await port.readSetting("autoCompact")).toBe(true);
    await port.writeSetting("autoCompact", false);
    await port.writeSetting("theme", "light");
    await port.writeSetting("outputPad", 1);
    await port.flush();
    expect(await port.readSetting("autoCompact")).toBe(false);
    expect(await port.readSetting("theme")).toBe("light");
    expect(await port.readSetting("outputPad")).toBe(1);
  });

  it("rejects invalid values without mutation and reports unavailable capabilities", async () => {
    const port = integration();
    const originalOutputPad = await port.readSetting("outputPad");
    await expect(port.writeSetting("outputPad", 4)).rejects.toThrow(/invalid/);
    await expect(port.writeSetting("showImages", "yes")).rejects.toThrow(/invalid/);
    await expect(port.writeSetting("future-setting", true)).rejects.toThrow(/unavailable/);
    expect(await port.readSetting("outputPad")).toBe(originalOutputPad);
    expect(await port.readSetting("future-setting")).toBeUndefined();
  });
});
