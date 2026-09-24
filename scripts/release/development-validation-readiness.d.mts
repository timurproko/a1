export interface DevelopmentValidationReadinessInput {
  eventName: string;
  draft?: boolean;
  body?: string;
}

export interface DevelopmentValidationReadinessDecision {
  validate: boolean;
  reason: "non-pull-request" | "draft" | "awaiting-finalization" | "malformed-implementation-metadata" | "finalized-version-3" | "legacy-implementation" | "ready" | "stale-pull-request-event" | "pull-metadata-unavailable";
  errorCode?: string;
}

export interface DevelopmentValidationReadinessResolutionInput {
  eventName: string;
  eventHead?: string;
  repository?: string;
  pullNumber?: number;
  token?: string;
}

export interface DevelopmentValidationReadinessPull {
  number: number;
  state: string;
  draft: boolean;
  body: string | null;
  head: { sha: string };
  base: { ref: string };
}

export type DevelopmentValidationReadinessReader = (
  repository: string,
  pullNumber: number,
  token: string,
) => Promise<DevelopmentValidationReadinessPull>;

export function classifyDevelopmentValidationReadiness(input: DevelopmentValidationReadinessInput): DevelopmentValidationReadinessDecision;
export function resolveDevelopmentValidationReadiness(
  input: DevelopmentValidationReadinessResolutionInput,
  reader?: DevelopmentValidationReadinessReader,
): Promise<DevelopmentValidationReadinessDecision>;
