import type { ChildProcess } from "node:child_process";

/** How long an unused spare helper may idle before it is stopped so a background session holds no extra process. */
export const HELPER_SPARE_IDLE_MS = 5 * 60_000;

export interface SpareHelper {
  readonly child: ChildProcess;
  /** Whether the helper already announced itself; the taker must then send the first request itself. */
  readonly ready: boolean;
}

export interface HelperPoolOptions {
  readonly fork: () => ChildProcess;
  /** Stops a spare that is no longer wanted; the paste helper needs its process group killed on POSIX. */
  readonly stop: (child: ChildProcess) => void;
  readonly idleMs?: number;
}

/**
 * Keeps one forked IPC helper ready so a request takes a live child instead of paying fork and module
 * load on its own critical path. The spare stays idle on its channel until it is taken; a spare that
 * exits or idles too long is dropped, and the next request forks cold and warms a replacement afterwards.
 */
export class HelperPool {
  readonly #fork: () => ChildProcess;
  readonly #stop: (child: ChildProcess) => void;
  readonly #idleMs: number;
  #spare: { readonly child: ChildProcess; ready: boolean; readonly timer: ReturnType<typeof setTimeout>; readonly detach: () => void } | undefined;
  #enabled = false;
  #disposed = false;

  constructor(options: HelperPoolOptions) {
    this.#fork = options.fork;
    this.#stop = options.stop;
    this.#idleMs = options.idleMs ?? HELPER_SPARE_IDLE_MS;
  }

  /** Whether a spare is currently held (ready or still starting). */
  get warmed(): boolean { return this.#spare !== undefined; }

  /** Opts the pool in and forks the first spare; from here on `replenish` keeps one ready after each request. */
  warm(): void {
    if (this.#disposed) return;
    this.#enabled = true;
    this.replenish();
  }

  /** Forks the next spare after a request released its child; a no-op until the owner warmed the pool. A fork failure leaves the pool empty. */
  replenish(): void {
    if (!this.#enabled || this.#disposed || this.#spare !== undefined) return;
    let child: ChildProcess;
    try { child = this.#fork(); } catch { return; }
    const onMessage = (value: unknown) => {
      if (this.#spare?.child === child && (value as { kind?: unknown } | null)?.kind === "ready") this.#spare.ready = true;
    };
    const onExit = () => { if (this.#spare?.child === child) { this.#drop(); } };
    const detach = () => {
      child.off("message", onMessage);
      child.off("exit", onExit);
      child.off("close", onExit);
      child.off("error", onExit);
    };
    // Performance: an idle spare must not keep a background session alive or hold a process forever.
    const timer = setTimeout(() => { if (this.#spare?.child === child) this.#discard(); }, this.#idleMs);
    timer.unref();
    child.on("message", onMessage);
    child.once("exit", onExit);
    child.once("close", onExit);
    child.once("error", onExit);
    // Invariant: an idle spare never keeps the owner's process alive; taking it refs it again.
    child.unref(); child.channel?.unref();
    this.#spare = { child, ready: false, timer, detach };
  }

  /** Hands the spare to a request, with the pool's listeners removed; returns nothing when no live spare is held. */
  take(): SpareHelper | undefined {
    const spare = this.#spare;
    if (spare === undefined) return undefined;
    this.#drop();
    if (spare.child.exitCode !== null || spare.child.signalCode !== null || !spare.child.connected) return undefined;
    spare.child.ref(); spare.child.channel?.ref();
    return { child: spare.child, ready: spare.ready };
  }

  /** Stops the held spare and refuses further warming. */
  dispose(): void {
    this.#disposed = true;
    this.#discard();
  }

  #drop(): void {
    const spare = this.#spare;
    if (spare === undefined) return;
    this.#spare = undefined;
    clearTimeout(spare.timer);
    spare.detach();
  }

  #discard(): void {
    const spare = this.#spare;
    if (spare === undefined) return;
    this.#drop();
    this.#stop(spare.child);
  }
}
