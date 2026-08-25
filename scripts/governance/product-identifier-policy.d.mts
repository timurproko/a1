export interface ProductIdentifierFinding { readonly path: string; readonly line: number; readonly identifier: string }
export interface ProductIdentifierInventory {
  readonly schema: "product-semantic-identifier-inventory-v1";
  readonly roots: readonly string[];
  readonly internalIdentifiers: readonly ProductIdentifierFinding[];
  readonly externalIdentityIdentifiers: readonly ProductIdentifierFinding[];
}
export function inspectProductIdentifiers(repository: string): Promise<ProductIdentifierInventory>;
export function inspectTypeScript(path: string, source: string): { readonly internal: readonly ProductIdentifierFinding[]; readonly external: readonly ProductIdentifierFinding[] };
