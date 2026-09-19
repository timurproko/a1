import { performance } from "node:perf_hooks";

type Entry = { operation: string; atMs: number; durationMs: number; failed: boolean; request?: number; pending?: number };

/** Bounded, metadata-only observation of one fixture attempt; never stores arguments, errors or payloads. */
export class NativeRegressionTrace {
  readonly #start: number;
  readonly #entries: Entry[] = [];
  readonly #totals = new Map<string, { count: number; durationMs: number; failures: number }>();
  readonly #active = new Map<number, { operation: string; atMs: number }>();
  #sequence = 0;
  #dropped = 0;
  readonly owner: "shell-paste" | "release-command";
  readonly now: () => number;
  constructor(owner: "shell-paste" | "release-command", now = () => performance.now()) { this.owner = owner; this.now = now; this.#start = now(); }

  event(operation: string, fields: { request?: number; pending?: number } = {}): void {
    const entry: Entry = { operation: this.#label(operation), atMs: this.#elapsed(), durationMs: 0, failed: false };
    if (typeof fields.request === "number" && Number.isSafeInteger(fields.request)) entry.request = fields.request;
    if (typeof fields.pending === "number" && Number.isSafeInteger(fields.pending)) entry.pending = fields.pending;
    this.#record(entry);
  }

  measure<T>(operation: string, execute: () => T): T {
    const token = this.#begin(operation);
    try { const result = execute(); this.#end(token, false); return result; }
    catch (error) { this.#end(token, true); throw error; }
  }

  measureAsync<T>(operation: string, execute: () => Promise<T>): Promise<T> {
    const token = this.#begin(operation);
    try {
      const result = execute();
      void result.then(() => this.#end(token, false), () => this.#end(token, true));
      return result;
    } catch (error) { this.#end(token, true); return Promise.reject(error); }
  }

  snapshot() {
    return { owner: this.owner, elapsedMs: this.#elapsed(), dropped: this.#dropped,
      active: [...this.#active.values()].map(entry => ({ ...entry })),
      totals: Object.fromEntries([...this.#totals].map(([key, value]) => [key, { ...value }])),
      entries: this.#entries.map(entry => ({ ...entry })) };
  }

  report(): void { console.error(`native-regression-trace ${JSON.stringify(this.snapshot())}`); }

  #elapsed(): number { return Math.max(0, Math.round(this.now() - this.#start)); }
  #label(value: string): string {
    const label = /^[a-z][a-z0-9-]{0,39}$/.test(value) ? value : "other";
    return this.#totals.has(label) || this.#totals.size < 31 ? label : "other";
  }
  #begin(operation: string) {
    const token = { id: ++this.#sequence, operation: this.#label(operation), atMs: this.#elapsed() };
    if (this.#active.size < 16) this.#active.set(token.id, token); else this.#dropped++;
    return token;
  }
  #end(token: { id: number; operation: string; atMs: number }, failed: boolean): void {
    this.#active.delete(token.id);
    this.#record({ operation: token.operation, atMs: token.atMs, durationMs: this.#elapsed() - token.atMs, failed });
  }
  #record(entry: Entry): void {
    entry.operation = this.#label(entry.operation);
    const total = this.#totals.get(entry.operation) ?? { count: 0, durationMs: 0, failures: 0 };
    total.count++; total.durationMs += entry.durationMs; total.failures += Number(entry.failed);
    this.#totals.set(entry.operation, total);
    if (this.#entries.length === 64) { this.#entries.shift(); this.#dropped++; }
    this.#entries.push(entry);
  }
}
