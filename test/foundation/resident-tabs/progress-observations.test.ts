import { describe, expect, it } from "vitest";
import {
  evaluateProgressScenario,
  evaluateStoppedStageControl,
  progressLatencyReport,
  validateProgressObservations,
  type ProgressObservation,
} from "../../../scripts/development/resident-progress-observations.mjs";

const RUN = "run-1";
const TABS = ["tab-a", "tab-b", "tab-c"] as const;

function record(overrides: Partial<ProgressObservation> & Pick<ProgressObservation, "stage" | "tabId" | "timestampUnixUs">): ProgressObservation {
  return {
    schema: "a1-resident-progress-observation-v1",
    runId: RUN,
    role: overrides.stage.startsWith("engine") || overrides.stage.startsWith("child") ? "child" : "holder",
    pid: overrides.pid ?? 10,
    processInstance: overrides.processInstance ?? `process-${overrides.pid ?? 10}`,
    clockErrorUs: 1_000,
    sequence: overrides.sequence ?? 1,
    incarnation: 1,
    eventSequence: 0,
    revision: 0,
    geometryGeneration: 0,
    bytes: 1,
    count: 1,
    lostBefore: 0,
    ...overrides,
  };
}

function scenarioRecords(): ProgressObservation[] {
  const records: ProgressObservation[] = [];
  for (const [tabIndex, tabId] of TABS.entries()) {
    const first = 1_100_000 + tabIndex * 100_000;
    for (let index = 1; index <= 3; index += 1) {
      records.push(record({ stage: "engine-delivery", tabId, timestampUnixUs: first + index * 300_000,
        pid: 100 + tabIndex, sequence: index, eventSequence: index, eventKind: "message_update" }));
      records.push(record({ stage: "child-render-write", tabId, timestampUnixUs: first + index * 300_000 + 20_000,
        pid: 100 + tabIndex, sequence: 3 + index, eventSequence: index, frameId: index }));
      records.push(record({ stage: "pty-ingest", tabId, timestampUnixUs: first + index * 300_000 + 40_000,
        pid: 200 + tabIndex, sequence: index * 2 - 1, eventSequence: index }));
      records.push(record({ stage: "holder-commit", tabId, timestampUnixUs: first + index * 300_000 + 50_000,
        pid: 200 + tabIndex, sequence: index * 2, revision: index }));
    }
    records.push(record({ stage: "child-render-write", tabId, timestampUnixUs: first + 1_250_000,
      pid: 100 + tabIndex, sequence: 7, eventSequence: 3, frameId: 4 }));
    records.push(record({ stage: "child-render-write", tabId, timestampUnixUs: first + 1_350_000,
      pid: 100 + tabIndex, sequence: 8, eventSequence: 3, frameId: 5 }));
    records.push(record({ stage: "attach-receipt", tabId, timestampUnixUs: first + 1_400_000,
      pid: 300, sequence: tabIndex * 2 + 1, revision: 3 }));
    records.push(record({ stage: "outer-paint", tabId, timestampUnixUs: first + 1_420_000,
      pid: 300, sequence: tabIndex * 2 + 2, revision: 3 }));
  }
  return records;
}

describe("resident progress observations", () => {
  it("requires independent unfinished progress and the requested first-response order", () => {
    const result = evaluateProgressScenario(scenarioRecords(), {
      id: "base",
      tabIds: TABS,
      viewedTabIds: TABS,
      startedUnixUs: 1_000_000,
      barrierUnixUs: 5_000_000,
      engineBaselines: { "tab-a": 0, "tab-b": 0, "tab-c": 0 },
      expectedFirstOrder: TABS,
    });
    expect(result).toMatchObject({ passed: true, faults: [], observedFirstOrder: TABS });
    expect(result.byTab["tab-b"]).toMatchObject({
      enginePartials: 3, childWrites: 5, ptyIngestions: 3, holderCommits: 3,
      attachReceipts: 1, outerPaints: 1, animationWrites: 2,
    });
  });

  it.each([
    "engine-delivery", "child-render-write", "holder-commit", "outer-paint",
  ] as const)("recognizes an isolated stopped %s control and rejects a control that did not stop", stage => {
    const control = {
      id: `stopped-${stage}`,
      stage,
      targetTabId: "tab-b",
      tabIds: TABS,
      startedUnixUs: 1_000_000,
      barrierUnixUs: 5_000_000,
      engineBaselines: { "tab-a": 0, "tab-b": 0, "tab-c": 0 },
    };
    const stopped = evaluateStoppedStageControl(
      scenarioRecords().filter(value => value.tabId !== "tab-b" || value.stage !== stage),
      control,
    );
    expect(stopped).toMatchObject({ passed: true, faults: [], stage, targetTabId: "tab-b" });
    const stillAdvancing = evaluateStoppedStageControl(scenarioRecords(), control);
    expect(stillAdvancing.passed).toBe(false);
    expect(stillAdvancing.faults).toContain(`stopped-${stage}: stopped ${stage} still advanced`);
  });

  it("starts a stopped painter's zero-progress check after its acknowledged writer sequence", () => {
    const control = {
      id: "acknowledged-painter-stop", stage: "outer-paint" as const,
      targetTabId: "tab-b", tabIds: TABS, startedUnixUs: 1_000_000, barrierUnixUs: 5_000_000,
      engineBaselines: { "tab-a": 0, "tab-b": 0, "tab-c": 0 },
    };
    const controlled = { ...control, stopBoundary: { processInstance: "process-300", sequence: 10 } };
    const records = scenarioRecords().filter(value => value.tabId !== "tab-b" || value.stage !== "outer-paint");
    records.push(record({ stage: "outer-paint", tabId: "tab-b", timestampUnixUs: 3_000_000, pid: 300, sequence: 9 }));
    records.push(record({ stage: "fixture-stop-ack", tabId: "tab-b", timestampUnixUs: 3_000_001,
      pid: 300, sequence: 10, eventKind: "outer-paint" }));
    expect(evaluateStoppedStageControl(records, control).passed).toBe(false);
    expect(evaluateStoppedStageControl(records, controlled)).toMatchObject({
      passed: true, counts: { "tab-b": { painter: 0 } }, stopBoundary: controlled.stopBoundary,
    });
    for (const afterStop of [
      record({ stage: "outer-paint", tabId: "tab-b", timestampUnixUs: 3_100_000, pid: 300, sequence: 11 }),
      record({ stage: "outer-paint", tabId: "tab-b", timestampUnixUs: 3_100_000, pid: 301, sequence: 1 }),
    ]) {
      expect(evaluateStoppedStageControl([...records, afterStop], controlled)).toMatchObject({
        passed: false, counts: { "tab-b": { painter: 1 } },
        faults: expect.arrayContaining(["acknowledged-painter-stop: stopped outer-paint still advanced"]),
      });
    }
  });

  it("accepts a payload-free fixture stop acknowledgement only with its tab identity", () => {
    const acknowledgement = record({ stage: "fixture-stop-ack", tabId: "tab-b", timestampUnixUs: 1_000_000,
      eventKind: "outer-paint" });
    expect(validateProgressObservations([acknowledgement], RUN)).toEqual([]);
    const missingTab = { ...acknowledgement };
    delete missingTab.tabId;
    expect(validateProgressObservations([missingTab], RUN)).toContain("record 1: invalid tab id");
  });

  it("rejects loss, duplicate process sequence, bad clocks, and payload fields", () => {
    const first = record({ stage: "holder-commit", tabId: "tab-a", timestampUnixUs: 2_000,
      pid: 4, sequence: 1, revision: 1 });
    const bad = { ...record({ stage: "holder-commit", tabId: "tab-a", timestampUnixUs: 500,
      pid: 4, sequence: 1, revision: 2, lostBefore: 3 }), content: "forbidden" } as ProgressObservation;
    expect(validateProgressObservations([first, bad], RUN)).toEqual(expect.arrayContaining([
      expect.stringContaining("observations lost"),
      expect.stringContaining("payload-bearing field content"),
      expect.stringContaining("duplicate or reordered process sequence"),
      expect.stringContaining("process clock moved backwards"),
    ]));
  });

  it("keeps recycled process ids distinct by process instance", () => {
    const first = record({ stage: "outer-paint", tabId: "tab-a", timestampUnixUs: 2_000,
      pid: 4, processInstance: "process-first", sequence: 1 });
    const recycled = record({ stage: "outer-paint", tabId: "tab-b", timestampUnixUs: 2_100,
      pid: 4, processInstance: "process-second", sequence: 1 });
    expect(validateProgressObservations([first, recycled], RUN)).toEqual([]);
  });

  it("retains at least forty matched per-tab latency samples and exposes missing samples", () => {
    const records: ProgressObservation[] = [];
    for (const [tabIndex, tabId] of TABS.entries()) {
      for (let index = 1; index <= 40; index += 1) {
        // Invariant: process sequences are chronological, including the shared painter across tabs.
        const base = 10_000 + tabIndex * 1_000_000 + index * 10_000;
        records.push(record({ stage: "engine-delivery", tabId, timestampUnixUs: base,
          pid: 10 + tabIndex, sequence: index * 2 - 1, eventSequence: index, eventKind: "message_update" }));
        records.push(record({ stage: "child-render-write", tabId, timestampUnixUs: base + 2_000,
          pid: 10 + tabIndex, sequence: index * 2, eventSequence: index }));
        records.push(record({ stage: "pty-ingest", tabId, timestampUnixUs: base + 3_000,
          pid: 20 + tabIndex, sequence: index * 2 - 1, eventSequence: index }));
        records.push(record({ stage: "holder-commit", tabId, timestampUnixUs: base + 4_000,
          pid: 20 + tabIndex, sequence: index * 2, revision: index }));
        records.push(record({ stage: "outer-paint", tabId, timestampUnixUs: base + 5_000,
          pid: 30, sequence: tabIndex * 40 + index, revision: index }));
      }
    }
    const complete = progressLatencyReport(records, TABS);
    expect(complete.faults).toEqual([]);
    expect(complete.perTab["tab-a"]!.engineToRender).toMatchObject({ count: 40, p95Ms: 2 });
    const incomplete = progressLatencyReport(records.filter(value => value.tabId !== "tab-c" || value.eventSequence !== 40), TABS);
    expect(incomplete.faults).toEqual(expect.arrayContaining([expect.stringContaining("tab-c: fewer than 40")]));
  });

  it("measures holder no-progress gaps only inside active streaming windows", () => {
    const commits = [0, 400_000, 800_000, 5_800_000, 6_200_000].map((timestampUnixUs, index) => record({
      stage: "holder-commit", tabId: "tab-a", timestampUnixUs, revision: index + 1, sequence: index + 1,
    }));
    const whole = progressLatencyReport(commits, ["tab-a"]);
    expect(whole.perTab["tab-a"]!.holderWorstGapMs).toBe(5_000);
    expect(whole.faults).toEqual(expect.arrayContaining(["tab-a: holder no-progress gap exceeded 1000 ms"]));
    const windows = [{ startedUnixUs: 0, barrierUnixUs: 900_000 }, { startedUnixUs: 5_500_000, barrierUnixUs: 6_500_000 }];
    const active = progressLatencyReport(commits, ["tab-a"], windows);
    expect(active.perTab["tab-a"]!.holderWorstGapMs).toBe(400);
    expect(active.faults).not.toContain("tab-a: holder no-progress gap exceeded 1000 ms");
    const stalled = progressLatencyReport(commits, ["tab-a"], [{ startedUnixUs: 0, barrierUnixUs: 6_500_000 }]);
    expect(stalled.faults).toContain("tab-a: holder no-progress gap exceeded 1000 ms");
  });

  it("accepts additive connection timings without a tab and separates idle waiting", () => {
    const transfer = record({ stage: "pipe-frame-read", timestampUnixUs: 1_000_000,
      durationUs: 250, idleWaitUs: 8_000_000, monotonicUs: 1_000, clockEpoch: 0 });
    expect(validateProgressObservations([transfer], RUN)).toEqual([]);
    const result = progressLatencyReport([transfer], []);
    expect(result.localCompletions["pipe-frame-read"]).toMatchObject({ count: 1, p95Ms: 0.25 });
    expect(result.faults).toEqual([]);
    expect(validateProgressObservations([{ ...transfer, durationUs: -1, idleWaitUs: Number.NaN }], RUN))
      .toEqual(expect.arrayContaining([expect.stringContaining("invalid durationUs"), expect.stringContaining("invalid idleWaitUs")]));
    const missingClock = { ...transfer };
    delete missingClock.clockEpoch;
    expect(validateProgressObservations([missingClock], RUN))
      .toContain("record 1: incomplete monotonic clock");
  });

  it("rejects a negative latency even within the declared clock uncertainty", () => {
    const records = [
      record({ stage: "engine-delivery", tabId: "tab-a", timestampUnixUs: 10_000, eventSequence: 1, sequence: 1 }),
      record({ stage: "child-render-write", tabId: "tab-a", timestampUnixUs: 9_999, eventSequence: 1, sequence: 2 }),
    ];
    expect(progressLatencyReport(records, ["tab-a"]).perTab["tab-a"]!.engineToRender.count).toBe(0);
  });

  it("excludes wake-crossing samples while retaining post-wake and local completion timings", () => {
    const records = [
      record({ stage: "holder-commit", tabId: "tab-a", timestampUnixUs: 1_000_000, pid: 20, revision: 1 }),
      record({ stage: "wake-gap", tabId: "tab-a", timestampUnixUs: 3_000_000, pid: 30, sequence: 1,
        monotonicUs: 2_000_000, clockEpoch: 1, clockDiscontinuity: true }),
      record({ stage: "outer-paint", tabId: "tab-a", timestampUnixUs: 3_100_000, pid: 30, sequence: 2, revision: 1,
        monotonicUs: 2_100_000, clockEpoch: 1 }),
      record({ stage: "holder-commit", tabId: "tab-a", timestampUnixUs: 3_200_000, pid: 20, sequence: 2, revision: 2 }),
      record({ stage: "outer-paint", tabId: "tab-a", timestampUnixUs: 3_210_000, pid: 30, sequence: 3, revision: 2,
        monotonicUs: 2_210_000, clockEpoch: 1 }),
      record({ stage: "outer-write-complete", timestampUnixUs: 3_220_000, pid: 30, sequence: 4,
        monotonicUs: 2_220_000, clockEpoch: 1, durationUs: 1_500 }),
    ];
    expect(validateProgressObservations(records, RUN)).toEqual([]);
    const result = progressLatencyReport(records, ["tab-a"]);
    expect(result.perTab["tab-a"]!.commitToPaint).toMatchObject({ count: 1, p95Ms: 10 });
    expect(result.localCompletions["outer-write-complete"]).toMatchObject({ count: 1, p95Ms: 1.5 });
    expect(result.perTab["tab-a"]!.holderWorstGapMs).toBeNull();
  });

  it("uses same-process monotonic durations and rejects changed epochs", () => {
    const engine = record({ stage: "engine-delivery", tabId: "tab-a", timestampUnixUs: 10_000, eventSequence: 1,
      sequence: 1, role: "child", monotonicUs: 100, clockEpoch: 0 });
    const rendered = record({ stage: "child-render-write", tabId: "tab-a", timestampUnixUs: 15_000, eventSequence: 1,
      sequence: 2, role: "child", monotonicUs: 300, clockEpoch: 0 });
    expect(progressLatencyReport([engine, rendered], ["tab-a"]).perTab["tab-a"]!.engineToRender.p95Ms).toBe(0.2);
    expect(progressLatencyReport([engine, { ...rendered, clockEpoch: 1 }], ["tab-a"]).perTab["tab-a"]!.engineToRender.count).toBe(0);
  });

  it("accepts declared backward jumps only as new epochs and excludes ambiguous intervals", () => {
    const first = record({ stage: "engine-delivery", tabId: "tab-a", timestampUnixUs: 5_000_000,
      sequence: 1, role: "child", eventSequence: 1, monotonicUs: 100, clockEpoch: 0 });
    const boundary = record({ stage: "wake-gap", tabId: "tab-a", timestampUnixUs: 1_000_000,
      sequence: 2, role: "child", monotonicUs: 200, clockEpoch: 1, clockDiscontinuity: true });
    const rendered = record({ stage: "child-render-write", tabId: "tab-a", timestampUnixUs: 1_100_000,
      sequence: 3, role: "child", eventSequence: 1, monotonicUs: 300, clockEpoch: 1 });
    expect(validateProgressObservations([first, boundary, rendered], RUN)).toEqual([]);
    expect(progressLatencyReport([first, boundary, rendered], ["tab-a"]).perTab["tab-a"]!.engineToRender.count).toBe(0);
    expect(validateProgressObservations([first, { ...boundary, clockEpoch: 0 }], RUN))
      .toContain("record 2: clock discontinuity without a new epoch");
  });
});
