export const PUBLIC_API_SCHEMA: string;
export const PI_PACKAGE_ENTRIES: readonly { readonly name: string; readonly entry: string }[];

export interface PublicApiExport { readonly name: string; readonly kind: string; readonly hash: string; readonly consumers: readonly string[] }
export interface PublicApiPackage { readonly name: string; readonly version: string; readonly entry: string; readonly exports: readonly PublicApiExport[] }
export interface PublicApiSurface { readonly schema: string; readonly packages: readonly PublicApiPackage[] }
export interface PublicApiDeltaRecord { readonly package: string; readonly name: string; readonly kind: string; readonly consumers: readonly string[] }
export interface PublicApiDelta { readonly added: readonly PublicApiDeltaRecord[]; readonly removed: readonly PublicApiDeltaRecord[]; readonly changed: readonly PublicApiDeltaRecord[] }
export interface CompileFileSummary { readonly path: string; readonly errors: number; readonly codes: readonly string[]; readonly first: string }

export function collectPiPublicApi(options: { packagesRoot: string; sourceRoot: string; packages?: readonly { readonly name: string; readonly entry: string }[] }): Promise<PublicApiSurface>;
export function diffPublicApi(previous: PublicApiSurface, next: PublicApiSurface): PublicApiDelta;
export function publicApiReviewItems(delta: PublicApiDelta): string[];
export function summarizeCompileOutput(output: string | null | undefined): CompileFileSummary[];
