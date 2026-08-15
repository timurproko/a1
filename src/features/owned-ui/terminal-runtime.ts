export type OwnedTerminalInput =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "key"; readonly key: string; readonly ctrl: boolean; readonly alt: boolean; readonly shift: boolean }
  | { readonly type: "paste"; readonly text: string }
  | { readonly type: "resize"; readonly columns: number; readonly rows: number };

export interface OwnedTerminalViewport {
  readonly columns: number;
  readonly rows: number;
}

export interface OwnedTerminalComponent {
  readonly id: string;
  focused: boolean;
  render(viewport: OwnedTerminalViewport): readonly string[];
  handleInput?(input: OwnedTerminalInput): boolean | void;
  invalidate?(): void;
  dispose?(): void;
}

export interface OwnedTerminalHost {
  readonly columns: number;
  readonly rows: number;
  write(text: string): void;
  setActive(active: boolean): void;
  onInput(listener: (text: string) => void): () => void;
  onResize(listener: (columns: number, rows: number) => void): () => void;
}

export interface OwnedTerminalRuntimeOptions {
  readonly host: OwnedTerminalHost;
  readonly root: OwnedTerminalComponent;
  readonly synchronizedOutput?: boolean;
}

interface OverlayEntry {
  readonly component: OwnedTerminalComponent;
  readonly modal: boolean;
}

const CSI = /^\x1b\[([0-9;?]*)([ -/]*)([@-~])$/;
const ANSI_SEQUENCE = /\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\)|\([A-Za-z0-9]|[@-_])/g;

export class OwnedTerminalRuntime {
  readonly #host: OwnedTerminalHost;
  readonly #root: OwnedTerminalComponent;
  readonly #synchronizedOutput: boolean;
  readonly #overlays: OverlayEntry[] = [];
  #active = false;
  #renderQueued = false;
  #renderPending: (() => void) | undefined;
  #inputBuffer = "";
  #paste: string[] | undefined;
  #disposed = false;
  #unsubscribeInput: (() => void) | undefined;
  #unsubscribeResize: (() => void) | undefined;

  constructor(options: OwnedTerminalRuntimeOptions) {
    this.#host = options.host;
    this.#root = options.root;
    this.#synchronizedOutput = options.synchronizedOutput ?? true;
  }

  get active(): boolean {
    return this.#active;
  }

  get focused(): OwnedTerminalComponent {
    const overlay = this.#overlays.at(-1);
    return overlay?.component ?? this.#root;
  }

  start(): void {
    if (this.#active || this.#disposed) return;
    this.#active = true;
    this.#host.setActive(true);
    this.#host.write("\x1b[?1049h\x1b[?2004h\x1b[?1000h\x1b[?25l");
    this.#unsubscribeInput = this.#host.onInput(text => this.#receiveRawInput(text));
    this.#unsubscribeResize = this.#host.onResize((columns, rows) => this.#resize(columns, rows));
    this.#root.focused = true;
    this.requestRender();
  }

  showOverlay(component: OwnedTerminalComponent, modal = true): () => void {
    if (this.#disposed) return () => {};
    this.focused.focused = false;
    const entry: OverlayEntry = { component, modal };
    this.#overlays.push(entry);
    component.focused = true;
    this.requestRender();
    return () => this.hideOverlay(component.id);
  }

  hideOverlay(componentId: string): boolean {
    const index = this.#overlays.findIndex(entry => entry.component.id === componentId);
    if (index < 0) return false;
    const [entry] = this.#overlays.splice(index, 1);
    entry?.component.dispose?.();
    this.focused.focused = true;
    this.requestRender();
    return true;
  }

  requestRender(): Promise<void> {
    if (this.#disposed) return Promise.resolve();
    if (this.#renderQueued) {
      return new Promise(resolve => {
        const previous = this.#renderPending;
        this.#renderPending = () => {
          previous?.();
          resolve();
        };
      });
    }
    this.#renderQueued = true;
    return new Promise(resolve => {
      this.#renderPending = resolve;
      queueMicrotask(() => this.#renderNow());
    });
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    await this.requestRender();
    this.#disposed = true;
    this.#unsubscribeInput?.();
    this.#unsubscribeResize?.();
    for (const entry of this.#overlays.splice(0)) entry.component.dispose?.();
    this.#root.dispose?.();
    this.#host.write("\x1b[?1000l\x1b[?2004l\x1b[?25h\x1b[?1049l");
    this.#host.setActive(false);
    this.#active = false;
  }

  #receiveRawInput(text: string): void {
    if (!this.#active || this.#disposed) return;
    this.#inputBuffer += text;
    for (;;) {
      if (this.#paste) {
        const end = this.#inputBuffer.indexOf("\x1b[201~");
        if (end < 0) {
          this.#paste.push(this.#inputBuffer);
          this.#inputBuffer = "";
          return;
        }
        this.#paste.push(this.#inputBuffer.slice(0, end));
        this.#inputBuffer = this.#inputBuffer.slice(end + 6);
        const pasted = this.#paste.join("");
        this.#paste = undefined;
        this.#dispatch({ type: "paste", text: pasted });
        continue;
      }
      const pasteStart = this.#inputBuffer.indexOf("\x1b[200~");
      if (pasteStart >= 0) {
        const before = this.#inputBuffer.slice(0, pasteStart);
        if (before) this.#dispatchText(before);
        this.#inputBuffer = this.#inputBuffer.slice(pasteStart + 6);
        this.#paste = [];
        continue;
      }
      if (this.#inputBuffer.startsWith("\x1b") && !CSI.test(this.#inputBuffer)) {
        if (this.#inputBuffer.length < 3 || /^\x1b\[[0-9;?]*[ -/]*$/.test(this.#inputBuffer)) return;
      }
      const sequence = CSI.exec(this.#inputBuffer);
      if (sequence) {
        this.#inputBuffer = "";
        this.#dispatch(decodeKey(sequence));
        continue;
      }
      if (this.#inputBuffer.length > 0) {
        const plain = this.#inputBuffer;
        this.#inputBuffer = "";
        this.#dispatchText(plain);
        continue;
      }
      return;
    }
  }

  #dispatchText(text: string): void {
    for (const character of text) {
      if (character === "\r" || character === "\n") {
        this.#dispatch({ type: "key", key: "enter", ctrl: false, alt: false, shift: false });
      } else if (character === "\x7f") {
        this.#dispatch({ type: "key", key: "backspace", ctrl: false, alt: false, shift: false });
      } else if (character === "\x03") {
        this.#dispatch({ type: "key", key: "c", ctrl: true, alt: false, shift: false });
      } else {
        this.#dispatch({ type: "text", text: character });
      }
    }
  }

  #dispatch(input: OwnedTerminalInput): void {
    const overlay = this.#overlays.at(-1);
    const handled = overlay?.component.handleInput?.(input);
    if (handled === true || overlay?.modal === true) {
      this.requestRender();
      return;
    }
    this.#root.handleInput?.(input);
    this.requestRender();
  }

  #resize(columns: number, rows: number): void {
    this.#root.invalidate?.();
    for (const overlay of this.#overlays) overlay.component.invalidate?.();
    this.#dispatch({ type: "resize", columns, rows });
  }

  #renderNow(): void {
    if (!this.#renderQueued || this.#disposed) return;
    this.#renderQueued = false;
    const viewport = { columns: this.#host.columns, rows: this.#host.rows };
    const lines = [...sanitizeLines(this.#root.render(viewport), viewport.columns)];
    for (const overlay of this.#overlays) {
      lines.push(...sanitizeLines(overlay.component.render(viewport), viewport.columns));
    }
    const frame = lines.slice(0, viewport.rows).join("\r\n");
    const body = this.#synchronizedOutput ? `\x1b[?2026h${frame}\x1b[?2026l` : frame;
    this.#host.write(`${body}\x1b[0m`);
    const pending = this.#renderPending;
    this.#renderPending = undefined;
    pending?.();
  }
}

export function sanitizeLines(lines: readonly string[], width: number): string[] {
  return lines.map(line => truncateVisible(line, width));
}

export function truncateVisible(line: string, width: number): string {
  if (width <= 0) return "";
  const parts = line.split(ANSI_SEQUENCE).filter(part => part.length > 0);
  const visible = parts.join("");
  if (displayWidth(visible) <= width) return line;
  const output: string[] = [];
  let used = 0;
  for (const character of visible) {
    const size = characterDisplayWidth(character);
    if (used + size > width) break;
    output.push(character);
    used += size;
  }
  return output.join("");
}

export function displayWidth(text: string): number {
  let width = 0;
  for (const character of text) width += characterDisplayWidth(character);
  return width;
}

function characterDisplayWidth(character: string): number {
  if (/^[\u1100-\u115F\u2329\u232A\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6\u{1F300}-\u{1FAFF}\u{20000}-\u{3FFFD}]$/u.test(character)) return 2;
  return 1;
}

export function createProcessTerminalHost(
  input: NodeJS.ReadStream = process.stdin,
  output: NodeJS.WriteStream = process.stdout,
): OwnedTerminalHost {
  return {
    get columns() {
      return output.columns ?? 80;
    },
    get rows() {
      return output.rows ?? 24;
    },
    write(text: string): void {
      output.write(text);
    },
    setActive(active: boolean): void {
      if (active) {
        input.setRawMode?.(true);
        input.resume();
      } else {
        input.setRawMode?.(false);
        input.pause();
      }
    },
    onInput(listener: (text: string) => void): () => void {
      const onData = (chunk: string | Buffer) => listener(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
      input.on("data", onData);
      return () => input.off("data", onData);
    },
    onResize(listener: (columns: number, rows: number) => void): () => void {
      const onResize = () => listener(output.columns ?? 80, output.rows ?? 24);
      output.on("resize", onResize);
      return () => output.off("resize", onResize);
    },
  };
}

function decodeKey(sequence: RegExpExecArray): OwnedTerminalInput {
  const final = sequence[3];
  const key = final === "A" ? "up"
    : final === "B" ? "down"
    : final === "C" ? "right"
    : final === "D" ? "left"
    : final === "H" ? "home"
    : final === "F" ? "end"
    : `csi-${final}`;
  return { type: "key", key, ctrl: false, alt: false, shift: false };
}
