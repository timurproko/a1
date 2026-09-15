import type { IntegrationOwner } from "./integration-selection.mjs";
export function selectModularOutcomeFiles(entries: { name: string; isFile(): boolean; isDirectory(): boolean }[]): string[];
export function requireModularValidation(options: { impact: any; owners: (IntegrationOwner & { entries: string[]; tests: string[]; support: string[] })[]; outcomes: any[]; modularResult: string; head: string; runId: string; runAttempt: number }): { mode: string; selectionId: string; selectedOwners: string[]; evidenceCount: number };
