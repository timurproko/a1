import { appendFile, mkdir } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
import { residentProgressObserver } from "../../../src/foundation/resident-tabs/progress-observation.js";
import { validateProgressObservations } from "../../../scripts/development/resident-progress-observations.mjs";

vi.mock("node:fs/promises", async importOriginal => ({
  ...await importOriginal<typeof import("node:fs/promises")>(),
  appendFile: vi.fn(async () => {}),
  mkdir: vi.fn(async () => undefined),
}));

function observer() {
  return residentProgressObserver({
    [PRODUCT_IDENTITY.environment.residentProgressObservationDir]: "/fixture/progress",
    [PRODUCT_IDENTITY.environment.residentProgressRunId]: "writer-test",
    [PRODUCT_IDENTITY.environment.residentProgressTabId]: "tab-1",
    [PRODUCT_IDENTITY.environment.residentProgressTabIncarnation]: "1",
  })!;
}

function records() {
  return vi.mocked(appendFile).mock.calls.flatMap(call => String(call[1]).trim().split("\n").map(line => JSON.parse(line)));
}

describe("payload-free child progress writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["setImmediate"] });
  });
  afterEach(() => vi.useRealTimers());

  it("batches one input turn, creates its directory once, and preserves every record in order", async () => {
    const sink = observer();
    for (let index = 0; index < 50; index++) sink.childRenderWrite(index, 1, "ordinary");
    expect(appendFile).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(mkdir).toHaveBeenCalledTimes(1);
    expect(appendFile).toHaveBeenCalledTimes(1);
    expect(records().map(record => record.sequence)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
    sink.inputPhase!("receipt", 42);
    sink.inputPhase!("semantic-start", 42);
    sink.inputPhase!("semantic-end", 42);
    await vi.runAllTimersAsync();
    expect(mkdir).toHaveBeenCalledTimes(1);
    expect(appendFile).toHaveBeenCalledTimes(2);
    expect(validateProgressObservations(records(), "writer-test")).toEqual([]);
    expect(records().slice(-3).map(record => [record.stage, record.eventKind, record.revision]))
      .toEqual(["receipt", "semantic-start", "semantic-end"].map(phase => ["child-input-phase", phase, 42]));
  });

  it("keeps its byte cap and reports dropped diagnostics rather than silently losing them", async () => {
    const sink = observer();
    for (let index = 0; index < 2_000; index++) sink.childRenderWrite(index, 1, "ordinary");
    await vi.runAllTimersAsync();
    expect(Buffer.byteLength(String(vi.mocked(appendFile).mock.calls[0]![1]))).toBeLessThanOrEqual(256 * 1024);
    expect(records().length).toBeLessThan(2_000);
    sink.engineDelivery({ type: "message_update", text: "must-not-be-recorded" });
    await vi.runAllTimersAsync();
    expect(records().at(-1)).toMatchObject({ sequence: 2_001, eventKind: "message_update" });
    expect(records().at(-1).lostBefore).toBeGreaterThan(0);
    expect(JSON.stringify(vi.mocked(appendFile).mock.calls)).not.toContain("must-not-be-recorded");
  });

  it("stops scheduling after an append failure without an unhandled rejection or retry loop", async () => {
    vi.mocked(appendFile).mockRejectedValueOnce(new Error("fixture write failed"));
    const sink = observer();
    sink.childRenderWrite(1, 1, "ordinary");
    await vi.runAllTimersAsync();
    sink.childRenderWrite(2, 1, "ordinary");
    await vi.runAllTimersAsync();
    expect(appendFile).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
