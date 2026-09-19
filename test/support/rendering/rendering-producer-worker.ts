import { mock } from "node:test";
import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { initTheme } from "@earendil-works/pi-coding-agent";
import { TuiAltScreen, TuiMainScreen } from "@earendil-works/pi-tui";
import { PinnedContentRoot } from "./pinned-content-root.js";
import { CONTENT_RENDERING_WORKLOADS } from "./content-workloads.js";
import { applyPiTheme } from "../../../src/integrations/pi/components/index.js";
import { createPiEngineAdapter } from "../../../src/integrations/pi/engine/index.js";
import { OwnedUiSessionShell } from "../../../src/app/session-shell/index.js";
import { RecordingRenderingTerminal } from "./recording-rendering-terminal.js";
import type { TranscriptViewportFrameDescriptor } from "../../../src/ui/components/index.js";
import type {
  ContentPresentation,
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
  const terminal = new RecordingTerminal(producerRequest.state.columns, producerRequest.state.rows, producerRequest.presentation === "scheduled");
  const shell = new OwnedUiSessionShell({
    engine: {
      backend: adapter,
      cwd: producerRequest.state.cwd,
      ...(producerRequest.producer === "bare-a1" ? { sessionLayout: "custom-viewport" as const } : {}),
    },
    presentation: { terminal },
  });
  terminal.observeDamageDecisions(() => shell.damagePresentationDecision());
  const checkpoints: RenderingProducerCheckpoint[] = [];
  const presentations: ContentPresentation[] = [];
  if (producerRequest.presentation === "scheduled") {
    const render = shell.root.render.bind(shell.root);
    shell.root.render = width => {
      const rows = render(width);
      const descriptor = shell.root.viewportFrameDescriptor();
      if (presentations.length >= 64 || rows.length > 256 || Buffer.byteLength(rows.join("")) > 128 * 1024) {
        throw new Error("content presentation evidence exceeds its bounded synthetic capture");
      }
      presentations.push({ frameId: descriptor?.frameId ?? null, writeStart: terminal.writes.length, rows: [...rows],
        blocks: shell.view().transcript.slice(-64).map(block => ({ id: block.id,
          semanticRevision: shell.root.transcriptComponent(block.id)?.revision ?? block.revision,
          presentationRevision: shell.root.transcriptComponent(block.id)?.presentationRevision ?? 0 })),
        documentRange: descriptor?.nextDocumentRange ?? null });
      return rows;
    };
  }
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
    for (const [index, step] of steps.entries()) {
      if (producerRequest.presentation === "scheduled" && steps[index - 1]?.atMs !== step.atMs) await terminal.advanceTo(step.atMs, step.checkpoint);
      else terminal.setClock(step.atMs, step.checkpoint);
      if (step.action.type === "event") runtime.session.emit(step.action.value);
      else if (step.action.type === "resize") terminal.resize(step.action.columns, step.action.rows);
      else terminal.input(step.action.data);
      if (producerRequest.presentation === "scheduled" && steps[index + 1]?.atMs === step.atMs) continue;
      await adapter.flushEvents();
      if (producerRequest.presentation === "scheduled") await new Promise<void>(resolve => setImmediate(resolve));
      else shell.runtime.renderNow();
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
    if (producerRequest.presentation === "scheduled") {
      await terminal.advanceTo((steps.at(-1)?.atMs ?? 0) + 100, "scheduled-drain");
      await adapter.flushEvents();
      checkpoints.push(ownedCheckpoint("scheduled-drain", (steps.at(-1)?.atMs ?? 0) + 100, terminal,
        shell.view().transcript, shell.root.viewportFrameDescriptor(), shell.damagePresentationDecision(), shell.root.viewportTransientTailRowCount()));
    }
    return {
      ...(producerRequest.presentation === "scheduled" ? { presentations } : {}),
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
  const terminal = new RecordingTerminal(producerRequest.state.columns, producerRequest.state.rows, producerRequest.presentation === "scheduled");
  const tui = producerRequest.mode === "fullscreen"
    ? new TuiAltScreen(terminal, false, undefined, { mouse: false })
    : new TuiMainScreen(terminal, false);
  const root = new PinnedContentRoot(tui, producerRequest.state.cwd);
  const checkpoints: RenderingProducerCheckpoint[] = [];
  try {
    tui.addChild(root);
    tui.setFocus(root);
    terminal.setClock(0, "initial");
    tui.start();
    tui.renderNow();
    checkpoints.push(pinnedCheckpoint("initial", 0, terminal, root.transcript));
    for (const [index, step] of steps.entries()) {
      if (producerRequest.presentation === "scheduled" && steps[index - 1]?.atMs !== step.atMs) await terminal.advanceTo(step.atMs, step.checkpoint);
      else terminal.setClock(step.atMs, step.checkpoint);
      if (step.action.type === "event") root.applyEvent(step.action.value);
      else if (step.action.type === "resize") terminal.resize(step.action.columns, step.action.rows);
      else terminal.input(step.action.data);
      if (producerRequest.presentation === "scheduled" && steps[index + 1]?.atMs === step.atMs) continue;
      tui.requestRender();
      if (producerRequest.presentation !== "scheduled") tui.renderNow();
      checkpoints.push(pinnedCheckpoint(step.checkpoint, step.atMs, terminal, root.transcript));
    }
    if (producerRequest.presentation === "scheduled") {
      await terminal.advanceTo((steps.at(-1)?.atMs ?? 0) + 100, "scheduled-drain");
      checkpoints.push(pinnedCheckpoint("scheduled-drain", (steps.at(-1)?.atMs ?? 0) + 100, terminal, root.transcript));
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

/** Advances the scripted clock while retaining the shared recorder's write-local decisions. */
class RecordingTerminal extends RecordingRenderingTerminal {
  #atMs = 0;

  private readonly scheduled: boolean;
  constructor(columns: number, rows: number, scheduled = false) { super(columns, rows); this.scheduled = scheduled; }

  async advanceTo(atMs: number, cause: string): Promise<void> {
    const elapsed = Math.max(0, atMs - this.#atMs);
    // Concurrency: scheduled producers use the actual nextTick/timer/monotonic-clock chain.
    // The stepped diagnostic path retains its historical mock clock and forced checkpoints.
    if (this.scheduled && elapsed > 0) await new Promise<void>(resolve => setTimeout(resolve, elapsed));
    this.setClock(atMs, cause);
  }

  override setClock(atMs: number, cause: string): void {
    const elapsed = Math.max(0, atMs - this.#atMs);
    this.#atMs = atMs;
    super.setClock(atMs, cause);
    // Rationale: label timer-driven writes before advancing the shared scripted clock.
    // Cooperative immediate/event delivery remains real for every independent producer.
    if (!this.scheduled) mock.timers.tick(elapsed);
  }
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
        transientRowCount: descriptor.transientRowCount,
        transientAlignmentGapRows: descriptor.transientAlignmentGapRows,
        bottomAlignedTailRowCount: descriptor.bottomAlignedTailRowCount,
        liveTailRows: descriptor.liveTailRows,
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

async function main(): Promise<void> {
  const request = await readRequest();
  if (request.testBehavior === "startup-hang") await hangForever();
  const workload = [...STREAM_RENDERING_WORKLOADS, ...CONTENT_RENDERING_WORKLOADS].find(candidate => candidate.id === request.workloadId);
  if (workload === undefined) throw new Error(`unknown workload: ${request.workloadId}`);
  if (workload.columns !== request.state.columns || workload.rows !== request.state.rows) {
    throw new Error("producer state geometry does not match workload geometry");
  }
  process.send?.({ type: "ready" });
  if (request.testBehavior === "hang") await hangForever();
  if (request.testBehavior === "fail") throw new Error("requested producer failure");
  if (request.presentation !== "scheduled") mock.timers.enable({ apis: ["Date", "setInterval", "setTimeout"], now: 1_700_000_000_000 });
  const result = await (request.producer === "pinned-pi"
    ? runPinned(request, workload.steps)
    : runOwned(request, workload.steps)).finally(() => { if (request.presentation !== "scheduled") mock.timers.reset(); });
  await new Promise<void>((resolve, reject) => {
    process.stdout.write(JSON.stringify(result), error => error ? reject(error) : resolve());
  });
  process.exit(0);
}

function hangForever(): Promise<never> {
  return new Promise(() => { setInterval(() => {}, 60_000); });
}

await main();
