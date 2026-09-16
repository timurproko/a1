export function configurePinnedPiPublicPackageEntry(entryUrl: string): { readonly root: string; readonly version: string };
export function pinnedPiModuleUrl(relativeModule: string): string;
export function resolvePinnedPiImport(specifier: string): string;
