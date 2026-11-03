import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import type { AgentSettingOwner } from "../../../../src/contracts/agent-engine/index.js";
import {
  EXPOSED_SETTING_KEYS,
  PI_SETTING_EFFECTS,
  PiSettingsBridge,
  type PiSettingKey,
  type PiSettingOwnerHandlers,
} from "../../../../src/integrations/pi/engine/index.js";

const OWNERS: readonly AgentSettingOwner[] = ["agent", "shell", "terminal", "startup", "shutdown", "installation"];

function integration(settings = SettingsManager.inMemory({ compaction: { enabled: true } })): PiSettingsBridge {
  const target = new PiSettingsBridge(settings, { productMode: "comparison" });
  bindEffects(target, () => true);
  return target;
}

function bindEffects(
  target: PiSettingsBridge,
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
    expect([...descriptors.map(value => value.key)].sort()).toEqual([...EXPOSED_SETTING_KEYS, "defaultModel"].sort());
    expect(descriptors[0]?.key).toBe("autoCompact");
    expect(descriptors.at(-1)?.key).toBe("defaultModel");
    expect(descriptors.every(value => value.writable && value.available)).toBe(true);
    expect(descriptors.every(value => value.limitationReason === null)).toBe(true);
    expect(descriptors.every(value => PI_SETTING_EFFECTS[value.key as PiSettingKey].application === value.application)).toBe(true);
    expect(descriptors.every(value => value.storedValue !== undefined && value.effectiveValue !== undefined)).toBe(true);
    expect(new Set(descriptors.map(value => value.key)).size).toBe(EXPOSED_SETTING_KEYS.length + 1);
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

  it("exposes Pi 1.0's header-only quiet-startup mode", async () => {
    const settings = SettingsManager.inMemory({ quietStartup: "header" });
    const port = new PiSettingsBridge(settings, { productMode: "comparison" });
    port.bindOwner("startup", { quietStartup: { apply() {} } });

    expect((await port.listSettings()).find(value => value.key === "quietStartup")).toMatchObject({
      valueType: "enum", choices: [true, "header", false], storedValue: "header", effectiveValue: "header",
    });
    await expect(port.writeSetting("quietStartup", true)).resolves.toMatchObject({
      status: "deferred", storedValue: true, effectiveValue: "header",
    });
    expect(settings.getQuietStartup()).toBe(true);
  });

  it("applies Pi's fullscreen copy preference through the live bare shell owner", async () => {
    const settings = SettingsManager.inMemory({ fullscreenCopyOnSelect: true });
    const port = new PiSettingsBridge(settings);
    let effective = true;
    port.bindOwner("shell", { fullscreenCopyOnSelect: { apply: value => {
      if (typeof value !== "boolean") throw new TypeError("invalid copy preference");
      effective = value;
    } } });

    expect((await port.listSettings()).find(value => value.key === "fullscreenCopyOnSelect")).toMatchObject({
      label: "Fullscreen copy on select", storedValue: true, effectiveValue: true,
    });
    await expect(port.writeSetting("fullscreenCopyOnSelect", false)).resolves.toMatchObject({
      status: "applied", storedValue: false, effectiveValue: false,
    });
    expect(effective).toBe(false);
    expect(settings.getFullscreenCopyOnSelect()).toBe(false);
  });

  it("applies Pi's fullscreen wheel-scroll distance through the live shell owner", async () => {
    const settings = SettingsManager.inMemory({ fullscreenWheelScrollLines: "auto" });
    const port = new PiSettingsBridge(settings);
    let effective: number | "auto" = "auto";
    port.bindOwner("shell", { fullscreenWheelScrollLines: { apply: value => {
      if (value !== "auto" && (typeof value !== "number" || !Number.isSafeInteger(value))) {
        throw new TypeError("invalid wheel-scroll distance");
      }
      effective = value;
    } } });

    expect((await port.listSettings()).find(value => value.key === "fullscreenWheelScrollLines")).toMatchObject({
      label: "Fullscreen wheel scrolling", storedValue: "auto", effectiveValue: "auto",
    });
    await expect(port.writeSetting("fullscreenWheelScrollLines", 4)).resolves.toMatchObject({
      status: "applied", storedValue: 4, effectiveValue: 4,
    });
    expect(effective).toBe(4);
    expect(settings.getFullscreenWheelScrollLines()).toBe(4);
  });

  it("omits every unavailable bare-A1 option while retaining supported fallbacks", async () => {
    const port = new PiSettingsBridge(SettingsManager.inMemory({ compaction: { enabled: true } }));
    bindEffects(port, (key, owner) => owner !== "installation" && PI_SETTING_EFFECTS[key].hiddenInBare !== true);

    const descriptors = await port.listSettings();
    const visible = new Set(descriptors.map(value => value.key));
    for (const key of [...EXPOSED_SETTING_KEYS, "defaultModel"]) {
      const definition = PI_SETTING_EFFECTS[key as PiSettingKey];
      const expected = definition.hiddenInBare !== true && definition.owner !== "installation";
      expect(visible.has(key), `${key} has incorrect bare-A1 visibility`).toBe(expected);
    }
    expect(visible.has("showImages")).toBe(true);
    expect(visible.has("fullscreenCopyOnSelect")).toBe(true);
    expect(descriptors.find(value => value.key === "fullscreenCopyOnSelect")).toMatchObject({
      label: "Fullscreen copy on select",
      description: "Automatically copy selected text in fullscreen mode; disable to copy selections with Ctrl+X",
      owner: "shell",
      application: "live",
      valueType: "boolean",
    });
    expect(visible.has("enableInstallTelemetry")).toBe(false);
    expect(descriptors.every(value => value.writable && value.available && value.limitationReason === null)).toBe(true);
    await expect(port.writeSetting("theme", "light")).resolves.toMatchObject({ status: "unavailable" });
    expect(await port.readSetting("theme")).not.toBe("light");
  });

  it("omits unbound effects instead of returning disabled explanatory descriptors", async () => {
    const port = new PiSettingsBridge(SettingsManager.inMemory({ compaction: { enabled: true } }));
    expect(await port.listSettings()).toEqual([expect.objectContaining({ key: "defaultModel" })]);
    await expect(port.writeSetting("autoCompact", false)).resolves.toMatchObject({
      status: "unavailable", storedValue: true, effectiveValue: true,
    });
    expect(await port.readSetting("autoCompact")).toBe(true);
  });

  it("persists the default model for the next session without a live model effect", async () => {
    const settings = SettingsManager.inMemory({ defaultProvider: "openai", defaultModel: "gpt-5" });
    const port = new PiSettingsBridge(settings, {
      productMode: "comparison",
      models: () => [
        { key: "openai/gpt-5", label: "gpt-5 [openai]", name: "GPT-5", description: "global default", levels: ["off", "low", "high"] },
        { key: "anthropic/claude/sonnet", label: "claude/sonnet [anthropic]", name: "Claude Sonnet", description: "global default", levels: ["off", "high"] },
      ],
    });
    bindEffects(port, () => true);

    expect((await port.listSettings()).find(value => value.key === "defaultModel")).toMatchObject({
      label: "Default model",
      application: "next-session",
      owner: "startup",
      storedValue: "openai/gpt-5",
      effectiveValue: "openai/gpt-5",
      choices: ["openai/gpt-5", "anthropic/claude/sonnet"],
      flags: [
        { key: "openai/gpt-5", label: "gpt-5 [openai]", description: "GPT-5", fallback: false },
        { key: "anthropic/claude/sonnet", label: "claude/sonnet [anthropic]", description: "Claude Sonnet", fallback: false },
      ],
    });
    await expect(port.writeSetting("defaultModel", "anthropic/claude/sonnet")).resolves.toMatchObject({
      status: "deferred",
      application: "next-session",
      storedValue: "anthropic/claude/sonnet",
      effectiveValue: "openai/gpt-5",
    });
    expect(settings.getDefaultProvider()).toBe("anthropic");
    expect(settings.getDefaultModel()).toBe("claude/sonnet");
    await expect(port.writeSetting("defaultModel", "missing/model")).rejects.toThrow(/invalid/);
    expect(settings.getDefaultProvider()).toBe("anthropic");
    expect(settings.getDefaultModel()).toBe("claude/sonnet");
  });

  it("restores the prior default model when persistence fails", async () => {
    const settings = SettingsManager.inMemory({ defaultProvider: "openai", defaultModel: "gpt-5" });
    const port = new PiSettingsBridge(settings, {
      models: () => [{ key: "anthropic/claude/sonnet", label: "claude/sonnet [anthropic]", name: "Claude Sonnet", description: "", levels: [] }],
    });
    vi.spyOn(settings, "flush").mockRejectedValueOnce(new Error("disk full"));

    await expect(port.writeSetting("defaultModel", "anthropic/claude/sonnet")).resolves.toMatchObject({
      status: "failed", storedValue: "openai/gpt-5", effectiveValue: "openai/gpt-5", failure: "disk full",
    });
    expect(settings.getDefaultProvider()).toBe("openai");
    expect(settings.getDefaultModel()).toBe("gpt-5");
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
