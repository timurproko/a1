import type { InteractionCase, InteractionStep } from "./interaction-parity/matrix.mjs";
import type { Candidate, Divergence, Observation, ObservationFault, ResidentDifference } from "./interaction-parity/observations.mjs";

export const PARITY_REPORT_SCHEMA: "a1-interaction-parity-v1";
export function stepBytes(step: InteractionStep): Buffer | null;
export function recordsFromOutput(output: string): { seq: number; hex: string }[];
export function buildObservations(caseId: string, candidate: Candidate, platform: string, records: readonly { seq: number; hex: string }[], sentAt: number, observedAt: number): Observation[];
export function parityReport(
  platform: string,
  observations: readonly Observation[],
  cases: readonly InteractionCase[],
  faults: readonly ObservationFault[],
  failures?: readonly { caseId: string; candidate: Candidate; reason: string }[],
): {
  schema: "a1-interaction-parity-v1";
  platform: string;
  cases: string[];
  compared: number;
  passed: boolean;
  divergences: readonly Divergence[];
  declared: readonly { caseId: string; difference: ResidentDifference }[];
  faults: readonly ObservationFault[];
  failures: readonly { caseId: string; candidate: Candidate; reason: string }[];
  observations: Observation[];
};
