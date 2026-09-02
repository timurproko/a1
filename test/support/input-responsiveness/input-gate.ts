import {
  inputResponsivenessMatrixFromResults,
  type InputResponsivenessMatrix,
} from "./input-matrix.js";
import { runInputProducer, runInputProducerBatch, type InputProducerResult } from "./input-producer.js";
import { INPUT_RESPONSIVENESS_WORKLOADS, type InputWorkloadTier } from "./input-workloads.js";

export interface InputResponsivenessGateCapture {
  readonly matrices: ReadonlyMap<string, InputResponsivenessMatrix>;
  readonly repeated: InputResponsivenessMatrix | null;
  readonly structure: {
    readonly workloadCaptures: number;
    readonly deliberateRepeatCaptures: number;
    readonly producerLaunches: number;
  };
}

/** Captures each tier workload once; only full evidence repeats the declared deterministic smoke workload. */
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
  let repeated: InputResponsivenessMatrix | null = null;
  if (tier === "full") {
    const repeatedResults: InputProducerResult[] = [];
    const workload = INPUT_RESPONSIVENESS_WORKLOADS.find(candidate => candidate.id === "smoke-current-state")!;
    for (const producer of ["bare-a1", "a1-pi", "pinned-pi"] as const) {
      repeatedResults.push(await runInputProducer({
        producer,
        workloadId: workload.id,
        state: { cwd: process.cwd(), columns: workload.columns, rows: workload.rows, theme: "dark" },
      }));
    }
    repeated = await inputResponsivenessMatrixFromResults(workload.id, repeatedResults);
  }
  return {
    matrices,
    repeated,
    structure: {
      workloadCaptures: matrices.size,
      deliberateRepeatCaptures: repeated === null ? 0 : 1,
      producerLaunches: 3 + (repeated === null ? 0 : 3),
    },
  };
}

export function deterministicInputMatrixShape(matrix: InputResponsivenessMatrix): unknown {
  return {
    workloadId: matrix.workloadId,
    semanticParity: matrix.semanticParity,
    bareStructure: matrix.bareStructure,
    firstDivergence: matrix.firstDivergence,
    producers: matrix.producers.map(producer => ({
      producer: producer.producer,
      phases: {
        receivedRevisions: producer.phases.receivedRevisions,
        appliedRevisions: producer.phases.appliedRevisions,
        presentedRevisions: producer.phases.presentedRevisions,
        maximumPendingDepth: producer.phases.maximumPendingDepth,
        maximumPendingPresentationDepth: producer.phases.maximumPendingPresentationDepth,
        inputDrivenFrames: producer.phases.inputDrivenFrames,
        staleFrames: producer.phases.staleFrames,
        finalAppliedRevision: producer.phases.finalAppliedRevision,
        finalPresentedRevision: producer.phases.finalPresentedRevision,
        finalBacklog: producer.phases.finalBacklog,
      },
      checkpoints: producer.checkpoints.map(checkpoint => ({
        name: checkpoint.name,
        text: checkpoint.text,
        actions: checkpoint.actions,
        selected: checkpoint.selected,
        viewportCause: checkpoint.viewportCause,
        viewportCompositions: checkpoint.viewportCompositions,
        transcriptBlockRenders: checkpoint.transcriptBlockRenders,
        paint: {
          fullScreenClears: checkpoint.paint.fullScreenClears,
          rowClears: checkpoint.paint.rowClears,
          addressedRowWrites: checkpoint.paint.addressedRowWrites,
        },
        rows: checkpoint.cellFrame.rows,
      })),
    })),
  };
}
