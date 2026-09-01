import HeadlessXterm from "@xterm/headless";
import type { Terminal as HeadlessTerminal } from "@xterm/headless";

const { Terminal } = HeadlessXterm;

export interface TimedTerminalWrite {
  readonly data: string;
  readonly atMs: number;
  readonly cause?: string;
}

export interface TerminalPaintLimits {
  readonly maxBytes?: number;
  readonly maxCapturedWrites?: number;
  readonly maxExcerptBytes?: number;
}

export interface TerminalPaintClassification {
  readonly writes: number;
  readonly frames: number;
  readonly bytes: number;
  readonly durationMs: number;
  readonly fullScreenClears: number;
  readonly rowClears: number;
  readonly addressedRowWrites: readonly number[];
  readonly scrollRegions: readonly { readonly top: number; readonly bottom: number }[];
  readonly scrollUpRows: number;
  readonly scrollDownRows: number;
  readonly synchronizedUpdates: { readonly begins: number; readonly ends: number; readonly balanced: boolean };
  readonly cursorPositions: readonly { readonly row: number; readonly column: number }[];
  readonly causes: Readonly<Record<string, number>>;
  readonly capturedWrites: readonly { readonly index: number; readonly atMs: number; readonly cause?: string; readonly excerpt: string; readonly truncated: boolean }[];
  readonly captureTruncated: boolean;
}

export interface TerminalCellFrame {
  readonly rows: readonly string[];
  readonly cursor: { readonly row: number; readonly column: number };
}

export interface TerminalReplayResult {
  readonly final: TerminalCellFrame;
  /** Intermediate physical states; synchronized transactions contribute one state when honored. */
  readonly states: readonly TerminalCellFrame[];
  readonly ignoredSynchronizedUpdates: boolean;
}

const BEGIN_SYNCHRONIZED_OUTPUT = "\u001b[?2026h";
const END_SYNCHRONIZED_OUTPUT = "\u001b[?2026l";
const DEFAULT_MAX_BYTES = 512 * 1024;
const DEFAULT_MAX_CAPTURED_WRITES = 24;
const DEFAULT_MAX_EXCERPT_BYTES = 2 * 1024;
const CSI = /\u001b\[([0-9;?]*)([ -/]*)([@-~])/gu;

export function classifyTerminalPaint(
  writes: readonly TimedTerminalWrite[],
  limits: TerminalPaintLimits = {},
): TerminalPaintClassification {
  const maxBytes = limits.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxCapturedWrites = limits.maxCapturedWrites ?? DEFAULT_MAX_CAPTURED_WRITES;
  const maxExcerptBytes = limits.maxExcerptBytes ?? DEFAULT_MAX_EXCERPT_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError("terminal paint maxBytes must be positive");
  if (!Number.isSafeInteger(maxCapturedWrites) || maxCapturedWrites < 1) throw new RangeError("terminal paint maxCapturedWrites must be positive");
  if (!Number.isSafeInteger(maxExcerptBytes) || maxExcerptBytes < 1) throw new RangeError("terminal paint maxExcerptBytes must be positive");

  let bytes = 0;
  let fullScreenClears = 0;
  let rowClears = 0;
  let scrollUpRows = 0;
  let scrollDownRows = 0;
  let syncBegins = 0;
  let syncEnds = 0;
  let syncDepth = 0;
  let frames = 0;
  const addressedRowWrites: number[] = [];
  const scrollRegions: Array<{ top: number; bottom: number }> = [];
  const cursorPositions: Array<{ row: number; column: number }> = [];
  const causes: Record<string, number> = {};

  for (const [writeIndex, write] of writes.entries()) {
    if (!Number.isFinite(write.atMs) || write.atMs < 0) throw new TypeError(`terminal write ${writeIndex} has an invalid timestamp`);
    const writeBytes = Buffer.byteLength(write.data);
    bytes += writeBytes;
    if (bytes > maxBytes) throw new RangeError(`terminal paint exceeds ${maxBytes} byte evidence limit`);
    if (write.cause !== undefined) causes[write.cause] = (causes[write.cause] ?? 0) + 1;
    const begins = count(write.data, BEGIN_SYNCHRONIZED_OUTPUT);
    const ends = count(write.data, END_SYNCHRONIZED_OUTPUT);
    syncBegins += begins;
    syncEnds += ends;
    for (const token of synchronizedTokens(write.data)) {
      if (token === "begin") {
        if (syncDepth !== 0) throw new Error(`terminal write ${writeIndex} nests synchronized output`);
        syncDepth = 1;
        frames += 1;
      } else {
        if (syncDepth === 0) throw new Error(`terminal write ${writeIndex} ends synchronized output without a begin`);
        syncDepth = 0;
      }
    }
    if (begins === 0 && ends === 0 && hasVisiblePaint(write.data)) frames += 1;

    for (const match of write.data.matchAll(CSI)) {
      const parameters = match[1] ?? "";
      const intermediate = match[2] ?? "";
      const final = match[3] ?? "";
      if (intermediate.length > 0) continue;
      const values = numericParameters(parameters);
      if (final === "J" && (values[0] ?? 0) === 2) fullScreenClears += 1;
      else if (final === "K" && (values[0] ?? 0) === 2) rowClears += 1;
      else if (final === "H" || final === "f") {
        const position = { row: values[0] ?? 1, column: values[1] ?? 1 };
        cursorPositions.push(position);
        if (hasRowPaintAfter(write.data, match.index! + match[0].length)) addressedRowWrites.push(position.row);
      } else if (final === "r" && parameters.length > 0 && values.length >= 2) {
        scrollRegions.push({ top: values[0] ?? 1, bottom: values[1] ?? 1 });
      } else if (final === "S") scrollUpRows += values[0] ?? 1;
      else if (final === "T") scrollDownRows += values[0] ?? 1;
    }
  }
  if (syncDepth !== 0) throw new Error("terminal paint ends inside synchronized output");

  const capturedIndexes = boundedIndexes(writes.length, maxCapturedWrites);
  const capturedWrites = capturedIndexes.map(index => {
    const write = writes[index]!;
    const excerpt = truncateUtf8(write.data, maxExcerptBytes);
    return {
      index,
      atMs: write.atMs,
      ...(write.cause === undefined ? {} : { cause: write.cause }),
      excerpt: excerpt.value,
      truncated: excerpt.truncated,
    };
  });
  const firstAt = writes[0]?.atMs ?? 0;
  const lastAt = writes.at(-1)?.atMs ?? firstAt;
  return {
    writes: writes.length,
    frames,
    bytes,
    durationMs: Math.max(0, lastAt - firstAt),
    fullScreenClears,
    rowClears,
    addressedRowWrites,
    scrollRegions,
    scrollUpRows,
    scrollDownRows,
    synchronizedUpdates: { begins: syncBegins, ends: syncEnds, balanced: syncBegins === syncEnds },
    cursorPositions,
    causes,
    capturedWrites,
    captureTruncated: capturedWrites.length < writes.length || capturedWrites.some(write => write.truncated),
  };
}

export async function replayTerminalPaint(
  writes: readonly TimedTerminalWrite[],
  options: { readonly columns: number; readonly rows: number; readonly synchronizedUpdates: "honor" | "ignore" },
): Promise<TerminalReplayResult> {
  if (!Number.isSafeInteger(options.columns) || options.columns < 1) throw new RangeError("terminal replay columns must be positive");
  if (!Number.isSafeInteger(options.rows) || options.rows < 1) throw new RangeError("terminal replay rows must be positive");
  // Reuse classification's strict synchronized-output validation before replaying bytes.
  classifyTerminalPaint(writes);
  const terminal = new Terminal({ cols: options.columns, rows: options.rows, allowProposedApi: true, scrollback: 0 });
  const states: TerminalCellFrame[] = [];
  let transaction = "";
  let synchronized = false;
  try {
    for (const write of writes) {
      for (const token of paintTokens(write.data)) {
        if (token === BEGIN_SYNCHRONIZED_OUTPUT) {
          synchronized = true;
          transaction = "";
          continue;
        }
        if (token === END_SYNCHRONIZED_OUTPUT) {
          if (options.synchronizedUpdates === "honor") {
            await terminalWrite(terminal, transaction);
            states.push(snapshot(terminal, options.rows));
          }
          transaction = "";
          synchronized = false;
          continue;
        }
        if (synchronized && options.synchronizedUpdates === "honor") {
          transaction += token;
          continue;
        }
        await terminalWrite(terminal, token);
        if (hasVisiblePaint(token)) states.push(snapshot(terminal, options.rows));
      }
    }
    return {
      final: snapshot(terminal, options.rows),
      states,
      ignoredSynchronizedUpdates: options.synchronizedUpdates === "ignore",
    };
  } finally {
    terminal.dispose();
  }
}

function snapshot(terminal: HeadlessTerminal, rows: number): TerminalCellFrame {
  const buffer = terminal.buffer.active;
  const result: string[] = [];
  for (let row = 0; row < rows; row += 1) {
    result.push(buffer.getLine(row)?.translateToString(true) ?? "");
  }
  return { rows: result, cursor: { row: buffer.cursorY + 1, column: buffer.cursorX + 1 } };
}

function terminalWrite(terminal: HeadlessTerminal, data: string): Promise<void> {
  if (data.length === 0) return Promise.resolve();
  return new Promise(resolve => terminal.write(data, resolve));
}

function paintTokens(data: string): readonly string[] {
  return data
    .split(/(\u001b\[\?2026[hl]|\u001b\[[0-?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b_[^\u0007]*(?:\u0007|$))/gu)
    .filter(Boolean);
}

function synchronizedTokens(data: string): readonly ("begin" | "end")[] {
  const result: Array<"begin" | "end"> = [];
  const pattern = /\u001b\[\?2026([hl])/gu;
  for (const match of data.matchAll(pattern)) result.push(match[1] === "h" ? "begin" : "end");
  return result;
}

function numericParameters(parameters: string): number[] {
  const plain = parameters.replace(/^\?/u, "");
  if (plain.length === 0) return [];
  return plain.split(";").map(value => value.length === 0 ? 0 : Number.parseInt(value, 10));
}

function hasVisiblePaint(data: string): boolean {
  const withoutControls = data
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "")
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/gu, "")
    .replace(/\u001b_[^\u0007]*(?:\u0007|$)/gu, "");
  return withoutControls.length > 0 || /\u001b\[(?:2J|2K|[0-9;]*[ST])/u.test(data);
}

function hasRowPaintAfter(data: string, from: number): boolean {
  const tail = data.slice(from);
  const nextCursor = tail.search(/\u001b\[[0-9;]*[Hf]/u);
  const segment = nextCursor < 0 ? tail : tail.slice(0, nextCursor);
  return hasVisiblePaint(segment);
}

function count(data: string, token: string): number {
  return data.split(token).length - 1;
}

function boundedIndexes(length: number, maximum: number): number[] {
  if (length <= maximum) return Array.from({ length }, (_, index) => index);
  const head = Math.ceil(maximum / 2);
  const tail = maximum - head;
  return [
    ...Array.from({ length: head }, (_, index) => index),
    ...Array.from({ length: tail }, (_, index) => length - tail + index),
  ];
}

function truncateUtf8(value: string, maximumBytes: number): { readonly value: string; readonly truncated: boolean } {
  const source = Buffer.from(value);
  if (source.length <= maximumBytes) return { value, truncated: false };
  return { value: `${source.subarray(0, maximumBytes).toString("utf8")}…`, truncated: true };
}
