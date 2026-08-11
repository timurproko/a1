import { createHash } from "node:crypto";
import type { TerminalSurface } from "../domain/index.js";

export interface CommittedTerminalFrame {
  readonly sourceCommitId: string;
  readonly committedAtMs: number;
  readonly surface: TerminalSurface;
  readonly complete: boolean;
}

export interface TerminalParityObservation {
  readonly frames: readonly CommittedTerminalFrame[];
  readonly inputToFrameLatencyMs: readonly number[];
  readonly sourceBytes: number;
  readonly hostBytes: number;
  readonly idleHostWriteCount: number;
  readonly finalRestorationPassed: boolean;
}

export interface TerminalParityMetrics {
  readonly directFrameCount: number;
  readonly hostedFrameCount: number;
  readonly maxHostedFramesPerSourceCommit: number;
  readonly outputAmplification: number;
  readonly directMeanLatencyMs: number;
  readonly hostedMeanLatencyMs: number;
  readonly directFrameJitterMs: number;
  readonly hostedFrameJitterMs: number;
}

export interface TerminalParityVerdict {
  readonly passed: boolean;
  readonly failures: readonly string[];
  readonly metrics: TerminalParityMetrics;
}

export interface TerminalParityLimits {
  readonly maxLatencyOverheadMs: number;
  readonly maxJitterOverheadMs: number;
  readonly maxOutputAmplification: number;
}

export const GENERIC_TERMINAL_PARITY_LIMITS: TerminalParityLimits = {
  maxLatencyOverheadMs: 16,
  maxJitterOverheadMs: 16,
  maxOutputAmplification: 8,
};

/** One workload-independent comparator used for every terminal application. */
export function compareTerminalParity(
  direct: TerminalParityObservation,
  hosted: TerminalParityObservation,
  limits: TerminalParityLimits = GENERIC_TERMINAL_PARITY_LIMITS,
): TerminalParityVerdict {
  const failures: string[] = [];
  const directByCommit = groupFrames(direct.frames);
  const hostedByCommit = groupFrames(hosted.frames);
  const directCommitOrder = [...directByCommit.keys()];
  const hostedCommitOrder = [...hostedByCommit.keys()];

  if (JSON.stringify(hostedCommitOrder) !== JSON.stringify(directCommitOrder)) {
    failures.push(`committed source timeline differs: direct=${directCommitOrder.join(",")} hosted=${hostedCommitOrder.join(",")}`);
  }
  for (const commitId of directCommitOrder) {
    const directFrames = directByCommit.get(commitId) ?? [];
    const hostedFrames = hostedByCommit.get(commitId) ?? [];
    if (hostedFrames.length > 1) failures.push(`source commit ${commitId} produced ${hostedFrames.length} hosted frames`);
    const directFinal = directFrames.at(-1);
    const hostedFinal = hostedFrames.at(-1);
    if (!directFinal || !hostedFinal) {
      failures.push(`source commit ${commitId} is missing a ${!directFinal ? "direct" : "hosted"} frame`);
      continue;
    }
    if (!hostedFinal.complete) failures.push(`source commit ${commitId} exposed a partial hosted frame`);
    if (surfaceDigest(hostedFinal.surface) !== surfaceDigest(directFinal.surface)) {
      failures.push(`source commit ${commitId} differs in cells/styles/cursor/modes/scrollback/final state`);
    }
  }

  let furthestCommitIndex = -1;
  for (const frame of hosted.frames) {
    const commitIndex = directCommitOrder.indexOf(frame.sourceCommitId);
    if (commitIndex >= 0 && commitIndex < furthestCommitIndex) failures.push(`hosted frame for ${frame.sourceCommitId} is stale or reordered`);
    furthestCommitIndex = Math.max(furthestCommitIndex, commitIndex);
  }
  const hostedDigests = hosted.frames.map(frame => surfaceDigest(frame.surface));
  for (let index = 1; index < hostedDigests.length; index++) {
    if (hostedDigests[index] === hostedDigests[index - 1]) failures.push(`hosted frame ${index + 1} is a duplicate unchanged commit`);
  }
  if (hosted.frames.some(frame => {
    const directFrame = directByCommit.get(frame.sourceCommitId)?.at(-1);
    return directFrame !== undefined && visibleCellCount(directFrame.surface) > 0 && visibleCellCount(frame.surface) === 0;
  })) failures.push("hosted timeline contains an intermediate blank frame");
  if (hosted.idleHostWriteCount !== 0) failures.push(`hosted path wrote ${hosted.idleHostWriteCount} unchanged idle frames`);
  if (!hosted.finalRestorationPassed) failures.push("hosted parent terminal restoration failed");

  const metrics = metricsFor(direct, hosted);
  if (metrics.hostedMeanLatencyMs - metrics.directMeanLatencyMs > limits.maxLatencyOverheadMs) {
    failures.push(`input-to-frame latency overhead ${round(metrics.hostedMeanLatencyMs - metrics.directMeanLatencyMs)}ms exceeds ${limits.maxLatencyOverheadMs}ms`);
  }
  if (metrics.hostedFrameJitterMs - metrics.directFrameJitterMs > limits.maxJitterOverheadMs) {
    failures.push(`frame jitter overhead ${round(metrics.hostedFrameJitterMs - metrics.directFrameJitterMs)}ms exceeds ${limits.maxJitterOverheadMs}ms`);
  }
  if (metrics.outputAmplification > limits.maxOutputAmplification) {
    failures.push(`host output amplification ${round(metrics.outputAmplification)} exceeds ${limits.maxOutputAmplification}`);
  }

  return { passed: failures.length === 0, failures, metrics };
}

function metricsFor(direct: TerminalParityObservation, hosted: TerminalParityObservation): TerminalParityMetrics {
  const hostedGroups = groupFrames(hosted.frames);
  return {
    directFrameCount: direct.frames.length,
    hostedFrameCount: hosted.frames.length,
    maxHostedFramesPerSourceCommit: Math.max(0, ...[...hostedGroups.values()].map(frames => frames.length)),
    outputAmplification: hosted.sourceBytes === 0 ? 0 : hosted.hostBytes / hosted.sourceBytes,
    directMeanLatencyMs: mean(direct.inputToFrameLatencyMs),
    hostedMeanLatencyMs: mean(hosted.inputToFrameLatencyMs),
    directFrameJitterMs: standardDeviation(frameIntervals(direct.frames)),
    hostedFrameJitterMs: standardDeviation(frameIntervals(hosted.frames)),
  };
}

function groupFrames(frames: readonly CommittedTerminalFrame[]): Map<string, CommittedTerminalFrame[]> {
  const groups = new Map<string, CommittedTerminalFrame[]>();
  for (const frame of frames) {
    const group = groups.get(frame.sourceCommitId) ?? [];
    group.push(frame);
    groups.set(frame.sourceCommitId, group);
  }
  return groups;
}

function surfaceDigest(surface: TerminalSurface): string {
  return createHash("sha256").update(JSON.stringify({
    columns: surface.columns,
    rows: surface.rows,
    cells: surface.cells,
    scrollbackCells: surface.scrollbackCells ?? [],
    cursor: surface.cursor,
    activeScreen: surface.activeScreen,
    modes: surface.modes,
    final: surface.final,
  })).digest("hex");
}
function visibleCellCount(surface: TerminalSurface): number {
  return surface.cells.flat().filter(cell => cell.character.trim().length > 0 && cell.width > 0).length;
}
function frameIntervals(frames: readonly CommittedTerminalFrame[]): number[] {
  return frames.slice(1).map((frame, index) => Math.max(0, frame.committedAtMs - (frames[index]?.committedAtMs ?? 0)));
}
function mean(values: readonly number[]): number { return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length; }
function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(mean(values.map(value => (value - average) ** 2)));
}
function round(value: number): number { return Math.round(value * 100) / 100; }
