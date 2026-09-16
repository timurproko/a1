import type { IntegrationSelection, IntegrationTarget } from "./integration-selection.mjs";
import type { ValidationOwnershipSelection } from "./validation-ownership.mjs";
export interface IntegrationImpactOwner {
  id: string;
  scopes: string[];
  targets: IntegrationTarget[];
  development: boolean;
  entries: string[];
  tests: string[];
  support: string[];
}
export interface IntegrationImpactResult { selection: IntegrationSelection; fallback: string | null }
export function classifyIntegrationImpact(options: { baseId: string; headId: string; changes: { status: string; path: string; oldPath?: string }[]; owners: IntegrationImpactOwner[]; coreSelection: ValidationOwnershipSelection }): IntegrationImpactResult;
export function selectIntegrationImpact(options: { baseId: string; headId: string; changes?: { status: string; path: string; oldPath?: string }[]; owners: IntegrationImpactOwner[]; coreSelection?: ValidationOwnershipSelection; exemption?: "docs-only" | "version-only"; manualNoComparison?: boolean }): IntegrationImpactResult;
export function conservativeIntegrationImpact(options: { base: string; head: string; owners: IntegrationImpactOwner[]; reason?: string }): IntegrationImpactResult;
export function exemptIntegrationImpact(options: { base: string; head: string; owners: IntegrationImpactOwner[]; exemption: "docs-only" | "version-only" }): IntegrationImpactResult;
