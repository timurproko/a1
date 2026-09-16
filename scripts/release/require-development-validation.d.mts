export interface DevelopmentValidationResults {
  readonly acceptanceOnly?: string | undefined;
  readonly acceptancePhase?: string;
  readonly acceptanceCandidate?: string;
  readonly deliveryCandidate?: string;
  readonly acceptanceResult?: string;
  readonly changesResult?: string;
  readonly docsResult?: string;
  readonly namingResult?: string;
  readonly namingRequired?: string | undefined;
  readonly namingHead?: string;
  readonly documentationResult?: string;
  readonly modularResult?: string;
  readonly renderingResult?: string;
  readonly docsOnly?: string;
  readonly versionOnly?: string;
  readonly openspecTouched?: string;
  readonly documentationRequired?: string;
  readonly renderingTier?: string;
  readonly selectedHead?: string;
  readonly expectedHead?: string;
}

export interface PriorImplementationValidationOptions {
  readonly repository: string;
  readonly pullNumber: number;
  readonly head: string;
  readonly currentRunId: number;
  readonly request(path: string): Promise<unknown>;
}

export interface PriorImplementationValidation {
  readonly runId: number;
  readonly attempt: number;
  readonly jobId: number;
  readonly head: string;
}

export function requireDevelopmentValidation(value: DevelopmentValidationResults):
  | { readonly mode: "acceptance" }
  | { readonly mode: "delivery-acceptance" }
  | { readonly mode: "docs"; readonly openspec: boolean }
  | { readonly mode: "version" }
  | { readonly mode: "code"; readonly renderingTier: string; readonly documentationRequired: boolean };

export function requirePriorImplementationValidation(value: PriorImplementationValidationOptions): Promise<PriorImplementationValidation>;
