import { describe, expect, it } from "vitest";
import {
  evaluateProgressScenario,
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
    ["engine-delivery", "engine partials"],
    ["child-render-write", "completed child writes"],
    ["pty-ingest", "PTY ingestions"],
    ["holder-commit", "holder commits"],
    ["attach-receipt", "attach receipt"],
    ["outer-paint", "outer paint"],
  ])("fails a frozen %s stage even when later output exists", (stage, expected) => {
    const records = scenarioRecords().filter(value => value.tabId !== "tab-b" || value.stage !== stage);
    const result = evaluateProgressScenario(records, {
      id: `frozen-${stage}`,
      tabIds: TABS,
      viewedTabIds: TABS,
      startedUnixUs: 1_000_000,
      barrierUnixUs: 5_000_000,
      engineBaselines: { "tab-a": 0, "tab-b": 0, "tab-c": 0 },
      expectedFirstOrder: TABS,
    });
    expect(result.passed).toBe(false);
    expect(result.faults.some(fault => fault.includes(`tab-b`) && fault.includes(expected))).toBe(true);
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
        const base = 10_000 + index * 1_000;
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
});
