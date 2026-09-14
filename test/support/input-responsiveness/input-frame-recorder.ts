import type { PiTuiInputDiagnosticsEvent } from "../../../src/integrations/pi/tui-runtime/index.js";
import type { TranscriptViewportFrameDescriptor } from "../../../src/ui/components/transcript-viewport.js";
import type { InputCheckpointFrames, InputCompositionFrame } from "./input-frame-evidence.js";
import { isInputNonFrameControl } from "./input-frame-validation.js";

interface Observation {
  readonly renders: number;
  readonly writeEnd: number;
  readonly descriptor: TranscriptViewportFrameDescriptor | null;
}

/** Synchronous read-only collector; it never renders, flushes, or advances the scheduler. */
export class InputFrameRecorder {
  #frames: InputCompositionFrame[] = [];
  #controls: number[] = [];
  #pending: { readonly observation: Observation; readonly revision: number } | undefined;
  #renderStart: number;
  #sequence = 0;
  #compositionStart = 0;

  constructor(readonly observe: () => Observation) { this.#renderStart = observe().renders; }

  trace(event: PiTuiInputDiagnosticsEvent): void {
    if (event.phase === "composition-start") {
      if (this.#pending) throw new Error("nested input frame composition");
      this.#pending = { observation: this.observe(), revision: event.appliedRevision };
    } else if (event.phase === "composition-end") {
      if (!this.#pending) throw new Error("input frame ended without a start");
      const end = this.observe();
      const { observation: start, revision } = this.#pending;
      const descriptor = end.descriptor;
      if (!descriptor) throw new Error("input frame has no viewport descriptor");
      if (start.writeEnd !== end.writeEnd) throw new Error("terminal write during input composition");
      this.#frames.push({ sequence: this.#sequence++, frameId: descriptor.frameId, cause: descriptor.cause, revision,
        renderStart: start.renders, renderEnd: end.renders, writeStart: end.writeEnd, writeEnd: end.writeEnd,
        columns: descriptor.width, rows: descriptor.height,
        transcript: descriptor.transcript && { ...descriptor.transcript }, dock: descriptor.dock && { ...descriptor.dock } });
      this.#pending = undefined;
    }
  }

  wrote(index: number, data: string): void {
    if (this.#pending) throw new Error("terminal write during input composition");
    const frame = this.#frames.at(-1);
    if (!frame) {
      if (!isInputNonFrameControl(data)) throw new Error("unattributed input terminal paint");
      this.#controls.push(index);
      return;
    }
    if (index !== frame.writeEnd) throw new Error("noncontiguous input frame writes");
    this.#frames[this.#frames.length - 1] = { ...frame, writeEnd: index + 1 };
  }

  checkpoint(): InputCheckpointFrames {
    if (this.#pending) throw new Error("checkpoint interrupts input frame composition");
    const evidence = { compositionStart: this.#compositionStart, compositionEnd: this.#sequence,
      renderStart: this.#renderStart, renderEnd: this.observe().renders, frames: this.#frames, controlWrites: this.#controls };
    this.#compositionStart = this.#sequence;
    this.#renderStart = evidence.renderEnd;
    this.#frames = [];
    this.#controls = [];
    return evidence;
  }
}
