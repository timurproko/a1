import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPiEngineAdapter } from "../../../../src/integrations/pi/engine/index.js";
import { OwnedUiSessionShell } from "../../../../src/integrations/pi/session-ui/index.js";
import { applyPiTheme, createPiShellSelector } from "../../../../src/integrations/pi/components/index.js";
import type { PiTuiInputDiagnosticsEvent } from "../../../../src/integrations/pi/tui-runtime/index.js";
import { RecordingTerminal, Runtime } from "../../../support/input-responsiveness/input-runtime-fixture.js";
import { InputFrameRecorder } from "../../../support/input-responsiveness/input-frame-recorder.js";
import { inputStableWork } from "../../../support/input-responsiveness/input-frame-work.js";
import type { InputProducerCheckpoint } from "../../../support/input-responsiveness/input-producer.js";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const settle = async () => { await new Promise<void>(resolve => setImmediate(resolve)); await new Promise<void>(resolve => setImmediate(resolve)); };

/** Controls existing scheduling seams; observation never owns these callbacks. */
class Schedule {
  time = 0;
  readonly inputs = new Map<ReturnType<typeof setImmediate>, () => void>();
  readonly streams = new Map<ReturnType<typeof setTimeout>, () => void>();
  readonly delays: number[] = [];
  now = () => this.time;
  scheduleImmediate = (callback: () => void) => { const key = {} as ReturnType<typeof setImmediate>; this.inputs.set(key, callback); return key; };
  cancelImmediate = (key: ReturnType<typeof setImmediate>) => { this.inputs.delete(key); };
  setTimeout = (callback: () => void, delay: number) => { const key = {} as ReturnType<typeof setTimeout>; this.delays.push(delay); this.streams.set(key, callback); return key; };
  clearTimeout = (key: ReturnType<typeof setTimeout>) => { this.streams.delete(key); };
  input() { for (const [key, callback] of [...this.inputs]) { this.inputs.delete(key); callback(); } }
  stream() { this.time += 33; for (const [key, callback] of [...this.streams]) { this.streams.delete(key); callback(); } }
}

async function capture(observe: boolean, order: "stream-first" | "input-first") {
  applyPiTheme("dark", false, "truecolor");
  const runtime = new Runtime([{ role: "user", content: [{ type: "text", text: "settled history" }], timestamp: 1 }]);
  const adapter = await createPiEngineAdapter({ cwd: process.cwd(), createRuntime: async () => runtime as unknown as AgentSessionRuntime });
  // Rationale: drive the real TUI's throttle deterministically, not by sleeping or forcing a paint.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance"] });
  const terminal = new RecordingTerminal(80, 24);
  const schedule = new Schedule();
  const phases: PiTuiInputDiagnosticsEvent[] = [];
  let recorder: InputFrameRecorder | undefined;
  const shell = new OwnedUiSessionShell({ backend: adapter, cwd: process.cwd(), terminal, sessionLayout: "custom-viewport",
    inputPresentation: { scheduler: schedule, now: schedule.now, onEvent: event => { phases.push(event); recorder?.trace(event); } },
    streamPresentation: { scheduler: schedule },
  });
  try {
    shell.start(); shell.runtime.renderNow();
    shell.root.setInputSurface(createPiShellSelector({ title: "Input responsiveness", options: ["alpha", "beta", "gamma"].map(value => ({ id: value, value, label: value })),
      onSelect() {}, onCancel() {}, maxVisible: 3 }), true, "owned");
    shell.runtime.renderNow(); await settle(); await vi.advanceTimersByTimeAsync(33);
    const renderStart = shell.root.transcriptRenderCount();
    const writeStart = terminal.writes.length;
    if (observe) {
      recorder = new InputFrameRecorder(() => ({ renders: shell.root.transcriptRenderCount(), writeEnd: terminal.writes.length, descriptor: shell.root.viewportFrameDescriptor() }));
      terminal.onWrite = phase => { if (phase === "write-end") recorder!.wrote(terminal.writes.length - 1, terminal.writes.at(-1)!.data); };
    }
    const input = async () => { terminal.input("\u001b[B"); terminal.input("\u001b[B"); schedule.input(); await settle(); };
    const stream = async () => {
      runtime.session.emit({ type: "agent_start" });
      runtime.session.emit({ type: "message_start", message: { role: "assistant", content: [{ type: "text", text: "stream content" }], timestamp: 1, stopReason: "pending" } });
      await adapter.flushEvents(); await settle(); schedule.stream(); await settle(); await vi.advanceTimersByTimeAsync(33);
    };
    if (order === "stream-first") { await stream(); await input(); } else { await input(); await stream(); }
    const descriptor = shell.root.viewportFrameDescriptor()!;
    const checkpoint: InputProducerCheckpoint = {
      name: order, writeStart, writeEnd: terminal.writes.length, columns: 80, rows: 24, text: shell.root.editor.getText(), actions: [...runtime.session.calls], selected: null,
      viewportCause: descriptor.cause, viewportTranscript: descriptor.transcript, viewportDock: descriptor.dock,
      viewportCompositions: shell.root.viewportCompositionEvidence(), transcriptBlockRenders: shell.root.transcriptRenderCount() - renderStart,
      frameEvidence: recorder?.checkpoint() ?? null,
    };
    return { checkpoint, writes: [...terminal.writes], delays: [...schedule.delays],
      semantics: phases.filter(event => event.phase === "semantic-end").map(event => event.revision) };
  } finally {
    recorder = undefined; terminal.onWrite = undefined;
    await shell.dispose(); if (!adapter.disposed) await adapter.dispose();
    vi.useRealTimers();
  }
}

describe("frame observation over the real owned shell", () => {
  it.each(["stream-first", "input-first"] as const)("preserves output and scheduling in %s ordering", async order => {
    vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    const control = await capture(false, order);
    const observed = await capture(true, order);
    expect(observed.writes.map(write => write.data)).toEqual(control.writes.map(write => write.data));
    expect(observed.delays).toEqual(control.delays);
    expect(observed.semantics).toEqual(control.semantics);
    expect({ ...observed.checkpoint, frameEvidence: null }).toEqual(control.checkpoint);
    const frames = observed.checkpoint.frameEvidence!.frames;
    expect(frames.some(frame => frame.cause === "dock-input"), JSON.stringify(frames)).toBe(true);
    expect(frames.some(frame => frame.cause !== "dock-input" && frame.renderEnd > frame.renderStart), JSON.stringify(frames)).toBe(true);
    expect(inputStableWork([observed.checkpoint], observed.writes)).toMatchObject({ stableTranscriptBlockRenders: 0, stableTranscriptPaintedRows: 0 });
    if (order === "stream-first") {
      // Rationale: the old checkpoint-final-cause formula would reject this legitimate real-shell capture.
      expect(observed.checkpoint.viewportCause).toBe("dock-input");
      expect(observed.checkpoint.transcriptBlockRenders).toBeGreaterThan(0);
    }
  });
});
