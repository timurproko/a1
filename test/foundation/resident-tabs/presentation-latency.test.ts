import { describe, expect, it } from "vitest";
import { progressLatencyReport, type ProgressObservation } from "../../../scripts/development/resident-progress-observations.mjs";

const TAB = "latency-tab";
function observations(delayUs = 1_000, incarnation = 1, start = 1_000_000): ProgressObservation[] {
  return Array.from({ length: 40 }, (_, index) => {
    const revision = index + 1;
    const at = start + index * 20_000;
    return ([
      ["engine-delivery", 0, "child", 10], ["child-render-write", 1_000, "child", 10],
      ["pty-ingest", 2_000, "holder", 20], ["holder-commit", 3_000, "holder", 20],
      ["attach-receipt", 3_500, "attach", 30], ["outer-paint", 3_000 + delayUs, "attach", 30],
    ] as const).map(([stage, offset, role, pid], stageIndex) => ({
      schema: "a1-resident-progress-observation-v1", runId: "latency-test", stage, role, pid,
      processInstance: `${role}-${incarnation}`, timestampUnixUs: at + offset, clockErrorUs: 0,
      sequence: index * 6 + stageIndex + 1, tabId: TAB, incarnation, revision,
      eventSequence: revision, geometryGeneration: 0, bytes: 1, count: 1, lostBefore: 0,
      ...(stage === "attach-receipt" ? { eventKind: "live" } : {}),
    }));
  }).flat();
}

function report(records: ProgressObservation[], windows?: { startedUnixUs: number; barrierUnixUs: number; viewedTabIds?: string[] }[]) {
  // Delayed paints can finish after later receipts; sequence the synthetic per-process events
  // by their actual completion time rather than inventing a backwards-clock fault.
  const sequences = new Map<string, number>();
  const chronological = [...records].sort((left, right) => left.timestampUnixUs - right.timestampUnixUs)
    .map(record => {
      const key = `${record.role}:${record.pid}:${record.processInstance}`;
      const sequence = (sequences.get(key) ?? 0) + 1;
      sequences.set(key, sequence);
      return { ...record, sequence };
    });
  return progressLatencyReport(chronological, [TAB], windows);
}

describe("healthy resident presentation latency verdict", () => {
  it("fails the previously accepted 200 ms paint delay", () => {
    const fast = report(observations());
    expect(fast.faults).toEqual([]);
    const slow = report(observations(200_000));
    expect(slow.perTab[TAB]!.commitToPaint).toMatchObject({ count: 40, p95Ms: 200 });
    expect(slow.faults).toContain(`${TAB}: healthy commit-to-paint p95 exceeded 33 ms`);
  });

  it("uses the first completed paint, not subsequent strip animation", () => {
    const records = observations();
    const repeats = records.filter(record => record.stage === "outer-paint")
      .map(record => ({ ...record, timestampUnixUs: record.timestampUnixUs + 500_000, sequence: record.sequence + 1000 }));
    expect(report([...repeats, ...records]).perTab[TAB]!.commitToPaint).toMatchObject({ count: 40, p95Ms: 1 });
  });

  it("never matches a revision to another holder incarnation", () => {
    const before = observations().filter(record => record.stage !== "outer-paint");
    const after = observations(1_000, 2).filter(record => record.stage === "outer-paint");
    expect(report([...before, ...after]).perTab[TAB]!.commitToPaint.count).toBe(0);
  });

  it("excludes stale and activation re-offers but retains healthy live delivery", () => {
    for (const eventKind of ["activation", "stale"]) {
      const old = observations(200_000).map(record => record.stage === "attach-receipt" ? { ...record, eventKind } : record);
      const result = report([...old, ...observations(1_000, 2, 3_000_000)]);
      expect(result.perTab[TAB]!.commitToPaint).toMatchObject({ count: 40, p95Ms: 1 });
      expect(result.faults).toEqual([]);
    }
  });

  it("permits coalesced intermediate surfaces but rejects absent presentation", () => {
    const extra = observations(1_000, 2).filter(record => record.stage === "holder-commit");
    expect(report([...observations(), ...extra]).faults).toEqual([]);
    const missing = report(extra, [{ startedUnixUs: 1_000_000, barrierUnixUs: 2_000_000, viewedTabIds: [TAB] }]);
    expect(missing.faults).toContain(`${TAB}: fewer than 40 matched healthy commit-to-paint samples`);
    expect(missing.faults).toContain(`${TAB}: healthy viewed window 1 has no matched presentation`);
  });

  it("never lets a paused sink outside healthy windows contaminate their percentile", () => {
    const records = [...observations(), ...observations(900_000, 2, 5_000_000)];
    expect(report(records).perTab[TAB]!.commitToPaint.p95Ms).toBe(900);
    const healthy = report(records, [{ startedUnixUs: 1_000_000, barrierUnixUs: 2_000_000, viewedTabIds: [TAB] }]);
    expect(healthy.perTab[TAB]!.commitToPaint).toMatchObject({ count: 40, p95Ms: 1 });
    expect(healthy.faults).toEqual([]);
  });

  it("rejects invalid clock intervals rather than accepting negative fast samples", () => {
    const negative = observations().map(record => record.stage === "outer-paint"
      ? { ...record, timestampUnixUs: record.timestampUnixUs - 2_000 } : record);
    expect(report(negative).perTab[TAB]!.commitToPaint.count).toBe(0);
    const boundary: ProgressObservation = { ...observations()[0]!, stage: "wake-gap", role: "attach", pid: 30,
      processInstance: "attach-1", timestampUnixUs: 2_000_000, sequence: 1000,
      monotonicUs: 2_000_000, clockEpoch: 1, clockDiscontinuity: true };
    const crossing = observations(2_000_000);
    expect(report([...crossing, boundary]).perTab[TAB]!.commitToPaint.count).toBe(0);
  });
});
