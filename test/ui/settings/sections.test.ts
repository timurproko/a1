import { describe, expect, it } from "vitest";
import type { AgentJsonValue, AgentSettingDescriptor } from "../../../src/contracts/agent-engine/index.js";
import {
  buildOwnedUiSettingsSections,
  findOwnedUiSettingsEntry,
  resolveOwnedUiSettings,
  type AgentSettingsSnapshot,
  type OwnedUiSettingDeclaration,
} from "../../../src/ui/settings/index.js";

const DECLARATIONS: readonly OwnedUiSettingDeclaration[] = [
  {
    id: "density",
    description: "Vertical density.",
    application: "live",
    defaultValue: "comfortable",
    allowedValues: ["comfortable", "compact"],
  },
  {
    id: "confirmExit",
    description: "Ask before exiting.",
    application: "restart",
    defaultValue: false,
    allowedValues: [true, false],
  },
];

function resolution(values: Record<string, unknown> = {}) {
  return resolveOwnedUiSettings({
    declarations: DECLARATIONS,
    migrations: [],
    document: { version: 1, values },
    currentVersion: 1,
  });
}

function descriptor(
  key: string,
  valueType: AgentSettingDescriptor["valueType"],
  storedValue: AgentJsonValue,
  options: Partial<AgentSettingDescriptor> = {},
): AgentSettingDescriptor {
  return {
    key,
    valueType,
    writable: true,
    application: "live",
    owner: "agent",
    available: true,
    limitationReason: null,
    storedValue,
    effectiveValue: storedValue,
    ...options,
  };
}

const AGENT: AgentSettingsSnapshot = {
  descriptors: [
    descriptor("autoCompact", "boolean", true),
    descriptor("thinkingLevel", "enum", "low", { choices: ["off", "low", "high"] }),
    descriptor("providerProfile", "json", { nested: 1 }),
    descriptor("installId", "string", "abc", { writable: false }),
  ],
  writeAdvertised: true,
  failure: null,
};

describe("owned UI settings sections", () => {
  it("puts declared A1 settings in the A1 section with their origin", () => {
    const [owned] = buildOwnedUiSettingsSections({ resolution: resolution({ density: "compact" }), agent: AGENT });
    expect(owned?.id).toBe("a1");
    expect(owned?.entries.map(entry => [entry.id, entry.origin, entry.application]))
      .toEqual([["density", "stored", "live"], ["confirmExit", "default", "next-start"]]);
    expect(owned?.entries.every(entry => entry.backend === "a1" && entry.editable)).toBe(true);
  });

  it("builds the Agent section from engine descriptors", () => {
    const sections = buildOwnedUiSettingsSections({ resolution: resolution(), agent: AGENT });
    const agent = sections.find(section => section.id === "agent");
    expect(agent?.title).toBe("Agent");
    expect(agent?.unavailableReason).toBeNull();
    expect(agent?.readOnlyReason).toBeNull();
    expect(agent?.entries.map(entry => entry.id))
      .toEqual(["autoCompact", "thinkingLevel", "providerProfile", "installId"]);
    expect(findOwnedUiSettingsEntry(sections, "thinkingLevel", "agent")?.choices).toEqual(["off", "low", "high"]);
    expect(findOwnedUiSettingsEntry(sections, "autoCompact", "agent")?.value).toBe(true);
  });

  it("preserves stored, effective, deferred, and unavailable engine state", () => {
    const sections = buildOwnedUiSettingsSections({
      resolution: resolution(),
      agent: {
        descriptors: [
          descriptor("collapseChangelog", "boolean", true, { application: "next-start", owner: "startup", effectiveValue: false }),
          descriptor("fullscreenExitOutput", "enum", "resume-hint", { application: "current-exit", owner: "shutdown", effectiveValue: "transcript", choices: ["transcript", "resume-hint"] }),
          descriptor("theme", "string", "dark", { writable: false, available: false, limitationReason: "Bare A1 uses its product-fixed theme", owner: "shell" }),
        ],
        writeAdvertised: true,
        failure: null,
      },
    });
    expect(findOwnedUiSettingsEntry(sections, "collapseChangelog", "agent")).toMatchObject({
      storedValue: true, effectiveValue: false, application: "next-start", editable: true,
    });
    expect(findOwnedUiSettingsEntry(sections, "fullscreenExitOutput", "agent")).toMatchObject({
      storedValue: "resume-hint", effectiveValue: "transcript", application: "current-exit", editable: true,
    });
    expect(findOwnedUiSettingsEntry(sections, "theme", "agent")).toMatchObject({
      editable: false, available: false, limitationReason: "Bare A1 uses its product-fixed theme",
    });
  });

  it("marks a structured setting editable through its own surface", () => {
    const sections = buildOwnedUiSettingsSections({ resolution: resolution(), agent: AGENT });
    // A structured value is edited through its own surface rather than a value
    // menu, so it stays reachable instead of being reported as fixed.
    expect(findOwnedUiSettingsEntry(sections, "providerProfile", "agent")?.editable).toBe(true);
    expect(findOwnedUiSettingsEntry(sections, "providerProfile", "agent")?.structured).toBe(true);
    expect(findOwnedUiSettingsEntry(sections, "autoCompact", "agent")?.structured).toBe(false);
    expect(findOwnedUiSettingsEntry(sections, "installId", "agent")?.editable).toBe(false);
    expect(findOwnedUiSettingsEntry(sections, "autoCompact", "agent")?.editable).toBe(true);
  });

  it("renders the Agent section read-only with a reason when write is not advertised", () => {
    const sections = buildOwnedUiSettingsSections({
      resolution: resolution(),
      agent: { ...AGENT, writeAdvertised: false },
    });
    const agent = sections.find(section => section.id === "agent");
    expect(agent?.readOnlyReason).toMatch(/does not support changing settings/);
    expect(agent?.entries.every(entry => !entry.editable)).toBe(true);
    expect(agent?.entries).toHaveLength(4);
  });

  it("reports an unavailable Agent section while keeping the A1 section usable", () => {
    for (const agent of [
      null,
      { ...AGENT, failure: "engine unreachable" },
      { ...AGENT, descriptors: [] },
    ]) {
      const sections = buildOwnedUiSettingsSections({ resolution: resolution(), agent });
      const [owned, agentSection] = sections;
      expect(owned?.entries).toHaveLength(2);
      expect(agentSection?.unavailableReason).not.toBeNull();
      expect(agentSection?.entries).toHaveLength(0);
    }
  });

  it("reports a read-only reason when the engine advertises write but nothing is writable", () => {
    const sections = buildOwnedUiSettingsSections({
      resolution: resolution(),
      agent: {
        ...AGENT,
        descriptors: [descriptor("installId", "string", "abc", { writable: false })],
      },
    });
    expect(sections.find(section => section.id === "agent")?.readOnlyReason)
      .toMatch(/no writable settings/);
  });

  it("does not expose an unknown key as an entry and finds nothing for a wrong backend", () => {
    const sections = buildOwnedUiSettingsSections({
      resolution: resolution({ futureSetting: "kept" }),
      agent: AGENT,
    });
    expect(findOwnedUiSettingsEntry(sections, "futureSetting", "a1")).toBeNull();
    expect(findOwnedUiSettingsEntry(sections, "density", "agent")).toBeNull();
    expect(findOwnedUiSettingsEntry(sections, "autoCompact", "a1")).toBeNull();
  });
});
