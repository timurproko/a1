export interface DevelopmentValidationReadinessInput {
  eventName: string;
  draft?: boolean;
  body?: string;
}

export interface DevelopmentValidationReadinessDecision {
  validate: boolean;
  reason: "non-pull-request" | "draft" | "awaiting-finalization" | "malformed-implementation-metadata" | "finalized-version-3" | "legacy-implementation" | "ready";
  errorCode?: string;
}

export function classifyDevelopmentValidationReadiness(input: DevelopmentValidationReadinessInput): DevelopmentValidationReadinessDecision;
