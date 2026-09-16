export type IntegrationExemption = "docs-only" | "version-only";
export interface IntegrationTarget {
  platform: "win32" | "linux" | "darwin";
  architecture: "x64" | "arm64";
  node: 22 | 24;
}
export type IntegrationCadence = "pull-request" | "exhaustive";
export interface IntegrationOwner {
  id: string;
  cadence: IntegrationCadence;
  scopes: string[];
  targets: IntegrationTarget[];
}
export interface IntegrationOwnership {
  schema: "a1-integration-ownership-v2";
  owners: IntegrationOwner[];
}
export interface IntegrationReason {
  code: "coarse-owner" | "changed-test" | "shared-support" | "invalidator" | "conservative-fallback"
    | "unrelated" | "exhaustive-cadence" | IntegrationExemption;
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
  schema: "a1-integration-selection-v2";
  base: string;
  head: string;
  ownershipId: string;
  selectionId: string;
  mode: "impact" | "conservative" | "exempt";
  exemption: IntegrationExemption | null;
  owners: (IntegrationDecision & { cadence: IntegrationCadence; scopes: string[]; targets: IntegrationTarget[] })[];
}
/** Build a complete contract; this does not authorize workflow skips by itself. */
export function createIntegrationSelection(options: IntegrationAuthority & {
  mode?: IntegrationSelection["mode"];
  decisions?: IntegrationDecision[];
}): IntegrationSelection;
/** Validate shape and identity against separately established checkout authority. */
export function assertIntegrationSelection(value: unknown, authority: IntegrationAuthority): IntegrationSelection;
