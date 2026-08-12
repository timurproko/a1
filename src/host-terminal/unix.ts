import type { HostTerminalAdapter, HostTerminalInputEvent, HostTerminalState, TerminalRenderTransaction, TerminalSurface } from "../domain/index.js";
import { VtHostInputDecoder } from "../terminal-input.js";
import { FullscreenHostRenderer, type HostRendererTransaction } from "../ui/host-terminal-renderer.js";

export interface UnixHostInput {
  readonly isTTY?: boolean;
  readonly isRaw?: boolean;
  setRawMode?(enabled: boolean): void;
  on?(event: "data", listener: (data: Buffer | string) => void): unknown;
  off?(event: "data", listener: (data: Buffer | string) => void): unknown;
  resume?(): unknown;
}

export class UnixHostTerminalAdapter implements HostTerminalAdapter {
  #captured: HostTerminalState | null = null;
  #entered = false;
  #restored = false;
  readonly #decoder = new VtHostInputDecoder();
  readonly #renderer: FullscreenHostRenderer;

  constructor(
    private readonly input: UnixHostInput,
    output: Pick<NodeJS.WriteStream, "write">,
    private readonly platform: "linux" | "darwin" = process.platform === "darwin" ? "darwin" : "linux",
    onRendererTransaction: (transaction: HostRendererTransaction) => void = () => {},
    initialNormalCursorRow = 0,
  ) {
    this.#renderer = new FullscreenHostRenderer(output, 0, "", "", undefined, onRendererTransaction, undefined, initialNormalCursorRow);
  }

  capture(): HostTerminalState {
    if (this.#captured) return this.#captured;
    this.#captured = {
      platform: this.platform,
      inputMode: null,
      raw: this.input.isRaw === true,
      alternateScreen: false,
      mouse: false,
      bracketedPaste: false,
      focusReporting: false,
      keyboardEnhancement: false,
      cursorVisible: true,
      wraparound: true,
    };
    return this.#captured;
  }

  enter(): void {
    if (this.#entered) return;
    this.capture();
    this.#entered = true;
    this.#restored = false;
    if (this.input.isTTY) this.input.setRawMode?.(true);
    this.#renderer.enter();
  }

  decode(data: Uint8Array): readonly HostTerminalInputEvent[] {
    return this.#decoder.push(data);
  }

  flushPendingEscape(): readonly HostTerminalInputEvent[] {
    return this.#decoder.flushPendingEscape();
  }

  resize(columns: number, rows: number): HostTerminalInputEvent {
    return { type: "resize", dimensions: { columns, rows } };
  }

  startInput(onEvents: (events: readonly HostTerminalInputEvent[]) => void): () => void {
    let escapeTimer: NodeJS.Timeout | null = null;
    const onData = (data: Buffer | string) => {
      if (escapeTimer) clearTimeout(escapeTimer);
      onEvents(this.decode(typeof data === "string" ? Buffer.from(data, "utf8") : data));
      escapeTimer = setTimeout(() => {
        escapeTimer = null;
        onEvents(this.flushPendingEscape());
      }, 10);
    };
    this.input.on?.("data", onData);
    this.input.resume?.();
    return () => {
      if (escapeTimer) clearTimeout(escapeTimer);
      this.input.off?.("data", onData);
    };
  }

  installExitCleanup(target: Pick<NodeJS.Process, "on" | "off"> = process): () => void {
    const cleanup = () => this.restore();
    target.on("exit", cleanup);
    return () => target.off("exit", cleanup);
  }

  setInitialNormalCursorRow(row: number): void { this.#renderer.setInitialNormalCursorRow(row); }

  renderSnapshot(surface: TerminalSurface): void {
    this.#renderer.renderSnapshot(surface);
  }

  renderTransaction(transaction: TerminalRenderTransaction): void {
    this.#renderer.renderTransaction(transaction);
  }

  writeApplicationFrame(frame: string): void {
    this.#renderer.writeApplicationFrame(frame);
  }

  restore(state = this.#captured): void {
    if (!this.#entered || this.#restored) return;
    this.#restored = true;
    this.#renderer.restore();
    if (this.input.isTTY && state) this.input.setRawMode?.(state.raw);
  }
}
