export const INPUT_RESPONSIVENESS_BUDGETS = Object.freeze({
  maximumPendingPresentations: 1,
  finalBacklog: 0,
  staleFramesAfterDrain: 0,
  framesPerInputTurn: 1,
  stableTranscriptBlockRenders: 0,
  stableTranscriptPaintedRows: 0,
  unexpectedFullscreenClears: 0,
});

export interface InputResponsivenessStructure {
  readonly semanticParity: boolean;
  readonly maximumPendingPresentations: number;
  readonly finalBacklog: number;
  readonly staleFramesAfterDrain: number;
  readonly inputTurns: number;
  readonly inputDrivenFrames: number;
  readonly stableTranscriptBlockRenders: number;
  readonly stableTranscriptPaintedRows: number;
  readonly unexpectedFullscreenClears: number;
}

/** Throws one bounded diagnostic for the first deterministic responsiveness violation. */
export function assertInputResponsivenessBudgets(structure: InputResponsivenessStructure): void {
  if (!structure.semanticParity) throw new Error("input semantic parity failed");
  assertNonNegativeStructure(structure);
  if (structure.maximumPendingPresentations > INPUT_RESPONSIVENESS_BUDGETS.maximumPendingPresentations) {
    throw new Error(`pending keyboard presentations ${structure.maximumPendingPresentations} exceed 1`);
  }
  if (structure.finalBacklog !== INPUT_RESPONSIVENESS_BUDGETS.finalBacklog) {
    throw new Error(`final accepted-but-unpresented backlog is ${structure.finalBacklog}`);
  }
  if (structure.staleFramesAfterDrain !== INPUT_RESPONSIVENESS_BUDGETS.staleFramesAfterDrain) {
    throw new Error(`post-drain stale keyboard frames are ${structure.staleFramesAfterDrain}`);
  }
  const frameBudget = structure.inputTurns * INPUT_RESPONSIVENESS_BUDGETS.framesPerInputTurn;
  if (structure.inputDrivenFrames > frameBudget) {
    throw new Error(`input-driven frames ${structure.inputDrivenFrames} exceed turn budget ${frameBudget}`);
  }
  if (structure.stableTranscriptBlockRenders !== INPUT_RESPONSIVENESS_BUDGETS.stableTranscriptBlockRenders) {
    throw new Error(`stable transcript block renders are ${structure.stableTranscriptBlockRenders}`);
  }
  if (structure.stableTranscriptPaintedRows !== INPUT_RESPONSIVENESS_BUDGETS.stableTranscriptPaintedRows) {
    throw new Error(`stable transcript painted rows are ${structure.stableTranscriptPaintedRows}`);
  }
  if (structure.unexpectedFullscreenClears !== INPUT_RESPONSIVENESS_BUDGETS.unexpectedFullscreenClears) {
    throw new Error(`unexpected fullscreen clears are ${structure.unexpectedFullscreenClears}`);
  }
}

function assertNonNegativeStructure(structure: InputResponsivenessStructure): void {
  for (const [key, value] of Object.entries(structure)) {
    if (key === "semanticParity") continue;
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`input responsiveness ${key} is invalid`);
  }
}
