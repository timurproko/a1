import { describe, expect, it } from "vitest";
import { SettingsManager } from "@earendil-works/pi-coding-agent";
import type { AgentSettingOwner } from "../../src/contracts/agent-engine/index.js";
import {
  EXPOSED_SETTING_KEYS,
  PI_SETTING_EFFECTS,
  PiSettingsIntegration,
  settingsEffectInventoryDrift,
  settingsInventoryDrift,
  type PiSettingOwnerHandlers,
} from "../../src/integrations/pi/engine/index.js";
import piSettingsMetadata from "../../src/integrations/pi/engine/pi-settings-metadata.json" with { type: "json" };

/**
 * The engine's own inventory of what it presents, against the settings A1 maps to
 * its API. A setting the engine adds, removes, or renames has to arrive here as a
 * named failure rather than as a row that quietly stops appearing.
 */
async function mappedKeys(): Promise<readonly string[]> {
  const integration = new PiSettingsIntegration(SettingsManager.inMemory({}), { productMode: "comparison" });
  const owners: readonly AgentSettingOwner[] = ["agent", "shell", "terminal", "startup", "shutdown", "installation"];
  for (const owner of owners) {
    integration.bindOwner(owner, Object.fromEntries(
      Object.entries(PI_SETTING_EFFECTS)
        .filter(([, definition]) => definition.owner === owner)
        .map(([key]) => [key, { apply() {} }]),
    ) as PiSettingOwnerHandlers);
  }
  return (await integration.listSettings()).map(descriptor => descriptor.key);
}

describe("Pi settings inventory governance", () => {
  it("has drifted from neither direction", async () => {
    const drift = settingsInventoryDrift(piSettingsMetadata.presented, await mappedKeys());
    expect(drift.unmapped, `Pi presents settings A1 does not map: ${drift.unmapped.join(", ")}`).toEqual([]);
    expect(drift.stale, `A1 maps settings Pi no longer presents: ${drift.stale.join(", ")}`).toEqual([]);
  });

  it("names a setting the engine has added", () => {
    const drift = settingsInventoryDrift(["autoCompact", "somethingNew"], ["autoCompact"]);
    expect(drift.unmapped).toEqual(["somethingNew"]);
    expect(drift.stale).toEqual([]);
  });

  it("names a setting the engine has dropped or renamed", () => {
    const drift = settingsInventoryDrift(["autoCompact"], ["autoCompact", "oldName"]);
    expect(drift.stale).toEqual(["oldName"]);
    expect(drift.unmapped).toEqual([]);
  });

  it("takes the exposed inventory from the engine rather than a list beside it", () => {
    expect(EXPOSED_SETTING_KEYS).toEqual(piSettingsMetadata.presented);
  });

  it("requires one reviewed effect entry for every generated key", () => {
    expect(settingsEffectInventoryDrift(piSettingsMetadata.presented, Object.keys(PI_SETTING_EFFECTS)))
      .toEqual({ unmapped: [], stale: [], duplicated: [] });
  });

  it("offers what the engine offers, in the engine's order", async () => {
    const integration = new PiSettingsIntegration(SettingsManager.inMemory({}), { productMode: "comparison" });
    const owners: readonly AgentSettingOwner[] = ["agent", "shell", "terminal", "startup", "shutdown", "installation"];
    for (const owner of owners) {
      integration.bindOwner(owner, Object.fromEntries(
        Object.entries(PI_SETTING_EFFECTS)
          .filter(([, definition]) => definition.owner === owner)
          .map(([key]) => [key, { apply() {} }]),
      ) as PiSettingOwnerHandlers);
    }
    const descriptors = await integration.listSettings();
    for (const [key, entry] of Object.entries(piSettingsMetadata.settings)) {
      const values = (entry as { values?: readonly string[] }).values;
      const descriptor = descriptors.find(candidate => candidate.key === key);
      if (values === undefined || descriptor === undefined || descriptor.valueType !== "enum") continue;
      // A boolean is offered as true/false by the engine but is a boolean here,
      // and a number the engine accepts by range keeps the range rather than the
      // few values its own menu offers as shortcuts.
      if (values.every(value => value === "true" || value === "false")) continue;
      if (values.every(value => /^\d+$/.test(value))) continue;
      expect(descriptor.choices, `${key} offers something other than what Pi offers`).toEqual(values);
    }
  });
});
