import { describe, expect, it } from "vitest";
import { evaluateRenderingBudgets } from "../../../support/rendering/rendering-budgets.js";
import { captureRenderingGate } from "../../../support/rendering/rendering-gate.js";
import type { RenderingMatrixResult } from "../../../support/rendering/rendering-matrix.js";
import { STREAM_RENDERING_WORKLOADS } from "../../../support/rendering/streaming-workloads.js";

const workloadIds = STREAM_RENDERING_WORKLOADS.map(workload => workload.id);

describe("full rendering stability gate", () => {
  it("captures every workload once and preserves product-facing matrix contracts", async () => {
    const captured = await captureRenderingGate(workloadIds);
    expect(captured.structure).toEqual({ workloadCaptures: 8, deliberateRepeatCaptures: 0, producerLaunches: 48 });
    for (const [workloadId, matrix] of captured.matrices) {
      const budget = evaluateRenderingBudgets(matrix);
      expect(budget.violations, workloadId).toEqual([]);
      expect(budget.passed).toBe(true);
      for (const mode of [matrix.defaultMode, matrix.fullscreenMode]) {
        expect(new Set(mode.map(result => result.processId)).size).toBe(3);
        expect(mode.map(result => result.state.profileId)).toEqual(["a1", "pi", "pi"]);
      }
    }

    const prose = captured.matrices.get("streamed-prose")!;
    expect(prose.defaultMode.map(entry => [entry.producer, entry.requestedMode, entry.effectiveMode])).toEqual([
      ["bare-a1", "regular", "fullscreen"],
      ["a1-pi", "regular", "regular"],
      ["pinned-pi", "regular", "regular"],
    ]);
    expect(prose.fullscreenMode.map(entry => entry.effectiveMode)).toEqual(["fullscreen", "fullscreen", "fullscreen"]);
    expect(prose.comparisonSemanticParity).toEqual({ regular: true, fullscreen: true });

    const followed = captured.matrices.get("long-transcript-follow")!;
    expect(followed.findings.customViewportMaximumRowClearsPerStreamCheckpoint).toBeLessThanOrEqual(3);
    expect(followed.findings.customViewportUnexpectedFullScreenClears).toBe(0);
    const shifted = followed.fullscreenMode.find(entry => entry.producer === "bare-a1")?.checkpoints.find(checkpoint => checkpoint.name === "long-tail-chunk-1");
    expect(shifted?.paint).toMatchObject({
      rowClears: 3,
      addressedRowWrites: [1, 5, 6],
      scrollRegions: [{ top: 1, bottom: 6 }],
      scrollUpRows: 1,
    });
    expect(followed.findings.safeShiftCheckpoints.length).toBeGreaterThan(0);
    expect(followed.findings.dockGeometry.length).toBeGreaterThan(0);

    const producer = prose.defaultMode[0]!;
    const checkpoint = producer.checkpoints.find(candidate => candidate.name !== "initial")!;
    const corrupted: RenderingMatrixResult = {
      ...prose,
      defaultMode: prose.defaultMode.map(entry => entry !== producer ? entry : {
        ...entry,
        checkpoints: entry.checkpoints.map(entryCheckpoint => entryCheckpoint !== checkpoint ? entryCheckpoint : {
          ...entryCheckpoint,
          paint: { ...entryCheckpoint.paint, fullScreenClears: 1 },
        }),
      }),
    };
    expect(evaluateRenderingBudgets(corrupted)).toMatchObject({ passed: false });
  }, 600_000);
});
