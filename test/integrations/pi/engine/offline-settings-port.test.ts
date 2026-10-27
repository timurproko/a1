import { describe, expect, it } from "vitest";
import { SettingsManager } from "@earendil-works/pi-coding-agent";
import {
  createOfflinePiSettingsPort,
  offlinePiSettingKeys,
} from "../../../../src/integrations/pi/engine/offline-settings-port.js";

const trust = async () => ({ trusted: false, source: "default" as const, diagnostic: null });

describe("offline Pi settings port", () => {
  it("lists every persist-only bare setting and persists writes without a live engine", async () => {
    const manager = SettingsManager.inMemory({ compaction: { enabled: true } });
    const offline = await createOfflinePiSettingsPort({
      cwd: process.cwd(),
      agentDir: process.cwd(),
      resolveTrust: trust,
      createSettingsManager: () => manager,
      createModelRuntime: async () => ({ getAvailableSnapshot: () => [] }) as never,
    });
    const listed = await offline.port.listSettings();
    expect(listed.map(setting => setting.key)).toEqual(expect.arrayContaining([...offlinePiSettingKeys()]));
    expect(listed).toHaveLength(offlinePiSettingKeys().length);

    await expect(offline.port.writeSetting("autoCompact", false)).resolves.toMatchObject({
      status: "applied",
      storedValue: false,
      effectiveValue: false,
    });
    expect(manager.getCompactionEnabled()).toBe(false);
  });

  it("adds offline model choices after the local catalog resolves", async () => {
    let resolveCatalog!: (runtime: { getAvailableSnapshot(): readonly unknown[] }) => void;
    const catalog = new Promise<{ getAvailableSnapshot(): readonly unknown[] }>(resolvePromise => { resolveCatalog = resolvePromise; });
    const manager = SettingsManager.inMemory({});
    const offline = await createOfflinePiSettingsPort({
      cwd: process.cwd(),
      agentDir: process.cwd(),
      resolveTrust: trust,
      createSettingsManager: () => manager,
      createModelRuntime: () => catalog as never,
    });
    const before = (await offline.port.listSettings()).find(setting => setting.key === "modelThinkingLevels");
    expect(before?.flags?.some(flag => flag.key === "openai/gpt-test")).not.toBe(true);

    resolveCatalog({
      getAvailableSnapshot: () => [{
        provider: "openai",
        id: "gpt-test",
        reasoning: true,
        thinkingLevelMap: { xhigh: "xhigh", max: null },
      }],
    });
    await offline.modelsReady;
    const after = (await offline.port.listSettings()).find(setting => setting.key === "modelThinkingLevels");
    expect(after?.flags).toEqual([expect.objectContaining({
      key: "openai/gpt-test",
      label: "gpt-test [openai]",
      choices: ["default", "off", "minimal", "low", "medium", "high", "xhigh"],
    })]);
  });
});
