import type { PiTuiTerminalPort } from "../../../src/integrations/pi/tui-runtime/index.js";
import type { RenderingDamageDecision, RenderingProducerWrite } from "./rendering-producer.js";

/** Records bytes and the fresh damage decision observed at that exact public terminal write. */
export class RecordingRenderingTerminal implements PiTuiTerminalPort {
  readonly kittyProtocolActive = false;
  readonly writes: RenderingProducerWrite[] = [];
  #input: ((data: string) => void) | undefined;
  #resize: (() => void) | undefined;
  #atMs = 0;
  #cause: string | undefined;
  #readDecision: (() => RenderingDamageDecision | null) | undefined;
  #observedDecision: RenderingDamageDecision | null = null;

  constructor(public columns: number, public rows: number) {}

  /** Ignore an already-existing decision, including when direct terminal writes bypass the adapter. */
  observeDamageDecisions(read: () => RenderingDamageDecision | null): void {
    this.#readDecision = read;
    this.#observedDecision = read();
  }

  setClock(atMs: number, cause: string): void { this.#atMs = atMs; this.#cause = cause; }
  start(input: (data: string) => void, resize: () => void): void { this.#input = input; this.#resize = resize; }
  stop(): void { this.#input = undefined; this.#resize = undefined; }
  async drainInput(): Promise<void> {}

  write(data: string): void {
    const decision = this.#readDecision?.() ?? null;
    // Invariant: adapter decisions are new immutable objects per write. Reusing the last one
    // would incorrectly authorize a later direct clear or attribute cursor output to cleanup.
    const fresh = decision !== null && decision !== this.#observedDecision;
    this.#observedDecision = decision;
    this.writes.push({
      data, atMs: this.#atMs,
      ...(this.#cause === undefined ? {} : { cause: this.#cause }),
      ...(fresh ? { damageDecision: { ...decision, paintedRows: [...decision.paintedRows] } } : {}),
    });
  }

  input(data: string): void { this.#input?.(data); }
  resize(columns: number, rows: number): void { this.columns = columns; this.rows = rows; this.#resize?.(); }
  moveBy(lines: number): void { if (lines > 0) this.write(`\u001b[${lines}B`); else if (lines < 0) this.write(`\u001b[${-lines}A`); }
  hideCursor(): void { this.write("\u001b[?25l"); }
  showCursor(): void { this.write("\u001b[?25h"); }
  clearLine(): void { this.write("\u001b[K"); }
  clearFromCursor(): void { this.write("\u001b[J"); }
  clearScreen(): void { this.write("\u001b[2J\u001b[H"); }
  setTitle(): void {}
  setProgress(): void {}
}
