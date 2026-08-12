import { appendFileSync } from "node:fs";
import {
  applyTerminalRenderTransaction,
  FULL_VIEWPORT_NATIVE_PROJECTION,
  terminalRenderTransactionToDamage,
  type TerminalDamage,
  type TerminalProjectionPolicy,
  type TerminalRenderTransaction,
  type TerminalSurface,
} from "../domain/index.js";
import { projectTerminalRenderTransaction, projectTerminalSnapshot, renderTerminalDamage, renderTerminalNormalSnapshot, renderTerminalSnapshot, RESET_TERMINAL_MODES, selectTerminalProjection, type TerminalProjectionPlan, type TerminalViewport } from "../presentation/index.js";
import { HostFrameWriter, type DrainAwareHostOutput } from "./host-frame-writer.js";

const HOST_BASE_INPUT_MODES_ON = "\x1b[?1004h\x1b[?2004h";
const HOST_MOUSE_MODES_ON = "\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006h";
const HOST_MOUSE_MODES_OFF = "\x1b[?1003l\x1b[?1002l\x1b[?1000l\x1b[?1006l";
const RESET_TERMINAL_MODES_INSIDE_SYNCHRONIZED_FRAME = RESET_TERMINAL_MODES.replace("\x1b[?2026l", "");

export interface HostRendererTransaction {
  readonly revision: number;
  readonly scrollRows: number;
  readonly spanCount: number;
  readonly synchronized: true;
}

/** Owns the physical fullscreen surface; child control bytes never enter here. */
export class FullscreenHostRenderer {
  #active = false;
  #restored = false;
  #surface: TerminalSurface | null = null;
  #mouseCapture = false;
  #platformInputModesActive = false;
  #projectionSelected = false;
  #normalProjection = false;
  #normalSnapshotInitialized = false;
  #childSnapshotInitialized = false;
  #outerAlternate = false;
  #projectionPlan: TerminalProjectionPlan | null = null;
  readonly #writer: HostFrameWriter;

  constructor(
    output: DrainAwareHostOutput,
    _legacyRefreshMs = 0,
    private readonly platformInputModesOn = "",
    private readonly platformInputModesOff = "",
    private readonly projectionPolicy: TerminalProjectionPolicy = FULL_VIEWPORT_NATIVE_PROJECTION,
    private readonly onTransaction: (transaction: HostRendererTransaction) => void = () => {},
    private readonly viewport?: TerminalViewport,
  ) {
    this.#writer = new HostFrameWriter(output, {
      onWrite: (frame, serialized) => {
        recordHostWrite(frame, serialized);
        if (frame.kind !== "transaction" || frame.revision === undefined) return;
        this.onTransaction({
          revision: frame.revision,
          scrollRows: Number(frame.detail?.scrollRows ?? 0),
          spanCount: Number(frame.detail?.spanCount ?? 0),
          synchronized: true,
        });
      },
    });
  }

  enter(): void {
    if (this.#active) return;
    this.#active = true;
    this.#restored = false;
    this.#projectionSelected = false;
    this.#normalProjection = false;
    this.#normalSnapshotInitialized = false;
    this.#childSnapshotInitialized = false;
    this.#projectionPlan = null;
    // Startup does not publish an AddOne-owned frame. Keep the caller's normal
    // screen intact until the first child snapshot selects its projection; the
    // alternate-screen transition and clear, when required, are then enclosed
    // in that same synchronized child frame.
    this.#outerAlternate = false;
    this.#write("lifecycle", `${RESET_TERMINAL_MODES}\x1b[?25l${HOST_BASE_INPUT_MODES_ON}`);
  }

  renderSnapshot(sourceSurface: TerminalSurface): void {
    if (!this.#active || this.#restored) return;
    this.#projectionPlan = selectTerminalProjection(this.projectionPolicy, sourceSurface, this.viewport);
    const surface = projectTerminalSnapshot(sourceSurface, this.#projectionPlan);
    this.#surface = surface;
    let framePrefix = "";
    if (!this.#projectionSelected) {
      this.#projectionSelected = true;
      this.#normalProjection = this.projectionPolicy.screen === "normal"
        || (this.projectionPolicy.screen === "auto" && this.projectionPolicy.preserveHostScrollback
          && surface.activeScreen === "normal" && surface.modes.mouseTracking === "none");
      if (this.#normalProjection && this.#outerAlternate) {
        this.#outerAlternate = false;
        framePrefix += `${RESET_TERMINAL_MODES_INSIDE_SYNCHRONIZED_FRAME}\x1b[?1049l${HOST_BASE_INPUT_MODES_ON}`;
      } else if (!this.#normalProjection && !this.#outerAlternate) {
        this.#outerAlternate = true;
        framePrefix += "\x1b[?1049h";
      }
    }
    framePrefix += this.#updateMouseCapture(surface.modes.mouseTracking !== "none");
    const firstChildSnapshot = !this.#childSnapshotInitialized;
    this.#childSnapshotInitialized = true;
    let snapshot: string;
    if (this.#normalProjection && !this.#normalSnapshotInitialized) {
      this.#normalSnapshotInitialized = true;
      snapshot = (surface.scrollbackCells?.length ?? 0) > 0 ? renderTerminalNormalSnapshot(surface) : renderTerminalSnapshot(surface);
      snapshot = insertAfterSynchronizedOutputStart(snapshot, "\x1b[2J\x1b[H");
    } else {
      snapshot = renderTerminalSnapshot(surface, !firstChildSnapshot);
      if (firstChildSnapshot) snapshot = insertAfterSynchronizedOutputStart(snapshot, "\x1b[2J\x1b[H");
    }
    this.#writer.enqueue({
      kind: "snapshot",
      payload: `${framePrefix}${removeSynchronizedOutputEnvelope(snapshot)}`,
      synchronized: true,
      supersedableState: false,
      revision: surface.revision,
    });
  }

  renderTransaction(sourceTransaction: TerminalRenderTransaction): void {
    if (!this.#active || this.#restored) return;
    if (!this.#surface || !this.#projectionPlan) throw new Error("terminal render transaction arrived before its bounded snapshot");
    const transaction = projectTerminalRenderTransaction(sourceTransaction, this.#projectionPlan);
    this.#surface = applyTerminalRenderTransaction(this.#surface, transaction);
    const framePrefix = this.#updateMouseCapture(transaction.modes.mouseTracking !== "none");
    const damage = terminalRenderTransactionToDamage(transaction);
    const scrollRows = transaction.operations
      .filter((operation): operation is Extract<typeof operation, { type: "scroll" }> => operation.type === "scroll")
      .filter(operation => operation.top === 0 && operation.bottom === transaction.dimensions.rows - 1)
      .reduce((total, operation) => total + operation.rows, 0);
    const hostScroll = this.#normalProjection && scrollRows > 0
      ? `\x1b[${transaction.dimensions.rows};1H${"\r\n".repeat(scrollRows)}`
      : "";
    const payload = `${framePrefix}${hostScroll}${renderTerminalDamage({ ...damage, scrollRows })}`;
    this.#writer.enqueue({
      kind: "transaction",
      payload,
      synchronized: true,
      supersedableState: transaction.operations.length === 0,
      revision: transaction.revision,
      detail: { scrollRows, spanCount: transaction.dirtyRanges.length },
    });
  }

  /** Compatibility entry point for historical damage unit fixtures. */
  renderDamage(damage: TerminalDamage): void {
    this.renderTransaction({
      generationId: damage.generationId,
      baseRevision: damage.baseRevision,
      revision: damage.revision,
      sourceSequence: { start: damage.outputSequence, end: damage.outputSequence },
      atomicBoundary: damage.synchronized ? "synchronized-output" : "io-turn",
      dimensions: damage.dimensions,
      operations: damage.scrollRows ? [{ type: "scroll", top: 0, bottom: damage.dimensions.rows - 1, rows: damage.scrollRows }] : [],
      dirtyRanges: damage.spans,
      cursor: damage.cursor,
      activeScreen: damage.activeScreen,
      modes: damage.modes,
      final: damage.final,
    });
  }

  writeApplicationFrame(frame: string): void {
    if (!this.#active || this.#restored) return;
    this.#write("application", frame, true);
  }

  restore(): void {
    if (!this.#active || this.#restored) return;
    this.#restored = true;
    if (this.#outerAlternate) {
      this.#outerAlternate = false;
      this.#write("lifecycle", `${RESET_TERMINAL_MODES}\x1b[0m\x1b[0 q\x1b[?25h\x1b[?1049l`);
    } else {
      // The child owns its final normal-screen cursor position and line breaks.
      // Adding a newline here shifts resume hints relative to direct execution.
      this.#write("lifecycle", `${RESET_TERMINAL_MODES}\x1b[0m\x1b[0 q\x1b[?25h`);
    }
  }

  #updateMouseCapture(enabled: boolean): string {
    let payload = "";
    if (enabled) {
      if (this.#platformInputModesActive) {
        this.#platformInputModesActive = false;
        payload += this.platformInputModesOff;
      }
      if (!this.#mouseCapture) {
        this.#mouseCapture = true;
        payload += HOST_MOUSE_MODES_ON;
      }
      return payload;
    }
    if (this.#mouseCapture) {
      this.#mouseCapture = false;
      payload += HOST_MOUSE_MODES_OFF;
    }
    if (!this.#platformInputModesActive && this.platformInputModesOn) {
      this.#platformInputModesActive = true;
      payload += this.platformInputModesOn;
    }
    return payload;
  }

  #write(kind: "application" | "lifecycle" | "mode", payload: string, supersedableState = false): void {
    this.#writer.enqueue({ kind, payload, synchronized: false, supersedableState });
  }
}

function insertAfterSynchronizedOutputStart(payload: string, inserted: string): string {
  const start = "\x1b[?2026h";
  return payload.startsWith(start) ? `${start}${inserted}${payload.slice(start.length)}` : `${start}${inserted}${payload}\x1b[?2026l`;
}

function removeSynchronizedOutputEnvelope(payload: string): string {
  const start = "\x1b[?2026h";
  const end = "\x1b[?2026l";
  return payload.startsWith(start) && payload.endsWith(end)
    ? payload.slice(start.length, -end.length)
    : payload;
}

function recordHostWrite(frame: Readonly<{ kind: string; synchronized: boolean; revision?: number; detail?: Readonly<Record<string, unknown>> }>, serialized: string): void {
  const path = process.env.ADDONE_TERMINAL_PROTOCOL_EVIDENCE;
  if (!path) return;
  try {
    appendFileSync(path, `${JSON.stringify({
      at: new Date().toISOString(),
      pid: process.pid,
      role: "ui",
      stage: "host-write",
      kind: frame.kind,
      synchronized: frame.synchronized,
      revision: frame.revision,
      detail: frame.detail,
      bytes: Buffer.byteLength(serialized, "utf8"),
      dataBase64: Buffer.from(serialized, "utf8").toString("base64"),
    })}\n`);
  } catch {}
}

export const HOST_TERMINAL_INPUT_MODES = {
  enabled: `${HOST_BASE_INPUT_MODES_ON}${HOST_MOUSE_MODES_ON}`,
  disabled: RESET_TERMINAL_MODES,
} as const;
