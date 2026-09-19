import { describe, expect, it } from "vitest";
import type { AgentJsonValue } from "../../../../src/contracts/agent-engine/index.js";
import {
  PiSettingsCoordinator,
  settingsEffectInventoryDrift,
  type PiSettingStorageOperation,
} from "../../../../src/integrations/pi/engine/index.js";

function boolOperation(key: "autoCompact" | "collapseChangelog", initial: boolean, events: string[] = []) {
  let stored = initial;
  const operation: PiSettingStorageOperation = {
    key,
    read: () => stored,
    validate(value: AgentJsonValue) {
      if (typeof value !== "boolean") throw new TypeError("invalid boolean");
    },
    write(value: AgentJsonValue) {
      events.push(`write:${String(value)}`);
      stored = value as boolean;
    },
  };
  return { operation, read: () => stored };
}

describe("Pi settings effect registry and coordinator", () => {
  it("names added, removed, and duplicated reviewed effects", () => {
    expect(settingsEffectInventoryDrift(["autoCompact", "future"], ["autoCompact", "stale", "stale"]))
      .toEqual({ unmapped: ["future"], stale: ["stale", "stale"], duplicated: ["stale"] });
  });

  it("applies a live effect before persistence and publishes one effective value", async () => {
    const events: string[] = [];
    const backing = boolOperation("autoCompact", true, events);
    const coordinator = new PiSettingsCoordinator([backing.operation], {
      flush: async () => { events.push("flush"); },
    });
    coordinator.bindOwner("agent", {
      autoCompact: { apply(value) { events.push(`apply:${String(value)}`); } },
    });

    await expect(coordinator.apply("autoCompact", false)).resolves.toEqual({
      status: "applied", application: "live", storedValue: false, effectiveValue: false,
      failure: null, limitationReason: null,
    });
    expect(events).toEqual(["apply:false", "write:false", "flush"]);
    expect(backing.read()).toBe(false);
  });

  it("persists a deferred value without claiming it changed the running owner", async () => {
    const events: string[] = [];
    const backing = boolOperation("collapseChangelog", false, events);
    const coordinator = new PiSettingsCoordinator([backing.operation], { flush: async () => { events.push("flush"); } });
    coordinator.bindOwner("startup", { collapseChangelog: { apply() { events.push("apply"); } } });

    await expect(coordinator.apply("collapseChangelog", true)).resolves.toMatchObject({
      status: "deferred", application: "next-start", storedValue: true, effectiveValue: false,
    });
    expect(events).toEqual(["write:true", "flush"]);
  });

  it("refuses an unavailable effect without touching persistence", async () => {
    const events: string[] = [];
    const backing = boolOperation("autoCompact", true, events);
    const coordinator = new PiSettingsCoordinator([backing.operation], { flush: async () => { events.push("flush"); } });

    await expect(coordinator.apply("autoCompact", false)).resolves.toMatchObject({
      status: "unavailable", storedValue: true, effectiveValue: true,
      limitationReason: "agent effect is not bound for live application",
    });
    expect(events).toEqual([]);
  });

  it("does not persist when the live effect fails", async () => {
    const events: string[] = [];
    const backing = boolOperation("autoCompact", true, events);
    const coordinator = new PiSettingsCoordinator([backing.operation], { flush: async () => { events.push("flush"); } });
    coordinator.bindOwner("agent", { autoCompact: { apply() { throw new Error("owner failed"); } } });

    await expect(coordinator.apply("autoCompact", false)).resolves.toMatchObject({
      status: "failed", storedValue: true, effectiveValue: true, failure: "owner failed",
    });
    expect(events).toEqual([]);
  });

  it("rolls persistence and the active effect back when durability fails", async () => {
    const events: string[] = [];
    const backing = boolOperation("autoCompact", true, events);
    let flushes = 0;
    const coordinator = new PiSettingsCoordinator([backing.operation], {
      flush: async () => {
        events.push("flush");
        flushes += 1;
        if (flushes === 1) throw new Error("disk full");
      },
    });
    coordinator.bindOwner("agent", { autoCompact: { apply(value) { events.push(`apply:${String(value)}`); } } });

    await expect(coordinator.apply("autoCompact", false)).resolves.toMatchObject({
      status: "failed", storedValue: true, effectiveValue: true, failure: "disk full",
    });
    expect(events).toEqual(["apply:false", "write:false", "flush", "write:true", "flush", "apply:true"]);
  });

  it("marks the setting unavailable when effect rollback also fails", async () => {
    const backing = boolOperation("autoCompact", true);
    let flushes = 0;
    const coordinator = new PiSettingsCoordinator([backing.operation], {
      flush: async () => { flushes += 1; if (flushes === 1) throw new Error("flush failed"); },
    });
    coordinator.bindOwner("agent", {
      autoCompact: { apply(value) { if (value === true) throw new Error("rollback owner failed"); } },
    });

    const result = await coordinator.apply("autoCompact", false);
    expect(result).toMatchObject({ status: "failed", storedValue: true, effectiveValue: false });
    expect(result.failure).toMatch(/rollback failed.*rollback owner failed/);
    expect(coordinator.available("autoCompact")).toBe(false);
  });

  it("unbinds owner effects on disposal and rejects owner mismatches", () => {
    const backing = boolOperation("autoCompact", true);
    const coordinator = new PiSettingsCoordinator([backing.operation], { flush: async () => {} });
    expect(() => coordinator.bindOwner("shell", { autoCompact: { apply() {} } })).toThrow(/belongs to agent/);
    const dispose = coordinator.bindOwner("agent", { autoCompact: { apply() {} } });
    expect(coordinator.available("autoCompact")).toBe(true);
    dispose();
    expect(coordinator.available("autoCompact")).toBe(false);
  });
});
