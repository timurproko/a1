import {
  FrameCache,
  finalizeFrame,
  type PaneInputResult,
  type PaneMouseEvent,
  type PaneRect,
  type UiTheme,
} from "../components/index.js";
import type { AppHostServices, AppSize, UiApp } from "./contracts.js";
import type { UiAppRegistry } from "./registry.js";

export interface AppHostSurface {
  /** Current viewport, re-read on every frame so a resize is picked up. */
  size(): AppSize;
  /** Asks the surrounding runtime to repaint. */
  requestRender(): void;
  /** Presents these rows, or clears the surface when null. */
  present(lines: readonly string[] | null): void;
  /** Reports a failure that closed an app. */
  reportFailure?(appId: string, error: unknown): void;
  /** Leaves A1 entirely. Invoked by the interrupt chord from a presented app. */
  exit?(): void;
}

export interface AppHostOptions {
  readonly registry: UiAppRegistry;
  readonly surface: AppHostSurface;
  /** Whether an idle interrupt closes the presented app. Chosen explicitly. */
  readonly closeOnInterrupt: boolean;
  /** Colours handed to every presented app. Absent renders plain text. */
  readonly theme?: UiTheme;
}

// Invariant: the interrupt byte is written as an escape: as a raw byte it is invisible to
// every text tool, and this constant had already been emptied by one.
const INTERRUPT = "";
/** How long the first interrupt of the chord stays armed. */
const INTERRUPT_CHORD_MS = 1_500;

/**
 * Presents at most one app. Input reaches the presented app first; anything it
 * does not consume continues to the caller. A failure while rendering or
 * handling input closes the app rather than leaving a broken surface on screen.
 */
export class UiAppHost {
  readonly #registry: UiAppRegistry;
  readonly #surface: AppHostSurface;
  readonly #closeOnInterrupt: boolean;
  readonly #theme: UiTheme | undefined;
  // Invariant: the first interrupt timestamp is null whenever the chord is disarmed.
  #interruptArmedAt: number | null = null;
  #renderedInterruptArmed: boolean | undefined;
  readonly #cache = new FrameCache();
  #app: UiApp | null = null;

  constructor(options: AppHostOptions) {
    this.#registry = options.registry;
    this.#surface = options.surface;
    this.#closeOnInterrupt = options.closeOnInterrupt;
    this.#theme = options.theme;
  }

  get presented(): UiApp | null {
    return this.#app;
  }

  get isPresenting(): boolean {
    return this.#app !== null;
  }

  /** Opens a registered app, replacing whatever was presented. */
  open(id: string): void {
    const registration = this.#registry.get(id);
    if (registration === null) throw new Error(`owned UI app is not registered: ${id}`);
    if (this.#app !== null) this.#closeCurrent();
    const app = registration.create();
    this.#app = app;
    this.#cache.invalidate();
    this.#guard(() => app.onActivate?.(this.#services()));
    this.render();
  }

  openRoute(route: string): boolean {
    const registration = this.#registry.forRoute(route);
    if (registration === null) return false;
    this.open(registration.id);
    return true;
  }

  render(): void {
    const app = this.#app;
    if (app === null) {
      this.#surface.present(null);
      return;
    }
    const size = this.#surface.size();
    const rect: PaneRect = { width: Math.max(0, size.width), height: Math.max(0, size.height) };
    const interruptArmed = this.interruptArmed;
    if (this.#renderedInterruptArmed !== interruptArmed) this.#cache.invalidate();
    this.#renderedInterruptArmed = interruptArmed;
    const lines = this.#guard(() => this.#cache.render(
      app,
      rect,
      () => finalizeFrame(app.render(rect, this.#services()), rect, app.id),
    ));
    this.#surface.present(lines ?? null);
  }

  handleInput(data: string): PaneInputResult {
    const app = this.#app;
    if (app === null) return { consumed: false };

    const result = this.#guard(() => app.onInput?.(data, this.#services())) ?? { consumed: false };
    if (this.#app === null) return { consumed: true, render: true };
    if (result.consumed) {
      if (result.render !== false) this.render();
      return result;
    }
    if (data === INTERRUPT) return this.#interrupt();
    return { consumed: false };
  }

  handleMouse(event: PaneMouseEvent): PaneInputResult {
    const app = this.#app;
    if (app === null) return { consumed: false };
    const result = this.#guard(() => app.onMouse?.(event, this.#services())) ?? { consumed: false };
    if (result.consumed && result.render !== false) this.render();
    return result;
  }

  // Protocol: two interrupts within the chord window leave A1 from every screen.
  #interrupt(): PaneInputResult {
    const now = Date.now();
    const armed = this.#interruptArmedAt;
    if (armed !== null && now - armed <= INTERRUPT_CHORD_MS) {
      this.#interruptArmedAt = null;
      this.close();
      this.#surface.exit?.();
      return { consumed: true, render: true };
    }
    this.#interruptArmedAt = now;
    // Invariant: host-owned state participates in the app's next frame independently of
    // the app's own revision contract.
    this.#cache.invalidate();
    return { consumed: true, render: true };
  }

  get interruptArmed(): boolean {
    const armed = this.#interruptArmedAt;
    return armed !== null && Date.now() - armed <= INTERRUPT_CHORD_MS;
  }

  close(): void {
    if (this.#app === null) return;
    this.#closeCurrent();
    this.#surface.present(null);
  }

  #closeCurrent(): void {
    const app = this.#app;
    this.#app = null;
    this.#cache.invalidate();
    if (app !== null) this.#guard(() => app.onClose?.(this.#services()));
  }

  #services(): AppHostServices {
    return {
      getSize: () => this.#surface.size(),
      requestRender: () => this.#surface.requestRender(),
      close: () => this.close(),
      returnToPrevious: () => this.close(),
      closeOnInterrupt: this.#closeOnInterrupt,
      exit: () => {
        this.close();
        this.#surface.exit?.();
      },
      interruptArmed: this.interruptArmed,
      ...(this.#theme === undefined ? {} : { theme: this.#theme }),
    };
  }

  // Security: an app failure closes its app and restores the surface.
  #guard<T>(work: () => T): T | undefined {
    try {
      return work();
    } catch (error) {
      const app = this.#app;
      this.#app = null;
      this.#cache.invalidate();
      this.#surface.present(null);
      this.#surface.reportFailure?.(app?.id ?? "unknown", error);
      return undefined;
    }
  }
}
