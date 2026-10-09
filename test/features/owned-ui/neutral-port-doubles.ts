import type { ProgramStatus } from "@earendil-works/pi-tui";
import type {
  OwnedUiApplicationPort,
  PresentationComponentPort,
  PresentationOverlayHandle,
  PresentationOverlayOptions,
  PresentationRuntimePort,
  PresentationRuntimeState,
  PresentationTerminalPort,
} from "../../../src/contracts/presentation/index.js";

export class TestPresentationTerminal implements PresentationTerminalPort {
  columns = 80;
  rows = 24;
  readonly enhancedKeyboard = false;
  readonly kittyProtocolActive = false;
  readonly writes: string[] = [];
  readonly programStatuses: ProgramStatus[] = [];
  active = false;
  #input: ((data: string) => void) | undefined;
  #resize: (() => void) | undefined;
  start(onInput: (data: string) => void = () => {}, onResize: () => void = () => {}): void { this.active = true; this.#input = onInput; this.#resize = onResize; }
  stop(): void { this.active = false; this.#input = undefined; this.#resize = undefined; }
  async drainInput(): Promise<void> {}
  write(text: string): void { this.writes.push(text); }
  input(data: string): void { this.#input?.(data); }
  resize(columns: number, rows: number): void { this.columns = columns; this.rows = rows; this.#resize?.(); }
  moveBy(): void {}
  hideCursor(): void { this.write("\x1b[?25l"); }
  showCursor(): void { this.write("\x1b[?25h"); }
  clearLine(): void { this.write("\x1b[K"); }
  clearFromCursor(): void { this.write("\x1b[J"); }
  clearScreen(): void { this.write("\x1b[2J\x1b[H"); }
  setTitle(): void {}
  setProgress(): void {}
  setProgramStatus(status: ProgramStatus): void { this.programStatuses.push(status); }
}

export class TestOwnedUiApplication implements OwnedUiApplicationPort {
  disposed = false;
  readonly calls: string[] = [];
  start(): void { this.calls.push("start"); }
  async flush(): Promise<void> { this.calls.push("flush"); }
  async waitUntilStopped(): Promise<void> { this.calls.push("wait"); }
  async dispose(): Promise<void> { this.calls.push("dispose"); this.disposed = true; }
}

export class TestPresentationRuntime implements PresentationRuntimePort {
  state: PresentationRuntimeState = "idle";
  readonly terminal: TestPresentationTerminal;
  constructor(terminal: TestPresentationTerminal = new TestPresentationTerminal()) { this.terminal = terminal; }
  start(): void { this.terminal.start(); this.state = "running"; }
  render(): void {}
  showOverlay(_component: PresentationComponentPort, _options: PresentationOverlayOptions): PresentationOverlayHandle {
    let visible = true;
    return { get visible() { return visible; }, hide() { visible = false; }, show() { visible = true; }, focus() {}, dispose() { visible = false; } };
  }
  async stop(): Promise<void> { this.state = "stopping"; this.terminal.stop(); this.state = "stopped"; }
}
