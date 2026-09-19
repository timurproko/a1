import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OwnedSettingsManager, type OwnedUiSettingDeclaration } from "../../../src/ui/settings/index.js";
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

function session(agent: AgentSettingsPort | null): OwnedSettingsManager {
  return new OwnedSettingsManager({ configDir: root, profileId: "a1", declarations: DECLARATIONS, migrations: [], agent });
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "a1-settings-session-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("owned settings manager", () => {
  it.each(["available", "absent", "failed", "read-only"] as const)(
    "preserves suggestion opt-out and skills choice and routes Agent-group toggles to A1 with %s engine settings",
    async state => {
      const port = syntheticPort({ write: state !== "read-only", failListSettings: state === "failed" });
      const seed = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
      expect((await seed.change("a1", "promptSuggestions", false)).status).toBe("applied");
      const before = readFileSync(seed.file, "utf8");
      const target = new OwnedSettingsManager({ configDir: root, profileId: "a1", agent: state === "absent" ? null : port });
      await target.load();
      expect(readFileSync(seed.file, "utf8")).toBe(before);
      expect(target.resolution).toMatchObject({ version: 7, migrated: false, notices: [] });
      const group = target.sections().find(section => section.id === "agent");
      const entry = group?.entries.find(candidate => candidate.id === "promptSuggestions");
      expect(group).toMatchObject({ unavailableReason: null, readOnlyReason: null });
      expect(entry).toMatchObject({ backend: "a1", value: false, effectiveValue: false, editable: true, application: "live" });
      const skills = group?.entries.find(candidate => candidate.id === "skillsPresentation");
      expect(skills).toMatchObject({ backend: "a1", value: "collapse", effectiveValue: "collapse", editable: true, application: "live", choices: ["collapse", "expand"] });
      expect(group?.entries.slice(-2).map(candidate => candidate.id)).toEqual(["promptSuggestions", "skillsPresentation"]);

      const liveValues: unknown[] = [];
      const unsubscribe = target.onChange(session => liveValues.push(session.value("promptSuggestions")));
      for (const value of [true, false]) {
        expect(await target.change(entry!.backend, entry!.id, value)).toMatchObject({
          status: "applied", applied: true, pendingRestart: false, application: "live", storedValue: value, effectiveValue: value,
        });
      }
      unsubscribe();
      expect(liveValues).toEqual([true, false]);
      const skillValues: unknown[] = [];
      const unsubscribeSkills = target.onChange(session => skillValues.push(session.value("skillsPresentation")));
      expect(await target.change(skills!.backend, skills!.id, "expand")).toMatchObject({
        status: "applied", applied: true, pendingRestart: false, application: "live", storedValue: "expand", effectiveValue: "expand",
      });
      unsubscribeSkills();
      expect(skillValues).toEqual(["expand"]);
      expect(target.value("skillsPresentation")).toBe("expand");
      expect(port.writes).toEqual([]);
      expect(port.flushed()).toBe(0);
      expect(JSON.parse(readFileSync(seed.file, "utf8"))).toEqual({ version: 7, values: { promptSuggestions: false, skillsPresentation: "expand" } });
      const restarted = new OwnedSettingsManager({ configDir: root, profileId: "a1", agent: state === "absent" ? null : port });
      await restarted.load();
      expect(restarted.sections().find(section => section.id === "agent")?.entries.slice(-2)).toMatchObject([
        { id: "promptSuggestions", backend: "a1", value: false, effectiveValue: false },
        { id: "skillsPresentation", backend: "a1", value: "expand", effectiveValue: "expand" },
      ]);
      expect((await restarted.change("agent", "promptSuggestions", true)).status).toBe("failed");
      expect((await restarted.change("agent", "skillsPresentation", "collapse")).status).toBe("failed");
      expect(restarted.value("promptSuggestions")).toBe(false);
      expect(restarted.value("skillsPresentation")).toBe("expand");
      expect(port.writes).toEqual([]);
    },
  );

  it("preserves multiple pending history settings through reload and unrelated live saves", async () => {
    const session = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    await session.change("a1", "promptHistoryEnabled", false);
    await session.change("a1", "promptHistoryMaxItems", 20);
    await session.change("a1", "promptSuggestions", false);
    await session.load();
    expect(session.value("promptHistoryEnabled")).toBe(true);
    expect(session.value("promptHistoryMaxItems")).toBe(100);
    const entries = session.sections().flatMap(section => section.entries);
    expect(entries.find(entry => entry.id === "promptHistoryEnabled")).toMatchObject({ storedValue: false, effectiveValue: true, application: "next-start" });
    expect(entries.find(entry => entry.id === "promptHistoryMaxItems")).toMatchObject({ storedValue: 20, effectiveValue: 100 });
    const restarted = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    expect(restarted.value("promptHistoryEnabled")).toBe(false);
    expect(restarted.value("promptHistoryMaxItems")).toBe(20);
    expect(restarted.value("promptSuggestions")).toBe(false);
  });

  it("types each declared getter by its declaration and falls back to the declared default", async () => {
    const target = new OwnedSettingsManager({ configDir: root, profileId: "a1" });
    const speed: "normal" | "fast" | "high" = target.value("scrollbarSpeed");
    const limit: number = target.value("promptHistoryMaxItems");
    const animate: boolean = target.value("quitAnimation");
    expect([speed, limit, animate]).toEqual(["normal", 100, true]);
    await target.change("a1", "scrollbarSpeed", "fast");
    expect(target.value("scrollbarSpeed")).toBe("fast");
    // Invariant: an injected declaration set that omits a setting still answers with the table default.
    const partial = session(null);
    expect(partial.valueOf("quitEffect")).toBeNull();
    expect(partial.value("quitEffect")).toBe("fall");
  });

  it("exposes resolved A1 values and engine-backed sections after load", async () => {
    const target = session(syntheticPort());
    await target.load();
    expect(target.valueOf("density")).toBe("comfortable");
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
    const target = new OwnedSettingsManager({ configDir: root, profileId: "a1", declarations: DECLARATIONS, migrations: [], agent });
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
    expect(target.valueOf("density")).toBe("compact");
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
    expect(target.valueOf("confirmExit")).toBe(false);
    expect(target.pendingValue("confirmExit")).toBe(true);

    const next = session(syntheticPort());
    await next.load();
    expect(next.valueOf("confirmExit")).toBe(true);
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
    expect(target.valueOf("thinkingLevel")).toBeNull();
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
    expect(target.valueOf("density")).toBe("comfortable");
  });
});
