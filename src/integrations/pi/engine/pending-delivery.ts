import type { OwnedUiEvent } from "../../../contracts/owned-ui/index.js";

export const MAX_PENDING_EVENTS = 1024;
export const MAX_PENDING_EVENT_BYTES = 8 * 1024 * 1024;

/** Actual shell semantics: only live complete block state has no independent side effect. */
export function replaceableEventKey(event: OwnedUiEvent): string | null {
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
  bytes: number;
};

/** Intrusive FIFO + segment index: replacement unlinks in O(1), never changes source ordering. */
export class PendingEngineDelivery {
  readonly #replaceable = new Map<string, Node>();
  #head: Node | undefined;
  #tail: Node | undefined;
  #size = 0;
  #bytes = 0;
  #protected = 0;
  #generation = -1;
  #superseded = 0;
  #peakNodes = 0;
  #peakBytes = 0;

  get size(): number { return this.#size; }
  diagnostics() {
    return { pending: this.#size, bytes: this.#bytes, protected: this.#protected,
      superseded: this.#superseded, peakNodes: this.#peakNodes, peakBytes: this.#peakBytes };
  }

  /** False means not admitted. The caller must enter its reserved recovery protocol, never evict. */
  push(event: OwnedUiEvent, generation: number, reconcile?: () => OwnedUiEvent): boolean {
    const key = replaceableEventKey(event);
    if (generation !== this.#generation || key === null) {
      if (!this.#seal()) return false;
      this.#generation = generation;
    }
    const prior = key === null ? undefined : this.#replaceable.get(key);
    let bytes = retainedEventBytes(event);
    const marker = key !== null && bytes > 64 * 1024 && reconcile !== undefined;
    if (marker) bytes = 128;
    if (this.#size - (prior === undefined ? 0 : 1) >= MAX_PENDING_EVENTS
      || this.#bytes - (prior?.bytes ?? 0) + bytes > MAX_PENDING_EVENT_BYTES) return false;
    if (prior !== undefined) { this.#unlink(prior); this.#superseded = Math.min(Number.MAX_SAFE_INTEGER, this.#superseded + 1); }
    const node: Node = { key, generation, bytes, ...(marker ? { resolve: reconcile } : { event }) };
    node.previous = this.#tail;
    if (this.#tail !== undefined) this.#tail.next = node; else this.#head = node;
    this.#tail = node;
    this.#size++; this.#bytes += bytes;
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

  shift(): { event: OwnedUiEvent; generation: number } | undefined {
    const node = this.#head;
    if (node === undefined) return undefined;
    const event = node.event ?? node.resolve!();
    this.#unlink(node);
    return { event, generation: node.generation };
  }

  // Invariant: a barrier freezes lazy authoritative markers before a later segment can change them.
  #seal(): boolean {
    for (const node of this.#replaceable.values()) {
      if (node.resolve === undefined) continue;
      const event = node.resolve();
      const bytes = retainedEventBytes(event);
      if (this.#bytes - node.bytes + bytes > MAX_PENDING_EVENT_BYTES) return false;
      this.#bytes += bytes - node.bytes; node.bytes = bytes; node.event = event; node.resolve = undefined;
      this.#peakBytes = Math.max(this.#peakBytes, this.#bytes);
    }
    this.#replaceable.clear();
    return true;
  }

  #unlink(node: Node): void {
    if (node.previous !== undefined) node.previous.next = node.next; else this.#head = node.next;
    if (node.next !== undefined) node.next.previous = node.previous; else this.#tail = node.previous;
    this.#size--; this.#bytes -= node.bytes;
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
