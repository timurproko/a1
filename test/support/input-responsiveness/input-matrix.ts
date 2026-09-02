import { classifyPiTuiInput } from "../../../src/integrations/pi/tui-runtime/index.js";
import { classifyTerminalPaint, replayTerminalCheckpoints, type TerminalCellFrame } from "../rendering/terminal-paint-evidence.js";
import { assertInputResponsivenessBudgets, type InputResponsivenessStructure } from "./input-budgets.js";
import { analyzeInputPhaseEvidence, type InputPhaseEvidence } from "./input-phase-evidence.js";
import { runInputProducer, type InputProducerCheckpoint, type InputProducerResult } from "./input-producer.js";
import { INPUT_RESPONSIVENESS_WORKLOADS } from "./input-workloads.js";

export interface InputMatrixProducerResult {
  readonly producer: InputProducerResult["producer"];
  readonly processId: number;
  readonly phases: InputPhaseEvidence;
  readonly checkpoints: readonly (InputProducerCheckpoint & {
    readonly cellFrame: TerminalCellFrame;
    readonly paint: ReturnType<typeof classifyTerminalPaint>;
  })[];
  readonly diagnostics: {
    readonly firstStateInputToWriteMs: number | null;
    readonly finalStateInputToWriteMs: number | null;
    readonly semanticMs: readonly number[];
    readonly compositionMs: readonly number[];
    readonly writeMs: readonly number[];
  };
}

export interface InputResponsivenessMatrix {
  readonly schema: "a1-input-responsiveness-matrix-v1";
  readonly workloadId: string;
  readonly producers: readonly InputMatrixProducerResult[];
  readonly semanticParity: boolean;
  readonly bareStructure: InputResponsivenessStructure;
  readonly firstDivergence: string | null;
}

/** Captures one workload once per independent producer and derives all applicable assertions. */
export async function runInputResponsivenessMatrix(workloadId: string): Promise<InputResponsivenessMatrix> {
  const workload = INPUT_RESPONSIVENESS_WORKLOADS.find(candidate => candidate.id === workloadId);
  if (workload === undefined) throw new TypeError(`unknown input workload: ${workloadId}`);
  const raw: InputProducerResult[] = [];
  for (const producer of ["bare-a1", "a1-pi", "pinned-pi"] as const) {
    raw.push(await runInputProducer({
      producer,
      workloadId,
      state: { cwd: process.cwd(), columns: workload.columns, rows: workload.rows, theme: "dark" },
    }));
  }
  return inputResponsivenessMatrixFromResults(workloadId, raw);
}

/** Derives one immutable matrix from already-isolated producer results. */
export async function inputResponsivenessMatrixFromResults(
  workloadId: string,
  raw: readonly InputProducerResult[],
): Promise<InputResponsivenessMatrix> {
  const workload = INPUT_RESPONSIVENESS_WORKLOADS.find(candidate => candidate.id === workloadId);
  if (workload === undefined) throw new TypeError(`unknown input workload: ${workloadId}`);
  if (raw.length !== 3 || raw.some((result, index) => result.workloadId !== workloadId
    || result.producer !== (["bare-a1", "a1-pi", "pinned-pi"] as const)[index])) {
    throw new TypeError("input matrix producer results are incomplete or out of order");
  }
  const producers: InputMatrixProducerResult[] = [];
  for (const result of raw) producers.push(await summarize(
    result,
    workload.expectedInputRevisions,
    workload.expectedPresentedRevision ?? workload.expectedInputRevisions,
  ));
  const semanticParity = sameSemantics(raw[0]!, raw[1]!) && sameSemantics(raw[1]!, raw[2]!);
  const firstDivergence = semanticParity ? null : describeFirstDivergence(raw);
  const bare = producers[0]!;
  const bareRaw = raw[0]!;
  const inputTurns = inputPresentationOpportunities(workload);
  const stableTranscriptBlockRenders = bareRaw.checkpoints
    .filter(checkpoint => checkpoint.viewportCause === "dock-input")
    .reduce((total, checkpoint) => total + (checkpoint.transcriptBlockRenders ?? 0), 0);
  let stableTranscriptPaintedRows = 0;
  for (const checkpoint of bare.checkpoints) {
    if (checkpoint.viewportCause !== "dock-input" || checkpoint.viewportTranscript === null) continue;
    stableTranscriptPaintedRows += checkpoint.paint.addressedRowWrites.filter(row =>
      row >= checkpoint.viewportTranscript!.rowStart && row <= checkpoint.viewportTranscript!.rowEnd).length;
  }
  const structure: InputResponsivenessStructure = {
    semanticParity,
    maximumPendingPresentations: bare.phases.maximumPendingPresentationDepth,
    finalBacklog: bare.phases.finalBacklog,
    staleFramesAfterDrain: bare.phases.staleFrames,
    inputTurns,
    inputDrivenFrames: new Set(bare.phases.presentedRevisions).size,
    stableTranscriptBlockRenders,
    stableTranscriptPaintedRows,
    unexpectedFullscreenClears: bare.checkpoints
      .filter(checkpoint => checkpoint.viewportCause !== "geometry-change")
      .reduce((total, checkpoint) => total + checkpoint.paint.fullScreenClears, 0),
  };
  return {
    schema: "a1-input-responsiveness-matrix-v1",
    workloadId,
    producers,
    semanticParity,
    bareStructure: structure,
    firstDivergence,
  };
}

export function assertInputResponsivenessMatrix(matrix: InputResponsivenessMatrix): void {
  if (matrix.firstDivergence !== null) throw new Error(matrix.firstDivergence);
  assertInputResponsivenessBudgets(matrix.bareStructure);
}

async function summarize(
  result: InputProducerResult,
  expectedRevision: number,
  expectedPresentedRevision: number,
): Promise<InputMatrixProducerResult> {
  const frames = await replayTerminalCheckpoints(result.writes, result.checkpoints.map(checkpoint => ({
    writeEnd: checkpoint.writeEnd,
    columns: checkpoint.columns,
    rows: checkpoint.rows,
  })));
  const checkpoints = result.checkpoints.map((checkpoint, index) => {
    const writes = result.writes.slice(checkpoint.writeStart, checkpoint.writeEnd);
    return { ...checkpoint, cellFrame: frames[index]!, paint: classifyTerminalPaint(writes) };
  });
  const phases = analyzeInputPhaseEvidence(result.phases, expectedRevision, { expectedPresentedRevision });
  return {
    producer: result.producer,
    processId: result.processId,
    phases,
    checkpoints,
    diagnostics: {
      firstStateInputToWriteMs: phases.firstStateInputToWriteMs,
      finalStateInputToWriteMs: phases.finalStateInputToWriteMs,
      semanticMs: phases.phaseDurationsMs.semantic,
      compositionMs: phases.phaseDurationsMs.composition,
      writeMs: phases.phaseDurationsMs.write,
    },
  };
}

function inputPresentationOpportunities(workload: (typeof INPUT_RESPONSIVENESS_WORKLOADS)[number]): number {
  let opportunities = 0;
  const surface = workload.surface === "editor" ? "editor" : "owned";
  for (const turn of workload.turns) {
    let safePending = false;
    for (const action of turn.actions) {
      if (action.type !== "input") {
        if (safePending) opportunities += 1;
        safePending = false;
        continue;
      }
      if (classifyPiTuiInput(action.data, surface) === "safe") safePending = true;
      else {
        if (safePending) opportunities += 1;
        safePending = false;
        opportunities += 1;
      }
    }
    if (safePending) opportunities += 1;
  }
  return opportunities;
}

function sameSemantics(left: InputProducerResult, right: InputProducerResult): boolean {
  return left.checkpoints.length === right.checkpoints.length && left.checkpoints.every((checkpoint, index) => {
    const other = right.checkpoints[index];
    return checkpoint.name === other?.name
      && checkpoint.text === other.text
      && JSON.stringify(checkpoint.actions) === JSON.stringify(other.actions)
      && checkpoint.selected === other.selected;
  });
}

function describeFirstDivergence(results: readonly InputProducerResult[]): string {
  const reference = results[2]!;
  for (const candidate of results.slice(0, 2)) {
    for (let index = 0; index < Math.max(candidate.checkpoints.length, reference.checkpoints.length); index += 1) {
      const actual = candidate.checkpoints[index];
      const expected = reference.checkpoints[index];
      if (JSON.stringify(actual && { name: actual.name, text: actual.text, actions: actual.actions, selected: actual.selected })
        !== JSON.stringify(expected && { name: expected.name, text: expected.text, actions: expected.actions, selected: expected.selected })) {
        return `${candidate.producer} first semantic divergence at ${actual?.name ?? expected?.name ?? index}`;
      }
    }
  }
  return "input producer checkpoint count diverged";
}
