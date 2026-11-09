const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export interface SessionNameFrameOptions {
  readonly from: string;
  readonly to: string;
  readonly elapsed: number;
  readonly width: number;
  readonly truecolor: boolean;
  readonly measure: (text: string) => number;
  readonly clip: (text: string, width: number) => string;
  /** Tonal brightness and blend-to-settled progress; the adapter supplies actual theme colors. */
  readonly paint: (text: string, brightness: number, settled: number) => string;
  readonly dim: (text: string) => string;
}

/** Deterministic, width-stable secondary-accent shimmer/reveal/settle frame. */
export function sessionNameFrame(options: SessionNameFrameOptions): { readonly text: string; readonly done: boolean } {
  const { measure, clip, paint, dim } = options;
  const from = clip(options.from, Math.max(0, options.width));
  const to = clip(options.to, Math.max(0, options.width));
  const old = [...GRAPHEMES.segment(from)].map(value => value.segment);
  const next = [...GRAPHEMES.segment(to)].map(value => value.segment);
  const stable = Math.max(measure(from), measure(to));
  const typing = next.length * 45;
  const shimmer = options.truecolor ? 600 : 0;
  const settle = options.truecolor ? 300 : 0;
  if (!to || options.elapsed >= shimmer + typing + settle) return { text: dim(to), done: true };
  const revealTime = Math.max(0, options.elapsed - shimmer);
  const cells = options.elapsed < shimmer ? old : next.slice(0, Math.min(next.length, Math.floor(revealTime / 45) + 1));
  const text = cells.join("");
  const padded = [...cells, ...Array.from({ length: Math.max(0, stable - measure(text)) }, () => " ")];
  if (!options.truecolor) return { text: dim(padded.join("")), done: false };
  const offset = options.elapsed < shimmer ? options.elapsed / 170 : 0;
  const blend = Math.max(0, Math.min(1, (revealTime - typing) / 300));
  return { text: padded.map((cell, index) => paint(cell, 0.18 + (Math.cos(index * 0.7 - offset) + 1) * 0.16, blend)).join(""), done: false };
}
