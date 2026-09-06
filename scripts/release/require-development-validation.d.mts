export interface DevelopmentValidationResults {
  readonly changesResult?: string;
  readonly docsResult?: string;
  readonly documentationResult?: string;
  readonly validateResult?: string;
  readonly renderingResult?: string;
  readonly containmentResult?: string;
  readonly startupResult?: string;
  readonly docsOnly?: string;
  readonly versionOnly?: string;
  readonly openspecTouched?: string;
  readonly documentationRequired?: string;
  readonly renderingTier?: string;
  readonly selectedHead?: string;
  readonly expectedHead?: string;
}

export function requireDevelopmentValidation(value: DevelopmentValidationResults):
  | { readonly mode: "docs"; readonly openspec: boolean }
  | { readonly mode: "version" }
  | { readonly mode: "code"; readonly renderingTier: string; readonly documentationRequired: boolean };
