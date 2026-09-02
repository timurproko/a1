export type PiTuiInputCoordinationDecision = "safe" | "barrier";
export type PiTuiInputSurfaceKind = "editor" | "owned" | "opaque";

export interface PiTuiInputCoordinationScheduler {
  scheduleImmediate(callback: () => void): ReturnType<typeof setImmediate>;
  cancelImmediate(handle: ReturnType<typeof setImmediate>): void;
}

export interface PiTuiInputCoordinationTrace {
  readonly phase: "receipt" | "semantic-start" | "semantic-end";
  readonly revision: number;
  readonly atMs: number;
  readonly pendingDepth: number;
  readonly pendingPresentationDepth: 0 | 1;
  readonly appliedRevision: number;
}

export interface InputPresentationCoordinatorOptions {
  readonly classify: (data: string) => PiTuiInputCoordinationDecision;
  readonly deliver: (data: string) => void;
  readonly onReceipt?: () => void;
  readonly onTrace?: (event: PiTuiInputCoordinationTrace) => void;
  readonly now?: () => number;
  readonly scheduler?: PiTuiInputCoordinationScheduler;
}

const SYSTEM_SCHEDULER: PiTuiInputCoordinationScheduler = {
  scheduleImmediate: callback => setImmediate(callback),
  cancelImmediate: handle => clearImmediate(handle),
};

interface PendingInput {
  readonly revision: number;
  readonly data: string;
}

/**
 * Delivers complete terminal chunks in their original order while allowing Pi
 * TUI's existing pending-render guard to present one current state per event
 * loop turn. Unknown or effectful input is an immediate ordering barrier.
 */
export class InputPresentationCoordinator {
  readonly #classify: (data: string) => PiTuiInputCoordinationDecision;
  readonly #deliver: (data: string) => void;
  readonly #onReceipt: (() => void) | undefined;
  readonly #onTrace: ((event: PiTuiInputCoordinationTrace) => void) | undefined;
  readonly #now: () => number;
  readonly #scheduler: PiTuiInputCoordinationScheduler;
  readonly #pending: PendingInput[] = [];
  #scheduled: ReturnType<typeof setImmediate> | undefined;
  #nextRevision = 1;
  #appliedRevision = 0;
  #disposed = false;

  constructor(options: InputPresentationCoordinatorOptions) {
    this.#classify = options.classify;
    this.#deliver = options.deliver;
    this.#onReceipt = options.onReceipt;
    this.#onTrace = options.onTrace;
    this.#now = options.now ?? (() => performance.now());
    this.#scheduler = options.scheduler ?? SYSTEM_SCHEDULER;
  }

  get pendingDepth(): number { return this.#pending.length; }
  get appliedRevision(): number { return this.#appliedRevision; }
  get pendingPresentation(): boolean { return this.#scheduled !== undefined; }

  accept(data: string): void {
    if (this.#disposed || data.length === 0) return;
    const input = { revision: this.#nextRevision++, data };
    this.#onReceipt?.();
    if (this.#classify(data) === "barrier") {
      this.#trace("receipt", input.revision);
      this.flush();
      this.#deliverOne(input);
      return;
    }
    this.#pending.push(input);
    if (this.#scheduled === undefined) {
      this.#scheduled = this.#scheduler.scheduleImmediate(() => {
        this.#scheduled = undefined;
        this.#drain();
      });
    }
    this.#trace("receipt", input.revision);
  }

  flush(): void {
    if (this.#scheduled !== undefined) this.#scheduler.cancelImmediate(this.#scheduled);
    this.#scheduled = undefined;
    this.#drain();
  }

  dispose(deliverPending = true): void {
    if (this.#disposed) return;
    if (deliverPending) this.flush();
    else {
      if (this.#scheduled !== undefined) this.#scheduler.cancelImmediate(this.#scheduled);
      this.#scheduled = undefined;
      this.#pending.length = 0;
    }
    this.#disposed = true;
  }

  #drain(): void {
    while (this.#pending.length > 0) this.#deliverOne(this.#pending.shift()!);
  }

  #deliverOne(input: PendingInput): void {
    this.#trace("semantic-start", input.revision);
    try {
      this.#deliver(input.data);
    } finally {
      this.#appliedRevision = input.revision;
      this.#trace("semantic-end", input.revision);
    }
  }

  #trace(phase: PiTuiInputCoordinationTrace["phase"], revision: number): void {
    this.#onTrace?.({
      phase,
      revision,
      atMs: this.#now(),
      pendingDepth: this.#pending.length,
      pendingPresentationDepth: this.#scheduled === undefined ? 0 : 1,
      appliedRevision: this.#appliedRevision,
    });
  }
}

const SAFE_EDITING_INPUTS = new Set([
  "\b",
  "\u007f",
  "\u001b[A",
  "\u001b[B",
  "\u001b[C",
  "\u001b[D",
  "\u001b[1;2A",
  "\u001b[1;2B",
  "\u001b[1;5C",
  "\u001b[1;5D",
  "\u001b[3~",
  "\u001b[H",
  "\u001b[F",
  "\u001b[1~",
  "\u001b[4~",
]);
const MAX_SAFE_TEXT_DELIVERY = 4096;

/** Finite fail-closed grammar for input whose semantic handlers may run in one ordered drain. */
export function classifyPiTuiInput(
  data: string,
  surface: PiTuiInputSurfaceKind,
): PiTuiInputCoordinationDecision {
  if (surface === "opaque" || data.length === 0 || data.length > MAX_SAFE_TEXT_DELIVERY) return "barrier";
  if (SAFE_EDITING_INPUTS.has(data)) return "safe";
  if (data.includes("\u001b") || data.includes("\r") || data.includes("\n") || data.includes("\u0003")) return "barrier";
  for (let index = 0; index < data.length; index += 1) {
    const code = data.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return "barrier";
    if (code >= 0xd800 && code <= 0xdbff) {
      if (index + 1 >= data.length) return "barrier";
      const next = data.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return "barrier";
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return "barrier";
  }
  return "safe";
}
