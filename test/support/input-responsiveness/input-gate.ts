import {
  inputResponsivenessMatrixFromResults,
  type InputResponsivenessMatrix,
} from "./input-matrix.js";
import { runInputProducerBatch, type InputProducerResult } from "./input-producer.js";
import { INPUT_RESPONSIVENESS_WORKLOADS, type InputWorkloadTier } from "./input-workloads.js";

export interface InputResponsivenessGateCapture {
  readonly matrices: ReadonlyMap<string, InputResponsivenessMatrix>;
  readonly structure: {
    readonly workloadCaptures: number;
    readonly deliberateRepeatCaptures: number;
    readonly producerLaunches: number;
  };
}

/** Captures each tier workload once while product assertions evaluate semantic and bounded behavior. */
export async function captureInputResponsivenessGate(tier: InputWorkloadTier): Promise<InputResponsivenessGateCapture> {
  const workloads = INPUT_RESPONSIVENESS_WORKLOADS.filter(workload => tier === "full" || workload.tier === "smoke");
  const workloadIds = workloads.map(workload => workload.id);
  const byWorkload = new Map(workloadIds.map(id => [id, [] as InputProducerResult[]]));
  for (const producer of ["bare-a1", "a1-pi", "pinned-pi"] as const) {
    const batch = await runInputProducerBatch({ producer, workloadIds, state: { cwd: process.cwd(), theme: "dark" } });
    for (const result of batch.results) byWorkload.get(result.workloadId)!.push(result);
  }
  const matrices = new Map<string, InputResponsivenessMatrix>();
  for (const workloadId of workloadIds) {
    matrices.set(workloadId, await inputResponsivenessMatrixFromResults(workloadId, byWorkload.get(workloadId)!));
  }
  return {
    matrices,
    structure: {
      workloadCaptures: matrices.size,
      deliberateRepeatCaptures: 0,
      producerLaunches: 3,
    },
  };
}
