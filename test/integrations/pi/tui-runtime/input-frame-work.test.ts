import { describe, expect, it } from "vitest";
import { inputStableWork } from "../../../support/input-responsiveness/input-frame-work.js";
import type { InputCheckpointFrames, InputCompositionFrame, InputFrameCause } from "../../../support/input-responsiveness/input-frame-evidence.js";
import type { InputProducerCheckpoint } from "../../../support/input-responsiveness/input-producer.js";
import { assertInputFrameEvidence } from "../../../support/input-responsiveness/input-frame-validation.js";
import { assertInputResponsivenessMatrix, type InputResponsivenessMatrix } from "../../../support/input-responsiveness/input-matrix.js";

function capture(causes: readonly InputFrameCause[], renders: readonly number[]) {
  let count = 0;
  const frames: InputCompositionFrame[] = causes.map((cause, sequence) => {
    const renderStart = count; count += renders[sequence]!;
    return { sequence, frameId: sequence + 1, cause, revision: sequence + 1, renderStart, renderEnd: count,
      writeStart: sequence, writeEnd: sequence + 1, columns: 80, rows: 24,
      transcript: { rowStart: 1, rowEnd: 18 }, dock: { rowStart: 19, rowEnd: 24 } };
  });
  const checkpoint: InputProducerCheckpoint & { frameEvidence: InputCheckpointFrames } = {
    name: "mixed", writeStart: 0, writeEnd: frames.length, columns: 80, rows: 24, text: "x", actions: [], selected: null,
    viewportCause: causes.at(-1) ?? null, viewportTranscript: frames[0]?.transcript ?? null, viewportDock: frames[0]?.dock ?? null,
    viewportCompositions: { full: 1, dockOnly: 1 }, transcriptBlockRenders: count,
    frameEvidence: { compositionStart: 0, compositionEnd: frames.length, renderStart: 0, renderEnd: count, frames, controlWrites: [] },
  };
  const writes = frames.map((frame, index) => ({ atMs: index, data: `\u001b[${renders[index] ? 1 : 20};1H${frame.cause}` }));
  return { checkpoint, writes };
}

describe("frame-attributed stable input work", () => {
  it("does not charge a preceding stream render and paint to the last dock frame", () => {
    const { checkpoint, writes } = capture(["steady", "dock-input"], [1, 0]);
    expect(inputStableWork([checkpoint], writes)).toMatchObject({ stableTranscriptBlockRenders: 0, stableTranscriptPaintedRows: 0 });
  });
  it.each(["steady", "geometry-change"] as const)("does not hide a dock violation before a later %s frame", cause => {
    const { checkpoint, writes } = capture(["dock-input", cause], [1, 0]);
    const result = inputStableWork([checkpoint], writes);
    expect(result).toMatchObject({ stableTranscriptBlockRenders: 1, stableTranscriptPaintedRows: 1,
      firstViolation: { checkpoint: "mixed", producer: "bare-a1", expected: 0, frame: { sequence: 0, cause: "dock-input", writeStart: 0, writeEnd: 1 } } });
  });

  it("reports bounded frame identity from the failing capture without exposing terminal content", () => {
    const { checkpoint, writes } = capture(["dock-input", "steady"], [1, 0]);
    writes[0] = { data: "\u001b[1;1Hprivate-transcript-content", atMs: 0 };
    const work = inputStableWork([checkpoint], writes);
    const matrix: InputResponsivenessMatrix = {
      schema: "a1-input-responsiveness-matrix-v1", workloadId: "smoke-menu-stream", producers: [], semanticParity: true, firstDivergence: null,
      stableWorkViolation: work.firstViolation,
      bareStructure: { stableTranscriptBlockRenders: work.stableTranscriptBlockRenders, stableTranscriptPaintedRows: work.stableTranscriptPaintedRows,
        unexpectedFullscreenClears: work.unexpectedFullscreenClears, semanticParity: true, maximumPendingPresentations: 0, finalBacklog: 0, staleFramesAfterDrain: 0, inputTurns: 1, inputDrivenFrames: 1 },
    };
    let message = "";
    try { assertInputResponsivenessMatrix(matrix); } catch (error) { message = (error as Error).message; }
    expect(message).toContain("smoke-menu-stream: stable transcript block renders are 1");
    for (const detail of ['"producer":"bare-a1"', '"checkpoint":"mixed"', '"frameId":1', '"cause":"dock-input"', '"expected":0', '"writeStart":0', '"transcript":']) expect(message).toContain(detail);
    expect(message).not.toContain("private-transcript-content");
    expect(message.length).toBeLessThan(2048);
  });

  it("counts a render even when the composition writes nothing", () => {
    const { checkpoint } = capture(["dock-input"], [1]);
    Object.assign(checkpoint, { writeEnd: 0 });
    Object.assign(checkpoint.frameEvidence.frames[0]!, { writeEnd: 0 });
    expect(inputStableWork([checkpoint], [])).toMatchObject({ stableTranscriptBlockRenders: 1, stableTranscriptPaintedRows: 0 });
  });

  it("uses each frame's transcript region for paint rather than the checkpoint's final geometry", () => {
    const { checkpoint, writes } = capture(["dock-input", "geometry-change"], [0, 0]);
    writes[0] = { data: "\u001b[12;1Hchanged", atMs: 0 };
    Object.assign(checkpoint, { viewportTranscript: { rowStart: 1, rowEnd: 10 } });
    Object.assign(checkpoint.frameEvidence.frames[1]!, { transcript: { rowStart: 1, rowEnd: 10 }, dock: { rowStart: 11, rowEnd: 24 } });
    expect(inputStableWork([checkpoint], writes)).toMatchObject({ stableTranscriptBlockRenders: 0, stableTranscriptPaintedRows: 1 });
  });

  it("retains standalone cursor controls without inventing a frame", () => {
    const { checkpoint } = capture([], []);
    Object.assign(checkpoint, { writeEnd: 1, viewportCause: null, viewportTranscript: null, viewportDock: null });
    Object.assign(checkpoint.frameEvidence, { controlWrites: [0] });
    expect(inputStableWork([checkpoint], [{ data: "\u001b[?25l", atMs: 0 }])).toMatchObject({ stableTranscriptBlockRenders: 0, stableTranscriptPaintedRows: 0 });
  });
});

describe("frame evidence conservation", () => {
  const corruptions: readonly [string, (checkpoint: ReturnType<typeof capture>["checkpoint"]) => void][] = [
    ["missing evidence", checkpoint => Object.assign(checkpoint, { frameEvidence: null })],
    ["missing frame", checkpoint => Object.assign(checkpoint.frameEvidence, { frames: [] })],
    ["duplicate sequence", checkpoint => Object.assign(checkpoint.frameEvidence.frames[1]!, { sequence: 0 })],
    ["duplicate identity", checkpoint => Object.assign(checkpoint.frameEvidence.frames[1]!, { frameId: 1 })],
    ["unknown cause", checkpoint => Object.assign(checkpoint.frameEvidence.frames[0]!, { cause: "ignored" })],
    ["negative counter", checkpoint => Object.assign(checkpoint.frameEvidence.frames[0]!, { renderStart: -1 })],
    ["nonfinite counter", checkpoint => Object.assign(checkpoint.frameEvidence.frames[0]!, { renderEnd: NaN })],
    ["reversed counter", checkpoint => Object.assign(checkpoint.frameEvidence.frames[1]!, { renderEnd: 0 })],
    ["missing renders", checkpoint => Object.assign(checkpoint.frameEvidence, { renderEnd: 2 })],
    ["counter discontinuity", checkpoint => Object.assign(checkpoint.frameEvidence.frames[1]!, { renderStart: 0 })],
    ["overlapping writes", checkpoint => Object.assign(checkpoint.frameEvidence.frames[1]!, { writeStart: 0 })],
    ["out-of-range write", checkpoint => Object.assign(checkpoint.frameEvidence.frames[1]!, { writeEnd: 3 })],
    ["unaccounted write", checkpoint => Object.assign(checkpoint.frameEvidence.frames[1]!, { writeEnd: 1 })],
    ["duplicate write owner", checkpoint => Object.assign(checkpoint.frameEvidence, { controlWrites: [0] })],
    ["paint disguised as control", checkpoint => { Object.assign(checkpoint.frameEvidence.frames[0]!, { writeEnd: 0 }); Object.assign(checkpoint.frameEvidence, { controlWrites: [0] }); }],
    ["invalid viewport", checkpoint => Object.assign(checkpoint.frameEvidence.frames[0]!, { transcript: { rowStart: 1, rowEnd: 25 } })],
    ["negative write index", checkpoint => Object.assign(checkpoint.frameEvidence.frames[0]!, { writeStart: -1 })],
    ["missing transcript region", checkpoint => Object.assign(checkpoint.frameEvidence.frames[0]!, { transcript: null })],
  ];
  it.each(corruptions)("rejects %s", (_name, corrupt) => {
    const { checkpoint, writes } = capture(["steady", "dock-input"], [1, 0]);
    corrupt(checkpoint);
    expect(() => assertInputFrameEvidence([checkpoint], writes)).toThrow("invalid input frame evidence");
  });
  it("checks continuity between checkpoints", () => {
    const { checkpoint, writes } = capture(["dock-input"], [0]);
    expect(() => assertInputFrameEvidence([checkpoint, checkpoint], writes)).toThrow("discontinuous checkpoint writes");
  });
});
