import type { PiTuiTerminalPort } from "./contracts.js";

export const PINNED_PI_TUI_DAMAGE_GRAMMAR = "@earendil-works/pi-tui@0.84.2:tui-alt-screen-one-write-v1";

export interface PiTuiDamageFrameDescriptor {
  readonly frameId: number;
  readonly width: number;
  readonly height: number;
  readonly transcript: { readonly rowStart: number; readonly rowEnd: number } | null;
  readonly dock: { readonly rowStart: number; readonly rowEnd: number } | null;
  readonly verticalShiftRows: number;
  readonly safeVerticalShift: boolean;
  readonly cause: string;
}

export interface PiTuiDamageFrameSafety {
  readonly overlayActive: boolean;
  readonly selectionActive: boolean;
  readonly replacementSurfaceActive: boolean;
}

export type PiTuiDamageDecisionReason =
  | "transformed"
  | "suppressed-redundant-clear"
  | "not-armed"
  | "unsafe-frame"
  | "stale-frame"
  | "unsupported-region-scroll"
  | "geometry-mismatch"
  | "grammar-mismatch"
  | "unsafe-terminal-content"
  | "incomplete-prior-frame"
  | "excessive-real-damage";

export interface PiTuiDamageDecision {
  readonly frameId: number | null;
  readonly transformed: boolean;
  readonly reason: PiTuiDamageDecisionReason;
  readonly shiftRows: number;
  readonly paintedRows: readonly number[];
}

export interface DamageAwareTerminalOptions {
  readonly regionalScroll: boolean;
  readonly onResize?: () => void;
}

interface ArmedFrame {
  readonly descriptor: PiTuiDamageFrameDescriptor;
  readonly safety: PiTuiDamageFrameSafety;
}

interface ParsedFullscreenWrite {
  readonly structuralPrefix: string;
  readonly rows: readonly ParsedRow[];
  readonly cursorSuffix: string;
}

interface ParsedRow {
  readonly row: number;
  readonly content: string;
  readonly segment: string;
}

const BEGIN_SYNCHRONIZED_OUTPUT = "\u001b[?2026h";
const END_SYNCHRONIZED_OUTPUT = "\u001b[?2026l";
const ROW_MARKER = /\u001b\[(\d+);1H\u001b\[2K/gu;
const CURSOR_SUFFIX = /\u001b\[(\d+);(\d+)H\u001b\[\?25[hl]\u001b\[\?2026l$/u;
const OSC8 = /\u001b\]8;[^;\u0007\u001b]*;([^\u0007\u001b]*)(?:\u0007|\u001b\\)/gu;

/**
 * A fail-closed adapter for one pinned Pi fullscreen write grammar. Semantic
 * viewport metadata authorizes a shift; bytes are inspected only to validate
 * and preserve Pi's complete row paint and cursor syntax.
 */
export class DamageAwareTerminalAdapter implements PiTuiTerminalPort {
  readonly #rows = new Map<number, string>();
  #armed: ArmedFrame | undefined;
  #lastConsumedFrameId = 0;
  #cacheWidth = 0;
  #cacheHeight = 0;
  #decision: PiTuiDamageDecision = {
    frameId: null,
    transformed: false,
    reason: "not-armed",
    shiftRows: 0,
    paintedRows: [],
  };

  constructor(
    readonly inner: PiTuiTerminalPort,
    readonly options: DamageAwareTerminalOptions,
  ) {}

  get columns(): number { return this.inner.columns; }
  get rows(): number { return this.inner.rows; }
  get kittyProtocolActive(): boolean { return this.inner.kittyProtocolActive; }
  get lastDecision(): PiTuiDamageDecision { return this.#decision; }

  arm(descriptor: PiTuiDamageFrameDescriptor, safety: PiTuiDamageFrameSafety): void {
    this.#armed = { descriptor, safety };
  }

  start(onInput: (data: string) => void, onResize: () => void): void {
    this.inner.start(onInput, () => {
      this.#invalidateRows();
      this.options.onResize?.();
      onResize();
    });
  }

  stop(): void {
    this.#armed = undefined;
    this.#invalidateRows();
    this.inner.stop();
  }

  drainInput(maxMs?: number, idleMs?: number): Promise<void> { return this.inner.drainInput(maxMs, idleMs); }

  write(data: string): void {
    const armed = this.#armed;
    this.#armed = undefined;
    const parsed = parsePinnedFullscreenWrite(data);
    const decision = this.#decide(armed, parsed);
    this.#decision = decision;
    if (decision.reason === "suppressed-redundant-clear" && parsed !== null) {
      this.inner.write(buildClearlessWrite(parsed));
    } else if (decision.transformed && armed !== undefined && parsed !== null) {
      this.inner.write(buildDamageWrite(parsed, armed.descriptor, new Set(decision.paintedRows), this.#rows));
    } else {
      this.inner.write(data);
    }
    this.#rememberFrame(armed?.descriptor, parsed, data);
  }

  moveBy(lines: number): void { this.inner.moveBy(lines); }
  hideCursor(): void { this.inner.hideCursor(); }
  showCursor(): void { this.inner.showCursor(); }
  clearLine(): void { this.#invalidateRows(); this.inner.clearLine(); }
  clearFromCursor(): void { this.#invalidateRows(); this.inner.clearFromCursor(); }
  clearScreen(): void { this.#invalidateRows(); this.inner.clearScreen(); }
  setTitle(title: string): void { this.inner.setTitle(title); }
  setProgress(active: boolean): void { this.inner.setProgress(active); }

  #decide(armed: ArmedFrame | undefined, parsed: ParsedFullscreenWrite | null): PiTuiDamageDecision {
    if (armed === undefined) {
      return { frameId: null, transformed: false, reason: "not-armed", shiftRows: 0, paintedRows: [] };
    }
    const descriptor = armed.descriptor;
    const base = {
      frameId: descriptor.frameId,
      transformed: false,
      shiftRows: descriptor.verticalShiftRows,
      paintedRows: [] as readonly number[],
    };
    if (descriptor.frameId <= this.#lastConsumedFrameId) return { ...base, reason: "stale-frame" };
    this.#lastConsumedFrameId = descriptor.frameId;
    if (parsed !== null && parsed.structuralPrefix === "\u001b[2J"
      && this.#cacheWidth === descriptor.width && this.#cacheHeight === descriptor.height
      && hasCompleteScreenRows(parsed.rows, descriptor.height) && !hasUnsafeTerminalContent(parsed)) {
      return {
        frameId: descriptor.frameId,
        transformed: true,
        reason: "suppressed-redundant-clear",
        shiftRows: 0,
        paintedRows: parsed.rows.map(row => row.row),
      };
    }
    if (!descriptor.safeVerticalShift || armed.safety.overlayActive || armed.safety.selectionActive
      || armed.safety.replacementSurfaceActive || descriptor.transcript === null) {
      return { ...base, reason: "unsafe-frame" };
    }
    if (!this.options.regionalScroll) return { ...base, reason: "unsupported-region-scroll" };
    if (descriptor.width !== this.columns || descriptor.height !== this.rows
      || descriptor.verticalShiftRows < 1
      || descriptor.verticalShiftRows >= descriptor.transcript.rowEnd - descriptor.transcript.rowStart + 1) {
      return { ...base, reason: "geometry-mismatch" };
    }
    if (parsed === null) return { ...base, reason: "grammar-mismatch" };
    if (parsed.structuralPrefix.length > 0 || hasUnsafeTerminalContent(parsed)) {
      return { ...base, reason: "unsafe-terminal-content" };
    }

    const { rowStart, rowEnd } = descriptor.transcript;
    const desired = new Map(parsed.rows.map(row => [row.row, row.content]));
    for (let row = rowStart; row <= rowEnd; row += 1) {
      if (!desired.has(row) && !this.#rows.has(row)) return { ...base, reason: "incomplete-prior-frame" };
      if (row <= rowEnd - descriptor.verticalShiftRows && !this.#rows.has(row + descriptor.verticalShiftRows)) {
        return { ...base, reason: "incomplete-prior-frame" };
      }
    }
    for (const row of parsed.rows) {
      const inTranscript = row.row >= rowStart && row.row <= rowEnd;
      const inDock = descriptor.dock !== null && row.row >= descriptor.dock.rowStart && row.row <= descriptor.dock.rowEnd;
      if (!inTranscript && !inDock) return { ...base, reason: "grammar-mismatch" };
    }

    const painted = new Set<number>();
    for (let row = rowStart; row <= rowEnd; row += 1) {
      const source = row + descriptor.verticalShiftRows;
      const desiredContent = desired.get(row) ?? this.#rows.get(row)!;
      if (source > rowEnd || desiredContent !== this.#rows.get(source)) painted.add(row);
    }
    for (const row of parsed.rows) {
      if (descriptor.dock !== null && row.row >= descriptor.dock.rowStart && row.row <= descriptor.dock.rowEnd) painted.add(row.row);
    }
    // Rationale: ordinary followed prose may change one active tail source row, expose
    // the shifted suffix, and restyle one sticky boundary row. Larger changes indicate
    // Markdown/theme/overlay reflow and fail closed.
    if (painted.size > descriptor.verticalShiftRows + 2 + countDockRows(parsed.rows, descriptor.dock)) {
      return { ...base, reason: "excessive-real-damage" };
    }
    return {
      frameId: descriptor.frameId,
      transformed: true,
      reason: "transformed",
      shiftRows: descriptor.verticalShiftRows,
      paintedRows: [...painted].sort((left, right) => left - right),
    };
  }

  #rememberFrame(
    descriptor: PiTuiDamageFrameDescriptor | undefined,
    parsed: ParsedFullscreenWrite | null,
    raw: string,
  ): void {
    if (raw.includes("\u001b[2J") || raw.includes("\u001b[?1049") || raw.includes("\u001b_G") || raw.includes("\u001bPq")) {
      this.#invalidateRows();
    }
    if (parsed === null) return;
    if (descriptor !== undefined && (descriptor.width !== this.#cacheWidth || descriptor.height !== this.#cacheHeight)) {
      this.#invalidateRows();
      this.#cacheWidth = descriptor.width;
      this.#cacheHeight = descriptor.height;
    }
    for (const row of parsed.rows) this.#rows.set(row.row, row.content);
  }

  #invalidateRows(): void {
    this.#rows.clear();
    this.#cacheWidth = 0;
    this.#cacheHeight = 0;
  }
}

function parsePinnedFullscreenWrite(data: string): ParsedFullscreenWrite | null {
  if (!data.startsWith(BEGIN_SYNCHRONIZED_OUTPUT) || !data.endsWith(END_SYNCHRONIZED_OUTPUT)) return null;
  const suffix = data.match(CURSOR_SUFFIX);
  if (suffix?.index === undefined) return null;
  const body = data.slice(BEGIN_SYNCHRONIZED_OUTPUT.length, suffix.index);
  const matches = [...body.matchAll(ROW_MARKER)];
  if (matches.length === 0) return null;
  const structuralPrefix = body.slice(0, matches[0]!.index);
  if (structuralPrefix !== "" && structuralPrefix !== "\u001b[2J") return null;
  const rows: ParsedRow[] = [];
  let previousRow = 0;
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]!;
    const row = Number.parseInt(match[1]!, 10);
    if (!Number.isSafeInteger(row) || row < 1 || row <= previousRow) return null;
    previousRow = row;
    const start = match.index!;
    const contentStart = start + match[0].length;
    const end = matches[index + 1]?.index ?? body.length;
    const content = body.slice(contentStart, end);
    rows.push({ row, content, segment: body.slice(start, end) });
  }
  return { structuralPrefix, rows, cursorSuffix: data.slice(suffix.index) };
}

function hasUnsafeTerminalContent(parsed: ParsedFullscreenWrite): boolean {
  const data = parsed.rows.map(row => row.content).join("");
  if (data.includes("\u001b_G") || data.includes("\u001bPq") || data.includes("\u001b[2J")) return true;
  for (const match of data.matchAll(OSC8)) if ((match[1] ?? "").length > 0) return true;
  return false;
}

function buildDamageWrite(
  parsed: ParsedFullscreenWrite,
  descriptor: PiTuiDamageFrameDescriptor,
  paintedRows: ReadonlySet<number>,
  previousRows: ReadonlyMap<number, string>,
): string {
  const transcript = descriptor.transcript!;
  const regionShift = `\u001b[${transcript.rowStart};${transcript.rowEnd}r`
    + `\u001b[${transcript.rowStart};1H`
    + `\u001b[${descriptor.verticalShiftRows}S`
    + "\u001b[r";
  const parsedRows = new Map(parsed.rows.map(row => [row.row, row]));
  const rowPaint = [...paintedRows].sort((left, right) => left - right).map(row => {
    const parsedRow = parsedRows.get(row);
    if (parsedRow !== undefined) return parsedRow.segment;
    return `\u001b[${row};1H\u001b[2K${previousRows.get(row) ?? ""}`;
  }).join("");
  return `${BEGIN_SYNCHRONIZED_OUTPUT}${regionShift}${rowPaint}${parsed.cursorSuffix}`;
}

function buildClearlessWrite(parsed: ParsedFullscreenWrite): string {
  return `${BEGIN_SYNCHRONIZED_OUTPUT}${parsed.rows.map(row => row.segment).join("")}${parsed.cursorSuffix}`;
}

function hasCompleteScreenRows(rows: readonly ParsedRow[], height: number): boolean {
  return rows.length === height && rows.every((row, index) => row.row === index + 1);
}

function countDockRows(
  rows: readonly ParsedRow[],
  dock: PiTuiDamageFrameDescriptor["dock"],
): number {
  if (dock === null) return 0;
  return rows.filter(row => row.row >= dock.rowStart && row.row <= dock.rowEnd).length;
}
