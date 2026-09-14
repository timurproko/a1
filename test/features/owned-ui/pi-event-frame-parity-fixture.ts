import { EventFrameClock } from "./event-frame-clock.js";
import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { createPiEngineAdapter } from "../../../src/integrations/pi/engine/index.js";
import { applyPiTheme, applyPiThemeInstance, piTheme } from "../../../src/integrations/pi/components/index.js";
import type { PiTuiTerminalPort } from "../../../src/integrations/pi/tui-runtime/index.js";
import { OwnedUiSessionShell } from "../../../src/integrations/pi/session-ui/index.js";
import { withPiParityColorMode } from "../../support/pi-terminal-capabilities.js";

/** Declared color grammar retained by the event-frame diagnostic fixture. */
export const EVENT_FRAME_PARITY_COLOR_MODE = "truecolor" as const;

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

/** Test-only checkpoints expose due timer attempts, not private renderer state or synthesized writes. */
export interface EventFrameCaptureOptions {
  readonly clock?: EventFrameClock;
  readonly beforeEvent?: (stage: string) => void | Promise<void>;
  readonly boundary?: (stage: string, phase: "before-flush" | "after-flush" | "before-capture" | "after-capture" | "before-resize" | "after-resize", advanceTimers: (milliseconds: number) => number) => void | Promise<void>;
  readonly failTerminalStop?: boolean;
}

/** Capture a non-concurrent event workload with explicit paint checkpoints and scoped host state. */
export async function buildEventFrameParityResult(options: EventFrameCaptureOptions = {}): Promise<EventFrameParityResult> {
  const clock = options.clock ?? new EventFrameClock();
  return clock.run(async () => {
    const previousTheme = piTheme();
    try {
      return await withPiParityColorMode(EVENT_FRAME_PARITY_COLOR_MODE, () => captureEventFrames(options, clock), { hyperlinks: true });
    } finally {
      applyPiTheme(previousTheme.name ?? "dark", false, previousTheme.getColorMode());
      applyPiThemeInstance(previousTheme);
    }
  });
}

async function captureEventFrames(options: EventFrameCaptureOptions, clock: EventFrameClock): Promise<EventFrameParityResult> {
  applyPiTheme("dark", false, EVENT_FRAME_PARITY_COLOR_MODE);
  const engine = new ScriptedRuntime();
  const adapter = await createPiEngineAdapter({
    cwd: "D:/parity",
    sessionId: "event-frame-parity",
    createRuntime: async () => engine as unknown as AgentSessionRuntime,
  });
  let ownedShell: OwnedUiSessionShell | undefined;
  try {
    const physical = new CapturingTerminal(64, 18, options.failTerminalStop);
    const shell = new OwnedUiSessionShell({ backend: adapter, cwd: "D:/parity", terminal: physical });
    ownedShell = shell;
    const states: EventStateParityEntry[] = [];
    const frames: TerminalFrameParityEntry[] = [];
    let writeOffset = 0;
    let paintedRevision = -1;
    let paintedColumns = -1;
    let paintedRows = -1;
    const render = shell.root.render.bind(shell.root);
    // Invariant: observe the public component render boundary, not incidental terminal writes.
    // This instance-only probe leaves installed packages and private/prototype state untouched.
    shell.root.render = columns => {
      const rows = render(columns);
      paintedRevision = shell.view().revision;
      paintedColumns = columns;
      paintedRows = physical.rows;
      return rows;
    };
    const boundary = (stage: string, phase: Parameters<NonNullable<EventFrameCaptureOptions["boundary"]>>[1]): Promise<void> =>
      clock.settle(`${stage}/${phase}`, async () => { await options.boundary?.(stage, phase, milliseconds => clock.advance(milliseconds)); }, () => adapter.deliveryDiagnostics());

    const captureRendered = (stage: string, captureFrame = false, forceRender = false): void => {
      if (forceRender || paintedRevision !== shell.view().revision || paintedColumns !== physical.columns || paintedRows !== physical.rows) shell.runtime.renderNow();
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
    const discardMaintenanceRender = (): void => {
      shell.runtime.renderNow();
      writeOffset = physical.writes.length;
    };
    const captureEvent = async (stage: string, captureFrame = false): Promise<void> => {
      await boundary(stage, "before-flush");
      await clock.settle(`${stage}/flush`, () => adapter.flushEvents(), () => adapter.deliveryDiagnostics());
      await boundary(stage, "after-flush");
      await boundary(stage, "before-capture");
      captureRendered(stage, captureFrame);
      clock.hold(false);
      await boundary(stage, "after-capture");
    };

    clock.hold(true);
    shell.start();
    captureRendered("initial", true, true);
    clock.hold(false);
    await boundary("initial", "after-capture");
    for (const entry of SCRIPTED_PI_EVENTS) {
      if (options.beforeEvent !== undefined) await clock.settle(`${entry.stage}/before-event`, async () => { await options.beforeEvent?.(entry.stage); });
      // Compatibility: settle only prior maintenance outside the next event's capture window.
      discardMaintenanceRender();
      clock.hold(true);
      engine.session.emit(entry.event);
      await captureEvent(entry.stage, ["streaming", "tool-result", "completed"].includes(entry.stage));
    }
    discardMaintenanceRender();
    clock.hold(true);
    await boundary("resized", "before-resize");
    physical.resize(48, 16);
    await boundary("resized", "after-resize");
    await boundary("resized", "before-capture");
    captureRendered("resized", true);
    clock.hold(false);
    await boundary("resized", "after-capture");
    return { states, frames };
  } finally {
    try { await clock.settle("dispose-shell", async () => { await ownedShell?.dispose(); }); }
    finally { if (!adapter.disposed) await clock.settle("dispose-adapter", () => adapter.dispose(), () => adapter.deliveryDiagnostics()); }
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

  constructor(public columns: number, public rows: number, readonly failStop = false) {}

  start(onInput: (data: string) => void, onResize: () => void): void { this.#input = onInput; this.#resize = onResize; }
  stop(): void {
    this.#input = undefined;
    this.#resize = undefined;
    if (this.failStop) throw new Error("injected terminal disposal failure");
  }
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
    // Compatibility: stored A1 diagnostics are cross-platform and do not own parity authority;
    // canonicalize optional OSC 8 targets while preserving wrappers, every SGR byte, and every cell.
    .replace(/\x1b]8;;([^\x07\x1b]*)(\x07|\x1b\\)/g, normalizeOsc8Link);
}

function normalizeOsc8Link(sequence: string, target: string, terminator: string): string {
  if (!target) return sequence;
  const suffix = target.split(/[\\/]/u).at(-1) ?? "target";
  return `\x1b]8;;<absolute-link-target>/${suffix}${terminator}`;
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
