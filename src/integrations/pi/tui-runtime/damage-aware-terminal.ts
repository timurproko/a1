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
  | "hyperlink-cleanup"
  | "pending-hyperlink-cleanup"
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
  /** The shell supplies visible-row analysis; the terminal layer owns no UI parser. */
  readonly inspectHyperlinks: (content: string) => {
    readonly ranges: readonly unknown[];
    readonly signature: string;
    readonly replaySafe: boolean;
    readonly width: number;
  };
  readonly onResize?: () => void;
  readonly onHyperlinkCleanupRequired?: () => void;
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
const CURSOR_SUFFIX = /(?:\u001b\[(\d+);(\d+)H)?\u001b\[\?25[hl]\u001b\[\?2026l$/u;
const OUT_OF_BAND = /^(?:\u001b\](?:0|2|9|52);[^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b\[\?25[hl])+$/u;

/**
 * A fail-closed adapter for one pinned Pi fullscreen write grammar. Semantic
 * viewport metadata authorizes a shift; bytes are inspected only to validate
 * and preserve Pi's complete row paint and cursor syntax.
 */
export class DamageAwareTerminalAdapter implements PiTuiTerminalPort {
  readonly #rows = new Map<number, string>();
  readonly #links = new Map<number, ReturnType<DamageAwareTerminalOptions["inspectHyperlinks"]>>();
  #cleanupRevision = 0;
  #cleanedRevision = 0;
  #recoveryRevision = 0;
  #epoch = 0;
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
  get hyperlinkCleanupPending(): boolean { return this.#cleanupRevision > this.#cleanedRevision; }

  /** Latches cleanup through composition/coalescing until a complete write covers it. */
  requestHyperlinkCleanup(): void { this.#cleanupRevision += 1; }

  arm(descriptor: PiTuiDamageFrameDescriptor, safety: PiTuiDamageFrameSafety): void {
    this.#armed = { descriptor, safety };
  }

  start(onInput: (data: string) => void, onResize: () => void): void {
    this.inner.start(onInput, () => {
      this.#epoch += 1;
      this.#recoveryRevision = 0;
      this.#invalidatePresentation();
      this.options.onResize?.();
      onResize();
    });
  }

  stop(): void {
    this.#epoch += 1;
    this.#armed = undefined;
    this.#cleanupRevision = this.#cleanedRevision = this.#recoveryRevision = 0;
    this.#lastConsumedFrameId = 0;
    this.#invalidateRows();
    this.inner.stop();
  }

  drainInput(maxMs?: number, idleMs?: number): Promise<void> { return this.inner.drainInput(maxMs, idleMs); }

  write(data: string): void {
    const armed = this.#armed;
    this.#armed = undefined;
    const parsed = parsePinnedFullscreenWrite(data);
    if (armed !== undefined && armed.descriptor.frameId <= this.#lastConsumedFrameId) {
      // Concurrency: a recognized obsolete frame must never repaint newer cells,
      // acknowledge cleanup, or become the reference for a subsequent differential.
      this.#decision = this.#decide(armed, parsed);
      return;
    }
    const sameGeometry = this.#cacheWidth === this.columns && this.#cacheHeight === this.rows;
    const unknownPaint = parsed === null && !OUT_OF_BAND.test(data);
    if (!sameGeometry || unknownPaint) this.#invalidatePresentation();
    if (unknownPaint && !this.hyperlinkCleanupPending && this.options.inspectHyperlinks(data).ranges.length > 0) {
      this.requestHyperlinkCleanup();
    }
    if (parsed !== null && !this.hyperlinkCleanupPending) {
      for (const row of parsed.rows) {
        const previous = this.#links.get(row.row);
        if (previous === undefined || this.#rows.get(row.row) === row.content
          || (previous.replaySafe && previous.ranges.length === 0)) continue;
        const next = this.options.inspectHyperlinks(row.content);
        if (previous.ranges.length > 0 && previous.signature !== next.signature) {
          this.requestHyperlinkCleanup();
          break;
        }
      }
    }
    const decision = this.#decide(armed, parsed);
    const cleanup = this.hyperlinkCleanupPending && parsed !== null
      && (armed === undefined || (armed.descriptor.width === this.columns && armed.descriptor.height === this.rows))
      ? this.#completeCleanupFrame(parsed) : null;
    const coveredRevision = this.#cleanupRevision;
    const epoch = this.#epoch;
    let output = data;
    if (cleanup !== null) {
      output = buildCompleteWrite(cleanup);
      this.#decision = {
        frameId: armed?.descriptor.frameId ?? null, transformed: output !== data,
        reason: "hyperlink-cleanup", shiftRows: 0, paintedRows: cleanup.rows.map(row => row.row),
      };
    } else {
      this.#decision = decision;
      if (decision.reason === "suppressed-redundant-clear" && parsed !== null) output = buildClearlessWrite(parsed);
      else if (decision.transformed && armed !== undefined && parsed !== null) {
        output = buildDamageWrite(parsed, armed.descriptor, new Set(decision.paintedRows), this.#rows);
      }
    }
    this.inner.write(output);
    if (epoch !== this.#epoch
      || (armed !== undefined && this.#lastConsumedFrameId !== armed.descriptor.frameId)) return;
    // Invariant: cache invalidation follows forwarded bytes, not a clear which
    // was stripped from the input. A synthesized cleanup publishes every row.
    this.#rememberFrame(armed?.descriptor, cleanup ?? parsed, output);
    if (cleanup !== null) this.#cleanedRevision = Math.max(this.#cleanedRevision, coveredRevision);
    this.#scheduleCleanupRecovery();
  }

  moveBy(lines: number): void { this.inner.moveBy(lines); }
  hideCursor(): void { this.inner.hideCursor(); }
  showCursor(): void { this.inner.showCursor(); }
  clearLine(): void { this.#invalidatePresentation(); this.inner.clearLine(); }
  clearFromCursor(): void { this.#invalidatePresentation(); this.inner.clearFromCursor(); }
  clearScreen(): void { this.#invalidatePresentation(); this.inner.clearScreen(); }
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
    if (this.hyperlinkCleanupPending) return { ...base, reason: "pending-hyperlink-cleanup" };
    if (parsed !== null && parsed.structuralPrefix === "\u001b[2J"
      && this.#cacheWidth === descriptor.width && this.#cacheHeight === descriptor.height
      && descriptor.width === this.columns && descriptor.height === this.rows
      && !this.#hasLinkRisk()
      && hasCompleteScreenRows(parsed.rows, descriptor.height) && !hasUnsafeTerminalContent(parsed, this.options.inspectHyperlinks)) {
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
    if (parsed.structuralPrefix.length > 0 || hasUnsafeTerminalContent(parsed, this.options.inspectHyperlinks)
      || this.#hasLinkRisk(descriptor.transcript) || this.#hasUnsafeRows(descriptor.transcript)) {
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
    const width = descriptor?.width ?? this.columns;
    const height = descriptor?.height ?? this.rows;
    if (width !== this.#cacheWidth || height !== this.#cacheHeight) {
      this.#invalidateRows();
      this.#cacheWidth = width;
      this.#cacheHeight = height;
    }
    if (parsed.rows.some(row => row.row > this.rows)) { this.#invalidatePresentation(); return; }
    for (const row of parsed.rows) {
      if (this.#rows.get(row.row) !== row.content) this.#links.set(row.row, this.options.inspectHyperlinks(row.content));
      this.#rows.set(row.row, row.content);
    }
  }

  #hasLinkRisk(region?: { readonly rowStart: number; readonly rowEnd: number }): boolean {
    for (const [row, state] of this.#links) {
      if (region !== undefined && (row < region.rowStart || row > region.rowEnd)) continue;
      if (state.ranges.length > 0) return true;
    }
    return false;
  }

  #hasUnsafeRows(region: { readonly rowStart: number; readonly rowEnd: number }): boolean {
    for (const [row, state] of this.#links) {
      if (row >= region.rowStart && row <= region.rowEnd && !state.replaySafe) return true;
    }
    return false;
  }

  #completeCleanupFrame(parsed: ParsedFullscreenWrite): ParsedFullscreenWrite | null {
    const desired = parsed.structuralPrefix.length === 0 ? new Map(this.#rows) : new Map<number, string>();
    for (const row of parsed.rows) desired.set(row.row, row.content);
    if (desired.size !== this.rows) return null;
    const rows: ParsedRow[] = [];
    for (let row = 1; row <= this.rows; row += 1) {
      const content = desired.get(row);
      if (content === undefined) return null;
      const state = content === this.#rows.get(row) ? this.#links.get(row) : this.options.inspectHyperlinks(content);
      if (state?.replaySafe !== true || state.width > this.columns) return null;
      rows.push({ row, content, segment: `\u001b[${row};1H\u001b[2K${content}` });
    }
    return { structuralPrefix: "\u001b[2J", rows, cursorSuffix: parsed.cursorSuffix };
  }

  #scheduleCleanupRecovery(): void {
    if (!this.hyperlinkCleanupPending || this.#recoveryRevision === this.#cleanupRevision
      || this.options.onHyperlinkCleanupRequired === undefined) return;
    this.#recoveryRevision = this.#cleanupRevision;
    const epoch = this.#epoch;
    // Concurrency: force only after Pi finishes updating its previous-screen
    // state. One recovery per revision avoids loops on unsupported image frames.
    queueMicrotask(() => {
      if (epoch === this.#epoch && this.hyperlinkCleanupPending) this.options.onHyperlinkCleanupRequired?.();
    });
  }

  #invalidatePresentation(): void {
    if (this.#hasLinkRisk() && !this.hyperlinkCleanupPending) this.requestHyperlinkCleanup();
    this.#invalidateRows();
  }

  #invalidateRows(): void {
    this.#rows.clear();
    this.#links.clear();
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
  if (matches.length === 0) return body.length === 0
    ? { structuralPrefix: "", rows: [], cursorSuffix: data.slice(suffix.index) } : null;
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

function hasUnsafeTerminalContent(parsed: ParsedFullscreenWrite, inspect: DamageAwareTerminalOptions["inspectHyperlinks"]): boolean {
  const data = parsed.rows.map(row => row.content).join("");
  if (data.includes("\u001b_G") || data.includes("\u001bPq") || data.includes("\u001b[2J")) return true;
  return parsed.rows.some(row => {
    const state = inspect(row.content);
    return !state.replaySafe || state.ranges.length > 0;
  });
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

/** Keeps the clear and all current rows in the same synchronized transaction. */
function buildCompleteWrite(parsed: ParsedFullscreenWrite): string {
  return `${BEGIN_SYNCHRONIZED_OUTPUT}${parsed.structuralPrefix}${parsed.rows.map(row => row.segment).join("")}${parsed.cursorSuffix}`;
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
