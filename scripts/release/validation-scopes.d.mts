export interface ValidationScopeDefinition {
  kind: string;
  includes?: string[];
  consumesPackage?: boolean;
}

export interface ValidationScopeSuites {
  tiers: Record<string, ValidationScopeDefinition>;
  scopes: Record<string, ValidationScopeDefinition>;
}

export function expandValidationScopes(suites: ValidationScopeSuites, requested: readonly string[]): string[];
export function consumesCandidatePackage(suites: ValidationScopeSuites, requested: readonly string[]): boolean;
