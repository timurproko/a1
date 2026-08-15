import XtermHeadless from "@xterm/headless";

const { Terminal: XtermTerminal } = XtermHeadless;
import { createPiEngineAdapter, type PiRuntimeLike, type PiSessionLike } from "../../../src/foundation/pi-engine-adapter/index.js";
import type { PiTuiTerminalPort } from "../../../src/foundation/pi-tui-runtime-adapter/index.js";
import { PiSessionShell } from "../../../src/features/owned-ui/index.js";

export interface EventStateParityEntry {
  readonly stage: string;
  readonly lifecycle: string;
  readonly queued: readonly string[];
  readonly transcript: readonly {
    readonly kind: string;
    readonly status: string;
    readonly text: string;
  }[];
}

export interface TerminalFrameParityEntry {
  readonly stage: string;
  readonly columns: number;
  readonly rows: number;
  readonly screen: readonly string[];
}

export interface EventFrameParityResult {
  readonly states: readonly EventStateParityEntry[];
  readonly frames: readonly TerminalFrameParityEntry[];
}

export const SCRIPTED_PI_EVENTS: readonly { readonly stage: string; readonly event: Record<string, unknown> }[] = [
  { stage: "working", event: { type: "agent_start" } },
  { stage: "user", event: { type: "message_start", message: { role: "user", content: [{ type: "text", text: "Inspect scripted parity" }], timestamp: 100 } } },
  { stage: "assistant-start", event: { type: "message_start", message: assistantMessage("Hello", "pending") } },
  { stage: "streaming", event: { type: "message_update", message: assistantMessage("Hello world", "pending"), assistantMessageEvent: { type: "text_delta", delta: " world" } } },
  { stage: "tool-start", event: { type: "tool_execution_start", toolCallId: "tool-1", toolName: "read", args: { path: "README.md" } } },
  { stage: "tool-update", event: { type: "tool_execution_update", toolCallId: "tool-1", toolName: "read", args: { path: "README.md" }, partialResult: { content: [{ type: "text", text: "partial" }] } } },
  { stage: "queued", event: { type: "queue_update", steering: ["Adjust approach"], followUp: ["Then summarize"] } },
  { stage: "tool-result", event: { type: "tool_execution_end", toolCallId: "tool-1", toolName: "read", args: { path: "README.md" }, result: { content: [{ type: "text", text: "Read complete" }], isError: false }, isError: false } },
  { stage: "assistant-end", event: { type: "message_end", message: assistantMessage("Hello world", "stop") } },
  {
    stage: "completed",
    event: {
      type: "agent_end",
      messages: [
        { role: "user", content: [{ type: "text", text: "Inspect scripted parity" }], timestamp: 100 },
        assistantMessage("Hello world", "stop"),
        { role: "toolResult", toolCallId: "tool-1", toolName: "read", content: [{ type: "text", text: "Read complete" }], isError: false, timestamp: 300 },
      ],
    },
  },
];

export async function buildEventFrameParityResult(): Promise<EventFrameParityResult> {
  const engine = new ScriptedRuntime();
  const adapter = await createPiEngineAdapter({
    cwd: "D:/parity",
    sessionId: "event-frame-parity",
    createRuntime: async () => engine,
  });
  const physical = new CapturingTerminal(64, 18);
  const virtual = new XtermTerminal({ cols: physical.columns, rows: physical.rows, allowProposedApi: true });
  const shell = new PiSessionShell({ adapter, cwd: "D:/parity", terminal: physical });
  const states: EventStateParityEntry[] = [];
  const frames: TerminalFrameParityEntry[] = [];
  let writeOffset = 0;

  const capture = async (stage: string, captureFrame = false): Promise<void> => {
    await adapter.flushEvents();
    shell.runtime.renderNow();
    writeOffset = await flushWrites(physical, virtual, writeOffset);
    const view = shell.view();
    states.push({
      stage,
      lifecycle: view.lifecycle,
      queued: [...view.editor.queuedSubmissions],
      transcript: view.transcript.map(block => ({ kind: block.kind, status: block.status, text: block.text })),
    });
    if (captureFrame) {
      frames.push({
        stage,
        columns: physical.columns,
        rows: physical.rows,
        screen: screenRows(virtual),
      });
    }
  };

  try {
    shell.start();
    await capture("initial", true);
    for (const entry of SCRIPTED_PI_EVENTS) {
      engine.session.emit(entry.event);
      await capture(entry.stage, ["streaming", "tool-result", "completed"].includes(entry.stage));
    }
    virtual.resize(48, 16);
    physical.resize(48, 16);
    await capture("resized", true);
    return { states, frames };
  } finally {
    await shell.dispose();
    if (!adapter.disposed) await adapter.dispose();
    virtual.dispose();
  }
}

class ScriptedSession implements PiSessionLike {
  readonly sessionId = "scripted-pi-session";
  readonly model = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  readonly thinkingLevel = "medium";
  readonly isStreaming = false;
  readonly isIdle = true;
  readonly isRetrying = false;
  readonly isCompacting = false;
  readonly messages: readonly unknown[] = [];
  #listeners = new Set<(event: unknown) => void>();
  subscribe(listener: (event: unknown) => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  emit(event: unknown): void { for (const listener of this.#listeners) listener(event); }
  async prompt(): Promise<void> {}
  async steer(): Promise<void> {}
  async followUp(): Promise<void> {}
  async abort(): Promise<void> {}
  abortRetry(): void {}
  abortCompaction(): void {}
  async compact(): Promise<void> {}
  async setModel(): Promise<void> {}
  setThinkingLevel(): void {}
  dispose(): void {}
}

class ScriptedRuntime implements PiRuntimeLike {
  readonly session = new ScriptedSession();
  readonly services = { modelRuntime: { getModel: () => undefined }, diagnostics: [] };
  readonly diagnostics = [];
  setRebindSession(): void {}
  async newSession(): Promise<void> {}
  async switchSession(): Promise<void> {}
  async dispose(): Promise<void> {}
}

class CapturingTerminal implements PiTuiTerminalPort {
  readonly kittyProtocolActive = false;
  readonly writes: string[] = [];
  #input: ((data: string) => void) | undefined;
  #resize: (() => void) | undefined;

  constructor(public columns: number, public rows: number) {}

  start(onInput: (data: string) => void, onResize: () => void): void { this.#input = onInput; this.#resize = onResize; }
  stop(): void { this.#input = undefined; this.#resize = undefined; }
  async drainInput(): Promise<void> {}
  write(data: string): void { this.writes.push(data); }
  resize(columns: number, rows: number): void { this.columns = columns; this.rows = rows; this.#resize?.(); }
  moveBy(lines: number): void { if (lines > 0) this.write(`\x1b[${lines}B`); else if (lines < 0) this.write(`\x1b[${-lines}A`); }
  hideCursor(): void { this.write("\x1b[?25l"); }
  showCursor(): void { this.write("\x1b[?25h"); }
  clearLine(): void { this.write("\x1b[K"); }
  clearFromCursor(): void { this.write("\x1b[J"); }
  clearScreen(): void { this.write("\x1b[2J\x1b[H"); }
  setTitle(title: string): void { this.write(`\x1b]0;${title}\x07`); }
  setProgress(): void {}
}

async function flushWrites(physical: CapturingTerminal, virtual: InstanceType<typeof XtermTerminal>, offset: number): Promise<number> {
  const writes = physical.writes.slice(offset).join("");
  if (writes.length > 0) await new Promise<void>(resolve => virtual.write(writes, resolve));
  return physical.writes.length;
}

function screenRows(terminal: InstanceType<typeof XtermTerminal>): readonly string[] {
  const rows: string[] = [];
  for (let row = 0; row < terminal.rows; row += 1) {
    rows.push(terminal.buffer.active.getLine(row)?.translateToString(true) ?? "");
  }
  return rows;
}

function assistantMessage(text: string, stopReason: string): Record<string, unknown> {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
    api: "openai-responses",
    provider: "openai",
    model: "gpt-5",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason,
    timestamp: 200,
  };
}
