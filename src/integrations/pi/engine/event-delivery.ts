import type { OwnedUiEvent, OwnedUiTranscriptBlock } from "../../../contracts/owned-ui/index.js";
import { PendingEngineDelivery } from "./pending-delivery.js";

/**
 * Engine events delivered before the queue hands the event loop a turn. Small enough
 * that a streaming burst never holds input, large enough that an ordinary turn is one
 * batch.
 */
// Performance: deliver at most one engine event per event-loop turn. Transcript updates can
// be expensive in long sessions; a larger synchronous batch starves terminal
// input and makes an in-progress mouse selection appear frozen.
const EVENT_DELIVERY_BATCH = 1;
const OVERLOAD_CANCELLATION_TIMEOUT_MS = 2000;

/** An event the adapter emits before delivery stamps it with the session id and sequence. */
export type PiEmittedEvent =
  | Omit<Extract<OwnedUiEvent, { type: "session-lifecycle" }>, "sessionId" | "sequence">
  | Omit<Extract<OwnedUiEvent, { type: "session-view" }>, "sessionId" | "sequence">
  | Omit<Extract<OwnedUiEvent, { type: "transcript-block" }>, "sessionId" | "sequence">
  | Omit<Extract<OwnedUiEvent, { type: "assistant-message-completed" }>, "sessionId" | "sequence">
  | Omit<Extract<OwnedUiEvent, { type: "agent-run-started" }>, "sessionId" | "sequence">
  | Omit<Extract<OwnedUiEvent, { type: "agent-run-settled" }>, "sessionId" | "sequence">
  | Omit<Extract<OwnedUiEvent, { type: "editor-state" }>, "sessionId" | "sequence">
  | Omit<Extract<OwnedUiEvent, { type: "status" }>, "sessionId" | "sequence">
  | Omit<Extract<OwnedUiEvent, { type: "command-outcome" }>, "sessionId" | "sequence">
  | Omit<Extract<OwnedUiEvent, { type: "terminal-surface" }>, "sessionId" | "sequence">
  | Omit<Extract<OwnedUiEvent, { type: "diagnostic" }>, "sessionId" | "sequence">;

/** A command outcome held back during an overload so its command can still settle after recovery. */
export interface ReservedCommandOutcome {
  readonly outcome: Extract<OwnedUiEvent, { type: "command-outcome" }>["outcome"];
  readonly diagnostic: Extract<OwnedUiEvent, { type: "command-outcome" }>["diagnostic"];
}

export interface PiEventDeliveryPorts {
  sessionId(): string;
  sessionGeneration(): number;
  /** The current block for a lazily materialized transcript event. */
  transcriptBlock(id: string): OwnedUiTranscriptBlock | undefined;
  /** Retain the image assets an event references until the returned release runs. */
  retainEvent(event: OwnedUiEvent): () => void;
  /** Whether a command outcome still has an admitted command waiting for it. */
  isPendingCommand(correlationId: string): boolean;
  /** Cancel admitted work when the queue saturates; resolves once the engine session aborted. */
  cancelForOverload(): Promise<void>;
  /** Rebuild session state once the saturated queue drained; `cancelled` says whether the abort completed. */
  reconcileOverload(cancelled: boolean): Promise<void>;
  /** A listener threw; the adapter records the warning. */
  listenerFailed(message: string): void;
}

/**
 * Bounded delivery of owned UI events: stamps sequence numbers, keeps subscribers, queues events
 * through the replaceable pending buffer, yields to the event loop between batches, and when the
 * buffer saturates declares an overload that the adapter reconciles once the queue drains. The
 * adapter decides what an event means; this class decides only when it reaches a listener.
 */
export class PiEventDelivery {
  readonly #listeners = new Map<(event: OwnedUiEvent) => void, number>();
  readonly #queue: PendingEngineDelivery;
  readonly #reservedOutcomes = new Map<string, ReservedCommandOutcome>();
  readonly #ports: PiEventDeliveryPorts;
  #sequence = 0;
  #processing: Promise<void> | undefined;
  #overload: Promise<boolean> | undefined;
  #overloads = 0;
  #deliveryFailed = false;
  #invalidatedEvents = 0;

  constructor(ports: PiEventDeliveryPorts) {
    this.#ports = ports;
    this.#queue = new PendingEngineDelivery(event => ports.retainEvent(event));
  }

  /** The sequence number of the most recently stamped event. */
  get sequence(): number {
    return this.#sequence;
  }

  /** True from queue saturation until the adapter's reconciliation ends. */
  get overloaded(): boolean {
    return this.#overload !== undefined;
  }

  /** True once a listener threw or the queue saturated, until the adapter clears it after a flush. */
  get failed(): boolean {
    return this.#deliveryFailed;
  }

  clearFailure(): void {
    this.#deliveryFailed = false;
  }

  /** Developer-only pressure evidence; never mirrored into visible diagnostic/status arrays. */
  diagnostics() {
    return { ...this.#queue.diagnostics(), overloads: this.#overloads, recovering: this.overloaded,
      reservedOutcomes: this.#reservedOutcomes.size, invalidatedEvents: this.#invalidatedEvents };
  }

  /** Give an event its session id and the next sequence number without queueing it. */
  stamp(value: PiEmittedEvent): OwnedUiEvent {
    this.#sequence += 1;
    return { ...value, sessionId: this.#ports.sessionId(), sequence: this.#sequence } as OwnedUiEvent;
  }

  /** Register a listener that first receives `initial` and afterwards every later-stamped event. */
  subscribe(listener: (event: OwnedUiEvent) => void, initial: OwnedUiEvent): () => void {
    this.#listeners.set(listener, initial.sequence);
    listener(initial);
    return () => this.#listeners.delete(listener);
  }

  /** Stamp and queue an event for ordered delivery. */
  emit(value: PiEmittedEvent): OwnedUiEvent {
    const event = this.stamp(value);
    this.enqueue(event);
    return event;
  }

  /** Queue an already stamped event; during an overload only pending command outcomes are kept, as reservations. */
  enqueue(event: OwnedUiEvent): void {
    if (this.#overload !== undefined) {
      if (event.type === "command-outcome" && event.outcome !== "accepted" && this.#ports.isPendingCommand(event.correlationId)) {
        this.#reservedOutcomes.set(event.correlationId, { outcome: event.outcome, diagnostic: event.diagnostic });
      }
      return;
    }
    if (!this.#queue.push(event, this.#ports.sessionGeneration(), event.type === "transcript-block"
      ? this.#blockReconciliation(event.block.id, event.sequence) : undefined)) {
      this.beginOverload();
      if (event.type === "command-outcome" && event.outcome !== "accepted" && this.#ports.isPendingCommand(event.correlationId)
        && !this.#reservedOutcomes.has(event.correlationId)) {
        this.#reservedOutcomes.set(event.correlationId, { outcome: event.outcome, diagnostic: event.diagnostic });
      }
    }
    this.#processing ??= Promise.resolve().then(() => this.#processQueue());
  }

  // Performance: capture only identity, not the complete block/event retained by an earlier revision.
  #blockReconciliation(id: string, sequence: number): () => OwnedUiEvent {
    return () => ({ type: "transcript-block", sessionId: this.#ports.sessionId(), sequence, block: this.#ports.transcriptBlock(id)! });
  }

  /** Freeze lazy snapshots before their source is replaced; false means the queue saturated. */
  seal(): boolean {
    return this.#queue.seal();
  }

  /** Drop queued events from earlier session generations. */
  discardObsolete(generation: number): void {
    this.#invalidatedEvents += this.#queue.discardObsolete(generation);
  }

  /** Enter the bounded overload transition; a no-op while one is already in progress. */
  beginOverload(): void {
    if (this.#overload !== undefined) return;
    this.#overloads = Math.min(Number.MAX_SAFE_INTEGER, this.#overloads + 1);
    this.#deliveryFailed = true;
    // Concurrency: reserve before cancellation; outcomes produced reentrantly must not enter the saturated queue.
    this.#overload = Promise.resolve(false);
    const cancellation = this.#ports.cancelForOverload();
    this.#overload = new Promise<boolean>(resolve => {
      const timer = setTimeout(() => resolve(false), OVERLOAD_CANCELLATION_TIMEOUT_MS);
      cancellation.then(() => {
        clearTimeout(timer); resolve(true);
      }, () => { clearTimeout(timer); resolve(false); });
    });
  }

  /** Deliver out of band, bypassing the queue; used for reconciliation after an overload. */
  deliverNow(event: OwnedUiEvent): void {
    for (const [listener, subscribedAt] of this.#listeners) {
      if (event.sequence <= subscribedAt) continue;
      try { listener(event); }
      catch (error) {
        this.#deliveryFailed = true;
        this.#ports.listenerFailed(error instanceof Error ? error.message : String(error));
      }
    }
  }

  /** The command outcomes reserved during an overload, in arrival order; clears the reservation. */
  takeReservedOutcomes(): [string, ReservedCommandOutcome][] {
    const reserved = [...this.#reservedOutcomes];
    this.#reservedOutcomes.clear();
    return reserved;
  }

  /** Resolves once every queued event has been delivered or invalidated. */
  async settle(): Promise<void> {
    while (this.#processing) await this.#processing;
  }

  async #processQueue(): Promise<void> {
    try {
      let deliveredSinceYield = 0;
      while (this.#queue.size > 0) {
        const pending = this.#queue.shift();
        if (pending === undefined) continue;
        if (pending.generation !== this.#ports.sessionGeneration() && pending.event.type !== "command-outcome") {
          this.#invalidatedEvents = Math.min(Number.MAX_SAFE_INTEGER, this.#invalidatedEvents + 1);
          pending.release?.();
          continue;
        }
        try { this.deliverNow(pending.event); }
        finally { pending.release?.(); }
        deliveredSinceYield += 1;
        // Concurrency: a microtask chain runs to exhaustion before the loop turns, so a streaming
        // burst would hold typed input, pointer reports, and timed indicators until it
        // drained. Yielding on a macrotask hands those their turn between batches.
        if (deliveredSinceYield >= EVENT_DELIVERY_BATCH && this.#queue.size > 0) {
          deliveredSinceYield = 0;
          await new Promise<void>(resolve => { setImmediate(resolve); });
        }
      }
      if (this.#overload !== undefined) {
        const cancelled = await this.#overload;
        await this.#ports.reconcileOverload(cancelled);
        // Invariant: an outcome reserved while reconciliation replayed the earlier ones is dropped with the overload.
        this.#reservedOutcomes.clear();
        this.#overload = undefined;
      }
    } finally {
      this.#processing = undefined;
      if (this.#queue.size > 0) {
        this.#processing = Promise.resolve().then(() => this.#processQueue());
      }
    }
  }
}
