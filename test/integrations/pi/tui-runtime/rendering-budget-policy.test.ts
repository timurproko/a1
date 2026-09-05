import { describe, expect, it } from "vitest";
import { evaluateRenderingBudgets } from "../../../support/rendering/rendering-budgets.js";
import type { RenderingMatrixCheckpoint, RenderingMatrixResult } from "../../../support/rendering/rendering-matrix.js";
import type { TerminalPaintClassification } from "../../../support/rendering/terminal-paint-evidence.js";

function paint(overrides: Partial<TerminalPaintClassification> = {}): TerminalPaintClassification {
  return {
    writes: 1,
    frames: 1,
    bytes: 10,
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
    ...overrides,
  };
}

function chunk(overrides: Partial<RenderingMatrixCheckpoint> = {}): RenderingMatrixCheckpoint {
  return {
    name: "long-tail-chunk-1",
    paint: paint(),
    cellFrame: { rows: ["content"], cursor: { row: 1, column: 1 } },
    ...overrides,
  };
}

function matrix(chunks: readonly RenderingMatrixCheckpoint[]): RenderingMatrixResult {
  const producer = (id: "bare-a1" | "a1-pi" | "pinned-pi", checkpoints: readonly RenderingMatrixCheckpoint[]) => ({
    producer: id,
    processId: 1,
    requestedMode: "fullscreen" as const,
    effectiveMode: "fullscreen" as const,
    state: {
      profileId: "pi" as const,
      cwd: ".",
      theme: "dark" as const,
      columns: 50,
      rows: 14,
      synchronizedUpdates: true,
    },
    checkpoints,
  });
  // Rationale: comparison producers never enter the A1 damage path, so their checkpoints
  // carry no decision; only bare A1 receives the workload's chunk fixtures.
  const comparison = chunks.map(({ damageDecision: _drop, ...rest }) => rest);
  return {
    schema: "a1-rendering-stability-matrix-v1",
    workloadId: "long-transcript-follow",
    geometry: { columns: 50, rows: 14 },
    defaultMode: [producer("bare-a1", chunks), producer("a1-pi", comparison), producer("pinned-pi", comparison)],
    fullscreenMode: [producer("bare-a1", chunks), producer("a1-pi", comparison), producer("pinned-pi", comparison)],
    comparisonSemanticParity: { regular: true, fullscreen: true },
    findings: {
      customViewportMaximumRowClearsPerStreamCheckpoint: 0,
      customViewportUnexpectedFullScreenClears: 0,
      safeShiftCheckpoints: [],
      dockGeometry: [],
    },
  };
}

const REGION = { rowStart: 1, rowEnd: 8 };
const transformed = { frameId: 1, transformed: true, reason: "transformed", shiftRows: 1, paintedRows: [8] };
const fallback = { frameId: 1, transformed: false, reason: "excessive-real-damage", shiftRows: 1, paintedRows: [] };

describe("long-transcript-follow rendering budget", () => {
  it("requires bounded movement for tail-free followed prose", () => {
    const tailFree = chunk({
      damageDecision: transformed,
      paint: paint({ rowClears: 1, addressedRowWrites: [8], scrollUpRows: 1 }),
      viewport: { frameId: 1, transcript: REGION, dock: null, followingEnd: true, verticalShiftRows: 1, safeVerticalShift: true, cause: "follow-shift", transientTailRows: 0 },
    });
    expect(evaluateRenderingBudgets(matrix([tailFree])).violations).toEqual([]);

    const untransformed = chunk({
      damageDecision: fallback,
      viewport: { frameId: 1, transcript: REGION, dock: null, followingEnd: true, verticalShiftRows: 1, safeVerticalShift: true, cause: "follow-shift", transientTailRows: 0 },
    });
    expect(evaluateRenderingBudgets(matrix([untransformed])).violations)
      .toEqual(["long-transcript-follow/long-tail-chunk-1: tail-free followed prose did not use bounded movement"]);
  });

  it("allows tail-active fallback only while damage stays inside the transcript region", () => {
    const confined = chunk({
      damageDecision: fallback,
      paint: paint({ rowClears: 6, addressedRowWrites: [1, 2, 3, 4, 5, 6] }),
      viewport: { frameId: 1, transcript: REGION, dock: { rowStart: 9, rowEnd: 14 }, followingEnd: true, verticalShiftRows: 1, safeVerticalShift: false, cause: "steady", transientTailRows: 2 },
    });
    expect(evaluateRenderingBudgets(matrix([confined])).violations).toEqual([]);

    const dockPainted = chunk({
      damageDecision: fallback,
      paint: paint({ rowClears: 7, addressedRowWrites: [1, 2, 3, 4, 5, 6, 10] }),
      viewport: confined.viewport,
    });
    expect(evaluateRenderingBudgets(matrix([dockPainted])).violations)
      .toEqual(["long-transcript-follow/long-tail-chunk-1: tail-active fallback painted outside the transcript region"]);

    const tooWide = chunk({
      damageDecision: fallback,
      paint: paint({ rowClears: 9, addressedRowWrites: [1, 2, 3, 4, 5, 6, 7, 8] }),
      viewport: confined.viewport,
    });
    expect(evaluateRenderingBudgets(matrix([tooWide])).violations)
      .toEqual(["long-transcript-follow/long-tail-chunk-1: tail-active fallback cleared more rows than the transcript region"]);
  });

  it("fails when followed stream checkpoints are absent", () => {
    expect(evaluateRenderingBudgets(matrix([])).violations)
      .toEqual(["long-transcript-follow: missing followed stream checkpoints"]);
  });
});
