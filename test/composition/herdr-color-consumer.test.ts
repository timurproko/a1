import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";
import { HERDR_IDENTITY_LABELS as LABELS } from "../../src/features/owned-ui/herdr-binding.js";
import { fixtureColorTargets, syncFixtureColors, type FixtureColorTerminal } from "./fixtures/herdr-color-consumer.js";

function fixture() {
  const now = 100_000;
  const terminal: FixtureColorTerminal = { address: "t5z", state: "live", app: PRODUCT_IDENTITY.commandName,
    labels: { [LABELS.session]: randomUUID(), [LABELS.runtime]: randomUUID(), [LABELS.at]: String(now), "herdr.space": "space-a", "herdr.tab": "inactive" } };
  const capture = () => fixtureColorTargets([{ machine: "remote", id: "space-a", color: "cyan", tabs: ["inactive"] }],
    [{ terminal: "t5z", tab: "inactive" }], [terminal], now);
  const get = vi.fn(async () => ({ sessionId: terminal.labels[LABELS.session]!, color: "green" }));
  const set = vi.fn(async () => ({ sessionId: terminal.labels[LABELS.session]!, color: "cyan" }));
  return { now, terminal, capture, get, set, ports: { now: () => now, terminal: async () => terminal, get, set } };
}

describe("unchanged membership and freshness contract", () => {
  it.each(["stale", "future", "partial", "foreign-runtime", "stopped", "different-app"])("refuses %s identity without another target or write", async mode => {
    const f = fixture(), captured = f.capture();
    if (mode === "stale") f.terminal.labels[LABELS.at] = String(f.now - 90_001);
    if (mode === "future") f.terminal.labels[LABELS.at] = String(f.now + 5001);
    if (mode === "partial") delete f.terminal.labels[LABELS.session];
    if (mode === "foreign-runtime") f.terminal.labels[LABELS.runtime] = randomUUID();
    if (mode === "stopped") f.terminal.state = "stopped";
    if (mode === "different-app") f.terminal.app = "not-the-product";
    expect(await syncFixtureColors(captured, f.now + 10_000, f.ports)).toEqual([]);
    expect(f.get).not.toHaveBeenCalled(); expect(f.set).not.toHaveBeenCalled();
  });

  it("does not borrow legacy identity when native identity is partial", () => {
    const f = fixture();
    for (const key of Object.values(LABELS)) f.terminal.labels[`custom.${key}`] = f.terminal.labels[key]!;
    delete f.terminal.labels[LABELS.runtime];
    expect(f.capture()).toEqual([]);
  });

  it("rejects a moved-again target after get and before set", async () => {
    const f = fixture(), captured = f.capture();
    const get = async () => {
      const current = await f.get();
      f.terminal.labels["herdr.space"] = "space-c";
      return current;
    };
    expect(await syncFixtureColors(captured, f.now + 10_000, { ...f.ports, get })).toEqual([]);
    expect(f.set).not.toHaveBeenCalled();
  });

  it.each(["expired", "wrong-get", "unavailable", "unacknowledged"])("does not acknowledge %s control", async mode => {
    const f = fixture(), captured = f.capture();
    const get = mode === "wrong-get" ? async () => ({ sessionId: randomUUID(), color: "green" })
      : mode === "unavailable" ? async () => { throw new Error("ambiguous or unavailable target"); } : f.get;
    const set = mode === "unacknowledged" ? async () => ({ sessionId: randomUUID(), color: "cyan" }) : f.set;
    expect(await syncFixtureColors(captured, f.now + (mode === "expired" ? -1 : 10_000), { ...f.ports, get, set })).toEqual([]);
    expect(f.set).not.toHaveBeenCalled();
  });
});
