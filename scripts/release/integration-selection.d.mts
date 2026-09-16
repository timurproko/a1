export type IntegrationExemption = "docs-only" | "version-only";
export interface IntegrationTarget {
  platform: "win32" | "linux" | "darwin";
  architecture: "x64" | "arm64";
  node: 22 | 24;
}
export interface IntegrationOwner {
  id: string;
  scopes: string[];
  targets: IntegrationTarget[];
  development: boolean;
}
export interface IntegrationOwnership {
  schema: "a1-integration-ownership-v1";
  owners: IntegrationOwner[];
}
export interface IntegrationReason {
  code: "coarse-owner" | "changed-test" | "shared-support" | "invalidator" | "conservative-fallback"
    | "unrelated" | "not-development" | IntegrationExemption;
  paths: string[];
}
export interface IntegrationDecision {
  owner: string;
  selected: boolean;
  reasons: IntegrationReason[];
}
export interface IntegrationAuthority {
  base: string;
  head: string;
  ownership: IntegrationOwnership;
  exemption?: IntegrationExemption | null;
}
export interface IntegrationSelection {
  schema: "a1-integration-selection-v1";
  base: string;
  head: string;
  ownershipId: string;
  selectionId: string;
  mode: "impact" | "conservative" | "exempt";
  exemption: IntegrationExemption | null;
  owners: (IntegrationDecision & { scopes: string[]; targets: IntegrationTarget[] })[];
}
/** Build a complete contract; this does not authorize workflow skips by itself. */
export function createIntegrationSelection(options: IntegrationAuthority & {
  mode?: IntegrationSelection["mode"];
  decisions?: IntegrationDecision[];
}): IntegrationSelection;
/** Validate shape and identity against separately established checkout authority. */
export function assertIntegrationSelection(value: unknown, authority: IntegrationAuthority): IntegrationSelection;
