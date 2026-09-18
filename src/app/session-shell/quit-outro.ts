/**
 * Bare A1's quit outro: the last presented fullscreen frame is captured, the
 * selected effect animates over it on the alternate screen, and only then does
 * the shell leave that screen. Every tick is one synchronized-output block so a
 * terminal never shows a half-painted step, and playback is bounded so a slow
 * terminal cannot delay restoration past the configured clamp.
 */
import { displayWidth, truncateToWidth } from "../../ui/components/index.js";
import { createQuitOutroPlan, type QuitOutroEffect } from "./quit-outro-effects.js";

export interface QuitOutroFrame {
  /** Row content as presented, truncated to `columns`; index 0 is the top row. */
  readonly lines: readonly string[];
  readonly columns: number;
  readonly rows: number;
  /** Visible width of each line, at most `columns`. */
  readonly rowWidths: readonly number[];
}

export interface QuitOutroPlayback {
  write(data: string): void;
  /** Monotonic clock seam; defaults to `Date.now`. */
  now?(): number;
  /** Delay seam; defaults to a timer. */
  sleep?(ms: number): Promise<void>;
  /** Plan seed; defaults to a time- and geometry-derived value. */
  readonly seed?: number;
}

export const QUIT_OUTRO_MIN_MS = 300;
export const QUIT_OUTRO_MAX_MS = 2000;
/** Wall-clock allowance beyond the clamped duration before playback abandons remaining ticks. */
export const QUIT_OUTRO_GUARD_MS = 500;
const FRAME_MS = 1000 / 30;
/** Tick ceiling for a clock that stops advancing: the longest playback plus its guard at 30 fps. */
export const QUIT_OUTRO_MAX_TICKS = Math.ceil((QUIT_OUTRO_MAX_MS + QUIT_OUTRO_GUARD_MS) / FRAME_MS) + 1;

const SYNC_BEGIN = "\x1b[?2026h";
const SYNC_END = "\x1b[?2026l";
const RESET = "\x1b[0m";
const CLEAR_SCREEN = "\x1b[2J";
const HOME = "\x1b[H";
const HIDE_CURSOR = "\x1b[?25l";

export function clampQuitOutroDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs)) return QUIT_OUTRO_MIN_MS;
  return Math.max(QUIT_OUTRO_MIN_MS, Math.min(QUIT_OUTRO_MAX_MS, Math.floor(durationMs)));
}

function cursorAt(row: number, col: number): string {
  return `\x1b[${row + 1};${col + 1}H`;
}

/**
 * Captures the presented rows into an outro frame. Returns null when nothing is
 * visible, so a blank screen never animates.
 */
export function captureQuitOutroFrame(presented: readonly string[], columns: number, rows: number): QuitOutroFrame | null {
  const width = Math.max(1, Math.floor(columns));
  const height = Math.max(1, Math.floor(rows));
  const lines = presented.slice(0, height).map(line => truncateToWidth(line, width));
  while (lines.length < height) lines.push("");
  const rowWidths = lines.map(line => Math.min(width, displayWidth(line)));
  if (rowWidths.every(w => w === 0)) return null;
  return { lines, columns: width, rows: height, rowWidths };
}

/** The clear-and-repaint block that seeds the animation surface with the captured frame. */
export function createQuitOutroSurfaceFrame(frame: QuitOutroFrame): string {
  let output = `${SYNC_BEGIN}${HIDE_CURSOR}${CLEAR_SCREEN}${HOME}${RESET}`;
  for (let row = 0; row < frame.rows; row++) {
    const line = frame.lines[row] ?? "";
    if (frame.rowWidths[row]! > 0) output += `${cursorAt(row, 0)}${line}${RESET}`;
  }
  return `${output}${SYNC_END}`;
}

/**
 * Plays the effect over the frame. Resolves true when the plan was played to
 * completion or abandoned at its guard, false when there was nothing to play.
 * Write failures propagate so the caller can decide to continue restoration.
 */
export async function playQuitOutro(
  frame: QuitOutroFrame,
  effect: QuitOutroEffect,
  durationMs: number,
  playback: QuitOutroPlayback,
): Promise<boolean> {
  const now = playback.now ?? (() => Date.now());
  const sleep = playback.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const seed = playback.seed ?? (Date.now() ^ (frame.columns << 16) ^ frame.rows);
  const plan = createQuitOutroPlan(effect, frame.rowWidths, seed);
  if (plan.clears.length === 0) return false;
  const duration = clampQuitOutroDuration(durationMs);
  let sparkleIndex = 0;
  let clearIndex = 0;
  let ticks = 0;

  playback.write(createQuitOutroSurfaceFrame(frame));
  const startedAt = now();
  for (;;) {
    ticks += 1;
    const elapsed = now() - startedAt;
    const progress = Math.min(1, elapsed / duration);
    let output = `${SYNC_BEGIN}${RESET}`;
    while (sparkleIndex < plan.sparkles.length && plan.sparkles[sparkleIndex]!.start <= progress) {
      const cell = plan.sparkles[sparkleIndex++]!;
      output += `${cursorAt(cell.row, cell.col)}${cell.color}${cell.glyph}`;
    }
    while (clearIndex < plan.clears.length && plan.clears[clearIndex]!.end <= progress) {
      const cell = plan.clears[clearIndex++]!;
      output += `${cursorAt(cell.row, cell.col)}${RESET} `;
    }
    const finished = clearIndex >= plan.clears.length || progress >= 1
      || elapsed > duration + QUIT_OUTRO_GUARD_MS || ticks >= QUIT_OUTRO_MAX_TICKS;
    // Invariant: the last block leaves the alternate screen blank regardless of which
    // cells the plan reached, so the leave never reveals a half-cleared frame.
    if (finished) output += `${CLEAR_SCREEN}${HOME}`;
    playback.write(`${output}${RESET}${SYNC_END}`);
    if (finished) return true;
    await sleep(FRAME_MS);
  }
}
