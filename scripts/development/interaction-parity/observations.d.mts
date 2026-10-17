import type { InteractionCase, ObservationKind, ResidentDifference } from "./matrix.mjs";

export type Candidate = "direct" | "resident";

export interface Observation {
  readonly caseId: string;
  readonly candidate: Candidate;
  readonly platform: string;
  readonly kind: ObservationKind;
  readonly seq: number;
  readonly sentAt: number;
  readonly observedAt: number;
  readonly digest: string;
  readonly length: number;
  readonly detail?: Readonly<Record<string, string | number | boolean>>;
}

export type FaultReason = "duplicate" | "stale" | "negative" | "missing" | "completion-only" | "non-normalizable" | "content";

export interface ObservationFault {
  readonly caseId: string;
  readonly candidate?: Candidate;
  readonly kind?: ObservationKind;
  readonly seq?: number;
  readonly reason: FaultReason;
}

export interface Divergence {
  readonly caseId: string;
  readonly kind: ObservationKind;
  readonly seq: number;
  readonly field: string;
  readonly direct: string | number | boolean | null;
  readonly resident: string | number | boolean | null;
}

export interface ParityVerdict {
  readonly platform: string;
  readonly passed: boolean;
  readonly compared: number;
  readonly divergences: readonly Divergence[];
  readonly declared: readonly { readonly caseId: string; readonly difference: ResidentDifference }[];
}

export function digestContent(content: string | Uint8Array): string;
export function normalizeResident(observation: Observation): Observation | null;
export function validateObservations(observations: readonly Observation[], cases: readonly InteractionCase[]): ObservationFault[];
export function compareCandidates(observations: readonly Observation[], cases: readonly InteractionCase[], platform: string): ParityVerdict;
