import { describe, expect, it } from "vitest";
import { NativeRegressionTrace } from "../../support/native-regression-trace.js";

describe("bounded native fixture diagnostics", () => {
  it("preserves synchronous return and original thrown error identities", () => {
    let clock = 0;
    const trace = new NativeRegressionTrace("release-command", () => clock);
    const value = { unchanged: true }, error = new Error("PRIVATE_ERROR_PAYLOAD");
    expect(trace.measure("workflow-status", () => { clock = 4; return value; })).toBe(value);
    expect(() => trace.measure("workflow-fetch", () => { clock = 9; throw error; })).toThrow(error);
    expect(trace.snapshot().totals).toEqual({
      "workflow-status": { count: 1, durationMs: 4, failures: 0 },
      "workflow-fetch": { count: 1, durationMs: 5, failures: 1 },
    });
    expect(JSON.stringify(trace.snapshot())).not.toContain("PRIVATE_ERROR_PAYLOAD");
  });

  it("preserves the original promise and exposes unfinished work without a new timer", async () => {
    let clock = 0;
    const trace = new NativeRegressionTrace("shell-paste", () => clock);
    const gate = Promise.withResolvers<object>();
    const result = trace.measureAsync("preparing", () => gate.promise);
    expect(result).toBe(gate.promise);
    expect(trace.snapshot().active).toHaveLength(1);
    const value = {}; clock = 12; gate.resolve(value);
    expect(await result).toBe(value);
    expect(trace.snapshot().active).toEqual([]);
    expect(trace.snapshot().totals.preparing).toEqual({ count: 1, durationMs: 12, failures: 0 });
  });

  it("preserves asynchronous rejection and synchronous setup failure", async () => {
    const trace = new NativeRegressionTrace("release-command");
    const error = new Error("PRIVATE_SETUP");
    const original = Promise.reject(error);
    expect(trace.measureAsync("setup", () => original)).toBe(original);
    await expect(original).rejects.toBe(error);
    await expect(trace.measureAsync("cleanup", () => { throw error; })).rejects.toBe(error);
    expect(trace.snapshot().active).toEqual([]);
    expect(trace.snapshot().totals.setup!.failures).toBe(1);
    expect(trace.snapshot().totals.cleanup!.failures).toBe(1);
  });

  it("bounds records and categories while conserving operation counts", () => {
    const trace = new NativeRegressionTrace("release-command", () => 0);
    for (let i = 0; i < 1000; i++) trace.event(`operation-${i}`);
    const snapshot = trace.snapshot();
    expect(snapshot.entries).toHaveLength(64);
    expect(Object.keys(snapshot.totals).length).toBeLessThanOrEqual(32);
    expect(Object.values(snapshot.totals).reduce((sum, item) => sum + item.count, 0)).toBe(1000);
    expect(snapshot.dropped).toBe(936);
    expect(JSON.stringify(snapshot).length).toBeLessThan(16_384);
  });

  it("copies only allowed numeric fields and never retains caller payloads", () => {
    const trace = new NativeRegressionTrace("shell-paste", () => 0);
    const event = { request: 1, pending: 2, clipboard: "PRIVATE_CLIPBOARD", image: "PRIVATE_IMAGE" };
    trace.event("acquired-image", event);
    trace.event("PRIVATE invalid label", { request: Number.NaN, pending: Infinity });
    const snapshot = trace.snapshot(); event.pending = 9;
    expect(snapshot.entries[0]).toMatchObject({ request: 1, pending: 2 });
    expect(snapshot.entries[1]!.operation).toBe("other");
    expect(JSON.stringify(snapshot)).not.toContain("PRIVATE");
    snapshot.entries[0]!.pending = 99;
    expect(trace.snapshot().entries[0]!.pending).toBe(2);
  });

  it("does not change the order or outcomes of observed operations", async () => {
    async function exercise(observed: boolean) {
      const trace = new NativeRegressionTrace("release-command");
      const events: string[] = [];
      const sync = () => { events.push("git"); return "same-tree"; };
      const asyncOperation = async () => { events.push("start"); await Promise.resolve(); events.push("finish"); return "same-head"; };
      const tree = observed ? trace.measure("git", sync) : sync();
      const head = await (observed ? trace.measureAsync("prepare", asyncOperation) : asyncOperation());
      events.push("assert");
      return { tree, head, events };
    }
    expect(await exercise(true)).toEqual(await exercise(false));
  });
});
