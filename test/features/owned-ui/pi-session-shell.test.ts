import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  createPiEngineAdapter,
  PINNED_PI_HIDDEN_COMMAND_NAMES,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
  type PiRuntimeLike,
  type PiSessionLike,
} from "../../../src/foundation/pi-engine-adapter/index.js";
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
  clearQueue(): unknown { this.calls.push("clearQueue"); return { steering: ["queued steer"], followUp: ["queued follow"] }; }
  async executeBash(command: string, _onChunk: unknown, options: { excludeFromContext: boolean }): Promise<unknown> {
    this.calls.push(`bash:${command}:${options.excludeFromContext}`);
    return { output: command, exitCode: 0, cancelled: false, truncated: false };
  }
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
    await adapter.flushEvents();
    const streamingId = shell.view().transcript.find(block => block.kind === "assistant")?.id;
    expect(streamingId).toBeDefined();
    const persistentComponent = shell.root.transcriptComponent(streamingId!);
    engine.session.emit({ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: " complete" } });
    await adapter.flushEvents();
    expect(shell.root.transcriptComponent(streamingId!)).toBe(persistentComponent);
    shell.runtime.renderNow();
    const rows = shell.root.render(60).join("\n");
    expect(rows).toContain("Streaming answer");
    expect(rows).toContain("gpt-5 • medium");
    expect(rows).toContain("pi v0.84.1");
    expect(rows).toContain("commands");

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

  it("routes the complete command manifest, hidden routes, prompt resources, bash modes, and streaming queues", async () => {
    const { engine, adapter, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow").mockImplementation(async request => ({
      command: request.command,
      outcome: "completed",
      message: `ran ${request.command}`,
    }));
    for (const command of [...PINNED_PI_WORKFLOW_COMMAND_NAMES, ...PINNED_PI_HIDDEN_COMMAND_NAMES]) {
      await shell.submit(`/${command}`);
    }
    expect(workflow.mock.calls.map(([request]) => request.command)).toEqual([
      ...PINNED_PI_WORKFLOW_COMMAND_NAMES,
      ...PINNED_PI_HIDDEN_COMMAND_NAMES,
    ]);

    await shell.submit("/plan release");
    await shell.submit("/skill:review src");
    await shell.submit("!echo included");
    await shell.submit("!!echo excluded");
    expect(engine.session.calls).toContain("prompt:/plan release");
    expect(engine.session.calls).toContain("prompt:/skill:review src");
    expect(engine.session.calls).toContain("bash:echo included:false");
    expect(engine.session.calls).toContain("bash:echo excluded:true");

    engine.session.emit({ type: "agent_start" });
    await adapter.flushEvents();
    await shell.submit("steer now");
    shell.root.editor.setText("follow later");
    await shell.queueFollowUp();
    expect(engine.session.calls).toContain("steer:steer now");
    expect(engine.session.calls).toContain("followUp:follow later");
    await shell.dispose();
  });

  it("retains compaction-time input and restores queued steering and follow-up text", async () => {
    const { engine, adapter, shell } = await fixture();
    engine.session.emit({ type: "compaction_start", reason: "manual" });
    await adapter.flushEvents();
    await shell.submit("after compaction");
    expect(engine.session.calls).not.toContain("steer:after compaction");
    engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
    await adapter.flushEvents();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("steer:after compaction");

    shell.restoreQueuedInput();
    expect(shell.root.editor.getText()).toBe("queued steer\nqueued follow");
    await shell.dispose();
  });

  it("continues selector choices and renders cancellation and failure outcomes", async () => {
    const { adapter, terminal, shell } = await fixture();
    const workflow = vi.spyOn(adapter, "executeWorkflow")
      .mockResolvedValueOnce({
        command: "model",
        outcome: "requires-selection",
        message: "Model",
        selectorTitle: "Model",
        options: [{ id: "openai/gpt-5", label: "GPT-5" }],
      })
      .mockResolvedValueOnce({ command: "model", outcome: "completed", message: "Selected GPT-5" })
      .mockResolvedValueOnce({ command: "copy", outcome: "failed", message: "clipboard denied" });
    await shell.submit("/model");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(workflow).toHaveBeenNthCalledWith(2, { command: "model", argument: "", selection: "openai/gpt-5" });
    await shell.submit("/copy");
    expect(shell.root.render(80).join("\n")).toContain("Error: clipboard denied");
    await shell.dispose();
  });

  it("keeps the production bare a1 path free of the hand-written runtime, editor, and chrome", async () => {
    const source = await readFile("src/features/owned-ui/run.ts", "utf8");
    expect(source).toContain("PiSessionShell");
    expect(source).not.toMatch(/OwnedTerminalRuntime|OwnedPromptEditor|OwnedSessionRootComponent|createProcessTerminalHost/);
  });
});
