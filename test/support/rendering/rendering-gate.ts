import { runRenderingMatrix, type RenderingMatrixResult } from "./rendering-matrix.js";

export interface RenderingGateCapture {
  readonly matrices: ReadonlyMap<string, RenderingMatrixResult>;
  readonly repeated: RenderingMatrixResult | null;
  readonly structure: {
    readonly workloadCaptures: number;
    readonly deliberateRepeatCaptures: number;
    readonly producerLaunches: number;
  };
}

/** Captures each requested workload once and only repeats the declared determinism workload. */
export async function captureRenderingGate(
  workloadIds: readonly string[],
  determinismWorkloadId: string | null,
): Promise<RenderingGateCapture> {
  const matrices = new Map<string, RenderingMatrixResult>();
  for (const workloadId of workloadIds) {
    if (matrices.has(workloadId)) throw new TypeError(`duplicate rendering workload: ${workloadId}`);
    matrices.set(workloadId, await runRenderingMatrix(workloadId));
  }
  if (determinismWorkloadId !== null && !matrices.has(determinismWorkloadId)) {
    throw new TypeError(`determinism workload was not captured: ${determinismWorkloadId}`);
  }
  const repeated = determinismWorkloadId === null ? null : await runRenderingMatrix(determinismWorkloadId);
  return {
    matrices,
    repeated,
    structure: {
      workloadCaptures: matrices.size,
      deliberateRepeatCaptures: repeated === null ? 0 : 1,
      producerLaunches: (matrices.size + (repeated === null ? 0 : 1)) * 6,
    },
  };
}
