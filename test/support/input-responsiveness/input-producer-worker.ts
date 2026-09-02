import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { getSelectListTheme, initTheme } from "@earendil-works/pi-coding-agent";
import { SelectList, TuiMainScreen, type Component } from "#pi-tui";
import { applyPiTheme, createPiShellSelector, type PiShellComponentPort } from "../../../src/integrations/pi/components/index.js";
import { createPiEngineAdapter } from "../../../src/integrations/pi/engine/index.js";
import { OwnedUiSessionShell } from "../../../src/integrations/pi/session-ui/index.js";
import type { PiTuiInputDiagnosticsEvent, PiTuiTerminalPort } from "../../../src/integrations/pi/tui-runtime/index.js";
import { createPinnedEditorHarness } from "../../integrations/pi/components/pinned-editor-upstream-fixture.js";
import type {
  InputProducerBatchRequest,
  InputProducerCheckpoint,
  InputProducerRequest,
  InputProducerResult,
} from "./input-producer.js";
import { INPUT_RESPONSIVENESS_WORKLOADS, assertInputResponsivenessWorkload } from "./input-workloads.js";

class RecordingTerminal implements PiTuiTerminalPort {
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

class Runtime {
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

async function runOwned(request: InputProducerRequest): Promise<InputProducerResult> {
  const workload = requireWorkload(request.workloadId);
  applyPiTheme("dark", false, "truecolor");
  const runtime = new Runtime(preparedMessages(workload.preparedTranscriptBlocks));
  const adapter = await createPiEngineAdapter({
    cwd: request.state.cwd,
    sessionId: `input-${request.producer}`,
    createRuntime: async () => runtime as unknown as AgentSessionRuntime,
  });
  const terminal = new RecordingTerminal(request.state.columns, request.state.rows);
  const phases: PiTuiInputDiagnosticsEvent[] = [];
  const shell = new OwnedUiSessionShell({
    backend: adapter,
    cwd: request.state.cwd,
    terminal,
    ...(request.producer === "bare-a1" ? { sessionLayout: "custom-viewport" as const } : {}),
    inputPresentation: {
      onEvent: event => phases.push(event),
      now: () => performance.now(),
      ...(request.variant === "baseline" ? { coordination: false, viewportReuse: false } : {}),
    },
  });
  const actions = runtime.session.calls;
  let selected: string | null = null;
  let streamStarted = false;
  const checkpoints: InputProducerCheckpoint[] = [];
  try {
    shell.start();
    shell.runtime.renderNow();
    if (workload.surface !== "editor") {
      const selector = createPiShellSelector({
        title: "Input responsiveness",
        options: ["alpha", "beta", "gamma", "delta"].map(value => ({ id: value, value, label: value })),
        maxVisible: 4,
        onSelect: value => { selected = value; actions.push(`select:${value}`); },
        onCancel: () => actions.push("cancel"),
      });
      shell.root.setInputSurface(selector, true, "owned");
      shell.runtime.renderNow();
    }
    let previousTranscriptRenders = shell.root.transcriptRenderCount();
    let previousWriteEnd = terminal.writes.length;
    for (const turn of workload.turns) {
      let inputBatch: string[] = [];
      const flushInputBatch = async () => {
        if (inputBatch.length === 0) return;
        await deliverInputBatch(terminal, inputBatch);
        inputBatch = [];
      };
      for (const action of turn.actions) {
        if (action.type === "input") inputBatch.push(action.data);
        else {
          await flushInputBatch();
          if (action.type === "resize") {
            terminal.resize(action.columns, action.rows);
            await settleResize();
          } else {
            if (!streamStarted) {
              streamStarted = true;
              runtime.session.emit({ type: "agent_start" });
              runtime.session.emit({ type: "message_start", message: assistant(action.text) });
            } else runtime.session.emit({
              type: action.final ? "message_end" : "message_update",
              message: assistant(action.text, action.final === true),
              assistantMessageEvent: { type: "text_delta", delta: action.text },
            });
            if (action.final) runtime.session.emit({ type: "agent_settled" });
          }
        }
      }
      await flushInputBatch();
      await adapter.flushEvents();
      await settleImmediate();
      const descriptor = shell.root.viewportFrameDescriptor();
      checkpoints.push({
        name: turn.id,
        writeStart: previousWriteEnd,
        writeEnd: terminal.writes.length,
        columns: terminal.columns,
        rows: terminal.rows,
        text: shell.root.editor.getText(),
        actions: [...actions],
        selected,
        viewportCause: descriptor?.cause ?? null,
        viewportTranscript: descriptor?.transcript ?? null,
        viewportDock: descriptor?.dock ?? null,
        viewportCompositions: request.producer === "bare-a1" ? shell.root.viewportCompositionEvidence() : null,
        transcriptBlockRenders: request.producer === "bare-a1"
          ? shell.root.transcriptRenderCount() - previousTranscriptRenders
          : null,
      });
      previousTranscriptRenders = shell.root.transcriptRenderCount();
      previousWriteEnd = terminal.writes.length;
    }
  } finally {
    await shell.dispose();
    if (!adapter.disposed) await adapter.dispose();
  }
  return result(request, phases, terminal, checkpoints);
}

class PinnedRoot implements Component {
  streamText = "";
  readonly history: readonly string[];
  constructor(
    readonly surface: Component,
    readonly phases: PiTuiInputDiagnosticsEvent[],
    readonly state: { revision: number; applied: number; pending: number },
    historyRows: number,
  ) { this.history = Array.from({ length: historyRows }, (_, index) => `historical-${index}`); }
  render(width: number): string[] {
    this.trace("composition-start");
    try { return [...this.history, ...(this.streamText ? [this.streamText] : []), ...this.surface.render(width)]; }
    finally { this.trace("composition-end"); }
  }
  handleInput(data: string): void {
    this.trace("semantic-start");
    try { this.surface.handleInput?.(data); }
    finally { this.state.applied = this.state.revision; this.trace("semantic-end"); }
  }
  invalidate(): void { this.surface.invalidate(); }
  private trace(phase: PiTuiInputDiagnosticsEvent["phase"]): void {
    const semantic = phase === "semantic-start" || phase === "semantic-end";
    this.phases.push({
      phase,
      revision: semantic ? this.state.revision : this.state.applied,
      appliedRevision: this.state.applied,
      pendingDepth: this.state.pending,
      pendingPresentationDepth: 0,
      atMs: performance.now(),
    });
  }
}

async function runPinned(request: InputProducerRequest): Promise<InputProducerResult> {
  const workload = requireWorkload(request.workloadId);
  initTheme("dark", false);
  const terminal = new RecordingTerminal(request.state.columns, request.state.rows);
  const phases: PiTuiInputDiagnosticsEvent[] = [];
  const state = { revision: 0, applied: 0, pending: 0 };
  const actions: string[] = [];
  let text = "";
  let readEditorText = () => text;
  let selected: string | null = null;
  let surface: Component;
  if (workload.surface === "editor") {
    const pinned = await createPinnedEditorHarness(request.state.cwd);
    pinned.editor.onSubmit = value => { actions.push(`submit:${value}`); };
    surface = pinned.editor;
    readEditorText = () => pinned.editor.getExpandedText();
    text = readEditorText();
  } else {
    const list = new SelectList(["alpha", "beta", "gamma", "delta"].map(value => ({ value, label: value })), 4, getSelectListTheme());
    list.onSelect = item => { selected = item.value; actions.push(`select:${item.value}`); };
    list.onCancel = () => actions.push("cancel");
    surface = list;
  }
  const root = new PinnedRoot(surface, phases, state, workload.preparedTranscriptBlocks);
  const tui = new TuiMainScreen(terminal, false);
  terminal.onReceipt = () => {
    state.revision += 1;
    state.pending = 0;
    phases.push({
      phase: "receipt",
      revision: state.revision,
      appliedRevision: state.applied,
      pendingDepth: 0,
      pendingPresentationDepth: 0,
      atMs: performance.now(),
    });
  };
  terminal.onWrite = phase => phases.push({
    phase,
    revision: state.applied,
    appliedRevision: state.applied,
    pendingDepth: 0,
    pendingPresentationDepth: 0,
    atMs: performance.now(),
  });
  const checkpoints: InputProducerCheckpoint[] = [];
  try {
    tui.addChild(root);
    tui.setFocus(root);
    tui.start();
    tui.renderNow();
    let previousWriteEnd = terminal.writes.length;
    for (const turn of workload.turns) {
      let inputBatch: string[] = [];
      const flushInputBatch = async () => {
        if (inputBatch.length === 0) return;
        await deliverInputBatch(terminal, inputBatch);
        inputBatch = [];
      };
      for (const action of turn.actions) {
        if (action.type === "input") inputBatch.push(action.data);
        else {
          await flushInputBatch();
          if (action.type === "resize") {
            terminal.resize(action.columns, action.rows);
            await settleResize();
          } else { root.streamText = action.text; tui.requestRender(); }
        }
      }
      await flushInputBatch();
      await settleImmediate();
      if (workload.surface === "editor") text = readEditorText();
      checkpoints.push({
        name: turn.id,
        writeStart: previousWriteEnd,
        writeEnd: terminal.writes.length,
        columns: terminal.columns,
        rows: terminal.rows,
        text,
        actions: [...actions],
        selected,
        viewportCause: null,
        viewportTranscript: null,
        viewportDock: null,
        viewportCompositions: null,
        transcriptBlockRenders: null,
      });
      previousWriteEnd = terminal.writes.length;
    }
  } finally {
    tui.stop({ preserveScreen: true });
  }
  return result(request, phases, terminal, checkpoints);
}

function result(
  request: InputProducerRequest,
  phases: readonly PiTuiInputDiagnosticsEvent[],
  terminal: RecordingTerminal,
  checkpoints: readonly InputProducerCheckpoint[],
): InputProducerResult {
  return {
    schema: "a1-input-responsiveness-producer-v1",
    producer: request.producer,
    processId: process.pid,
    workloadId: request.workloadId,
    variant: request.variant ?? "candidate",
    phases,
    writes: terminal.writes,
    checkpoints: request.testBehavior === "missing-checkpoint" ? [] : checkpoints,
    restored: !terminal.active,
  };
}

function requireWorkload(id: string) {
  const workload = INPUT_RESPONSIVENESS_WORKLOADS.find(candidate => candidate.id === id);
  if (workload === undefined) throw new TypeError(`unknown input workload: ${id}`);
  assertInputResponsivenessWorkload(workload);
  return workload;
}

function preparedMessages(count: number): readonly unknown[] {
  return Array.from({ length: count }, (_, index) => index % 2 === 0
    ? { role: "user", content: [{ type: "text", text: `historical prompt ${index}` }], timestamp: index + 1 }
    : assistant(`historical answer ${index}`, true));
}

function assistant(text: string, final = false) {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
    api: "openai-responses",
    provider: "openai",
    model: "gpt-5",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: final ? "stop" : "pending",
    timestamp: Date.now(),
  };
}

async function settleResize(): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 120));
}

async function deliverInputBatch(terminal: RecordingTerminal, deliveries: readonly string[]): Promise<void> {
  await Promise.all(deliveries.map(data => new Promise<void>(resolve => {
    setImmediate(() => { terminal.input(data); resolve(); });
  })));
}

async function settleImmediate(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve));
  await new Promise<void>(resolve => setImmediate(resolve));
}

async function readRequest(): Promise<InputProducerRequest | InputProducerBatchRequest> {
  const input = await new Promise<string>((resolve, reject) => {
    let text = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => { text += chunk; });
    process.stdin.once("end", () => resolve(text));
    process.stdin.once("error", reject);
    process.stdin.resume();
  });
  return JSON.parse(input) as InputProducerRequest | InputProducerBatchRequest;
}

async function main(): Promise<void> {
  const request = await readRequest();
  const behavior = "testBehavior" in request ? request.testBehavior : undefined;
  if (behavior === "startup-hang") await hangForever();
  process.send?.({ type: "ready" });
  if (behavior === "hang") await hangForever();
  if (behavior === "fail") throw new Error("requested input producer failure");
  if (behavior === "malformed") {
    process.stdout.write("not-json");
    process.exit(0);
  }
  const output = "workloadIds" in request
    ? {
        schema: "a1-input-responsiveness-batch-v1" as const,
        producer: request.producer,
        processId: process.pid,
        results: await runBatch(request),
      }
    : request.producer === "pinned-pi" ? await runPinned(request) : await runOwned(request);
  await new Promise<void>((resolve, reject) => process.stdout.write(JSON.stringify(output), error => error ? reject(error) : resolve()));
  process.exit(0);
}

async function runBatch(request: InputProducerBatchRequest): Promise<readonly InputProducerResult[]> {
  const results: InputProducerResult[] = [];
  for (const workloadId of request.workloadIds) {
    const workload = requireWorkload(workloadId);
    const item: InputProducerRequest = {
      producer: request.producer,
      workloadId,
      variant: request.variant ?? "candidate",
      state: {
        ...request.state,
        columns: workload.columns,
        rows: workload.rows,
      },
    };
    results.push(request.producer === "pinned-pi" ? await runPinned(item) : await runOwned(item));
  }
  return results;
}

function hangForever(): Promise<never> { return new Promise(() => { setInterval(() => {}, 60_000); }); }

await main();
