import { PI_TUI_PACKAGE_VERSION, type PiTuiComponentPort, type PiTuiTerminalPort } from "./contracts.js";
import { PiTuiRuntimeAdapter, PiTuiRuntimeError } from "./adapter.js";

export interface PiTuiRuntimeConformanceReport {
  readonly packageName: "@earendil-works/pi-tui";
  readonly packageVersion: typeof PI_TUI_PACKAGE_VERSION;
  readonly mode: "fullscreen";
  readonly lifecycleRestored: boolean;
  readonly inputRouted: boolean;
  readonly overlayRouted: boolean;
  readonly differentialRendering: boolean;
  readonly resizeRedraw: boolean;
  readonly physicalWheelRouted: boolean;
  readonly directScrollRouted: boolean;
}

export async function runPiTuiRuntimeConformance(): Promise<PiTuiRuntimeConformanceReport> {
  const terminal = new ConformanceTerminal();
  const root = new ConformanceComponent(["stable row", "before"]);
  const overlay = new ConformanceComponent(["overlay"]);
  const runtime = new PiTuiRuntimeAdapter({ root, terminal, mouse: false });

  try {
    runtime.start();
    runtime.renderNow(true);
    root.lines = ["stable row", "after"];
    runtime.renderNow();
    const differentialFrame = terminal.writes.at(-1) ?? "";

    terminal.input("root-input");
    runtime.renderNow();
    const overlayHandle = runtime.showOverlay(overlay, { width: 12, anchor: "center" });
    runtime.renderNow();
    terminal.input("overlay-input");
    runtime.renderNow();
    const overlayRouted = overlay.inputs.includes("overlay-input") && !root.inputs.includes("overlay-input");
    overlayHandle.hide();

    const redrawsBeforeResize = runtime.fullRedraws;
    terminal.resize(60, 10);
    runtime.renderNow();
    const resizeRedraw = runtime.fullRedraws > redrawsBeforeResize && runtime.viewport().columns === 60;

    root.lines = Array.from({ length: 14 }, (_, index) => `scroll-row-${index}`);
    runtime.invalidate();
    runtime.renderNow();
    runtime.scrollToTop();
    runtime.renderNow();
    terminal.input("\x1b[<65;5;3M");
    runtime.renderNow();
    const physicalWheelRouted = runtime.scrollState().scrollTop === 1;
    runtime.scrollBy(1);
    runtime.renderNow();
    const directScrollRouted = runtime.scrollState().scrollTop === 2;

    await runtime.stop({ drainMaxMs: 1, drainIdleMs: 1 });
    const emitted = terminal.writes.join("");
    return {
      packageName: "@earendil-works/pi-tui",
      packageVersion: PI_TUI_PACKAGE_VERSION,
      mode: runtime.mode,
      lifecycleRestored: terminal.startCount === 1
        && terminal.stopCount === 1
        && terminal.drainCount === 1
        && emitted.includes("\x1b[?1049h")
        && emitted.includes("\x1b[?1049l")
        && root.disposed,
      inputRouted: root.inputs.includes("root-input"),
      overlayRouted,
      differentialRendering: differentialFrame.includes("after") && !differentialFrame.includes("stable row"),
      resizeRedraw,
      physicalWheelRouted,
      directScrollRouted,
    };
  } catch (error) {
    if (runtime.active) await runtime.stop({ drainInput: false }).catch(() => {});
    if (error instanceof PiTuiRuntimeError) throw error;
    throw new PiTuiRuntimeError("construction", error);
  }
}

class ConformanceComponent implements PiTuiComponentPort {
  readonly inputs: string[] = [];
  disposed = false;

  constructor(public lines: readonly string[]) {}

  render(): readonly string[] {
    return this.lines;
  }

  handleInput(data: string): void {
    this.inputs.push(data);
  }

  invalidate(): void {}

  dispose(): void {
    this.disposed = true;
  }
}

class ConformanceTerminal implements PiTuiTerminalPort {
  columns = 40;
  rows = 6;
  readonly kittyProtocolActive = false;
  readonly writes: string[] = [];
  startCount = 0;
  stopCount = 0;
  drainCount = 0;
  #onInput: ((data: string) => void) | undefined;
  #onResize: (() => void) | undefined;

  start(onInput: (data: string) => void, onResize: () => void): void {
    this.startCount += 1;
    this.#onInput = onInput;
    this.#onResize = onResize;
  }

  stop(): void {
    this.stopCount += 1;
    this.#onInput = undefined;
    this.#onResize = undefined;
  }

  async drainInput(): Promise<void> {
    this.drainCount += 1;
  }

  write(data: string): void {
    this.writes.push(data);
  }

  input(data: string): void {
    this.#onInput?.(data);
  }

  resize(columns: number, rows: number): void {
    this.columns = columns;
    this.rows = rows;
    this.#onResize?.();
  }

  moveBy(lines: number): void {
    if (lines !== 0) this.write(`move:${lines}`);
  }

  hideCursor(): void {
    this.write("\x1b[?25l");
  }

  showCursor(): void {
    this.write("\x1b[?25h");
  }

  clearLine(): void {
    this.write("\x1b[K");
  }

  clearFromCursor(): void {
    this.write("\x1b[J");
  }

  clearScreen(): void {
    this.write("\x1b[2J\x1b[H");
  }

  setTitle(title: string): void {
    this.write(`title:${title}`);
  }

  setProgress(active: boolean): void {
    this.write(`progress:${active}`);
  }
}
