import type { IntegrationOwner } from "./integration-selection.mjs";
export function selectModularEvidenceFiles(entries: { name: string; isFile(): boolean; isDirectory(): boolean }[]): { outcomes: string[]; envelopes: string[] };
export function selectModularOutcomeFiles(entries: { name: string; isFile(): boolean; isDirectory(): boolean }[]): string[];
export function requireModularValidation(options: {
  impact: any;
  owners: (IntegrationOwner & { entries: string[]; tests: string[]; support: string[] })[];
  outcomes: any[];
  envelopes?: any[];
  modularResult: string;
  head: string;
  runId: string;
  runAttempt: number;
}): { mode: string; selectionId: string; selectedOwners: string[]; deferredOwners: string[]; evidenceCount: number; attempts: { job: string; attempt: number; reused: boolean }[]; reused: { job: string; attempt: number }[] };
