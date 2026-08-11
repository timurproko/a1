export interface DrainAwareHostOutput {
  write(data: string, callback?: () => void): boolean;
  once?(event: "drain", listener: () => void): unknown;
}

export interface HostFrame {
  readonly kind: "application" | "snapshot" | "transaction" | "lifecycle" | "mode";
  readonly payload: string;
  readonly synchronized: boolean;
  readonly supersedableState: boolean;
  readonly revision?: number;
  readonly detail?: Readonly<Record<string, unknown>>;
}

export interface HostFrameWriterOptions {
  readonly maxQueuedFrames?: number;
  readonly onWrite?: (frame: HostFrame, serialized: string) => void;
}

/** Bounded, drain-aware serialization for the one physical terminal owner. */
export class HostFrameWriter {
  readonly #maxQueuedFrames: number;
  readonly #onWrite: (frame: HostFrame, serialized: string) => void;
  readonly #queue: HostFrame[] = [];
  #backpressured = false;
  #closed = false;
  #activeFrame: HostFrame | null = null;
  #activeSegments: readonly string[] = [];
  #activeSegmentIndex = 0;
  #activeSerialized = "";
  #endBoundaryReady = false;
  #endBoundaryScheduled = false;

  constructor(private readonly output: DrainAwareHostOutput, options: HostFrameWriterOptions = {}) {
    this.#maxQueuedFrames = options.maxQueuedFrames ?? 64;
    this.#onWrite = options.onWrite ?? (() => {});
  }

  get queuedFrames(): number { return this.#queue.length; }
  get backpressured(): boolean { return this.#backpressured; }

  enqueue(frame: HostFrame): void {
    if (this.#closed) return;
    if (this.#activeFrame || this.#backpressured || this.#queue.length > 0) {
      const tail = this.#queue.at(-1);
      if (tail?.synchronized && frame.synchronized && tail.supersedableState && frame.supersedableState) {
        this.#queue[this.#queue.length - 1] = {
          ...frame,
          // Both payloads remain hidden beneath one outer synchronized-output
          // pair. The later writes supersede cells/cursor while preserving the
          // final state without exposing the intermediate state.
          payload: `${tail.payload}${frame.payload}`,
        };
      } else {
        if (this.#queue.length >= this.#maxQueuedFrames) {
          throw new Error(`host frame queue exceeded ${this.#maxQueuedFrames} frames while preserving ordered terminal operations`);
        }
        this.#queue.push(frame);
      }
      return;
    }
    this.#write(frame);
  }

  close(): void {
    this.#closed = true;
    this.#queue.length = 0;
  }

  #write(frame: HostFrame): void {
    this.#activeFrame = frame;
    this.#activeSegments = frame.synchronized ? ["\x1b[?2026h", frame.payload, "\x1b[?2026l"] : [frame.payload];
    this.#activeSegmentIndex = 0;
    this.#activeSerialized = this.#activeSegments.join("");
    this.#endBoundaryReady = !frame.synchronized;
    this.#endBoundaryScheduled = false;
    this.#writeActiveSegments();
  }

  #writeActiveSegments(): void {
    while (this.#activeFrame && this.#activeSegmentIndex < this.#activeSegments.length) {
      if (this.#activeSegments.length === 3 && this.#activeSegmentIndex === 2 && !this.#endBoundaryReady) {
        if (!this.#endBoundaryScheduled) {
          this.#endBoundaryScheduled = true;
          setImmediate(() => {
            this.#endBoundaryScheduled = false;
            this.#endBoundaryReady = true;
            this.#writeActiveSegments();
          });
        }
        return;
      }
      const segmentIndex = this.#activeSegmentIndex;
      const segment = this.#activeSegments[segmentIndex] ?? "";
      this.#activeSegmentIndex += 1;
      const supportsWriteCompletion = this.output.write.length >= 2;
      const payloadNeedsCompletion = this.#activeSegments.length === 3 && segmentIndex === 1 && supportsWriteCompletion;
      if (payloadNeedsCompletion) this.#endBoundaryScheduled = true;
      const accepted = payloadNeedsCompletion
        ? this.output.write(segment, () => {
            setImmediate(() => {
              this.#endBoundaryScheduled = false;
              this.#endBoundaryReady = true;
              if (!this.#backpressured) this.#writeActiveSegments();
            });
          })
        : this.output.write(segment);
      if (payloadNeedsCompletion) {
        if (!accepted) this.#awaitDrain();
        return;
      }
      if (accepted) continue;
      this.#awaitDrain();
      return;
    }
    const frame = this.#activeFrame;
    if (!frame) return;
    const serialized = this.#activeSerialized;
    this.#activeFrame = null;
    this.#activeSegments = [];
    this.#activeSegmentIndex = 0;
    this.#activeSerialized = "";
    this.#endBoundaryReady = false;
    this.#endBoundaryScheduled = false;
    this.#onWrite(frame, serialized);
    this.#flush();
  }

  #awaitDrain(): void {
    if (!this.output.once) throw new Error("host output applied backpressure but does not expose a drain event");
    this.#backpressured = true;
    this.output.once("drain", () => {
      this.#backpressured = false;
      this.#writeActiveSegments();
    });
  }

  #flush(): void {
    if (this.#backpressured || this.#closed || this.#activeFrame) return;
    const next = this.#queue.shift();
    if (next) this.#write(next);
  }
}
