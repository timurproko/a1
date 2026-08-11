import type { GenerationId, TerminalCell, TerminalCursor, TerminalDimensions, TerminalModes, TerminalSurface } from "./model.js";

export interface KeyModifiers {
  readonly shift: boolean;
  readonly alt: boolean;
  readonly control: boolean;
  readonly meta: boolean;
}

export type TerminalKeyEvent = {
  readonly type: "key";
  readonly key: string;
  readonly text: string | null;
  readonly modifiers: KeyModifiers;
  readonly action: "press" | "repeat" | "release";
};

export type TerminalPasteEvent = {
  readonly type: "paste";
  readonly text: string;
};

export type TerminalFocusEvent = {
  readonly type: "focus";
  readonly focused: boolean;
};

export type TerminalMouseEvent = {
  readonly type: "mouse";
  readonly action: "press" | "release" | "move" | "wheel";
  readonly button: "left" | "middle" | "right" | "none";
  readonly modifiers: KeyModifiers;
  readonly column: number;
  readonly row: number;
  readonly wheelDelta: number;
};

export type TerminalResizeEvent = {
  readonly type: "resize";
  readonly dimensions: TerminalDimensions;
};

/** A physical host event before child-protocol encoding. */
export type HostTerminalInputEvent = TerminalKeyEvent | TerminalPasteEvent | TerminalFocusEvent | TerminalMouseEvent | TerminalResizeEvent;

export type EffectiveTerminalModes = TerminalModes;

export interface TerminalProjectionPolicy {
  readonly layout: "full-viewport-native" | "clipped-composited";
  readonly screen: "auto" | "normal" | "isolated";
  readonly preserveHostScrollback: boolean;
}

export const FULL_VIEWPORT_NATIVE_PROJECTION: TerminalProjectionPolicy = {
  layout: "full-viewport-native",
  screen: "auto",
  preserveHostScrollback: true,
};

export interface TerminalDamageSpan {
  readonly row: number;
  readonly startColumn: number;
  readonly cells: readonly TerminalCell[];
}

export type TerminalSnapshot = TerminalSurface;

export type TerminalSnapshotReason = "initial-handoff" | "reconnect" | "resize-resynchronization" | "gap-resynchronization" | "exit";

export interface CorrelatedTerminalSnapshot {
  readonly generationId: GenerationId;
  readonly reason: TerminalSnapshotReason;
  readonly sourceSequence: number;
  readonly surface: TerminalSurface;
}

export interface TerminalSourceSequenceRange {
  readonly start: number;
  readonly end: number;
}

export type TerminalRenderAtomicBoundary = "synchronized-output" | "io-turn" | "bounded-fallback" | "resynchronization" | "resize" | "exit";

export type TerminalRenderOperation =
  | { readonly type: "scroll"; readonly top: number; readonly bottom: number; readonly rows: number }
  | { readonly type: "erase"; readonly row: number; readonly startColumn: number; readonly endColumn: number }
  | { readonly type: "screen"; readonly activeScreen: "normal" | "alternate" };

/** One complete, application-agnostic visual commit from the resident terminal. */
export interface TerminalRenderTransaction {
  readonly generationId: GenerationId;
  readonly baseRevision: number;
  readonly revision: number;
  readonly sourceSequence: TerminalSourceSequenceRange;
  readonly atomicBoundary: TerminalRenderAtomicBoundary;
  readonly dimensions: TerminalDimensions;
  readonly operations: readonly TerminalRenderOperation[];
  readonly dirtyRanges: readonly TerminalDamageSpan[];
  readonly cursor: TerminalCursor;
  readonly activeScreen: "normal" | "alternate";
  readonly modes: EffectiveTerminalModes;
  readonly final: boolean;
}

/** Correlated virtual-terminal changes; never child PTY control bytes. */
export interface TerminalDamage {
  readonly generationId: GenerationId;
  readonly baseRevision: number;
  readonly revision: number;
  readonly outputSequence: number;
  readonly dimensions: TerminalDimensions;
  readonly spans: readonly TerminalDamageSpan[];
  readonly cursor: TerminalCursor;
  readonly activeScreen: "normal" | "alternate";
  readonly modes: EffectiveTerminalModes;
  /** Positive rows by which normal-screen content moved upward. */
  readonly scrollRows?: number;
  readonly synchronized: boolean;
  readonly final: boolean;
}

export interface EncodedTerminalInput {
  readonly route: "child" | "virtual-scrollback" | "ignored";
  readonly bytes: Uint8Array;
}

export interface TerminalInputEncoder {
  encode(event: HostTerminalInputEvent, modes: EffectiveTerminalModes, activeScreen: "normal" | "alternate"): EncodedTerminalInput;
}

export function applyTerminalDamage(surface: TerminalSurface, damage: TerminalDamage): TerminalSurface {
  if (surface.revision !== damage.baseRevision) {
    throw new Error(`terminal damage gap: have revision ${surface.revision}, need ${damage.baseRevision}`);
  }
  if (surface.columns !== damage.dimensions.columns || surface.rows !== damage.dimensions.rows) {
    throw new Error("terminal damage dimensions do not match the resident snapshot");
  }
  const scrollRows = Math.max(0, Math.min(surface.rows, damage.scrollRows ?? 0));
  const cells = surface.cells.map(row => [...row]);
  let scrollbackCells = surface.scrollbackCells?.map(row => [...row]) ?? [];
  if (scrollRows > 0) {
    scrollbackCells = [...scrollbackCells, ...cells.slice(0, scrollRows)].slice(-500);
    cells.splice(0, scrollRows);
    while (cells.length < surface.rows) cells.push(Array.from({ length: surface.columns }, () => ({ character: " ", width: 1, attributes: 0 })));
  }
  for (const span of damage.spans) {
    const row = cells[span.row];
    if (!row) throw new Error(`terminal damage row ${span.row} is outside the snapshot`);
    row.splice(span.startColumn, span.cells.length, ...span.cells);
  }
  return {
    ...surface,
    cells,
    scrollbackCells,
    cursor: damage.cursor,
    activeScreen: damage.activeScreen,
    modes: damage.modes,
    scrollbackBase: (surface.scrollbackBase ?? 0) + scrollRows,
    outputSequence: damage.outputSequence,
    revision: damage.revision,
    final: damage.final,
  };
}

export function terminalRenderTransactionToDamage(transaction: TerminalRenderTransaction): TerminalDamage {
  const scroll = transaction.operations.find((operation): operation is Extract<TerminalRenderOperation, { type: "scroll" }> => operation.type === "scroll");
  return {
    generationId: transaction.generationId,
    baseRevision: transaction.baseRevision,
    revision: transaction.revision,
    outputSequence: transaction.sourceSequence.end,
    dimensions: transaction.dimensions,
    spans: transaction.dirtyRanges,
    cursor: transaction.cursor,
    activeScreen: transaction.activeScreen,
    modes: transaction.modes,
    ...(scroll && scroll.top === 0 && scroll.bottom === transaction.dimensions.rows - 1 ? { scrollRows: scroll.rows } : {}),
    synchronized: transaction.atomicBoundary === "synchronized-output",
    final: transaction.final,
  };
}

export function applyTerminalRenderTransaction(surface: TerminalSurface, transaction: TerminalRenderTransaction): TerminalSurface {
  if (transaction.sourceSequence.start > transaction.sourceSequence.end) throw new Error("terminal render transaction source sequence range is reversed");
  return applyTerminalDamage(surface, terminalRenderTransactionToDamage(transaction));
}

export interface TerminalResponse {
  readonly kind: "device-attributes" | "cursor-position" | "dimensions" | "color" | "capability" | "keyboard-state" | "other";
  readonly bytes: Uint8Array;
}

export type TerminalSessionLifecycle =
  | { readonly state: "starting" | "running" }
  | { readonly state: "exited"; readonly exitCode: number | null; readonly signal: number | null }
  | { readonly state: "failed"; readonly message: string };

/** Physical state captured by a platform adapter and restored exactly once. */
export interface HostTerminalState {
  readonly platform: "win32" | "linux" | "darwin" | "other";
  readonly inputMode: number | null;
  readonly raw: boolean;
  readonly alternateScreen: boolean;
  readonly mouse: boolean;
  readonly bracketedPaste: boolean;
  readonly focusReporting: boolean;
  readonly keyboardEnhancement: boolean;
  readonly cursorVisible: boolean;
  readonly wraparound: boolean;
}

export interface TerminalSession {
  readonly generationId: GenerationId;
  readonly lifecycle: TerminalSessionLifecycle;
  snapshot(): TerminalSnapshot | null;
  input(event: HostTerminalInputEvent): void;
  resize(dimensions: TerminalDimensions): void;
  stop(): Promise<void>;
}

export interface HostTerminalAdapter {
  capture(): HostTerminalState;
  enter(): void;
  decode(data: Uint8Array): readonly HostTerminalInputEvent[];
  renderSnapshot(surface: TerminalSurface): void;
  renderTransaction(transaction: TerminalRenderTransaction): void;
  restore(state: HostTerminalState): void;
}
