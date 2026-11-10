import type { OwnedUiShellComponentPort } from "../../contracts/owned-ui/index.js";
import type { UiRouteSurface } from "../../ui/apps/index.js";
import type { PaneMouseEvent } from "../../ui/components/index.js";

type InputRouteOptions = {
  readonly requestRender: () => void;
  readonly closed: (rendered: boolean) => void;
  readonly exit: () => void;
  readonly released: () => void;
  readonly key: (data: string) => string;
};

/** Hosts a bounded dock route. */
export class InputRoute implements OwnedUiShellComponentPort {
  readonly #surface: UiRouteSurface;
  readonly #options: InputRouteOptions;
  #disposed = false;
  #rendered = false;

  constructor(surface: UiRouteSurface, options: InputRouteOptions) {
    this.#surface = surface;
    this.#options = options;
    surface.onRenderRequested(() => { if (!this.#disposed) this.#refresh(); });
    surface.onExitRequested(() => { this.close(); options.exit(); });
  }

  render(width: number): readonly string[] { return this.renderInDock(width, 24); }

  renderInDock(width: number, maxHeight: number): readonly string[] {
    if (this.#disposed) return [];
    const frame = this.#surface.render(width, Math.max(1, Math.min(24, maxHeight)));
    this.#rendered = true;
    return frame;
  }

  handleInput(data: string): void {
    if (this.#disposed) return;
    const key = this.#options.key(data);
    // Close even while the deferred document is loading.
    if (key === "\u001b" || key === "\u0003") { this.close(); return; }
    this.#surface.handleInput(key);
    this.#refresh();
  }

  handleLocalMouse(event: PaneMouseEvent): void {
    if (this.#disposed) return;
    this.#surface.handleMouse(event);
    this.#refresh();
  }

  invalidate(): void {}

  close(): void {
    if (this.#disposed) return;
    this.#options.closed(this.#rendered);
    this.dispose();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#surface.close();
    this.#options.released();
  }

  #refresh(): void {
    if (this.#surface.isClosed()) this.close();
    this.#options.requestRender();
  }
}
