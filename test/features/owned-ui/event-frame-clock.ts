import { AsyncLocalStorage } from "node:async_hooks";

const owner = new AsyncLocalStorage<EventFrameClock>();
let installed = false;

/** A fixture-only clock: unrelated async contexts retain native time and timer behavior. */
export class EventFrameClock {
  readonly now = 1_700_000_000_000;
  readonly #timers = new Map<number, OwnedTimer>();
  #nextId = -1;
  #elapsed = 0;
  #held = false;
  #closed = false;

  get pending(): number { return this.#timers.size; }

  /** Hold scheduled paints across a semantic event transaction, without draining periodic animation. */
  hold(value: boolean): void { this.#held = value; }

  /** Advance only fixture timeout eligibility; presentation time and interval animations stay fixed. */
  advance(milliseconds: number): number {
    this.#elapsed += milliseconds;
    if (this.#held) return 0;
    let count = 0;
    for (const timer of [...this.#timers.values()]) {
      if (timer.interval || timer.due > this.#elapsed || !this.#timers.has(timer.id)) continue;
      if (++count > 64) throw new Error(`event-frame callback bound exhausted: pending=${this.pending}`);
      this.#timers.delete(timer.id);
      owner.run(this, () => timer.callback());
    }
    return count;
  }

  /** Bound cooperative event/disposal settlement by host event-loop turns, not frozen timer sleeps. */
  async settle<T>(stage: string, work: () => Promise<T>, diagnostics: () => unknown = () => ({})): Promise<T> {
    let outcome: { value: T } | { error: unknown } | undefined;
    void Promise.resolve().then(work).then(value => { outcome = { value }; }, error => { outcome = { error }; });
    for (let turn = 0; turn <= 64; turn += 1) {
      await Promise.resolve();
      if (outcome !== undefined) {
        if ("error" in outcome) throw outcome.error;
        return outcome.value;
      }
      if (turn === 64) break;
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    throw new Error(`event-frame settlement bound exhausted: stage=${stage} turns=64 pendingTimers=${this.pending} work=${JSON.stringify(diagnostics()).slice(0, 500)}`);
  }

  /** Install context-dispatched globals for one capture and restore their exact identities on every exit. */
  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.#closed) throw new Error("event-frame clock cannot be reused after disposal");
    if (installed) throw new Error("event-frame captures must not overlap");
    installed = true;
    const native = { Date, setTimeout, clearTimeout, setInterval, clearInterval };
    const create = (interval: boolean, callback: (...args: unknown[]) => void, delay = 0, ...args: unknown[]): NodeJS.Timeout => {
      const clock = owner.getStore();
      if (clock === undefined) return (interval ? native.setInterval : native.setTimeout)(callback, delay, ...args);
      const timer = new OwnedTimer(clock.#nextId--, clock.#elapsed + Math.max(0, delay), interval, () => callback.apply(timer, args), () => clock.#timers.delete(timer.id));
      if (!clock.#closed) clock.#timers.set(timer.id, timer);
      return timer as unknown as NodeJS.Timeout;
    };
    const clear = (timer: NodeJS.Timeout | string | number | undefined): void => {
      if (timer instanceof OwnedTimer) { timer.close(); return; }
      const clock = owner.getStore();
      if (typeof timer === "number" && timer < 0 && clock !== undefined) { clock.#timers.delete(timer); return; }
      native.clearTimeout(timer);
    };
    globalThis.setTimeout = ((callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => create(false, callback, delay, ...args)) as typeof setTimeout;
    globalThis.setInterval = ((callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => create(true, callback, delay, ...args)) as typeof setInterval;
    // Compatibility: native promisify hooks and timer function metadata remain available
    // to unrelated callers; only this workload's callback timers are clock-controlled.
    Object.defineProperties(globalThis.setTimeout, Object.getOwnPropertyDescriptors(native.setTimeout));
    Object.defineProperties(globalThis.setInterval, Object.getOwnPropertyDescriptors(native.setInterval));
    globalThis.clearTimeout = clear;
    globalThis.clearInterval = clear;
    globalThis.Date = new Proxy(native.Date, {
      construct(target, args, newTarget) {
        const clock = owner.getStore();
        return Reflect.construct(target, args.length === 0 && clock !== undefined ? [clock.now] : args, newTarget);
      },
      apply(target, receiver, args) {
        const clock = owner.getStore();
        return clock === undefined ? Reflect.apply(target, receiver, args) : new native.Date(clock.now).toString();
      },
      get(target, key, receiver) {
        return key === "now" ? () => owner.getStore()?.now ?? native.Date.now() : Reflect.get(target, key, receiver);
      },
    });
    try { return await owner.run(this, work); }
    finally {
      this.#closed = true;
      this.#timers.clear();
      Object.assign(globalThis, native);
      installed = false;
    }
  }
}

/** Fixture handle for the Node timer operations used here; cancellation never touches native timers. */
class OwnedTimer {
  #referenced = true;
  constructor(
    readonly id: number,
    readonly due: number,
    readonly interval: boolean,
    readonly callback: () => void,
    readonly cancel: () => unknown,
  ) {}
  ref(): this { this.#referenced = true; return this; }
  unref(): this { this.#referenced = false; return this; }
  hasRef(): boolean { return this.#referenced; }
  close(): this { this.cancel(); return this; }
  [Symbol.toPrimitive](): number { return this.id; }
  [Symbol.dispose](): void { this.close(); }
}
