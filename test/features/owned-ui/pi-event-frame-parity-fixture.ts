import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { createPiEngineAdapter } from "../../../src/integrations/pi/engine/index.js";
import { applyPiTheme } from "../../../src/integrations/pi/components/index.js";
import type { PiTuiTerminalPort } from "../../../src/integrations/pi/tui-runtime/index.js";
import { OwnedUiSessionShell } from "../../../src/integrations/pi/session-ui/index.js";

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
  readonly capturedAnsi: string;
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
  applyPiTheme("dark", false, "truecolor");
  const engine = new ScriptedRuntime();
  const adapter = await createPiEngineAdapter({
    cwd: "D:/parity",
    sessionId: "event-frame-parity",
    createRuntime: async () => engine as unknown as AgentSessionRuntime,
  });
  const physical = new CapturingTerminal(64, 18);
  const shell = new OwnedUiSessionShell({ backend: adapter, cwd: "D:/parity", terminal: physical });
  const states: EventStateParityEntry[] = [];
  const frames: TerminalFrameParityEntry[] = [];
  let writeOffset = 0;

  const capture = async (stage: string, captureFrame = false): Promise<void> => {
    await adapter.flushEvents();
    shell.runtime.renderNow();
    const capturedAnsi = physical.writes.slice(writeOffset).join("");
    writeOffset = physical.writes.length;
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
        capturedAnsi: normalizeCapturedFrame(capturedAnsi),
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
    physical.resize(48, 16);
    await capture("resized", true);
    return { states, frames };
  } finally {
    await shell.dispose();
    if (!adapter.disposed) await adapter.dispose();
  }
}

class ScriptedSession {
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

class ScriptedRuntime {
  readonly session = new ScriptedSession();
  readonly services = {
    modelRuntime: {
      getModel: () => undefined,
      getAvailableSnapshot: () => [{ provider: "openai", id: "gpt-5", name: "GPT-5" }],
    },
    diagnostics: [],
  };
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

function normalizeCapturedFrame(frame: string): string {
  return frame
    .replaceAll("\x1b[?2026h", "")
    .replaceAll("\x1b[?2026l", "")
    // Stored A1 diagnostics are cross-platform and do not own parity authority;
    // normalize optional OSC 8 wrappers while preserving every SGR byte and cell.
    .replace(/\x1b]8;;[^\x07\x1b]*(?:\x07|\x1b\\)/g, "");
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
