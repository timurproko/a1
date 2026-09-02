import type { PiTuiInputDiagnosticsEvent } from "../../../src/integrations/pi/tui-runtime/index.js";

export interface InputPhaseEvidence {
  readonly receivedRevisions: readonly number[];
  readonly appliedRevisions: readonly number[];
  readonly presentedRevisions: readonly number[];
  readonly maximumPendingDepth: number;
  readonly maximumPendingPresentationDepth: number;
  readonly inputDrivenFrames: number;
  readonly staleFrames: number;
  readonly finalAppliedRevision: number;
  readonly finalPresentedRevision: number;
  readonly finalBacklog: number;
  readonly firstStateInputToWriteMs: number | null;
  readonly finalStateInputToWriteMs: number | null;
  readonly phaseDurationsMs: {
    readonly semantic: readonly number[];
    readonly composition: readonly number[];
    readonly write: readonly number[];
  };
}

/** Validates a monotonic phase stream and derives scheduler/backlog evidence. */
export function analyzeInputPhaseEvidence(
  events: readonly PiTuiInputDiagnosticsEvent[],
  expectedFinalRevision: number,
  options: { readonly requireFinalWrite?: boolean; readonly expectedPresentedRevision?: number } = {},
): InputPhaseEvidence {
  if (!Number.isSafeInteger(expectedFinalRevision) || expectedFinalRevision < 0) {
    throw new RangeError("expected final input revision is invalid");
  }
  const expectedPresentedRevision = options.expectedPresentedRevision ?? expectedFinalRevision;
  if (!Number.isSafeInteger(expectedPresentedRevision) || expectedPresentedRevision < 0
    || expectedPresentedRevision > expectedFinalRevision) {
    throw new RangeError("expected presented input revision is invalid");
  }
  const receipts: number[] = [];
  const applied: number[] = [];
  const presented: number[] = [];
  const receiptAt = new Map<number, number>();
  const starts = new Map<string, PiTuiInputDiagnosticsEvent>();
  const semanticDurations: number[] = [];
  const compositionDurations: number[] = [];
  const writeDurations: number[] = [];
  let previousAt = Number.NEGATIVE_INFINITY;
  let previousReceipt = 0;
  let previousApplied = 0;
  let maximumPendingDepth = 0;
  let maximumPendingPresentationDepth = 0;
  let inputDrivenFrames = 0;
  let staleFrames = 0;
  let latestApplied = 0;

  for (const event of events) {
    assertEvent(event);
    if (event.atMs < previousAt) throw new TypeError("input phase timestamps are not monotonic");
    previousAt = event.atMs;
    maximumPendingDepth = Math.max(maximumPendingDepth, event.pendingDepth);
    maximumPendingPresentationDepth = Math.max(maximumPendingPresentationDepth, event.pendingPresentationDepth);
    if (event.phase === "receipt") {
      if (event.revision !== previousReceipt + 1 || receiptAt.has(event.revision)) {
        throw new TypeError("input receipt revisions are missing, duplicated, or reordered");
      }
      previousReceipt = event.revision;
      receipts.push(event.revision);
      receiptAt.set(event.revision, event.atMs);
    } else if (event.phase === "semantic-start") {
      if (!receiptAt.has(event.revision)) throw new TypeError("semantic input starts before receipt");
      starts.set(`semantic:${event.revision}`, event);
    } else if (event.phase === "semantic-end") {
      const start = starts.get(`semantic:${event.revision}`);
      if (start === undefined) throw new TypeError("semantic input ends without a start");
      if (event.revision !== previousApplied + 1) throw new TypeError("semantic input revisions are missing or reordered");
      starts.delete(`semantic:${event.revision}`);
      previousApplied = event.revision;
      latestApplied = event.revision;
      applied.push(event.revision);
      semanticDurations.push(event.atMs - start.atMs);
    } else if (event.phase === "composition-start") {
      if (starts.has("composition")) throw new TypeError("composition phases overlap");
      starts.set("composition", event);
    } else if (event.phase === "composition-end") {
      const start = starts.get("composition");
      if (start === undefined) throw new TypeError("composition ends without a start");
      starts.delete("composition");
      compositionDurations.push(event.atMs - start.atMs);
      if (event.revision > 0) {
        inputDrivenFrames += 1;
        if (event.revision < latestApplied) staleFrames += 1;
      }
    } else if (event.phase === "write-start") {
      if (starts.has("write")) throw new TypeError("terminal write phases overlap");
      starts.set("write", event);
    } else {
      const start = starts.get("write");
      if (start === undefined) throw new TypeError("terminal write ends without a start");
      starts.delete("write");
      writeDurations.push(event.atMs - start.atMs);
      if (event.revision > 0) presented.push(event.revision);
    }
  }
  if ([...starts.keys()].some(key => key === "composition" || key === "write" || key.startsWith("semantic:"))) {
    throw new TypeError("input phase stream contains an unfinished phase");
  }
  const finalAppliedRevision = applied.at(-1) ?? 0;
  if (finalAppliedRevision !== expectedFinalRevision) throw new TypeError("final applied input revision is missing");
  const finalPresentedRevision = Math.max(0, ...presented);
  if (options.requireFinalWrite !== false && expectedPresentedRevision > 0 && finalPresentedRevision < expectedPresentedRevision) {
    throw new TypeError("final applied input revision was not presented");
  }
  const firstRevision = receipts[0];
  const firstPresented = presented.find(revision => firstRevision !== undefined && revision >= firstRevision);
  const finalReceiptAt = receiptAt.get(expectedPresentedRevision) ?? Number.POSITIVE_INFINITY;
  const finalWrite = events.find(event => event.phase === "write-end"
    && event.revision >= expectedPresentedRevision && event.atMs >= finalReceiptAt);
  return {
    receivedRevisions: receipts,
    appliedRevisions: applied,
    presentedRevisions: presented,
    maximumPendingDepth,
    maximumPendingPresentationDepth,
    inputDrivenFrames,
    staleFrames,
    finalAppliedRevision,
    finalPresentedRevision,
    finalBacklog: Math.max(0, expectedPresentedRevision - finalPresentedRevision),
    firstStateInputToWriteMs: firstRevision === undefined || firstPresented === undefined
      ? null
      : (events.find(event => event.phase === "write-end" && event.revision === firstPresented)?.atMs ?? 0) - receiptAt.get(firstRevision)!,
    finalStateInputToWriteMs: expectedPresentedRevision === 0 || finalWrite === undefined
      ? null
      : finalWrite.atMs - receiptAt.get(expectedPresentedRevision)!,
    phaseDurationsMs: {
      semantic: semanticDurations,
      composition: compositionDurations,
      write: writeDurations,
    },
  };
}

function assertEvent(event: PiTuiInputDiagnosticsEvent): void {
  if (!Number.isFinite(event.atMs) || event.atMs < 0) throw new TypeError("input phase timestamp is invalid");
  if (!Number.isSafeInteger(event.revision) || event.revision < 0
    || !Number.isSafeInteger(event.appliedRevision) || event.appliedRevision < 0
    || !Number.isSafeInteger(event.pendingDepth) || event.pendingDepth < 0
    || (event.pendingPresentationDepth !== 0 && event.pendingPresentationDepth !== 1)) {
    throw new TypeError("input phase revision or backlog is invalid");
  }
  if ((event.phase === "receipt" || event.phase === "semantic-start" || event.phase === "semantic-end") && event.revision < 1) {
    throw new TypeError("semantic input phase requires a positive revision");
  }
}
