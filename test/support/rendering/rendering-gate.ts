import { runRenderingMatrix, type RenderingMatrixResult } from "./rendering-matrix.js";

export interface RenderingGateCapture {
  readonly matrices: ReadonlyMap<string, RenderingMatrixResult>;
  readonly structure: {
    readonly workloadCaptures: number;
    readonly deliberateRepeatCaptures: number;
    readonly producerLaunches: number;
  };
}

/** Captures each requested workload once for semantic parity and bounded rendering assertions. */
export async function captureRenderingGate(workloadIds: readonly string[]): Promise<RenderingGateCapture> {
  const matrices = new Map<string, RenderingMatrixResult>();
  for (const workloadId of workloadIds) {
    if (matrices.has(workloadId)) throw new TypeError(`duplicate rendering workload: ${workloadId}`);
    matrices.set(workloadId, await runRenderingMatrix(workloadId));
  }
  return {
    matrices,
    structure: {
      workloadCaptures: matrices.size,
      deliberateRepeatCaptures: 0,
      producerLaunches: matrices.size * 6,
    },
  };
}
