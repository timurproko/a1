interface Allocation {
  readonly bytes: number;
  readonly children: readonly Allocation[];
  pending: number;
  authoritative: number;
}

/** Accounts shared immutable graphs once; only delivery-exclusive storage consumes backlog capacity. */
export class DeliveryRetention {
  readonly #objects = new WeakMap<object, Allocation>();
  #current: unknown;
  #baseline: Allocation | undefined;
  #bytes = 0;

  get bytes(): number { return this.#bytes; }

  baseline(value: unknown): void {
    if (value === this.#current) return;
    const next = this.#allocation(value);
    // Invariant: retain first so common blocks never become transient backlog during a revision change.
    this.#change(next, "authoritative", 1);
    if (this.#baseline) this.#change(this.#baseline, "authoritative", -1);
    this.#current = value;
    this.#baseline = next;
  }

  retain(value: unknown): () => void {
    const allocation = this.#allocation(value);
    this.#change(allocation, "pending", 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#change(allocation, "pending", -1);
    };
  }

  #allocation(value: unknown): Allocation {
    if (value === null || typeof value !== "object") {
      return { bytes: scalarBytes(value), children: [], pending: 0, authoritative: 0 };
    }
    const cached = this.#objects.get(value);
    if (cached) return cached;
    let bytes = 32;
    const children: Allocation[] = [];
    for (const [key, item] of Object.entries(value)) {
      bytes += 16 + key.length * 2;
      if (item !== null && typeof item === "object") children.push(this.#allocation(item));
      else bytes += scalarBytes(item);
    }
    const result = { bytes, children, pending: 0, authoritative: 0 };
    this.#objects.set(value, result);
    return result;
  }

  #change(allocation: Allocation, owner: "pending" | "authoritative", delta: 1 | -1): void {
    const before = allocation[owner];
    const charged = allocation.pending > 0 && allocation.authoritative === 0;
    allocation[owner] += delta;
    const charge = allocation.pending > 0 && allocation.authoritative === 0;
    if (charged !== charge) this.#bytes += charge ? allocation.bytes : -allocation.bytes;
    // Invariant: a shared parent's second owner does not retain every descendant again.
    if (before === 0 || allocation[owner] === 0) {
      for (const child of allocation.children) this.#change(child, owner, delta);
    }
  }
}

function scalarBytes(value: unknown): number {
  return typeof value === "string" ? 16 + value.length * 2 : 8;
}
