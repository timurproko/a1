import type { OwnedUiSessionViewModel } from "../../contracts/owned-ui/index.js";

interface RevealPorts {
  active(): boolean;
  frame(value: { readonly from: string; readonly elapsed: number } | null): boolean;
  requestRender(): void;
}

/** Presenter-owned short-lived animation clock; saved provenance never replays on activation. */
export class SessionNameReveal {
  readonly #ports: RevealPorts;
  #binding: number | undefined;
  #seen: string | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #animation: { readonly from: string; readonly started: number } | undefined;

  constructor(ports: RevealPorts) { this.#ports = ports; }

  update(view: OwnedUiSessionViewModel, binding: number): void {
    const reveal = view.status.footer?.sessionNameReveal;
    if (this.#binding !== binding) {
      this.stop(); this.#binding = binding; this.#seen = reveal?.id; return;
    }
    if (reveal?.id === this.#seen) return;
    this.stop();
    this.#seen = reveal?.id;
    if (!reveal || !this.#ports.active()) return;
    this.#animation = { from: reveal.from, started: performance.now() };
    this.#tick();
  }

  stop(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#animation = undefined;
    this.#ports.frame(null);
  }

  #tick(): void {
    this.#timer = undefined;
    const animation = this.#animation;
    if (!animation || !this.#ports.active()) { this.stop(); return; }
    const active = this.#ports.frame({ from: animation.from, elapsed: performance.now() - animation.started });
    this.#ports.requestRender();
    if (!active) { this.#animation = undefined; return; }
    this.#timer = setTimeout(() => this.#tick(), 15);
    this.#timer.unref?.();
  }
}
