export interface ValidationOwnershipDecision { owner: string; selected: boolean; reasons: { code: string; paths: string[] }[]; integrationOwners: string[] }
export interface ValidationOwnershipSelection {
  schema: "a1-pr-core-selection-v1";
  mode: "impact" | "conservative" | "exempt";
  exemption: "docs-only" | "version-only" | null;
  policyId: string;
  mandatoryTests: string[];
  tests: string[];
  resourceTests: string[];
  owners: ValidationOwnershipDecision[];
  integrationOwners: string[];
  invalidators: string[];
  unknown: string[];
}
export function loadValidationOwnership(repository?: string): Promise<any>;
export function selectValidationOwnership(options: { authority: any; changes: { status: string; path: string; oldPath?: string }[]; manualNoComparison?: boolean; exemption?: "docs-only" | "version-only" | null }): ValidationOwnershipSelection;
export function assertValidationOwnershipSelection(value: unknown, authority: any): ValidationOwnershipSelection;
export function validationSelectionDigest(value: unknown): string;
