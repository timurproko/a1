export interface ParityStyleRun {
  start: number;
  end: number;
  text: string;
  foreground: string;
  background: string;
  flags: readonly string[];
}

export interface ParityCheckpoint {
  name: string;
  domains: string[];
  dimensions: { columns: number; rows: number };
  cursor: { x: number; y: number };
  scroll: { viewportY: number; baseY: number; length: number };
  modes: Record<string, unknown>;
  rows: Array<{ text: string; rawText: string; wrapped: boolean; styles: ParityStyleRun[] }>;
  rawSgr: string[];
  geometry: Array<{ start: number; end: number }>;
  frameHash: string;
}

export interface ParityProducerCapture {
  producer: string;
  geometry: { columns: number; rows: number };
  capabilities: Record<string, unknown>;
  checkpoints: ParityCheckpoint[];
  exit: { code: number | null; signal: number | null };
  restoration: Record<string, boolean>;
  raw: { sha256: string; bytes: number; truncated: boolean; excerpt: string };
}

export interface ParityDifference {
  checkpoint: string;
  domain: string;
  path: string;
  expected: string;
  actual: string;
}

export interface ParityComparison {
  schemaVersion: number;
  passed: boolean;
  differenceCount: number;
  differences: readonly ParityDifference[];
  truncated: boolean;
  comparedCheckpointNames: readonly string[];
  tolerances: readonly string[];
}

export const MAX_REPORTED_DIFFERENCES: number;
export const MAX_EXCERPT_CHARACTERS: number;
export function compareParityRun(upstream: ParityProducerCapture, addone: ParityProducerCapture, options?: { tolerances?: readonly string[] }): ParityComparison;
export function applyIntentionalMutation(producer: ParityProducerCapture, mutation: "visual" | "input-scroll"): ParityProducerCapture;
export function renderSideBySideDiff(comparison: ParityComparison, upstream: ParityProducerCapture, addone: ParityProducerCapture): string;
