export const STARTUP_LAZY_IMPORT_MODULES: readonly string[];
export const PINNED_DYNAMIC_IMPORT_HANDLING: Readonly<Record<PinnedDynamicImportHandling, string>>;
export type PinnedDynamicImportHandling = "bare-specifier" | "extension-path" | "inlined" | "pinned-tree";
export interface PinnedDynamicImportEntry {
  readonly path: string;
  readonly handling: PinnedDynamicImportHandling;
}
export function isStartupLazyImportModule(path: string): boolean;
export function rewriteStartupLazyImports(source: string): string;
export function pinnedDynamicImportPath(path: string): string | undefined;
export function hasDynamicImport(source: string): boolean;
export function validatePinnedDynamicImports(observed: ReadonlySet<string>, ledger: readonly PinnedDynamicImportEntry[] | undefined): string[];
