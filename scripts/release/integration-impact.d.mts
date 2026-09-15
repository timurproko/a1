import type { IntegrationDependencyImpact, IntegrationDependencyPolicy } from "./integration-dependency-graph.mjs";
import type { IntegrationSelection, IntegrationTarget } from "./integration-selection.mjs";
import type { RevisionDependencySnapshot } from "./revision-dependencies.mjs";

export interface IntegrationImpactOwner {
  id: string;
  scopes: string[];
  targets: IntegrationTarget[];
  development: boolean;
  entries: string[];
  tests: string[];
  support: string[];
}
export interface IntegrationImpactResult {
  selection: IntegrationSelection;
  dependency: IntegrationDependencyImpact | null;
  fallback: string | null;
}
/** Classifies changed tests/support before graph reachability and fails closed for unknown operational inputs. */
export function classifyIntegrationImpact(options: {
  base: RevisionDependencySnapshot;
  head: RevisionDependencySnapshot;
  changes: { status: string; path: string; oldPath?: string }[];
  owners: IntegrationImpactOwner[];
  basePolicy: IntegrationDependencyPolicy;
  headPolicy?: IntegrationDependencyPolicy;
}): IntegrationImpactResult;
/** Returns exempt, impact, or conservative selection; malformed ownership/commit authority still blocks. */
export function selectIntegrationImpact(options: {
  baseId: string;
  headId: string;
  base?: RevisionDependencySnapshot;
  head?: RevisionDependencySnapshot;
  changes?: { status: string; path: string; oldPath?: string }[];
  owners: IntegrationImpactOwner[];
  basePolicy?: IntegrationDependencyPolicy;
  headPolicy?: IntegrationDependencyPolicy;
  exemption?: "docs-only" | "version-only";
  manualNoComparison?: boolean;
}): IntegrationImpactResult;
/** Produces full development selection after a comparison or classifier failure. */
export function conservativeIntegrationImpact(options: { base: string; head: string; owners: IntegrationImpactOwner[]; reason?: string }): IntegrationImpactResult;
/** Exempt documents still enumerate and explicitly exclude every owner. */
export function exemptIntegrationImpact(options: { base: string; head: string; owners: IntegrationImpactOwner[]; exemption: "docs-only" | "version-only" }): IntegrationImpactResult;
