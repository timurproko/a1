import { describe, expect, it } from "vitest";
import { assertInputResponsivenessMatrix } from "../../../support/input-responsiveness/input-matrix.js";
import { captureInputResponsivenessGate } from "../../../support/input-responsiveness/input-gate.js";

const capture = captureInputResponsivenessGate("smoke");

describe("input responsiveness smoke evidence", () => {
  it("captures typing, editing, menu navigation, submit, and stream preemption once per producer", async () => {
    const evidence = await capture;
    expect(evidence.structure).toEqual({ workloadCaptures: 2, deliberateRepeatCaptures: 0, producerLaunches: 3 });
    expect([...evidence.matrices]).toHaveLength(2);
    for (const matrix of evidence.matrices.values()) {
      expect(() => assertInputResponsivenessMatrix(matrix)).not.toThrow();
      expect(new Set(matrix.producers.map(producer => producer.processId)).size).toBe(3);
      expect(matrix.producers.every(producer => producer.diagnostics.firstStateInputToWriteMs !== null)).toBe(true);
    }
  }, 120_000);
});
