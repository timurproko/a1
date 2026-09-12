import type { NamingPolicy, NamingSelection } from "./naming-source-policy.mjs";
export interface ProductIdentifierFinding { readonly path: string; readonly line: number; readonly identifier: string; readonly rule: string; readonly message: string }
export interface ProductIdentifierInventory {
  readonly schema: "product-semantic-identifier-inventory-v2";
  readonly internalIdentifiers: readonly ProductIdentifierFinding[];
  readonly externalIdentityIdentifiers: readonly ProductIdentifierFinding[];
  readonly inspectedPaths: readonly string[];
  readonly exclusions: readonly { readonly path: string; readonly reason: string }[];
}
export interface NamingResult extends Omit<ProductIdentifierInventory, "schema"> {
  readonly schema: "internal-naming-result-v1";
  readonly base: string | null;
  readonly head: string;
  readonly mode: NamingSelection["mode"];
  readonly required: boolean;
  readonly selectedPaths: readonly string[];
  readonly reasons: readonly string[];
  readonly passed: boolean;
  readonly durationMs: number;
}
export function inspectProductIdentifiers(repository: string, options?: { readonly revision?: string; readonly paths?: readonly string[] }): Promise<ProductIdentifierInventory>;
export function inspectTypeScript(path: string, source: string, policy?: NamingPolicy): { readonly internal: readonly ProductIdentifierFinding[]; readonly external: readonly ProductIdentifierFinding[] };
export function runNamingValidation(options?: { readonly repository?: string; readonly selection?: unknown }): Promise<NamingResult>;
