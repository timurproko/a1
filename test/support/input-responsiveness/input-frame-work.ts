import { classifyTerminalPaint, type TimedTerminalWrite } from "../rendering/terminal-paint-evidence.js";
import type { InputProducerCheckpoint } from "./input-producer.js";
import type { InputCompositionFrame } from "./input-frame-evidence.js";
import { assertInputFrameEvidence } from "./input-frame-validation.js";

export interface InputFrameViolation {
  readonly producer: "bare-a1";
  readonly checkpoint: string;
  readonly frame: InputCompositionFrame;
  readonly expected: 0;
  readonly renders: number;
  readonly paintedRows: number;
  readonly unexpectedClears: number;
}

/** Derives work from original frame causes; real dock violations cannot be hidden by later frames. */
export function inputStableWork(checkpoints: readonly InputProducerCheckpoint[], writes: readonly TimedTerminalWrite[]) {
  assertInputFrameEvidence(checkpoints, writes);
  let stableTranscriptBlockRenders = 0;
  let stableTranscriptPaintedRows = 0;
  let unexpectedFullscreenClears = 0;
  let firstViolation: InputFrameViolation | null = null;
  for (const checkpoint of checkpoints) {
    for (const frame of checkpoint.frameEvidence!.frames) {
      const paint = classifyTerminalPaint(writes.slice(frame.writeStart, frame.writeEnd));
      const stable = frame.cause === "dock-input";
      const renders = stable ? frame.renderEnd - frame.renderStart : 0;
      const region = frame.transcript;
      const paintedRows = stable && region ? paint.addressedRowWrites.filter(row => row >= region.rowStart && row <= region.rowEnd).length : 0;
      const unexpectedClears = frame.cause === "geometry-change" ? 0 : paint.fullScreenClears;
      stableTranscriptBlockRenders += renders;
      stableTranscriptPaintedRows += paintedRows;
      unexpectedFullscreenClears += unexpectedClears;
      if (firstViolation === null && (renders > 0 || paintedRows > 0 || unexpectedClears > 0)) {
        firstViolation = { producer: "bare-a1", checkpoint: checkpoint.name, frame, expected: 0, renders, paintedRows, unexpectedClears };
      }
    }
  }
  return { stableTranscriptBlockRenders, stableTranscriptPaintedRows, unexpectedFullscreenClears, firstViolation };
}
