import type { OwnedUiEvent } from "../../../contracts/owned-ui/index.js";
import { DeliveryRetention } from "./delivery-retention.js";

const MAX_PENDING_EVENTS = 1024;
const MAX_PENDING_EVENT_BYTES = 8 * 1024 * 1024;

/** Actual shell semantics: only live complete block state has no independent side effect. */
function replaceableEventKey(event: OwnedUiEvent): string | null {
  switch (event.type) {
    case "transcript-block": return event.block.status === "live" && !(typeof event.block.payload === "object" && event.block.payload !== null && "isError" in event.block.payload && event.block.payload.isError === true) ? event.block.id : null;
    case "session-view": // Invariant: may clear compaction work, replace editor/session state, or preempt presentation.
    case "status": // Invariant: retry/compaction transitions invalidate suggestion work.
    case "editor-state": case "terminal-surface": case "session-lifecycle":
    case "agent-run-started": case "agent-run-settled": case "assistant-message-completed":
    case "command-outcome": case "diagnostic": case "dialog": case "overlay": case "customization": return null;
    default: { const exhaustive: never = event; return exhaustive; }
  }
}

type Node = {
  previous?: Node | undefined; next?: Node | undefined;
  key: string | null; generation: number;
  event?: OwnedUiEvent; resolve?: (() => OwnedUiEvent) | undefined;
  charge?: (() => void) | undefined;
  release?: (() => void) | undefined;
};

/** Intrusive FIFO + segment index: replacement unlinks in O(1), never changes source ordering. */
export class PendingEngineDelivery {
  readonly #replaceable = new Map<string, Node>();
  #head: Node | undefined;
  #tail: Node | undefined;
  #size = 0;
  readonly #retention = new DeliveryRetention();
  #protected = 0;
  #generation = -1;
  #superseded = 0;
  #peakNodes = 0;
  #peakBytes = 0;
  rejection: "event-count" | "retained-bytes" | null = null;

  private readonly retain: ((event: OwnedUiEvent) => () => void) | undefined;
  private readonly current: (() => unknown) | undefined;
  private readonly externalBytes: (() => number) | undefined;
  constructor(retain?: (event: OwnedUiEvent) => () => void, current?: () => unknown, externalBytes?: () => number) {
    this.retain = retain; this.current = current; this.externalBytes = externalBytes;
  }

  get size(): number { return this.#size; }
  get #bytes(): number { return this.#retention.bytes + this.#size * 128 + (this.externalBytes?.() ?? 0); }
  diagnostics() {
    return { pending: this.#size, bytes: this.#bytes, protected: this.#protected,
      superseded: this.#superseded, peakNodes: this.#peakNodes, peakBytes: this.#peakBytes };
  }

  /** False means not admitted. The caller must enter its reserved recovery protocol, never evict. */
  push(event: OwnedUiEvent, generation: number, reconcile?: () => OwnedUiEvent): boolean {
    this.rejection = null;
    if (this.current) this.#retention.baseline(this.current());
    const key = replaceableEventKey(event);
    if (generation !== this.#generation || key === null) {
      if (!this.seal()) return false;
      this.#generation = generation;
    }
    const prior = key === null ? undefined : this.#replaceable.get(key);
    // Production owns exact immutable revisions through the ledger. Legacy standalone
    // queues retain the compact-marker contract when no authoritative owner is supplied.
    const marker = this.current === undefined && key !== null && retainedEventBytes(event) > 64 * 1024 && reconcile !== undefined;
    const charge = marker ? undefined : this.#retention.retain(event);
    const release = marker ? undefined : this.retain?.(event);
    prior?.charge?.();
    if (this.#size - (prior === undefined ? 0 : 1) >= MAX_PENDING_EVENTS
      || this.#bytes + (prior === undefined ? 128 : 0) > MAX_PENDING_EVENT_BYTES) {
      this.rejection = this.#size - (prior === undefined ? 0 : 1) >= MAX_PENDING_EVENTS ? "event-count" : "retained-bytes";
      charge?.(); release?.();
      if (prior?.event) prior.charge = this.#retention.retain(prior.event);
      return false;
    }
    const node: Node = { key, generation, charge, ...(marker ? { resolve: reconcile } : { event, release }) };
    if (prior !== undefined) { this.#unlink(prior); this.#superseded = Math.min(Number.MAX_SAFE_INTEGER, this.#superseded + 1); }
    node.previous = this.#tail;
    if (this.#tail !== undefined) this.#tail.next = node; else this.#head = node;
    this.#tail = node;
    this.#size++;
    if (key === null) this.#protected++; else this.#replaceable.set(key, node);
    this.#peakNodes = Math.max(this.#peakNodes, this.#size); this.#peakBytes = Math.max(this.#peakBytes, this.#bytes);
    return true;
  }

  /** Session replacement invalidates old view state without resolving its lazy block references. */
  discardObsolete(generation: number): number {
    let discarded = 0;
    let node = this.#head;
    while (node !== undefined) {
      const next = node.next;
      if (node.generation !== generation && node.event?.type !== "command-outcome") { this.#unlink(node); discarded++; }
      node = next;
    }
    this.#replaceable.clear(); this.#generation = generation;
    return discarded;
  }

  shift(): { event: OwnedUiEvent; generation: number; release?: (() => void) | undefined } | undefined {
    const node = this.#head;
    if (node === undefined) return undefined;
    const event = node.event ?? node.resolve!();
    const release = node.release ?? this.retain?.(event);
    const charge = node.charge;
    this.#unlink(node, false);
    // Keep the exact revision and assets charged through reentrant listener production.
    let released = false;
    return { event, generation: node.generation, release: () => {
      if (released) return;
      released = true; charge?.(); release?.();
    } };
  }

  // Invariant: a barrier freezes lazy authoritative markers before a later segment can change them.
  seal(): boolean {
    for (const node of this.#replaceable.values()) {
      if (node.resolve === undefined) continue;
      const event = node.resolve();
      const charge = this.#retention.retain(event);
      const release = this.retain?.(event);
      if (this.#bytes > MAX_PENDING_EVENT_BYTES) { this.rejection = "retained-bytes"; charge(); release?.(); return false; }
      node.charge = charge; node.event = event; node.resolve = undefined;
      node.release = release;
      this.#peakBytes = Math.max(this.#peakBytes, this.#bytes);
    }
    this.#replaceable.clear();
    return true;
  }

  #unlink(node: Node, release = true): void {
    if (release) { node.charge?.(); node.release?.(); }
    if (node.previous !== undefined) node.previous.next = node.next; else this.#head = node.next;
    if (node.next !== undefined) node.next.previous = node.previous; else this.#tail = node.previous;
    this.#size--;
    if (node.key === null) this.#protected--;
    else if (this.#replaceable.get(node.key) === node) this.#replaceable.delete(node.key);
  }
}

/** Conservative UTF-16 payload bound. String length is O(1); never encode accumulated text per chunk. */
function retainedEventBytes(value: unknown): number {
  if (typeof value === "string") return 16 + value.length * 2;
  if (value === null || typeof value !== "object") return 8;
  let bytes = 32;
  for (const [key, item] of Object.entries(value)) bytes += 16 + key.length * 2 + retainedEventBytes(item);
  return bytes;
}
