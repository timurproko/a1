import { describe, expect, it } from "vitest";
import {
  assertInputResponsivenessBudgets,
  type InputResponsivenessStructure,
} from "../../../support/input-responsiveness/input-budgets.js";

const PASSING: InputResponsivenessStructure = {
  semanticParity: true,
  maximumPendingPresentations: 1,
  finalBacklog: 0,
  staleFramesAfterDrain: 0,
  inputTurns: 3,
  inputDrivenFrames: 3,
  stableTranscriptBlockRenders: 0,
  stableTranscriptPaintedRows: 0,
  unexpectedFullscreenClears: 0,
};

describe("input responsiveness budgets", () => {
  it("accepts one current-state frame per turn with no stale transcript work", () => {
    expect(() => assertInputResponsivenessBudgets(PASSING)).not.toThrow();
  });

  it.each([
    ["semanticParity", false, /semantic parity/u],
    ["maximumPendingPresentations", 2, /pending keyboard/u],
    ["finalBacklog", 1, /final accepted/u],
    ["staleFramesAfterDrain", 1, /stale keyboard/u],
    ["inputDrivenFrames", 4, /turn budget/u],
    ["stableTranscriptBlockRenders", 1, /block renders/u],
    ["stableTranscriptPaintedRows", 1, /painted rows/u],
    ["unexpectedFullscreenClears", 1, /fullscreen clears/u],
  ] as const)("rejects an independent %s violation", (key, value, message) => {
    expect(() => assertInputResponsivenessBudgets({ ...PASSING, [key]: value })).toThrow(message);
  });
});
