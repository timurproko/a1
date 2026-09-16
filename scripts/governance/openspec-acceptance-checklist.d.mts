import type { AcceptanceRecord } from "./openspec-acceptance-policy.mjs";
export const MIN_ACCEPTANCE_CHECKS: number;
export const MAX_ACCEPTANCE_CHECKS: number;
export const PHASE_FREE_VERSION3_BODY_POLICY: true;
export function assertAcceptanceScenarios(values: unknown): string[];
export function parseImplementationAcceptanceChecks(body: string): string[];
export function parseImplementationAcceptanceScenarios(body: string, version: number,
  options?: { allowLegacyVersion3Phase?: boolean }): string[];
export function acceptanceChecklistDigest(checks: string[]): string;
export function acceptancePullTitle(record: AcceptanceRecord, sourceTitle?: string): string;
export function acceptancePullBody(record: AcceptanceRecord, sourceTitle?: string): string;
export function verifyAcceptancePullBody(record: AcceptanceRecord, sourceTitle: string | undefined, actualBody: string,
  options?: { requireComplete?: boolean }): { complete: boolean; checks: string[]; bodyDigest: string };
