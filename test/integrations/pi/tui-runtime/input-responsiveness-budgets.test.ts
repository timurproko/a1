import { describe, expect, it } from "vitest";
import {
  captureInputResponsivenessGate,
  deterministicInputMatrixShape,
} from "../../../support/input-responsiveness/input-gate.js";
import { assertInputResponsivenessMatrix } from "../../../support/input-responsiveness/input-matrix.js";

const capture = captureInputResponsivenessGate("full");

describe("full input responsiveness evidence", () => {
  it("gates editor, menu, replacement, barrier, wrap, long-transcript, and streaming workloads", async () => {
    const evidence = await capture;
    expect(evidence.structure).toEqual({ workloadCaptures: 6, deliberateRepeatCaptures: 1, producerLaunches: 6 });
    for (const matrix of evidence.matrices.values()) expect(() => assertInputResponsivenessMatrix(matrix)).not.toThrow();
    const empty = evidence.matrices.get("full-empty-transcript")!;
    const long = evidence.matrices.get("full-long-transcript")!;
    expect(long.bareStructure).toEqual(empty.bareStructure);
    expect(long.bareStructure.stableTranscriptBlockRenders).toBe(0);
    expect(long.bareStructure.stableTranscriptPaintedRows).toBe(0);
    expect(long.producers[0]!.checkpoints.some(checkpoint => checkpoint.viewportCause === "dock-input")).toBe(true);
    const wrapped = evidence.matrices.get("full-grapheme-wrap")!.producers[0]!;
    expect(wrapped.checkpoints.find(checkpoint => checkpoint.name === "wrap")?.viewportCause).toBe("geometry-change");
    const replacement = evidence.matrices.get("full-replacement-resize")!.producers[0]!;
    expect(replacement.checkpoints.find(checkpoint => checkpoint.name === "navigate")?.viewportCause).toBe("dock-input");
    expect(replacement.checkpoints.find(checkpoint => checkpoint.name === "resize")?.viewportCause).toBe("geometry-change");
  }, 180_000);

  it("repeats one matrix deliberately and excludes wall-clock diagnostics from determinism", async () => {
    const evidence = await capture;
    const original = evidence.matrices.get("smoke-current-state")!;
    expect(deterministicInputMatrixShape(evidence.repeated!)).toEqual(deterministicInputMatrixShape(original));
  }, 180_000);
});
