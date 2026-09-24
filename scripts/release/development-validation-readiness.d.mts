export interface DevelopmentValidationReadinessInput {
  eventName: string;
  draft?: boolean;
  body?: string;
}

export interface DevelopmentValidationReadinessDecision {
  validate: boolean;
  reason: "non-pull-request" | "draft" | "awaiting-finalization" | "malformed-implementation-metadata" | "missing-implementation-association" | "finalized-version-3" | "legacy-implementation" | "ready";
  errorCode?: string;
  changes?: readonly string[];
}

export function classifyDevelopmentValidationReadiness(input: DevelopmentValidationReadinessInput): DevelopmentValidationReadinessDecision;
export function classifyDevelopmentValidationReadinessFromRepository(input: {
  eventName: string;
  pull: any;
  reader: any;
}): Promise<DevelopmentValidationReadinessDecision>;
export function classifyCurrentDevelopmentValidationReadiness(input: {
  eventName: string;
  pull: any;
  reader: any;
  expectedNumber: number;
  expectedHead: string;
  expectedBase: string;
}): Promise<DevelopmentValidationReadinessDecision>;
