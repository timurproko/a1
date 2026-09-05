import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import {
  AssistantMessageComponent,
  UserMessageComponent,
  getMarkdownTheme,
  initTheme,
} from "@earendil-works/pi-coding-agent";
import {
  Container,
  Text,
  TuiAltScreen,
  TuiMainScreen,
  type Component,
} from "#pi-tui";
import { applyPiTheme } from "../../../src/integrations/pi/components/index.js";
import { createPiEngineAdapter } from "../../../src/integrations/pi/engine/index.js";
import { OwnedUiSessionShell } from "../../../src/integrations/pi/session-ui/index.js";
import type { PiTuiTerminalPort } from "../../../src/integrations/pi/tui-runtime/index.js";
import type { TranscriptViewportFrameDescriptor } from "../../../src/ui/components/index.js";
import type {
  RenderingProducerCheckpoint,
  RenderingProducerRequest,
  RenderingProducerResult,
} from "./rendering-producer.js";
import { STREAM_RENDERING_WORKLOADS, type RenderingWorkloadStep } from "./streaming-workloads.js";

async function runOwned(
  producerRequest: RenderingProducerRequest,
  steps: readonly RenderingWorkloadStep[],
): Promise<RenderingProducerResult> {
  applyPiTheme(producerRequest.state.theme, false, "truecolor");
  const runtime = new ScriptedRuntime(producerRequest.mode);
  const adapter = await createPiEngineAdapter({
    cwd: producerRequest.state.cwd,
    sessionId: `render-${producerRequest.producer}`,
    createRuntime: async () => runtime as unknown as AgentSessionRuntime,
  });
  const terminal = new RecordingTerminal(producerRequest.state.columns, producerRequest.state.rows);
  const shell = new OwnedUiSessionShell({
    backend: adapter,
    cwd: producerRequest.state.cwd,
    terminal,
    ...(producerRequest.producer === "bare-a1" ? { sessionLayout: "custom-viewport" as const } : {}),
  });
  const checkpoints: RenderingProducerCheckpoint[] = [];
  try {
    terminal.setClock(0, "initial");
    shell.start();
    await adapter.flushEvents();
    shell.runtime.renderNow();
    checkpoints.push(ownedCheckpoint(
      "initial",
      0,
      terminal,
      shell.view().transcript,
      shell.root.viewportFrameDescriptor(),
      shell.damagePresentationDecision(),
      shell.root.viewportTransientTailRowCount(),
    ));
    for (const step of steps) {
      terminal.setClock(step.atMs, step.checkpoint);
      if (step.action.type === "event") runtime.session.emit(step.action.value);
      else if (step.action.type === "resize") terminal.resize(step.action.columns, step.action.rows);
      else terminal.input(step.action.data);
      await adapter.flushEvents();
      shell.runtime.renderNow();
      checkpoints.push(ownedCheckpoint(
        step.checkpoint,
        step.atMs,
        terminal,
        shell.view().transcript,
        shell.root.viewportFrameDescriptor(),
        shell.damagePresentationDecision(),
        shell.root.viewportTransientTailRowCount(),
      ));
    }
    return {
      producer: producerRequest.producer,
      processId: process.pid,
      effectiveMode: shell.runtime.mode,
      state: producerRequest.state,
      writes: [...terminal.writes],
      checkpoints,
    };
  } finally {
    await shell.dispose();
    if (!adapter.disposed) await adapter.dispose();
  }
}

async function runPinned(
  producerRequest: RenderingProducerRequest,
  steps: readonly RenderingWorkloadStep[],
): Promise<RenderingProducerResult> {
  initTheme(producerRequest.state.theme, false);
  const terminal = new RecordingTerminal(producerRequest.state.columns, producerRequest.state.rows);
  const root = new PinnedRoot();
  const tui = producerRequest.mode === "fullscreen"
    ? new TuiAltScreen(terminal, false, undefined, { mouse: false })
    : new TuiMainScreen(terminal, false);
  const checkpoints: RenderingProducerCheckpoint[] = [];
  try {
    tui.addChild(root);
    tui.setFocus(root);
    terminal.setClock(0, "initial");
    tui.start();
    tui.renderNow();
    checkpoints.push(pinnedCheckpoint("initial", 0, terminal, root.transcript));
    for (const step of steps) {
      terminal.setClock(step.atMs, step.checkpoint);
      if (step.action.type === "event") root.applyEvent(step.action.value);
      else if (step.action.type === "resize") terminal.resize(step.action.columns, step.action.rows);
      else terminal.input(step.action.data);
      tui.requestRender();
      tui.renderNow();
      checkpoints.push(pinnedCheckpoint(step.checkpoint, step.atMs, terminal, root.transcript));
    }
    return {
      producer: "pinned-pi",
      processId: process.pid,
      effectiveMode: producerRequest.mode,
      state: producerRequest.state,
      writes: [...terminal.writes],
      checkpoints,
    };
  } finally {
    tui.stop({ preserveScreen: true });
  }
}

class RecordingTerminal implements PiTuiTerminalPort {
  readonly kittyProtocolActive = false;
  readonly writes: Array<{ data: string; atMs: number; cause?: string }> = [];
  #input: ((data: string) => void) | undefined;
  #resize: (() => void) | undefined;
  #atMs = 0;
  #cause: string | undefined;

  constructor(public columns: number, public rows: number) {}
  setClock(atMs: number, cause: string): void { this.#atMs = atMs; this.#cause = cause; }
  start(input: (data: string) => void, resize: () => void): void { this.#input = input; this.#resize = resize; }
  stop(): void { this.#input = undefined; this.#resize = undefined; }
  async drainInput(): Promise<void> {}
  write(data: string): void { this.writes.push({ data, atMs: this.#atMs, ...(this.#cause === undefined ? {} : { cause: this.#cause }) }); }
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

class ScriptedSession {
  readonly sessionId = "rendering-session";
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
  readonly services;
  readonly diagnostics: readonly unknown[] = [];
  constructor(mode: "regular" | "fullscreen") {
    this.services = {
      modelRuntime: {
        getModel: () => this.session.model,
        getAvailableSnapshot: () => [this.session.model],
        getProviderAuthStatus: () => ({ configured: true, source: "stored" }),
      },
      settingsManager: {
        getTuiMode: () => mode,
        getTheme: () => "dark",
      },
      diagnostics: [],
    };
  }
  setRebindSession(): void {}
  async newSession(): Promise<void> {}
  async switchSession(): Promise<void> {}
  async dispose(): Promise<void> {}
}

class PinnedRoot implements Component {
  readonly #document = new Container();
  readonly #dock = new Container();
  readonly transcript: Array<{ kind: string; status: string; text: string }> = [];
  #assistant: AssistantMessageComponent | undefined;
  #assistantIndex = -1;
  #working = false;

  constructor() { this.#rebuildDock(); }
  render(width: number): string[] { return [...this.#document.render(width), ...this.#dock.render(width)]; }
  invalidate(): void { this.#document.invalidate(); this.#dock.invalidate(); }
  handleInput(): void {}
  applyEvent(event: Readonly<Record<string, unknown>>): void {
    if (event.type === "agent_start") this.#working = true;
    else if (event.type === "agent_settled" || event.type === "agent_end") {
      this.#working = false;
      for (const [index, entry] of this.transcript.entries()) {
        if (entry.status === "live") this.transcript[index] = { ...entry, status: "finalized" };
      }
    }
    else if (event.type === "message_start" || event.type === "message_update" || event.type === "message_end") {
      const message = event.message;
      if (isRecord(message) && message.role === "user" && event.type === "message_start") {
        const text = textFromContent(message.content);
        this.#document.addChild(new UserMessageComponent(text));
        this.transcript.push({ kind: "user", status: "live", text });
      } else if (isRecord(message) && message.role === "assistant") {
        const status = event.type === "message_end" ? "finalized" : "live";
        const text = textFromContent(message.content);
        const delta = event.type === "message_update" && isRecord(event.assistantMessageEvent)
          && typeof event.assistantMessageEvent.delta === "string"
          ? event.assistantMessageEvent.delta
          : undefined;
        const semanticText = delta !== undefined && !text.endsWith(delta) ? `${text}${delta}` : text;
        if (this.#assistant === undefined) {
          this.#assistant = new AssistantMessageComponent(undefined, false, getMarkdownTheme());
          this.#assistantIndex = this.transcript.length;
          this.#document.addChild(this.#assistant);
          this.transcript.push({ kind: "assistant", status, text: semanticText });
        } else this.transcript[this.#assistantIndex] = { kind: "assistant", status, text: semanticText };
        this.#assistant.updateContent(message as never, status === "live");
      }
    } else if (event.type === "tool_execution_start" || event.type === "tool_execution_update" || event.type === "tool_execution_end") {
      const status = event.type === "tool_execution_end" ? "finalized" : "live";
      const source = event.type === "tool_execution_end" ? event.result : event.partialResult;
      const text = isRecord(source) ? textFromContent(source.content) : "";
      const existing = this.transcript.findIndex(item => item.kind.startsWith("tool"));
      const entry = { kind: status === "finalized" ? "tool-result" : "tool-call", status, text };
      if (existing < 0) {
        this.transcript.push(entry);
        this.#document.addChild(new Text(` ${String(event.toolName ?? "tool")}: ${text}`, 0, 0));
      } else this.transcript[existing] = entry;
    }
    this.#rebuildDock();
  }
  #rebuildDock(): void {
    this.#dock.clear();
    if (this.#working) this.#dock.addChild(new Text(" Working...", 0, 0));
    this.#dock.addChild(new Text("\n> \n fixture • gpt-5", 0, 0));
  }
}

function ownedCheckpoint(
  name: string,
  atMs: number,
  terminal: RecordingTerminal,
  transcript: readonly { kind: string; status: string; text: string }[],
  descriptor: TranscriptViewportFrameDescriptor | null,
  damageDecision: RenderingProducerCheckpoint["damageDecision"] | null,
  transientTailRows: number,
): RenderingProducerCheckpoint {
  return {
    name,
    atMs,
    writeEnd: terminal.writes.length,
    columns: terminal.columns,
    rows: terminal.rows,
    transcript: transcript.map(block => ({ kind: block.kind, status: block.status, text: block.text })),
    ...(damageDecision == null ? {} : { damageDecision }),
    ...(descriptor === null ? {} : {
      viewport: {
        frameId: descriptor.frameId,
        transcript: descriptor.transcript,
        dock: descriptor.dock,
        followingEnd: descriptor.followingEnd,
        verticalShiftRows: descriptor.verticalShiftRows,
        safeVerticalShift: descriptor.safeVerticalShift,
        cause: descriptor.cause,
        transientTailRows,
      },
    }),
  };
}

function pinnedCheckpoint(
  name: string,
  atMs: number,
  terminal: RecordingTerminal,
  transcript: readonly { kind: string; status: string; text: string }[],
): RenderingProducerCheckpoint {
  return ownedCheckpoint(name, atMs, terminal, transcript, null, null, 0);
}

async function readRequest(): Promise<RenderingProducerRequest> {
  const input = await new Promise<string>((resolve, reject) => {
    let text = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => { text += chunk; });
    process.stdin.once("end", () => resolve(text));
    process.stdin.once("error", reject);
    process.stdin.resume();
  });
  const value: unknown = JSON.parse(input);
  if (!isRecord(value)) throw new Error("producer request must be an object");
  return value as unknown as RenderingProducerRequest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function textFromContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map(item => isRecord(item) && typeof item.text === "string" ? item.text : "").join("");
}

async function main(): Promise<void> {
  const request = await readRequest();
  if (request.testBehavior === "startup-hang") await hangForever();
  const workload = STREAM_RENDERING_WORKLOADS.find(candidate => candidate.id === request.workloadId);
  if (workload === undefined) throw new Error(`unknown workload: ${request.workloadId}`);
  if (workload.columns !== request.state.columns || workload.rows !== request.state.rows) {
    throw new Error("producer state geometry does not match workload geometry");
  }
  process.send?.({ type: "ready" });
  if (request.testBehavior === "hang") await hangForever();
  if (request.testBehavior === "fail") throw new Error("requested producer failure");
  const result = request.producer === "pinned-pi"
    ? await runPinned(request, workload.steps)
    : await runOwned(request, workload.steps);
  await new Promise<void>((resolve, reject) => {
    process.stdout.write(JSON.stringify(result), error => error ? reject(error) : resolve());
  });
  process.exit(0);
}

function hangForever(): Promise<never> {
  return new Promise(() => { setInterval(() => {}, 60_000); });
}

await main();
