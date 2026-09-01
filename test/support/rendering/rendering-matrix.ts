import {
  classifyTerminalPaint,
  replayTerminalCheckpoints,
  type TerminalCellFrame,
  type TerminalPaintClassification,
} from "./terminal-paint-evidence.js";
import {
  runRenderingProducer,
  type RenderingMode,
  type RenderingProducerId,
  type RenderingProducerRequest,
  type RenderingProducerResult,
} from "./rendering-producer.js";
import { STREAM_RENDERING_WORKLOADS } from "./streaming-workloads.js";

export interface RenderingMatrixCheckpoint {
  readonly name: string;
  readonly paint: TerminalPaintClassification;
  readonly cellFrame: TerminalCellFrame;
  readonly damageDecision?: RenderingProducerResult["checkpoints"][number]["damageDecision"];
}

export interface RenderingMatrixProducerResult {
  readonly producer: RenderingProducerId;
  readonly requestedMode: RenderingMode;
  readonly effectiveMode: RenderingMode;
  readonly checkpoints: readonly RenderingMatrixCheckpoint[];
}

export interface RenderingMatrixResult {
  readonly schema: "a1-rendering-stability-matrix-v1";
  readonly workloadId: string;
  readonly geometry: { readonly columns: number; readonly rows: number };
  readonly defaultMode: readonly RenderingMatrixProducerResult[];
  readonly fullscreenMode: readonly RenderingMatrixProducerResult[];
  readonly comparisonSemanticParity: { readonly regular: boolean; readonly fullscreen: boolean };
  readonly findings: {
    readonly bareA1MaximumRowClearsPerStreamCheckpoint: number;
    readonly bareA1UnexpectedFullScreenClears: number;
    readonly safeShiftCheckpoints: readonly string[];
    readonly dockGeometry: readonly {
      readonly checkpoint: string;
      readonly rowStart: number;
      readonly rowEnd: number;
    }[];
  };
}

export async function runRenderingMatrix(workloadId: string): Promise<RenderingMatrixResult> {
  const workload = STREAM_RENDERING_WORKLOADS.find(candidate => candidate.id === workloadId);
  if (workload === undefined) throw new TypeError(`unknown rendering workload: ${workloadId}`);
  const defaultRaw = await runMode(workloadId, "regular", workload.columns, workload.rows);
  const fullscreenRaw = await runMode(workloadId, "fullscreen", workload.columns, workload.rows);
  const defaultMode = await Promise.all(defaultRaw.map(result => summarize(result, "regular")));
  const fullscreenMode = await Promise.all(fullscreenRaw.map(result => summarize(result, "fullscreen")));
  const bare = fullscreenMode.find(result => result.producer === "bare-a1")!;
  const streamCheckpoints = new Set(workload.steps
    .filter(step => step.action.type === "event" && step.action.value.type === "message_update")
    .map(step => step.checkpoint));
  const streamPaint = bare.checkpoints.filter(checkpoint => streamCheckpoints.has(checkpoint.name));
  return {
    schema: "a1-rendering-stability-matrix-v1",
    workloadId,
    geometry: { columns: workload.columns, rows: workload.rows },
    defaultMode,
    fullscreenMode,
    comparisonSemanticParity: {
      regular: sameTranscript(defaultRaw[1]!, defaultRaw[2]!),
      fullscreen: sameTranscript(fullscreenRaw[1]!, fullscreenRaw[2]!),
    },
    findings: {
      bareA1MaximumRowClearsPerStreamCheckpoint: Math.max(0, ...streamPaint.map(checkpoint => checkpoint.paint.rowClears)),
      bareA1UnexpectedFullScreenClears: streamPaint.reduce((total, checkpoint) => total + checkpoint.paint.fullScreenClears, 0),
      safeShiftCheckpoints: defaultRaw[0]!.checkpoints
        .filter(checkpoint => checkpoint.viewport?.safeVerticalShift === true)
        .map(checkpoint => checkpoint.name),
      dockGeometry: defaultRaw[0]!.checkpoints.flatMap(checkpoint => checkpoint.viewport?.dock === null
        || checkpoint.viewport?.dock === undefined
        ? []
        : [{
            checkpoint: checkpoint.name,
            rowStart: checkpoint.viewport.dock.rowStart,
            rowEnd: checkpoint.viewport.dock.rowEnd,
          }]),
    },
  };
}

async function runMode(
  workloadId: string,
  mode: RenderingMode,
  columns: number,
  rows: number,
): Promise<readonly RenderingProducerResult[]> {
  const results: RenderingProducerResult[] = [];
  // Concurrency: deliberately serialize cold TypeScript workers. Parallel imports contend on
  // Windows and made the evidence command fail nondeterministically despite a healthy producer.
  for (const producer of ["bare-a1", "a1-pi", "pinned-pi"] as const) {
    results.push(await runRenderingProducer({
      producer,
      mode,
      workloadId,
      state: {
        profileId: producer === "bare-a1" ? "a1" : "pi",
        cwd: process.cwd(),
        theme: "dark",
        columns,
        rows,
        synchronizedUpdates: true,
      },
    } satisfies RenderingProducerRequest));
  }
  return results;
}

async function summarize(result: RenderingProducerResult, requestedMode: RenderingMode): Promise<RenderingMatrixProducerResult> {
  const cellFrames = await replayTerminalCheckpoints(result.writes, result.checkpoints.map(checkpoint => ({
    writeEnd: checkpoint.writeEnd,
    columns: checkpoint.columns,
    rows: checkpoint.rows,
  })));
  let writeStart = 0;
  return {
    producer: result.producer,
    requestedMode,
    effectiveMode: result.effectiveMode,
    checkpoints: result.checkpoints.map((checkpoint, index) => {
      const writes = result.writes.slice(writeStart, checkpoint.writeEnd);
      writeStart = checkpoint.writeEnd;
      return {
        name: checkpoint.name,
        paint: classifyTerminalPaint(writes),
        cellFrame: cellFrames[index]!,
        ...(checkpoint.damageDecision === undefined ? {} : { damageDecision: checkpoint.damageDecision }),
      };
    }),
  };
}

function sameTranscript(left: RenderingProducerResult, right: RenderingProducerResult): boolean {
  return left.checkpoints.length === right.checkpoints.length && left.checkpoints.every((checkpoint, index) => {
    const other = right.checkpoints[index];
    return checkpoint.name === other?.name && JSON.stringify(checkpoint.transcript) === JSON.stringify(other.transcript);
  });
}
