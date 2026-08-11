import type { TerminalRenderAtomicBoundary, TerminalSourceSequenceRange } from "../../domain/index.js";

export interface AssembledPtyOutput {
  readonly data: string;
  readonly sourceSequence: TerminalSourceSequenceRange;
  readonly atomicBoundary: TerminalRenderAtomicBoundary;
  readonly readCount: number;
  readonly requiresResynchronization: boolean;
  readonly final: boolean;
}

export interface OutputAssemblerScheduler {
  scheduleEndOfIoTurn(callback: () => void): { cancel(): void };
  scheduleAfterQuiescence?(delayMs: number, callback: () => void): { cancel(): void };
}

export interface PtyOutputTransactionAssemblerOptions {
  readonly maxBufferedBytes?: number;
  /** Complete event-loop turns with no PTY read before an unsynchronized commit. */
  readonly quietIoTurns?: number;
  readonly maxAdaptiveQuiescenceMs?: number;
  readonly now?: () => number;
  readonly scheduler?: OutputAssemblerScheduler;
}

const defaultScheduler: OutputAssemblerScheduler = {
  scheduleEndOfIoTurn(callback) {
    const handle = setImmediate(callback);
    return { cancel: () => clearImmediate(handle) };
  },
  scheduleAfterQuiescence(delayMs, callback) {
    const handle = setTimeout(callback, delayMs);
    return { cancel: () => clearTimeout(handle) };
  },
};

/**
 * Groups PTY transport reads into application-independent visual commits.
 * DEC synchronized-output regions never publish partially. Unsynchronized
 * output is grouped through the current I/O turn (setImmediate), not a fixed
 * millisecond repaint delay.
 */
export class PtyOutputTransactionAssembler {
  readonly #maxBufferedBytes: number;
  readonly #scheduler: OutputAssemblerScheduler;
  readonly #quietIoTurns: number;
  readonly #maxAdaptiveQuiescenceMs: number;
  readonly #now: () => number;
  readonly #emit: (transaction: AssembledPtyOutput) => void;
  #pending = "";
  #readCount = 0;
  #firstSequence = 0;
  #lastSequence = 0;
  #nextSequence = 0;
  #synchronizedOutput = false;
  #sawSynchronizedBoundary = false;
  #synchronizedRegionHadCellPayload = false;
  #synchronizedRegionCursorVisible: boolean | null = null;
  #awaitingPostBoundaryCellPayload = false;
  #awaitingPostBoundaryCursorShow = false;
  #awaitingPostBoundaryVisualPayload = false;
  #scanTail = "";
  #scheduled: { cancel(): void } | null = null;
  #lastReadAt: number | null = null;
  #observedCadenceMs: number | null = null;

  constructor(emit: (transaction: AssembledPtyOutput) => void, options: PtyOutputTransactionAssemblerOptions = {}) {
    this.#emit = emit;
    this.#maxBufferedBytes = options.maxBufferedBytes ?? 1024 * 1024;
    this.#quietIoTurns = Math.max(0, Math.min(4, options.quietIoTurns ?? 1));
    this.#maxAdaptiveQuiescenceMs = Math.max(4, Math.min(40, options.maxAdaptiveQuiescenceMs ?? 32));
    this.#now = options.now ?? (() => performance.now());
    this.#scheduler = options.scheduler ?? defaultScheduler;
  }

  push(data: string): number {
    const readAt = this.#now();
    if (this.#lastReadAt !== null) {
      const interval = readAt - this.#lastReadAt;
      // Ignore application think time and same-burst 0–3 ms fragments. The
      // recurring gap between transport bursts describes PTY cadence; counting
      // intra-burst fragments would collapse quiescence and expose cursor-only
      // prefixes before ConPTY releases their restorative cells.
      if (interval >= 4 && interval <= 40) {
        this.#observedCadenceMs = this.#observedCadenceMs === null
          ? interval
          : this.#observedCadenceMs * 0.7 + interval * 0.3;
      }
    }
    this.#lastReadAt = readAt;
    const sequence = ++this.#nextSequence;
    this.#cancelScheduled();
    this.#consume(data, sequence);

    if (Buffer.byteLength(this.#pending, "utf8") >= this.#maxBufferedBytes) {
      this.#cancelScheduled();
      this.#flush("bounded-fallback", this.#synchronizedOutput);
      return sequence;
    }
    if (this.#synchronizedOutput) this.#cancelScheduled();
    else this.#scheduleFlush(this.#sawSynchronizedBoundary);
    return sequence;
  }

  flushBeforeResize(): void {
    this.#cancelScheduled();
    if (this.#pending.length > 0) {
      this.#flush(this.#sawSynchronizedBoundary && !this.#synchronizedOutput ? "synchronized-output" : "resynchronization", this.#synchronizedOutput);
    }
  }

  flushFinal(): void {
    this.#cancelScheduled();
    if (this.#pending.length > 0) this.#flush("exit", this.#synchronizedOutput);
  }

  dispose(): void {
    this.#cancelScheduled();
    this.#pending = "";
    this.#readCount = 0;
  }

  #scheduleFlush(useAdaptiveTransportQuiescence = false): void {
    // Restart quiescence whenever another PTY read arrives. Some PTYs (notably
    // ConPTY) release one source commit over recurring transport bursts after
    // consuming terminal modes. Use the measured burst cadence, bounded to one
    // short interval, rather than a CLI rule or fixed repaint timer.
    this.#cancelScheduled();
    const adaptiveDelay = !useAdaptiveTransportQuiescence || this.#observedCadenceMs === null
      ? null
      : Math.max(2, Math.min(this.#maxAdaptiveQuiescenceMs, Math.ceil(this.#observedCadenceMs * 1.75)));
    if (adaptiveDelay !== null && this.#scheduler.scheduleAfterQuiescence) {
      this.#scheduled = this.#scheduler.scheduleAfterQuiescence(adaptiveDelay, () => {
        this.#scheduled = null;
        if (!this.#synchronizedOutput && this.#pending.length > 0) {
          this.#flush(this.#sawSynchronizedBoundary ? "synchronized-output" : "io-turn", false);
        }
      });
      return;
    }
    let remainingQuietTurns = this.#quietIoTurns;
    const waitForQuietTurn = () => {
      this.#scheduled = this.#scheduler.scheduleEndOfIoTurn(() => {
        this.#scheduled = null;
        if (this.#synchronizedOutput || this.#pending.length === 0) return;
        if (remainingQuietTurns > 0) {
          remainingQuietTurns -= 1;
          waitForQuietTurn();
          return;
        }
        this.#flush(this.#sawSynchronizedBoundary ? "synchronized-output" : "io-turn", false);
      });
    };
    waitForQuietTurn();
  }

  #flush(atomicBoundary: TerminalRenderAtomicBoundary, requiresResynchronization: boolean): void {
    if (this.#pending.length === 0) return;
    const transaction: AssembledPtyOutput = {
      data: this.#pending,
      sourceSequence: { start: this.#firstSequence, end: this.#lastSequence },
      atomicBoundary,
      readCount: this.#readCount,
      requiresResynchronization,
      final: atomicBoundary === "exit",
    };
    this.#pending = "";
    this.#readCount = 0;
    this.#firstSequence = 0;
    this.#lastSequence = 0;
    this.#sawSynchronizedBoundary = false;
    this.#synchronizedRegionHadCellPayload = false;
    this.#synchronizedRegionCursorVisible = null;
    this.#awaitingPostBoundaryCellPayload = false;
    this.#awaitingPostBoundaryCursorShow = false;
    this.#awaitingPostBoundaryVisualPayload = false;
    this.#emit(transaction);
  }

  #consume(data: string, sequence: number): void {
    let offset = 0;
    let foundCompleteBoundary = false;
    for (const match of data.matchAll(/\x1b\[\?2026([hl])/g)) {
      foundCompleteBoundary = true;
      const segment = data.slice(offset, match.index ?? 0);
      this.#appendPending(segment, sequence);
      this.#observeVisualPayload(segment);
      if (match[1] === "h") {
        // A new explicit synchronized region is a definitive source-commit
        // boundary. ConPTY can place several complete regions in one read; do
        // not collapse their status/input states into one jumping host frame.
        if (this.#sawSynchronizedBoundary && !this.#synchronizedOutput && this.#pending.length > 0
          && !this.#awaitingPostBoundaryVisualPayload) {
          this.#flush("synchronized-output", false);
        }
        this.#appendPending(match[0], sequence);
        this.#synchronizedOutput = true;
        this.#synchronizedRegionHadCellPayload = false;
        this.#synchronizedRegionCursorVisible = null;
        this.#awaitingPostBoundaryCellPayload = false;
        this.#awaitingPostBoundaryCursorShow = false;
        this.#awaitingPostBoundaryVisualPayload = false;
      } else {
        this.#appendPending(match[0], sequence);
        this.#synchronizedOutput = false;
        this.#awaitingPostBoundaryCellPayload = !this.#synchronizedRegionHadCellPayload;
        this.#awaitingPostBoundaryCursorShow = this.#synchronizedRegionCursorVisible === false;
        this.#awaitingPostBoundaryVisualPayload = this.#awaitingPostBoundaryCellPayload || this.#awaitingPostBoundaryCursorShow;
      }
      this.#sawSynchronizedBoundary = true;
      offset = (match.index ?? 0) + match[0].length;
    }
    const trailing = data.slice(offset);
    this.#appendPending(trailing, sequence);
    this.#observeVisualPayload(trailing);

    // Preserve mode recognition when a DECSET/DECRST sequence itself crosses
    // PTY reads. Visual classification remains conservative until later data.
    const tailLength = this.#scanTail.length;
    const combined = `${this.#scanTail}${data}`;
    if (!foundCompleteBoundary) {
      for (const match of combined.matchAll(/\x1b\[\?2026([hl])/g)) {
        if ((match.index ?? 0) + match[0].length <= tailLength) continue;
        this.#synchronizedOutput = match[1] === "h";
        if (match[1] === "h") {
          this.#synchronizedRegionHadCellPayload = false;
          this.#synchronizedRegionCursorVisible = null;
        } else {
          this.#awaitingPostBoundaryCellPayload = !this.#synchronizedRegionHadCellPayload;
          this.#awaitingPostBoundaryCursorShow = this.#synchronizedRegionCursorVisible === false;
          this.#awaitingPostBoundaryVisualPayload = this.#awaitingPostBoundaryCellPayload || this.#awaitingPostBoundaryCursorShow;
        }
        this.#sawSynchronizedBoundary = true;
      }
    }
    this.#scanTail = combined.slice(-16);
  }

  #appendPending(data: string, sequence: number): void {
    if (data.length === 0) return;
    if (this.#pending.length === 0) this.#firstSequence = sequence;
    if (this.#lastSequence !== sequence) this.#readCount += 1;
    this.#lastSequence = sequence;
    this.#pending += data;
  }

  #observeVisualPayload(data: string): void {
    const cursorModes = [...data.matchAll(/\x1b\[\?25([hl])/g)];
    const finalCursorMode = cursorModes.at(-1)?.[1];
    if (this.#synchronizedOutput) {
      if (containsCellTerminalPayload(data)) this.#synchronizedRegionHadCellPayload = true;
      if (finalCursorMode) this.#synchronizedRegionCursorVisible = finalCursorMode === "h";
      return;
    }
    if (!this.#awaitingPostBoundaryVisualPayload) return;
    if (containsCellTerminalPayload(data)) this.#awaitingPostBoundaryCellPayload = false;
    if (finalCursorMode === "h") this.#awaitingPostBoundaryCursorShow = false;
    this.#awaitingPostBoundaryVisualPayload = this.#awaitingPostBoundaryCellPayload || this.#awaitingPostBoundaryCursorShow;
  }

  #cancelScheduled(): void {
    this.#scheduled?.cancel();
    this.#scheduled = null;
  }
}

function containsCellTerminalPayload(data: string): boolean {
  // ConPTY can emit synchronized scroll/newline controls, close the region,
  // and release the cells that restore fixed rows in a later transport burst.
  // A printable cell is the generic evidence that restorative payload arrived.
  return /[^\x00-\x1f\x7f]/u.test(stripTerminalControls(data));
}

function stripTerminalControls(data: string): string {
  return data
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1bP.*?\x1b\\/gs, "")
    .replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "")
    .replace(/\x1b./g, "");
}
