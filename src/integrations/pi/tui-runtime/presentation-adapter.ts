import type {
  PresentationComponentPort,
  PresentationOverlayHandle,
  PresentationOverlayOptions,
  PresentationRuntimePort,
  PresentationRuntimeState,
  PresentationTerminalPort,
} from "../../../foundation/presentation-contracts/index.js";
import { PiTuiRuntimeAdapter } from "./adapter.js";
import type { PiTuiTerminalPort } from "./contracts.js";

export function createPiPresentationRuntime(root: PresentationComponentPort, terminal: PresentationTerminalPort): PresentationRuntimePort {
  return new PresentationRuntimeAdapter(root, terminal);
}

class PresentationRuntimeAdapter implements PresentationRuntimePort {
  readonly #runtime: PiTuiRuntimeAdapter;
  constructor(root: PresentationComponentPort, readonly terminal: PresentationTerminalPort) {
    this.#runtime = new PiTuiRuntimeAdapter({ root, terminal: createPiTerminalBridge(terminal), mouse: false });
  }
  get state(): PresentationRuntimeState { return this.#runtime.state; }
  start(): void { this.#runtime.start(); }
  render(force?: boolean): void { this.#runtime.renderNow(force); }
  showOverlay(component: PresentationComponentPort, options: PresentationOverlayOptions): PresentationOverlayHandle {
    const handle = this.#runtime.showOverlay(component, {
      anchor: options.anchor === "top" ? "top-center" : options.anchor === "bottom" ? "bottom-center" : "center",
      ...(options.width === undefined ? {} : { width: options.width }),
    });
    return {
      get visible() { return !handle.isHidden(); },
      hide: () => handle.hide(),
      show: () => handle.setHidden(false),
      focus: () => handle.focus(),
      dispose: () => handle.hide(),
    };
  }
  async stop(): Promise<void> { await this.#runtime.stop(); }
}

export function createPiTerminalBridge(terminal: PresentationTerminalPort): PiTuiTerminalPort {
  return {
    get columns() { return terminal.columns; },
    get rows() { return terminal.rows; },
    get kittyProtocolActive() { return terminal.enhancedKeyboard; },
    start: (input, resize) => terminal.start(input, resize),
    stop: () => terminal.stop(),
    drainInput: (max, idle) => terminal.drainInput(max, idle),
    write: data => terminal.write(data),
    moveBy: lines => terminal.moveBy(lines),
    hideCursor: () => terminal.hideCursor(),
    showCursor: () => terminal.showCursor(),
    clearLine: () => terminal.clearLine(),
    clearFromCursor: () => terminal.clearFromCursor(),
    clearScreen: () => terminal.clearScreen(),
    setTitle: title => terminal.setTitle(title),
    setProgress: active => terminal.setProgress(active),
  };
}
