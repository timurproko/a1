export const STARTUP_LAZY_IMPORT_MODULES: readonly string[];
export function isStartupLazyImportModule(path: string): boolean;
export function rewriteStartupLazyImports(source: string): string;
