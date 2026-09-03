import { describe, expect, it } from "vitest";
import { evaluateRenderingBudgets } from "../../../support/rendering/rendering-budgets.js";
import { captureRenderingGate } from "../../../support/rendering/rendering-gate.js";
import type { RenderingMatrixResult } from "../../../support/rendering/rendering-matrix.js";

const smokeWorkloads = ["streamed-prose", "long-transcript-follow"] as const;

describe("rendering smoke gate", () => {
  it("covers independent producers, both modes, replay, parity, status, and followed damage", async () => {
    const captured = await captureRenderingGate(smokeWorkloads);
    expect(captured.structure).toEqual({ workloadCaptures: 2, deliberateRepeatCaptures: 0, producerLaunches: 12 });
    for (const workloadId of smokeWorkloads) {
      const matrix = captured.matrices.get(workloadId)!;
      expect(matrix.comparisonSemanticParity).toEqual({ regular: true, fullscreen: true });
      expect(matrix.defaultMode.map(result => result.producer)).toEqual(["bare-a1", "a1-pi", "pinned-pi"]);
      expect(matrix.fullscreenMode.map(result => result.effectiveMode)).toEqual(["fullscreen", "fullscreen", "fullscreen"]);
      expect(matrix.defaultMode.flatMap(result => result.checkpoints).some(checkpoint => checkpoint.name === "initial")).toBe(true);
      expect(matrix.defaultMode.flatMap(result => result.checkpoints).every(checkpoint => checkpoint.paint.synchronizedUpdates.balanced)).toBe(true);
      expect(evaluateRenderingBudgets(matrix)).toEqual({ passed: true, violations: [] });
    }
  }, 300_000);

  it("rejects seeded parity, clear, damage, blank-frame, and stale-final evidence", () => {
    const matrix = fixtureMatrix();
    expect(evaluateRenderingBudgets({ ...matrix, comparisonSemanticParity: { regular: false, fullscreen: true } }).passed).toBe(false);
    expect(evaluateRenderingBudgets(corruptCheckpoint(matrix, checkpoint => ({
      ...checkpoint,
      paint: { ...checkpoint.paint, fullScreenClears: 1 },
    }))).passed).toBe(false);
    expect(evaluateRenderingBudgets(corruptCheckpoint(matrix, checkpoint => ({
      ...checkpoint,
      paint: { ...checkpoint.paint, rowClears: checkpoint.paint.rowClears + 1 },
      damageDecision: { frameId: 1, transformed: true, reason: "transformed", shiftRows: 1, paintedRows: [] },
    }))).passed).toBe(false);
    expect(evaluateRenderingBudgets(corruptCheckpoint(matrix, checkpoint => ({
      ...checkpoint,
      cellFrame: { ...checkpoint.cellFrame, rows: [""] },
    }))).passed).toBe(false);
    expect(evaluateRenderingBudgets({ ...matrix, comparisonSemanticParity: { regular: true, fullscreen: false } }).passed).toBe(false);
  });
});

function corruptCheckpoint(matrix: RenderingMatrixResult, transform: (checkpoint: RenderingMatrixResult["defaultMode"][number]["checkpoints"][number]) => RenderingMatrixResult["defaultMode"][number]["checkpoints"][number]): RenderingMatrixResult {
  const producer = matrix.defaultMode[0]!;
  return {
    ...matrix,
    defaultMode: matrix.defaultMode.map(entry => entry !== producer ? entry : {
      ...entry,
      checkpoints: entry.checkpoints.map((checkpoint, index) => index === 0 ? checkpoint : transform(checkpoint)),
    }),
  };
}

function fixtureMatrix(): RenderingMatrixResult {
  const checkpoint = {
    name: "chunk",
    paint: {
      writes: 1,
      frames: 1,
      bytes: 1,
      durationMs: 0,
      fullScreenClears: 0,
      rowClears: 0,
      addressedRowWrites: [],
      scrollRegions: [],
      scrollUpRows: 0,
      scrollDownRows: 0,
      synchronizedUpdates: { begins: 1, ends: 1, balanced: true },
      cursorPositions: [],
      causes: {},
      capturedWrites: [],
      captureTruncated: false,
    },
    cellFrame: { rows: ["x"], cursor: { row: 1, column: 1 } },
  };
  const producer = (name: "bare-a1" | "a1-pi" | "pinned-pi", processId: number) => ({
    producer: name,
    processId,
    requestedMode: "regular" as const,
    effectiveMode: name === "bare-a1" ? "fullscreen" as const : "regular" as const,
    state: { profileId: name === "bare-a1" ? "a1" as const : "pi" as const, cwd: ".", theme: "dark" as const, columns: 1, rows: 1, synchronizedUpdates: true },
    checkpoints: [{ ...checkpoint, name: "initial" }, checkpoint],
  });
  const defaultMode = [producer("bare-a1", 1), producer("a1-pi", 2), producer("pinned-pi", 3)];
  return {
    schema: "a1-rendering-stability-matrix-v1",
    workloadId: "streamed-prose",
    geometry: { columns: 1, rows: 1 },
    defaultMode,
    fullscreenMode: defaultMode.map(entry => ({ ...entry, requestedMode: "fullscreen" as const, effectiveMode: "fullscreen" as const })),
    comparisonSemanticParity: { regular: true, fullscreen: true },
    findings: { customViewportMaximumRowClearsPerStreamCheckpoint: 0, customViewportUnexpectedFullScreenClears: 0, safeShiftCheckpoints: [], dockGeometry: [] },
  };
}
