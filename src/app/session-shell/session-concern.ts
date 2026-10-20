/**
 * One piece of a session presenter's state that resets itself when the backend replaces the
 * session and releases itself when the presenter is released.
 */
export interface SessionConcern {
  /** The backend replaced the session: drop the pending work, timers, and surfaces that belonged to it. */
  onSessionReplaced?(): void;
  /** Release everything this concern holds; called at most once. */
  dispose?(): void;
}

/**
 * The presenter's concerns in their declared order. Session replacement and disposal fan out in
 * that order, because later resets depend on earlier ones (copy intent before pastes before the
 * input surface), and disposal is idempotent.
 */
export class SessionConcerns {
  readonly #concerns: readonly SessionConcern[];
  #disposed = false;

  constructor(concerns: readonly SessionConcern[]) {
    this.#concerns = concerns;
  }

  replaceSession(): void {
    if (this.#disposed) return;
    for (const concern of this.#concerns) concern.onSessionReplaced?.();
  }

  /** Disposes each concern once, through `attempt` so one failure does not skip the rest. */
  dispose(attempt: (action: () => void) => void = action => action()): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const concern of this.#concerns) {
      const dispose = concern.dispose;
      if (dispose !== undefined) attempt(() => dispose.call(concern));
    }
  }
}
