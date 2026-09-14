import type { PiTuiTerminalPort } from "../../../src/integrations/pi/tui-runtime/index.js";

/** Records real terminal-port deliveries without a physical desktop or provider. */
export class RecordingTerminal implements PiTuiTerminalPort {
  readonly kittyProtocolActive = false;
  readonly writes: Array<{ data: string; atMs: number }> = [];
  active = false;
  onReceipt: ((data: string) => void) | undefined;
  onWrite: ((phase: "write-start" | "write-end") => void) | undefined;
  #input: ((data: string) => void) | undefined;
  #resize: (() => void) | undefined;
  constructor(public columns: number, public rows: number) {}
  start(input: (data: string) => void, resize: () => void): void { this.active = true; this.#input = input; this.#resize = resize; }
  stop(): void { this.active = false; this.#input = undefined; this.#resize = undefined; }
  async drainInput(): Promise<void> {}
  write(data: string): void {
    this.onWrite?.("write-start");
    this.writes.push({ data, atMs: performance.now() });
    this.onWrite?.("write-end");
  }
  input(data: string): void { this.onReceipt?.(data); this.#input?.(data); }
  resize(columns: number, rows: number): void { this.columns = columns; this.rows = rows; this.#resize?.(); }
  moveBy(lines: number): void { this.write(lines >= 0 ? `\u001b[${lines}B` : `\u001b[${-lines}A`); }
  hideCursor(): void { this.write("\u001b[?25l"); }
  showCursor(): void { this.write("\u001b[?25h"); }
  clearLine(): void { this.write("\u001b[K"); }
  clearFromCursor(): void { this.write("\u001b[J"); }
  clearScreen(): void { this.write("\u001b[2J\u001b[H"); }
  setTitle(): void {}
  setProgress(): void {}
}

class Session {
  readonly sessionId = "input-session";
  readonly model = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  readonly thinkingLevel = "medium";
  readonly isStreaming = false;
  readonly isIdle = true;
  readonly isRetrying = false;
  readonly isCompacting = false;
  readonly calls: string[] = [];
  #listeners = new Set<(event: unknown) => void>();
  constructor(readonly messages: readonly unknown[]) {}
  subscribe(listener: (event: unknown) => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  emit(event: unknown): void { for (const listener of this.#listeners) listener(event); }
  async prompt(text: string): Promise<void> { this.calls.push(`submit:${text}`); }
  async steer(text: string): Promise<void> { this.calls.push(`submit:${text}`); }
  async followUp(text: string): Promise<void> { this.calls.push(`submit:${text}`); }
  async abort(): Promise<void> { this.calls.push("interrupt"); }
  abortRetry(): void {}
  abortCompaction(): void {}
  async compact(): Promise<void> {}
  async setModel(): Promise<void> {}
  setThinkingLevel(): void {}
  dispose(): void {}
}

/** Synthetic engine state shared by isolated producers and deterministic observation controls. */
export class Runtime {
  readonly session: Session;
  readonly diagnostics: readonly unknown[] = [];
  readonly services;
  constructor(messages: readonly unknown[]) {
    this.session = new Session(messages);
    this.services = {
      modelRuntime: {
        getModel: () => this.session.model,
        getAvailableSnapshot: () => [this.session.model],
        getProviderAuthStatus: () => ({ configured: true, source: "stored" }),
      },
      settingsManager: { getTuiMode: () => "regular", getTheme: () => "dark" },
      diagnostics: [],
    };
  }
  setRebindSession(): void {}
  async newSession(): Promise<void> {}
  async switchSession(): Promise<void> {}
  async dispose(): Promise<void> {}
}
