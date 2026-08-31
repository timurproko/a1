import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OwnedUiSettingsSession } from "../../../src/ui/settings/index.js";
import {
  OwnedUiSettingsStore,
  type OwnedUiSettingDeclaration,
} from "../../../src/ui/settings/index.js";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingsPort } from "../../../src/contracts/agent-engine/index.js";

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

interface SyntheticAgentOptions {
  readonly write?: boolean;
  readonly flush?: boolean;
  readonly failListSettings?: boolean;
  readonly failWrite?: boolean;
}

interface SyntheticPort extends AgentSettingsPort {
  readonly writes: { key: string; value: AgentJsonValue }[];
  readonly flushed: () => number;
}

function syntheticPort(options: SyntheticAgentOptions = {}): SyntheticPort {
  const write = options.write ?? true;
  const flush = options.flush ?? true;
  const values: Record<string, AgentJsonValue> = { autoCompact: true, thinkingLevel: "low" };
  const writes: { key: string; value: AgentJsonValue }[] = [];
  let flushes = 0;

  return {
    capabilities: { write, flush },
    writes,
    flushed: () => flushes,
    async listSettings(): Promise<readonly AgentSettingDescriptor[]> {
      if (options.failListSettings) throw new Error("engine unreachable");
      return [
        settingDescriptor("autoCompact", "boolean", values.autoCompact ?? null),
        { ...settingDescriptor("thinkingLevel", "enum", values.thinkingLevel ?? null), choices: ["off", "low", "high"] },
      ];
    },
    async readSetting(key: string): Promise<AgentJsonValue | undefined> {
      return values[key];
    },
    ...(write
      ? {
        async writeSetting(key: string, value: AgentJsonValue) {
          if (options.failWrite) throw new Error("engine rejected the write");
          writes.push({ key, value });
          values[key] = value;
          if (flush) flushes += 1;
          return { status: "applied" as const, application: "live" as const, storedValue: value, effectiveValue: value, failure: null, limitationReason: null };
        },
      }
      : {}),
    ...(flush ? { async flush(): Promise<void> { flushes += 1; } } : {}),
  };
}

function settingDescriptor(key: string, valueType: AgentSettingDescriptor["valueType"], value: AgentJsonValue): AgentSettingDescriptor {
  return { key, valueType, writable: true, application: "live", owner: "agent", available: true, limitationReason: null, storedValue: value, effectiveValue: value };
}

let root: string;

function session(agent: AgentSettingsPort | null): OwnedUiSettingsSession {
  const store = new OwnedUiSettingsStore({ configDir: root, profileId: "a1", declarations: DECLARATIONS, migrations: [] });
  return new OwnedUiSettingsSession({ store, agent });
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "a1-settings-session-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("owned UI settings session", () => {
  it("exposes resolved A1 values and engine-backed sections after load", async () => {
    const target = session(syntheticPort());
    await target.load();
    expect(target.value("density")).toBe("comfortable");
    const sections = target.sections();
    expect(sections.map(section => section.id)).toEqual(["a1", "agent"]);
    expect(sections[1]?.entries.map(entry => entry.id)).toEqual(["autoCompact", "thinkingLevel"]);
  });

  it("omits unavailable agent controls without exposing their reason copy", async () => {
    const base = syntheticPort();
    const unavailable = { writable: false, available: false, limitationReason: "fixture reason must stay hidden" } as const;
    const agent: AgentSettingsPort = {
      ...base,
      async listSettings(): Promise<readonly AgentSettingDescriptor[]> {
        return [
          ...await base.listSettings(),
          { ...settingDescriptor("tuiMode", "enum", "regular"), ...unavailable, choices: ["regular", "fullscreen"] },
          { ...settingDescriptor("theme", "enum", "dark"), ...unavailable, choices: ["dark", "light", "automatic"] },
          { ...settingDescriptor("fullscreenScrollbar", "enum", "auto"), ...unavailable, choices: ["auto", "always", "hidden"] },
          { ...settingDescriptor("quietStartup", "boolean", false), ...unavailable },
        ];
      },
    };
    const store = new OwnedUiSettingsStore({ configDir: root, profileId: "a1", declarations: DECLARATIONS, migrations: [] });
    const target = new OwnedUiSettingsSession({ store, agent });
    await target.load();

    const entries = target.sections().flatMap(section => section.entries);
    expect(entries.some(entry => entry.id === "tuiMode")).toBe(false);
    expect(entries.some(entry => entry.id === "theme")).toBe(false);
    expect(entries.some(entry => entry.id === "fullscreenScrollbar")).toBe(false);
    expect(entries.some(entry => entry.id === "quietStartup")).toBe(false);
    expect((await target.change("agent", "tuiMode", "regular")).failure).toMatch(/unknown agent setting/);
    expect((await target.change("agent", "theme", "light")).failure).toMatch(/unknown agent setting/);
    expect((await target.change("agent", "fullscreenScrollbar", "always")).failure).toMatch(/unknown agent setting/);
    expect((await target.change("agent", "quietStartup", true)).failure).toMatch(/unknown agent setting/);
  });

  it("writes a live A1 setting to the document, applies it, and notifies", async () => {
    const port: SyntheticPort = syntheticPort();
    const target = session(port);
    await target.load();
    let notified = 0;
    target.onChange(() => { notified += 1; });

    expect(await target.change("a1", "density", "compact")).toEqual({
      status: "applied", applied: true, pendingRestart: false, application: "live",
      storedValue: "compact", effectiveValue: "compact", limitationReason: null, failure: null,
    });
    expect(target.value("density")).toBe("compact");
    expect(notified).toBe(1);
    expect(port.writes).toHaveLength(0);
    expect(port.flushed()).toBe(0);
  });

  it("stores a restart-required setting without applying it to the running session", async () => {
    const target = session(syntheticPort());
    await target.load();

    expect(await target.change("a1", "confirmExit", true)).toEqual({
      status: "deferred", applied: false, pendingRestart: true, application: "next-start",
      storedValue: true, effectiveValue: false, limitationReason: null, failure: null,
    });
    expect(target.value("confirmExit")).toBe(false);
    expect(target.pendingValue("confirmExit")).toBe(true);

    const next = session(syntheticPort());
    await next.load();
    expect(next.value("confirmExit")).toBe(true);
  });

  it("routes an agent change through the port and never into the A1 document", async () => {
    const port: SyntheticPort = syntheticPort();
    const target = session(port);
    await target.load();

    expect(await target.change("agent", "thinkingLevel", "high")).toEqual({
      status: "applied", applied: true, pendingRestart: false, application: "live",
      storedValue: "high", effectiveValue: "high", limitationReason: null, failure: null,
    });
    expect(port.writes).toEqual([{ key: "thinkingLevel", value: "high" }]);
    expect(port.flushed()).toBe(1);
    expect(target.resolution.preserved).toEqual({});
    expect(target.value("thinkingLevel")).toBeNull();
  });

  it("does not flush when the engine does not advertise flush", async () => {
    const port: SyntheticPort = syntheticPort({ flush: false });
    const target = session(port);
    await target.load();
    expect((await target.change("agent", "autoCompact", false)).applied).toBe(true);
    expect(port.writes).toHaveLength(1);
    expect(port.flushed()).toBe(0);
  });

  it("omits agent options and refuses a hidden route when write is not advertised", async () => {
    const target = session(syntheticPort({ write: false }));
    await target.load();
    expect(target.sections()[1]?.entries).toEqual([]);
    expect(target.sections()[1]?.readOnlyReason).toBeNull();
    const outcome = await target.change("agent", "autoCompact", false);
    expect(outcome.applied).toBe(false);
    expect(outcome.failure).toMatch(/unknown agent setting/);
  });

  it("reports a failed engine write rather than claiming it was saved", async () => {
    const target = session(syntheticPort({ failWrite: true }));
    await target.load();
    const outcome = await target.change("agent", "autoCompact", false);
    expect(outcome).toEqual({
      status: "failed", applied: false, pendingRestart: false, application: null,
      storedValue: null, effectiveValue: null, limitationReason: null,
      failure: "autoCompact could not be written to the agent engine: engine rejected the write",
    });
  });

  it("rejects incomplete or contradictory engine descriptors instead of promoting them", async () => {
    const base = syntheticPort();
    const malformed: AgentSettingsPort = {
      ...base,
      async listSettings() {
        return [{ key: "storageOnly", valueType: "boolean", writable: true } as never];
      },
    };
    const target = session(malformed);
    await target.load();
    expect(target.sections()[1]?.unavailableReason).toMatch(/descriptor is invalid/);
    expect(target.sections()[1]?.entries).toEqual([]);
  });

  it("keeps A1 settings usable when the engine cannot report its settings", async () => {
    const target = session(syntheticPort({ failListSettings: true }));
    await target.load();
    const [owned, agent] = target.sections();
    expect(owned?.entries).toHaveLength(2);
    expect(agent?.unavailableReason).toMatch(/engine unreachable/);
    expect((await target.change("a1", "density", "compact")).applied).toBe(true);
  });

  it("reports an unavailable Agent section when no engine is attached", async () => {
    const target = session(null);
    await target.load();
    expect(target.sections()[1]?.unavailableReason).toMatch(/no agent engine is attached/);
    expect((await target.change("agent", "autoCompact", false)).failure).toMatch(/unknown agent setting/);
  });

  it("rejects an unknown setting and a disallowed value", async () => {
    const target = session(syntheticPort());
    await target.load();
    expect((await target.change("a1", "absentSetting", "x")).failure).toMatch(/unknown a1 setting/);
    expect((await target.change("a1", "density", "enormous")).failure).toMatch(/is not allowed for density/);
    expect(target.value("density")).toBe("comfortable");
  });
});
