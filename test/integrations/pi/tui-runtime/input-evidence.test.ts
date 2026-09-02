import { describe, expect, it } from "vitest";
import type { PiTuiInputDiagnosticsEvent } from "../../../../src/integrations/pi/tui-runtime/index.js";
import { analyzeInputPhaseEvidence } from "../../../support/input-responsiveness/input-phase-evidence.js";
import {
  INPUT_RESPONSIVENESS_WORKLOADS,
  assertInputResponsivenessWorkload,
  type InputResponsivenessWorkload,
} from "../../../support/input-responsiveness/input-workloads.js";

function event(
  phase: PiTuiInputDiagnosticsEvent["phase"],
  revision: number,
  atMs: number,
  pendingDepth = 0,
  pendingPresentationDepth: 0 | 1 = pendingDepth > 0 ? 1 : 0,
): PiTuiInputDiagnosticsEvent {
  return {
    phase,
    revision,
    atMs,
    pendingDepth,
    pendingPresentationDepth,
    appliedRevision: phase === "semantic-end" ? revision : Math.max(0, revision - 1),
  };
}

describe("input responsiveness workloads", () => {
  it("declares unique bounded smoke and full coverage", () => {
    expect(new Set(INPUT_RESPONSIVENESS_WORKLOADS.map(workload => workload.id)).size).toBe(INPUT_RESPONSIVENESS_WORKLOADS.length);
    expect(INPUT_RESPONSIVENESS_WORKLOADS.filter(workload => workload.tier === "smoke").map(workload => workload.surface)).toEqual(["editor", "menu"]);
    expect(INPUT_RESPONSIVENESS_WORKLOADS.filter(workload => workload.tier === "full")).toHaveLength(4);
    for (const workload of INPUT_RESPONSIVENESS_WORKLOADS) expect(() => assertInputResponsivenessWorkload(workload)).not.toThrow();
  });

  it.each([
    ["bad id", {}],
    ["duplicate turn", { turns: [{ id: "same", actions: [{ type: "input", data: "a" }] }, { id: "same", actions: [{ type: "input", data: "b" }] }], expectedInputRevisions: 2 }],
    ["empty delivery", { turns: [{ id: "turn", actions: [{ type: "input", data: "" }] }], expectedInputRevisions: 1 }],
    ["oversized transcript", { preparedTranscriptBlocks: 257 }],
    ["ambiguous revisions", { expectedInputRevisions: 99 }],
  ] as const)("rejects %s", (_label, patch) => {
    const baseline = INPUT_RESPONSIVENESS_WORKLOADS[0]!;
    const candidate = { ...baseline, id: "candidate", ...patch } as InputResponsivenessWorkload;
    if (_label === "bad id") Object.assign(candidate, { id: "Bad id" });
    expect(() => assertInputResponsivenessWorkload(candidate)).toThrow();
  });
});

describe("input phase evidence", () => {
  it("derives ordered current-state presentation, backlog, frames, and timings", () => {
    const events = [
      event("receipt", 1, 0, 0),
      event("receipt", 2, 1, 1),
      event("semantic-start", 1, 2, 2),
      event("semantic-end", 1, 3, 1),
      event("semantic-start", 2, 4, 1),
      event("semantic-end", 2, 5, 0),
      event("composition-start", 2, 6),
      event("composition-end", 2, 8),
      event("write-start", 2, 9),
      event("write-end", 2, 10),
    ];
    const evidence = analyzeInputPhaseEvidence(events, 2);
    expect(evidence).toMatchObject({
      receivedRevisions: [1, 2],
      appliedRevisions: [1, 2],
      presentedRevisions: [2],
      maximumPendingDepth: 2,
      maximumPendingPresentationDepth: 1,
      inputDrivenFrames: 1,
      staleFrames: 0,
      finalAppliedRevision: 2,
      finalPresentedRevision: 2,
      finalBacklog: 0,
      firstStateInputToWriteMs: 10,
      finalStateInputToWriteMs: 9,
      phaseDurationsMs: { semantic: [1, 1], composition: [2], write: [1] },
    });
  });

  it("supports a semantic no-op without claiming a missing terminal write", () => {
    const events = [event("receipt", 1, 0), event("semantic-start", 1, 1), event("semantic-end", 1, 2)];
    expect(analyzeInputPhaseEvidence(events, 1, {
      requireFinalWrite: false,
      expectedPresentedRevision: 0,
    })).toMatchObject({
      finalAppliedRevision: 1,
      finalPresentedRevision: 0,
      finalBacklog: 0,
    });
  });

  it.each([
    ["missing receipt", [event("semantic-start", 1, 0), event("semantic-end", 1, 1)]],
    ["reordered receipt", [event("receipt", 2, 0)]],
    ["unfinished semantic", [event("receipt", 1, 0), event("semantic-start", 1, 1)]],
    ["missing write", [event("receipt", 1, 0), event("semantic-start", 1, 1), event("semantic-end", 1, 2)]],
    ["non-monotonic time", [event("receipt", 1, 2), event("semantic-start", 1, 1)]],
  ] as const)("rejects %s evidence", (_label, events) => {
    expect(() => analyzeInputPhaseEvidence(events, 1)).toThrow();
  });
});
