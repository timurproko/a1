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
  bindEffects(target, () => true);
  return target;
}

function bindEffects(
  target: PiSettingsIntegration,
  include: (key: PiSettingKey, owner: AgentSettingOwner) => boolean,
): void {
  for (const owner of OWNERS) {
    const handlers = Object.fromEntries(
      Object.entries(PI_SETTING_EFFECTS)
        .filter(([key, definition]) => definition.owner === owner && include(key as PiSettingKey, owner))
        .map(([key]) => [key, { apply() {} }]),
    ) as PiSettingOwnerHandlers;
    target.bindOwner(owner, handlers);
  }
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

  it("omits every unavailable bare-A1 option while retaining supported fallbacks", async () => {
    const port = new PiSettingsIntegration(SettingsManager.inMemory({ compaction: { enabled: true } }));
    bindEffects(port, (key, owner) => owner !== "installation" && PI_SETTING_EFFECTS[key].hiddenInBare !== true);

    const descriptors = await port.listSettings();
    const visible = new Set(descriptors.map(value => value.key));
    for (const key of EXPOSED_SETTING_KEYS) {
      const definition = PI_SETTING_EFFECTS[key as PiSettingKey];
      const expected = definition.hiddenInBare !== true && definition.owner !== "installation";
      expect(visible.has(key), `${key} has incorrect bare-A1 visibility`).toBe(expected);
    }
    expect(visible.has("showImages")).toBe(true);
    expect(visible.has("enableInstallTelemetry")).toBe(false);
    expect(descriptors.every(value => value.writable && value.available && value.limitationReason === null)).toBe(true);
    await expect(port.writeSetting("theme", "light")).resolves.toMatchObject({ status: "unavailable" });
    expect(await port.readSetting("theme")).not.toBe("light");
  });

  it("omits unbound effects instead of returning disabled explanatory descriptors", async () => {
    const port = new PiSettingsIntegration(SettingsManager.inMemory({ compaction: { enabled: true } }));
    expect(await port.listSettings()).toEqual([]);
    await expect(port.writeSetting("autoCompact", false)).resolves.toMatchObject({
      status: "unavailable", storedValue: true, effectiveValue: true,
    });
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
