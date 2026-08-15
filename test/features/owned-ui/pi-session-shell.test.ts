import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createPiEngineAdapter, type PiRuntimeLike, type PiSessionLike } from "../../../src/foundation/pi-engine-adapter/index.js";
import type { PiTuiTerminalPort } from "../../../src/foundation/pi-tui-runtime-adapter/index.js";
import { PiSessionShell } from "../../../src/features/owned-ui/index.js";

class Session implements PiSessionLike {
  readonly sessionId = "pi-session";
  model: unknown = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  thinkingLevel: unknown = "medium";
  isStreaming = false;
  readonly isIdle = true;
  isRetrying = false;
  isCompacting = false;
  readonly messages: readonly unknown[] = [];
  readonly calls: string[] = [];
  #listeners = new Set<(event: unknown) => void>();
  subscribe(listener: (event: unknown) => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  emit(event: unknown): void { for (const listener of this.#listeners) listener(event); }
  async prompt(text: string): Promise<void> { this.calls.push(`prompt:${text}`); }
  async steer(text: string): Promise<void> { this.calls.push(`steer:${text}`); }
  async followUp(text: string): Promise<void> { this.calls.push(`followUp:${text}`); }
  async abort(): Promise<void> { this.calls.push("abort"); }
  abortRetry(): void { this.calls.push("abortRetry"); }
  abortCompaction(): void { this.calls.push("abortCompaction"); }
  async compact(): Promise<void> { this.calls.push("compact"); }
  async setModel(model: unknown): Promise<void> { this.model = model; this.calls.push("setModel"); }
  setThinkingLevel(level: unknown): void { this.thinkingLevel = level; this.calls.push(`thinking:${String(level)}`); }
  dispose(): void {}
}

class Runtime implements PiRuntimeLike {
  readonly session = new Session();
  readonly services = { modelRuntime: { getModel: (_provider: string, id: string) => ({ provider: "openai", id, name: id }) }, diagnostics: [] };
  readonly diagnostics = [];
  readonly calls: string[] = [];
  setRebindSession(): void {}
  async newSession(): Promise<void> { this.calls.push("newSession"); }
  async switchSession(path: string): Promise<void> { this.calls.push(`switch:${path}`); }
  async dispose(): Promise<void> { this.calls.push("dispose"); }
}

class Terminal implements PiTuiTerminalPort {
  columns = 80;
  rows = 24;
  readonly kittyProtocolActive = false;
  readonly writes: string[] = [];
  #input: ((data: string) => void) | undefined;
  #resize: (() => void) | undefined;
  start(onInput: (data: string) => void, onResize: () => void): void { this.#input = onInput; this.#resize = onResize; }
  stop(): void { this.#input = undefined; this.#resize = undefined; }
  async drainInput(): Promise<void> {}
  write(data: string): void { this.writes.push(data); }
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
}

async function fixture() {
  const engine = new Runtime();
  const adapter = await createPiEngineAdapter({ cwd: "D:/work", sessionId: "owned-shell", createRuntime: async () => engine });
  const terminal = new Terminal();
  const shell = new PiSessionShell({ adapter, cwd: "D:/work", terminal });
  shell.start();
  shell.runtime.renderNow();
  return { engine, adapter, terminal, shell };
}

describe("PiSessionShell", () => {
  it("composes the public Pi editor, transcript, tool/status surfaces, and runtime", async () => {
    const { engine, adapter, terminal, shell } = await fixture();
    shell.root.editor.setText("Inspect with Pi editor");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("prompt:Inspect with Pi editor");

    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "message_start", message: { role: "assistant", content: [{ type: "text", text: "Streaming answer" }], timestamp: 1 } });
    engine.session.emit({ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: " complete" } });
    await adapter.flushEvents();
    shell.runtime.renderNow();
    const rows = shell.root.render(60).join("\n");
    expect(rows).toContain("Streaming answer");
    expect(rows).toContain("thinking:medium");

    const handle = shell.showSelector("Choose", [{ id: "one", label: "One" }], () => {});
    shell.runtime.renderNow();
    expect(handle.isFocused()).toBe(true);
    terminal.resize(50, 16);
    shell.runtime.renderNow();
    expect(shell.runtime.viewport()).toEqual({ columns: 50, rows: 16 });

    await shell.shutdown();
    await shell.dispose();
    expect(engine.calls).toContain("dispose");
  });

  it("keeps the production a1 ui path free of the hand-written runtime, editor, and chrome", async () => {
    const source = await readFile("src/features/owned-ui/run.ts", "utf8");
    expect(source).toContain("PiSessionShell");
    expect(source).not.toMatch(/OwnedTerminalRuntime|OwnedPromptEditor|OwnedSessionRootComponent|createProcessTerminalHost/);
  });
});
