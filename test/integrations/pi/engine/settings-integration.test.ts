import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import type { AgentSettingOwner } from "../../../../src/contracts/agent-engine/index.js";
import {
  EXPOSED_SETTING_KEYS,
  PI_SETTING_EFFECTS,
  PiSettingsIntegration,
  type PiSettingKey,
  type PiSettingOwnerHandlers,
} from "../../../../src/integrations/pi/engine/index.js";

const OWNERS: readonly AgentSettingOwner[] = ["agent", "shell", "terminal", "startup", "shutdown", "installation"];

function integration(settings = SettingsManager.inMemory({ compaction: { enabled: true } })): PiSettingsIntegration {
  const target = new PiSettingsIntegration(settings, { productMode: "comparison" });
  for (const owner of OWNERS) {
    const handlers = Object.fromEntries(
      Object.entries(PI_SETTING_EFFECTS)
        .filter(([, definition]) => definition.owner === owner)
        .map(([key]) => [key, { apply() {} }]),
    ) as PiSettingOwnerHandlers;
    target.bindOwner(owner, handlers);
  }
  return target;
}

describe("Pi settings integration", () => {
  it("covers every A1-exposed setting with a complete application descriptor", async () => {
    const descriptors = await integration().listSettings();
    expect([...descriptors.map(value => value.key)].sort()).toEqual([...EXPOSED_SETTING_KEYS].sort());
    expect(descriptors[0]?.key).toBe("autoCompact");
    expect(descriptors.at(-1)?.key).toBe("theme");
    expect(descriptors.every(value => value.writable && value.available)).toBe(true);
    expect(descriptors.every(value => value.limitationReason === null)).toBe(true);
    expect(descriptors.every(value => PI_SETTING_EFFECTS[value.key as PiSettingKey].application === value.application)).toBe(true);
    expect(descriptors.every(value => value.storedValue !== undefined && value.effectiveValue !== undefined)).toBe(true);
    expect(new Set(descriptors.map(value => value.key)).size).toBe(EXPOSED_SETTING_KEYS.length);
  });

  it("applies, persists, and flushes through the coordinator", async () => {
    const port = integration();
    expect(await port.readSetting("autoCompact")).toBe(true);
    expect(await port.writeSetting("autoCompact", false)).toMatchObject({ status: "applied", storedValue: false, effectiveValue: false });
    expect(await port.writeSetting("theme", "light")).toMatchObject({ status: "applied", storedValue: "light", effectiveValue: "light" });
    expect(await port.writeSetting("outputPad", 1)).toMatchObject({ status: "applied", storedValue: 1, effectiveValue: 1 });
    expect(await port.readSetting("autoCompact")).toBe(false);
    expect(await port.readSetting("theme")).toBe("light");
    expect(await port.readSetting("outputPad")).toBe(1);
  });

  it("keeps an unbound effect read-only and reports its exact limitation", async () => {
    const port = new PiSettingsIntegration(SettingsManager.inMemory({ compaction: { enabled: true } }));
    const autoCompact = (await port.listSettings()).find(value => value.key === "autoCompact");
    expect(autoCompact).toMatchObject({ writable: false, available: false, application: "live", owner: "agent" });
    expect(autoCompact?.limitationReason).toMatch(/agent effect is not bound/);
    const productFixed = (await port.listSettings()).filter(value => ["theme", "quietStartup", "tuiMode", "fullscreenScrollbar"].includes(value.key));
    expect(productFixed.map(value => value.key)).toEqual(["quietStartup", "tuiMode", "fullscreenScrollbar", "theme"]);
    expect(productFixed.every(value => !value.writable && !value.available && value.limitationReason !== null)).toBe(true);
    expect(productFixed.find(value => value.key === "theme")?.limitationReason).toMatch(/product-fixed dark owned theme/);
    await expect(port.writeSetting("autoCompact", false)).resolves.toMatchObject({ status: "unavailable", storedValue: true, effectiveValue: true });
    expect(await port.readSetting("autoCompact")).toBe(true);
  });

  it("rejects invalid values without mutation and reports unknown settings", async () => {
    const port = integration();
    const originalOutputPad = await port.readSetting("outputPad");
    await expect(port.writeSetting("outputPad", 4)).rejects.toThrow(/invalid/);
    await expect(port.writeSetting("showImages", "yes")).rejects.toThrow(/invalid/);
    await expect(port.writeSetting("future-setting", true)).rejects.toThrow(/unavailable/);
    expect(await port.readSetting("outputPad")).toBe(originalOutputPad);
    expect(await port.readSetting("future-setting")).toBeUndefined();
  });
});
