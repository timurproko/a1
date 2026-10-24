import { expect } from "vitest";
import { assertInputResponsivenessMatrix } from "./input-matrix.js";
import type { InputResponsivenessGateCapture } from "./input-gate.js";

/** Full includes the smoke workloads; these checks consume its existing independent captures. */
export function assertInputSmokeContracts(evidence: InputResponsivenessGateCapture): void {
  for (const id of ["smoke-current-state", "smoke-menu-stream"]) {
    const matrix = evidence.matrices.get(id)!;
    expect(matrix, `missing input smoke workload ${id}`).toBeDefined();
    expect(() => assertInputResponsivenessMatrix(matrix)).not.toThrow();
    expect(new Set(matrix.producers.map(producer => producer.processId)).size).toBe(3);
    expect(matrix.producers.every(producer => producer.diagnostics.firstStateInputToWriteMs !== null)).toBe(true);
  }
}
