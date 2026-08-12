import type { HostTerminalAdapter, HostTerminalInputEvent, HostTerminalState, KeyModifiers, TerminalMouseEvent, TerminalRenderTransaction, TerminalSurface } from "../domain/index.js";
import { decodeWindowsKeyIdentity, VtHostInputDecoder } from "../terminal-input.js";
import { FullscreenHostRenderer, type HostRendererTransaction } from "../ui/host-terminal-renderer.js";
import { getWindowsConsoleInputMode, setWindowsConsoleInputMode, type PowerShellRunner } from "../windows-console-mode.js";
import { startWindowsRecordReader } from "./windows-record-reader.js";

const WINDOWS_HOST_KEYBOARD_AND_SCROLL_MODES = "\x1b[?9001h\x1b[?1007h";
const WINDOWS_HOST_KEYBOARD_AND_SCROLL_MODES_OFF = "\x1b[?1007l\x1b[?9001l";

export interface WindowsHostInput {
  readonly isTTY?: boolean;
  readonly isRaw?: boolean;
  setRawMode?(enabled: boolean): void;
  on?(event: "data", listener: (data: Buffer | string) => void): unknown;
  off?(event: "data", listener: (data: Buffer | string) => void): unknown;
  resume?(): unknown;
  pause?(): unknown;
}

export type WindowsInputRecord =
  | { readonly type: "key"; readonly keyDown: boolean; readonly repeatCount: number; readonly virtualKey: number; readonly scanCode: number; readonly unicode: number; readonly controlKeyState: number }
  | { readonly type: "mouse"; readonly x: number; readonly y: number; readonly buttonState: number; readonly controlKeyState: number; readonly eventFlags: number }
  | { readonly type: "focus"; readonly focused: boolean }
  | { readonly type: "resize"; readonly columns: number; readonly rows: number };

export interface WindowsConsoleApi {
  getInputMode(): number | null;
  setInputMode(mode: number): boolean;
}

export class WindowsHostTerminalAdapter implements HostTerminalAdapter {
  #captured: HostTerminalState | null = null;
  #entered = false;
  #restored = false;
  readonly #decoder = new VtHostInputDecoder();
  readonly #renderer: FullscreenHostRenderer;

  constructor(
    private readonly input: WindowsHostInput,
    output: Pick<NodeJS.WriteStream, "write">,
    private readonly consoleApi: WindowsConsoleApi = defaultWindowsConsoleApi(),
    onRendererTransaction: (transaction: HostRendererTransaction) => void = () => {},
    initialNormalCursorRow = 0,
  ) {
    this.#renderer = new FullscreenHostRenderer(output, 0, WINDOWS_HOST_KEYBOARD_AND_SCROLL_MODES, WINDOWS_HOST_KEYBOARD_AND_SCROLL_MODES_OFF, undefined, onRendererTransaction, undefined, initialNormalCursorRow);
  }

  capture(): HostTerminalState {
    if (this.#captured) return this.#captured;
    this.#captured = {
      platform: "win32",
      inputMode: this.consoleApi.getInputMode(),
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

  /** VTI fallback and Windows Terminal CSI ? 9001 record path. */
  decode(data: Uint8Array): readonly HostTerminalInputEvent[] {
    const encoded = Buffer.from(data).toString("utf8");
    const alternateWheel = /^\x1b\[(38|40);\d+;0;1;\d+;([3-9]\d*)_$/.exec(encoded);
    if (alternateWheel) {
      return [{
        type: "mouse", action: "wheel", button: "none",
        modifiers: { shift: false, alt: false, control: false, meta: false },
        column: 0, row: 0, wheelDelta: alternateWheel[1] === "38" ? 1 : -1,
      }];
    }
    return this.#decoder.push(data);
  }

  /** Native ReadConsoleInputW path. */
  decodeInputRecords(records: readonly WindowsInputRecord[]): readonly HostTerminalInputEvent[] {
    return records.flatMap(record => decodeInputRecord(record));
  }

  flushPendingEscape(): readonly HostTerminalInputEvent[] {
    return this.#decoder.flushPendingEscape();
  }

  resize(columns: number, rows: number): HostTerminalInputEvent {
    return { type: "resize", dimensions: { columns, rows } };
  }

  startInput(onEvents: (events: readonly HostTerminalInputEvent[]) => void, preferNativeRecords = process.env.ADDONE_WINDOWS_NATIVE_INPUT_RECORDS === "1"): () => void {
    let fallbackActive = false;
    let escapeTimer: NodeJS.Timeout | null = null;
    const onData = (data: Buffer | string) => {
      if (escapeTimer) clearTimeout(escapeTimer);
      onEvents(this.decode(typeof data === "string" ? Buffer.from(data, "utf8") : data));
      escapeTimer = setTimeout(() => {
        escapeTimer = null;
        onEvents(this.flushPendingEscape());
      }, 10);
    };
    const activateFallback = () => {
      if (fallbackActive) return;
      fallbackActive = true;
      this.input.on?.("data", onData);
      this.input.resume?.();
    };
    const reader = preferNativeRecords
      ? startWindowsRecordReader(record => onEvents(this.decodeInputRecords([record])), activateFallback)
      : { available: false, stop() {} };
    if (!reader.available) activateFallback();
    return () => {
      reader.stop();
      if (escapeTimer) clearTimeout(escapeTimer);
      if (fallbackActive) this.input.off?.("data", onData);
    };
  }

  setInitialNormalCursorRow(row: number): void { this.#renderer.setInitialNormalCursorRow(row); }
  renderSnapshot(surface: TerminalSurface): void { this.#renderer.renderSnapshot(surface); }
  renderTransaction(transaction: TerminalRenderTransaction): void { this.#renderer.renderTransaction(transaction); }
  writeApplicationFrame(frame: string): void { this.#renderer.writeApplicationFrame(frame); }

  restore(state = this.#captured): void {
    if (!this.#entered || this.#restored) return;
    this.#restored = true;
    this.#renderer.restore();
    if (this.input.isTTY && state) this.input.setRawMode?.(state.raw);
    if (state?.inputMode !== null && state?.inputMode !== undefined) this.consoleApi.setInputMode(state.inputMode);
  }

  installExitCleanup(target: Pick<NodeJS.Process, "on" | "off"> = process): () => void {
    const cleanup = () => this.restore();
    target.on("exit", cleanup);
    return () => target.off("exit", cleanup);
  }
}

export function decodeInputRecord(record: WindowsInputRecord): readonly HostTerminalInputEvent[] {
  if (record.type === "focus") return [{ type: "focus", focused: record.focused }];
  if (record.type === "resize") return [{ type: "resize", dimensions: { columns: record.columns, rows: record.rows } }];
  if (record.type === "key") {
    const modifiers = decodeModifiers(record.controlKeyState);
    const identity = decodeWindowsKeyIdentity(record.virtualKey, record.unicode, modifiers.control);
    const base = { type: "key" as const, ...identity, modifiers };
    if (!record.keyDown) return [{ ...base, action: "release" }];
    return Array.from({ length: Math.max(1, record.repeatCount) }, (_, index) => ({ ...base, action: index === 0 ? "press" as const : "repeat" as const }));
  }
  return [decodeMouseRecord(record)];
}

function decodeMouseRecord(record: Extract<WindowsInputRecord, { type: "mouse" }>): TerminalMouseEvent {
  const wheel = (record.eventFlags & 0x0004) !== 0 || (record.eventFlags & 0x0008) !== 0;
  const movement = (record.eventFlags & 0x0001) !== 0;
  const wheelDelta = wheel ? signedHighWord(record.buttonState) : 0;
  const button = (record.buttonState & 0x0001) !== 0 ? "left" : (record.buttonState & 0x0004) !== 0 ? "right" : (record.buttonState & 0x0002) !== 0 ? "middle" : "none";
  return {
    type: "mouse",
    action: wheel ? "wheel" : movement ? "move" : button === "none" ? "release" : "press",
    button,
    modifiers: decodeModifiers(record.controlKeyState),
    column: Math.max(0, record.x),
    row: Math.max(0, record.y),
    wheelDelta: wheelDelta === 0 ? 0 : wheelDelta > 0 ? 1 : -1,
  };
}

function decodeModifiers(state: number): KeyModifiers {
  return {
    shift: (state & 0x0010) !== 0,
    alt: (state & 0x0003) !== 0,
    control: (state & 0x000c) !== 0,
    meta: false,
  };
}
function signedHighWord(value: number): number {
  const word = (value >>> 16) & 0xffff;
  return word >= 0x8000 ? word - 0x1_0000 : word;
}
function defaultWindowsConsoleApi(runner?: PowerShellRunner): WindowsConsoleApi {
  return {
    getInputMode: () => getWindowsConsoleInputMode(runner),
    setInputMode: mode => setWindowsConsoleInputMode(mode, runner),
  };
}
