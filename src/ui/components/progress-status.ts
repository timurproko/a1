export type ProgressStatusMarker = "…" | "...";

export interface ProgressStatusFrameStyles {
  readonly muted: (text: string) => string;
  readonly accent: (text: string) => string;
}

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const HIGHLIGHT_WIDTH = 2;
const UPDATES_PER_STEP = 3;

/** Returns spinner-backed status text with the selected terminal progress marker. */
export function progressStatusText(message: string, marker: ProgressStatusMarker = "…"): string {
  return `${message.replace(/(?:…|\.+)$/u, "")}${marker}`;
}

/** Paints one width-stable, grapheme-safe frame of the quiet progress-label sweep. */
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
  return `${paint(before, styles.muted)}${paint(highlight, styles.accent)}${paint(after, styles.muted)}`;
}

function paint(text: string, style: (value: string) => string): string {
  return text === "" ? "" : style(text);
}
