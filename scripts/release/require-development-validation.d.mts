export interface DevelopmentValidationResults {
  readonly acceptanceOnly?: string | undefined;
  readonly implementationBound?: string | undefined;
  readonly acceptanceCandidate?: string;
  readonly deliveryCandidate?: string;
  readonly acceptanceResult?: string;
  readonly deliveryResult?: string;
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

export function requireDevelopmentValidation(value: DevelopmentValidationResults):
  | { readonly mode: "acceptance" }
  | { readonly mode: "docs"; readonly openspec: boolean }
  | { readonly mode: "version" }
  | { readonly mode: "code"; readonly renderingTier: string; readonly documentationRequired: boolean };
