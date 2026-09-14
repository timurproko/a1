import type { TimedTerminalWrite } from "../rendering/terminal-paint-evidence.js";
import type { InputProducerCheckpoint } from "./input-producer.js";
import type { InputFrameRegion } from "./input-frame-evidence.js";

const causes = new Set(["initial", "steady", "dock-input", "follow-shift", "detached", "geometry-change"]);
const MAX_COMPOSITIONS = 4096;

/** Only standalone cursor visibility controls may occur without a composed frame in the measured window. */
export function isInputNonFrameControl(data: string): boolean { return /^(?:\u001b\[\?25[hl])+$/.test(data); }

/** Validates conservation against raw checkpoint counters/writes, never assuming absent evidence is zero. */
export function assertInputFrameEvidence(checkpoints: readonly InputProducerCheckpoint[], writes: readonly TimedTerminalWrite[], required = true): void {
  if (!Array.isArray(checkpoints) || checkpoints.length === 0 || !Array.isArray(writes)) fail("missing checkpoints or writes");
  for (const write of writes) {
    if (!write || typeof write.data !== "string" || !Number.isFinite(write.atMs) || write.atMs < 0) fail("invalid raw terminal write");
  }
  let previousWriteEnd: number | undefined;
  let previousRenderEnd: number | undefined;
  let nextSequence = 0;
  let previousFrameId = -1;
  for (const checkpoint of checkpoints) {
    if (!checkpoint || typeof checkpoint.name !== "string" || checkpoint.name.length > 128) fail("invalid checkpoint identity");
    range(checkpoint.writeStart, checkpoint.writeEnd, writes.length, "checkpoint writes");
    if (previousWriteEnd !== undefined && checkpoint.writeStart !== previousWriteEnd) fail("discontinuous checkpoint writes");
    previousWriteEnd = checkpoint.writeEnd;
    const evidence = checkpoint.frameEvidence;
    if (!required) {
      if (evidence !== null) fail("unexpected comparison producer frame evidence");
      continue;
    }
    if (!evidence || !Array.isArray(evidence.frames) || !Array.isArray(evidence.controlWrites)) fail("missing frame evidence");
    integer(evidence.renderStart, "render start"); integer(evidence.renderEnd, "render end");
    integer(evidence.compositionStart, "composition start"); integer(evidence.compositionEnd, "composition end");
    if (evidence.compositionStart !== nextSequence || evidence.compositionEnd > MAX_COMPOSITIONS
      || evidence.compositionEnd - evidence.compositionStart !== evidence.frames.length) fail("composition coverage disagrees");
    if (previousRenderEnd !== undefined && evidence.renderStart !== previousRenderEnd) fail("discontinuous render counters");
    if (evidence.renderEnd < evidence.renderStart || checkpoint.transcriptBlockRenders !== evidence.renderEnd - evidence.renderStart) fail("checkpoint render delta disagrees");
    const owners = new Set<number>();
    let count = evidence.renderStart;
    let boundary = checkpoint.writeStart;
    for (const frame of evidence.frames) {
      if (!frame || frame.sequence !== nextSequence++) fail("missing or duplicate frame sequence");
      integer(frame.frameId, "frame identity"); integer(frame.revision, "input revision");
      integer(frame.renderStart, "frame render start"); integer(frame.renderEnd, "frame render end");
      if (frame.frameId <= previousFrameId) fail("frame identity is not increasing");
      previousFrameId = frame.frameId;
      if (!causes.has(frame.cause)) fail("unknown frame cause");
      if (frame.renderStart !== count || frame.renderEnd < frame.renderStart) fail("unaccounted or reversed frame renders");
      count = frame.renderEnd;
      if (!Number.isSafeInteger(frame.columns) || frame.columns < 1 || !Number.isSafeInteger(frame.rows) || frame.rows < 1) fail("invalid frame geometry");
      region(frame.transcript, frame.rows); region(frame.dock, frame.rows);
      let nextRow = 1;
      for (const area of [frame.transcript, frame.dock]) {
        if (area === null) continue;
        if (area.rowStart !== nextRow) fail("viewport regions do not partition the frame");
        nextRow = area.rowEnd + 1;
      }
      if (nextRow !== frame.rows + 1) fail("unaccounted viewport rows");
      range(frame.writeStart, frame.writeEnd, checkpoint.writeEnd, "frame writes");
      if (frame.writeStart < boundary) fail("overlapping or reversed frame writes");
      boundary = frame.writeEnd;
      for (let index = frame.writeStart; index < frame.writeEnd; index++) own(index, owners, checkpoint.writeStart, checkpoint.writeEnd);
    }
    if (count !== evidence.renderEnd) fail("unaccounted transcript render delta");
    let previousControl = -1;
    for (const index of evidence.controlWrites) {
      integer(index, "control write index");
      if (index <= previousControl) fail("reversed or duplicate control writes");
      previousControl = index;
      own(index, owners, checkpoint.writeStart, checkpoint.writeEnd);
      if (!isInputNonFrameControl(writes[index]!.data)) fail("unattributed terminal paint or unknown control");
    }
    if (owners.size !== checkpoint.writeEnd - checkpoint.writeStart) fail("unaccounted terminal writes");
    previousRenderEnd = evidence.renderEnd;
  }
}
function own(index: number, owners: Set<number>, start: number, end: number): void {
  if (index < start || index >= end || owners.has(index)) fail("missing or duplicate write ownership");
  owners.add(index);
}
function integer(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) fail(`invalid ${name}`);
}
function range(start: number, end: number, maximum: number, name: string): void {
  integer(start, name); integer(end, name);
  if (start > end || end > maximum) fail(`invalid ${name} range`);
}
function region(value: InputFrameRegion | null, height: number): void {
  if (value === null) return;
  if (!value || !Number.isSafeInteger(value.rowStart) || !Number.isSafeInteger(value.rowEnd)
    || value.rowStart < 1 || value.rowEnd < value.rowStart || value.rowEnd > height) fail("invalid viewport region");
}
function fail(reason: string): never { throw new Error(`invalid input frame evidence: ${reason}`); }
