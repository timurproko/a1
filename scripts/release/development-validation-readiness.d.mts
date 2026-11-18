export interface DevelopmentValidationReadinessInput {
  eventName: string;
  draft?: boolean;
  body?: string;
  headSha?: string;
}

export interface DevelopmentValidationReadinessDecision {
  validate: boolean;
  reason: "non-pull-request" | "draft" | "awaiting-finalization" | "malformed-implementation-metadata" | "finalized-version-3" | "ready";
  errorCode?: string;
}

export function classifyDevelopmentValidationReadiness(input: DevelopmentValidationReadinessInput): DevelopmentValidationReadinessDecision;
export function classifyCurrentDevelopmentValidationReadiness(input: {
  eventName: string;
  pull: any;
  expectedNumber: number;
  expectedHead: string;
  expectedBase: string;
}): Promise<DevelopmentValidationReadinessDecision>;

export interface ReleaseReopeningValidationRoute {
  selected: boolean;
  reason: string;
}

export function classifyReleaseReopeningValidationRoute(input: {
  eventName: string;
  pull: any;
  reader: any;
}): Promise<ReleaseReopeningValidationRoute>;
export function classifyCurrentReleaseReopeningValidationRoute(input: {
  eventName: string;
  pull: any;
  reader: any;
  expectedNumber: number;
  expectedHead: string;
  expectedBase: string;
}): Promise<ReleaseReopeningValidationRoute>;
