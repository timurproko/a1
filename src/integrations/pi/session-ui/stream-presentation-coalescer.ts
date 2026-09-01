/**
 * 33 ms (30.3 fps): baseline chunks arrive every 5 ms, while this cadence
 * retains immediate first paint/input and explicit final-state flushing.
 */
export const STREAM_PRESENTATION_INTERVAL_MS = 33;

export interface StreamPresentationScheduler {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>;
  clearTimeout(timer: ReturnType<typeof setTimeout>): void;
}

const SYSTEM_SCHEDULER: StreamPresentationScheduler = {
  now: Date.now,
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: timer => clearTimeout(timer),
};

/** Bounds terminal presentation requests while semantic root state remains current. */
export class StreamPresentationCoalescer {
  #timer: ReturnType<typeof setTimeout> | undefined;
  #lastPresentationAt = Number.NEGATIVE_INFINITY;
  #disposed = false;

  constructor(
    readonly present: () => void,
    readonly intervalMs = STREAM_PRESENTATION_INTERVAL_MS,
    readonly scheduler: StreamPresentationScheduler = SYSTEM_SCHEDULER,
  ) {
    if (!Number.isSafeInteger(intervalMs) || intervalMs < 1) throw new RangeError("stream presentation interval must be positive");
  }

  get pending(): boolean { return this.#timer !== undefined; }

  request(): void {
    if (this.#disposed || this.#timer !== undefined) return;
    const elapsed = this.scheduler.now() - this.#lastPresentationAt;
    if (elapsed >= this.intervalMs) {
      this.#presentNow();
      return;
    }
    this.#timer = this.scheduler.setTimeout(() => {
      this.#timer = undefined;
      this.#presentNow();
    }, Math.max(0, this.intervalMs - elapsed));
  }

  /** Cancels a superseded stream frame; the immediate input/overlay/resize path renders current state. */
  preempt(): void {
    if (this.#timer === undefined) return;
    this.scheduler.clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  /** Records an immediate input/status/overlay frame and cancels an obsolete stream timer. */
  noteImmediatePresentation(): void {
    if (this.#disposed) return;
    this.preempt();
    this.#lastPresentationAt = this.scheduler.now();
  }

  /** Presents current semantic state immediately regardless of pending stream work. */
  presentImmediate(): void {
    if (this.#disposed) return;
    this.noteImmediatePresentation();
    this.present();
  }

  /** Presents the newest semantic state immediately only when a stream frame is pending. */
  flush(): void {
    if (this.#disposed || this.#timer === undefined) return;
    this.scheduler.clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#presentNow();
  }

  dispose(): void {
    this.preempt();
    this.#disposed = true;
  }

  #presentNow(): void {
    if (this.#disposed) return;
    this.#lastPresentationAt = this.scheduler.now();
    this.present();
  }
}
