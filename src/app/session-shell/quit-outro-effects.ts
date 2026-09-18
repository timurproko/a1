/**
 * Deterministic quit-outro effect plans, ported from the v2 sketch.
 *
 * Each effect turns the captured frame's per-row visible widths and a seed into
 * two sorted schedules over unit playback progress: sparkles paint a glyph at a
 * cell from `start`, and clears blank a cell at `end`. The player consumes both
 * in order, so a fixed seed yields a byte-stable animation.
 */

export interface QuitOutroCell {
  readonly row: number;
  readonly col: number;
  /** Progress at which the sparkle glyph is painted. */
  readonly start: number;
  /** Progress at which the cell is cleared. */
  readonly end: number;
  readonly glyph: string;
  readonly color: string;
}

export interface QuitOutroPlan {
  /** Sorted by `start`. */
  readonly sparkles: readonly QuitOutroCell[];
  /** Sorted by `end`. */
  readonly clears: readonly QuitOutroCell[];
}

export const QUIT_OUTRO_EFFECTS = Object.freeze(["fall", "dissolve", "starburst", "waves"] as const);
export type QuitOutroEffect = (typeof QUIT_OUTRO_EFFECTS)[number];

export function isQuitOutroEffect(value: unknown): value is QuitOutroEffect {
  return typeof value === "string" && (QUIT_OUTRO_EFFECTS as readonly string[]).includes(value);
}

const WHITE = "\x1b[38;2;238;238;238m";
const DUST_GLYPHS = [".", "·", "'", ":", "+", "°"] as const;
const FALL_GLYPHS = [".", ".", "·", "'", ":", "°"] as const;
const GRAVITY = 85;

type Random = () => number;

interface MutableCell {
  row: number;
  col: number;
  start: number;
  end: number;
  glyph: string;
  color: string;
}

function mulberry32(seed: number): Random {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pick<T>(random: Random, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)]!;
}

function rowWidth(rowWidths: readonly number[], row: number): number {
  return Math.max(0, Math.floor(rowWidths[row] ?? 0));
}

function finish(sparkles: MutableCell[], clears: MutableCell[]): QuitOutroPlan {
  sparkles.sort((a, b) => a.start - b.start);
  clears.sort((a, b) => a.end - b.end);
  return { sparkles, clears };
}

/** Calm white ASCII dust dissolve. */
function dissolvePlan(rowWidths: readonly number[], seed: number): QuitOutroPlan {
  const random = mulberry32(seed);
  const height = Math.max(1, rowWidths.length);
  const width = Math.max(1, ...rowWidths);
  const sparkles: MutableCell[] = [];
  const clears: MutableCell[] = [];
  for (let row = 0; row < rowWidths.length; row++) {
    for (let col = 0; col < rowWidth(rowWidths, row); col++) {
      const sweep = (row / height) * 0.14 + (col / width) * 0.08;
      const start = Math.min(0.76, sweep + random() * 0.54);
      const cell: MutableCell = {
        row, col, start,
        end: Math.min(0.96, start + 0.1 + random() * 0.1),
        glyph: pick(random, DUST_GLYPHS),
        color: WHITE,
      };
      clears.push(cell);
      if (random() < 0.34) sparkles.push(cell);
    }
  }
  return finish(sparkles, clears);
}

/** Soft white harmonic ripple dissolve. */
function starburstPlan(rowWidths: readonly number[], seed: number): QuitOutroPlan {
  const random = mulberry32(seed);
  const height = Math.max(1, rowWidths.length);
  const width = Math.max(1, ...rowWidths);
  const center = (width - 1) / 2;
  const sparkles: MutableCell[] = [];
  const clears: MutableCell[] = [];
  for (let row = 0; row < rowWidths.length; row++) {
    for (let col = 0; col < rowWidth(rowWidths, row); col++) {
      const distance = Math.abs(col - center) / Math.max(1, width / 2);
      const ripple = (Math.sin(distance * Math.PI * 3 + (row / height) * Math.PI) + 1) * 0.035;
      const sweep = distance * 0.2 + (row / height) * 0.1 + ripple;
      const start = Math.min(0.79, sweep + random() * 0.34);
      const cell: MutableCell = {
        row, col, start,
        end: Math.min(0.97, start + 0.12 + random() * 0.1),
        glyph: pick(random, DUST_GLYPHS),
        color: WHITE,
      };
      clears.push(cell);
      if (random() < 0.38) sparkles.push(cell);
    }
  }
  return finish(sparkles, clears);
}

/** White dotted fragments accelerating downward and collecting in a floor pile. */
function fallPlan(rowWidths: readonly number[], seed: number): QuitOutroPlan {
  const random = mulberry32(seed);
  const height = Math.max(1, rowWidths.length);
  const width = Math.max(1, ...rowWidths);
  const floor = height - 1;
  const area = Math.max(1, width * height);
  const fragmentChance = clamp(150 / area, 0.1, 0.24);
  interface Particle { row: number; col: number; release: number; glyph: string; velocityCol: number }
  const particles: Particle[] = [];
  const sparkles: MutableCell[] = [];
  const clears: MutableCell[] = [];
  let fallbackParticle: Particle | undefined;

  for (let row = 0; row < rowWidths.length; row++) {
    for (let col = 0; col < rowWidth(rowWidths, row); col++) {
      const release = 0.025 + random() * 0.13 + (1 - row / height) * 0.035;
      const glyph = pick(random, FALL_GLYPHS);
      clears.push({ row, col, start: release, end: release + 0.04, glyph, color: WHITE });
      if (row >= floor) continue;
      const particle: Particle = { row, col, release, glyph, velocityCol: (random() - 0.5) * 9 };
      fallbackParticle ??= particle;
      if (random() < fragmentChance) particles.push(particle);
    }
  }
  if (particles.length === 0 && fallbackParticle) particles.push(fallbackParticle);

  const arrival = (particle: Particle) => particle.release + Math.sqrt((2 * (floor - particle.row)) / GRAVITY);
  particles.sort((a, b) => arrival(a) - arrival(b));

  const pileHeights: number[] = Array<number>(width).fill(0);
  for (const particle of particles) {
    const floorFallTime = Math.max(0.05, Math.sqrt((2 * (floor - particle.row)) / GRAVITY));
    const predictedCol = clamp(Math.round(particle.col + particle.velocityCol * floorFallTime), 0, width - 1);
    let landingCol = predictedCol;
    for (let radius = 1; radius <= 3; radius++) {
      for (const candidate of [predictedCol - radius, predictedCol + radius]) {
        if (candidate >= 0 && candidate < width && pileHeights[candidate]! < pileHeights[landingCol]!) landingCol = candidate;
      }
    }
    const stackHeight = pileHeights[landingCol]!++;
    const restingRow = clamp(floor - stackHeight, particle.row + 1, floor);
    const fallDistance = Math.max(1, restingRow - particle.row);
    const fallTime = Math.sqrt((2 * fallDistance) / GRAVITY);
    const velocityCol = (landingCol - particle.col) / fallTime;
    const steps = Math.max(4, Math.min(14, Math.ceil(fallTime / 0.045)));
    const interval = fallTime / steps;

    for (let step = 1; step < steps; step++) {
      const elapsed = step * interval;
      const progress = step / steps;
      const row = particle.row + 0.5 * GRAVITY * elapsed * elapsed;
      const col = particle.col + velocityCol * elapsed + Math.sin(progress * Math.PI) * 0.3;
      const start = clamp(particle.release + elapsed, 0, 0.93);
      const cell: MutableCell = {
        row: clamp(Math.round(row), 0, floor),
        col: clamp(Math.round(col), 0, width - 1),
        start,
        end: Math.min(0.96, start + Math.max(0.025, interval * 0.72)),
        glyph: particle.glyph,
        color: WHITE,
      };
      sparkles.push(cell);
      clears.push(cell);
    }

    const settledAt = clamp(particle.release + fallTime, 0, 0.93);
    const settled: MutableCell = { row: restingRow, col: landingCol, start: settledAt, end: 0.97, glyph: particle.glyph, color: WHITE };
    sparkles.push(settled);
    clears.push(settled);
  }
  return finish(sparkles, clears);
}

/** Soft white dotted radio pulses expanding from a gently moving center. */
function wavesPlan(rowWidths: readonly number[], seed: number): QuitOutroPlan {
  const random = mulberry32(seed);
  const height = Math.max(1, rowWidths.length);
  const width = Math.max(1, ...rowWidths);
  const baseCenterCol = (width - 1) / 2;
  const baseCenterRow = (height - 1) / 2;
  const sparkles: MutableCell[] = [];
  const clears: MutableCell[] = [];

  const addPulseCell = (row: number, col: number, start: number, lifetime: number, glyph: string) => {
    const safeStart = clamp(start, 0, 0.94);
    const cell: MutableCell = {
      row: clamp(Math.round(row), 0, height - 1),
      col: clamp(Math.round(col), 0, width - 1),
      start: safeStart,
      end: clamp(safeStart + lifetime, safeStart + 0.02, 0.98),
      glyph,
      color: WHITE,
    };
    sparkles.push(cell);
    clears.push(cell);
  };

  // Rationale: clear the frame in the same outward direction as the expanding signal.
  for (let row = 0; row < rowWidths.length; row++) {
    for (let col = 0; col < rowWidth(rowWidths, row); col++) {
      const x = (col - baseCenterCol) / Math.max(1, width * 0.5);
      const y = (row - baseCenterRow) / Math.max(1, height * 0.5);
      const distance = Math.min(1.25, Math.sqrt(x * x + y * y));
      const start = 0.04 + random() * 0.1;
      const cell: MutableCell = {
        row, col, start,
        end: Math.min(0.95, 0.18 + distance * 0.54 + random() * 0.12),
        glyph: pick(random, DUST_GLYPHS),
        color: WHITE,
      };
      clears.push(cell);
      if (random() < 0.055) sparkles.push(cell);
    }
  }

  const pulseCount = 4;
  const expansionSteps = 9;
  for (let pulse = 0; pulse < pulseCount; pulse++) {
    const pulseStart = 0.025 + pulse * 0.135;
    const phase = pulse * 1.47 + random() * 0.45;
    for (let step = 0; step <= expansionSteps; step++) {
      const progress = step / expansionSteps;
      const centerCol = baseCenterCol + Math.sin(phase + progress * Math.PI) * width * 0.035;
      const centerRow = baseCenterRow + Math.cos(phase + progress * Math.PI * 0.8) * height * 0.065;
      const radiusCol = progress * width * 0.56;
      const radiusRow = progress * height * 0.56;
      const samples = Math.max(10, Math.min(58, Math.round(12 + radiusCol * 0.48)));
      const time = pulseStart + progress * 0.28;
      if (step === 0) {
        addPulseCell(centerRow, centerCol, time, 0.1, pulse % 2 === 0 ? "+" : "°");
        continue;
      }
      for (let sample = 0; sample < samples; sample++) {
        if (random() < 0.08 + progress * 0.06) continue;
        const angle = (sample / samples) * Math.PI * 2 + Math.sin(phase) * 0.035;
        const shimmer = (random() - 0.5) * (0.25 + progress * 0.55);
        const row = centerRow + Math.sin(angle) * radiusRow + shimmer * 0.4;
        const col = centerCol + Math.cos(angle) * radiusCol + shimmer;
        const glyph = progress < 0.28 ? "°" : progress < 0.62 ? "·" : random() < 0.72 ? "." : "'";
        addPulseCell(row, col, time + random() * 0.018, 0.065 + (1 - progress) * 0.055, glyph);
      }
    }
  }
  return finish(sparkles, clears);
}

const PLANS: Readonly<Record<QuitOutroEffect, (rowWidths: readonly number[], seed: number) => QuitOutroPlan>> = Object.freeze({
  fall: fallPlan,
  dissolve: dissolvePlan,
  starburst: starburstPlan,
  waves: wavesPlan,
});

/** Builds the selected effect's deterministic plan for the captured row widths. */
export function createQuitOutroPlan(effect: QuitOutroEffect, rowWidths: readonly number[], seed: number): QuitOutroPlan {
  return PLANS[effect](rowWidths, seed);
}
