import type { ProgressSpinnerStyle } from "../../contracts/presentation/index.js";

export type ProgressStatusMarker = "…" | "...";

/** Pinned loader cadence, shared by the focused Settings preview. */
export const PROGRESS_SPINNER_INTERVAL_MS = 80;
const SPINNER_FRAMES = {
  none: [],
  current: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  circle: ["◐", "◓", "◑", "◒"],
  diamond: ["◇", "◈", "◆", "◈"],
  square: ["◧", "◩", "◨", "◪"],
} as const;

/** Accepts only the declared owned spinner choices. */
export function isProgressSpinnerStyle(value: unknown): value is ProgressSpinnerStyle {
  return typeof value === "string" && Object.hasOwn(SPINNER_FRAMES, value);
}

/** One fixed-cell glyph; actual Current indicators retain the loader's supplied frame. */
export function progressSpinnerFrame(style: ProgressSpinnerStyle, phase: number, currentFrame?: string): string {
  if (style === "current" && currentFrame !== undefined) return currentFrame;
  const frames = SPINNER_FRAMES[style];
  const index = Number.isFinite(phase) ? Math.max(0, Math.floor(phase)) : 0;
  return frames.length === 0 ? "" : frames[index % frames.length]!;
}

export interface ProgressStatusFrameStyles {
  readonly muted: (text: string) => string;
  readonly highlight: (text: string) => string;
}

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const HIGHLIGHT_WIDTH = 2;
const UPDATES_PER_STEP = 3;

/** Returns status text with the selected terminal progress marker. */
export function progressStatusText(message: string, marker: ProgressStatusMarker = "…"): string {
  return `${message.replace(/(?:…|\.+)$/u, "")}${marker}`;
}

/** Paints one width-stable, grapheme-safe frame of the progress-label sweep. */
export function progressStatusFrame(
  message: string,
  phase: number,
  styles: ProgressStatusFrameStyles,
): string {
  const marker = message.endsWith("…") ? "…" : "";
  const label = marker === "" ? message : message.slice(0, -marker.length);
  const graphemes = [...GRAPHEMES.segment(label)].map(segment => segment.segment);
  if (graphemes.length === 0) return paint(marker, styles.muted);

  const step = Math.floor(Math.max(0, phase) / UPDATES_PER_STEP) % (graphemes.length * 2);
  if (step >= graphemes.length) return paint(`${label}${marker}`, styles.muted);

  const before = graphemes.slice(0, step).join("");
  const highlight = graphemes.slice(step, step + HIGHLIGHT_WIDTH).join("");
  const after = `${graphemes.slice(step + HIGHLIGHT_WIDTH).join("")}${marker}`;
  return `${paint(before, styles.muted)}${paint(highlight, styles.highlight)}${paint(after, styles.muted)}`;
}

function paint(text: string, style: (value: string) => string): string {
  return text === "" ? "" : style(text);
}
