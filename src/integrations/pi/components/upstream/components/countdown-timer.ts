/**
 * Provenance: @earendil-works/pi-coding-agent 1.0.4 (MIT), commit 7c10bd4337495ee613f2224843ecdf349b80d1df,
 * packages/coding-agent/src/modes/interactive/components/countdown-timer.ts.
 * Modifications: Mechanical source port with ECMAScript private fields; imports remain on the public
 * Pi TUI package root.
 * Deviations: countdown-owned-private-fields.
 */
import type { TUI } from "@earendil-works/pi-tui";

export class CountdownTimer {
  #intervalId: ReturnType<typeof setInterval> | undefined;
  #remainingSeconds: number;
  #tui: TUI | undefined;
  #onTick: (seconds: number) => void;
  #onExpire: () => void;

  constructor(timeoutMs: number, tui: TUI | undefined, onTick: (seconds: number) => void, onExpire: () => void) {
    this.#tui = tui;
    this.#onTick = onTick;
    this.#onExpire = onExpire;
    this.#remainingSeconds = Math.ceil(timeoutMs / 1000);
    this.#onTick(this.#remainingSeconds);
    this.#intervalId = setInterval(() => {
      this.#remainingSeconds--;
      this.#onTick(this.#remainingSeconds);
      this.#tui?.requestRender();
      if (this.#remainingSeconds <= 0) {
        this.dispose();
        this.#onExpire();
      }
    }, 1000);
  }

  dispose(): void {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = undefined;
    }
  }
}
