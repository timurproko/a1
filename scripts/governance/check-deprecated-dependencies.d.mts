export interface DocumentedDeprecatedException { readonly name: string; readonly version: string; readonly upstream: string; readonly reasonIncludes: string }
export interface DeprecatedDependencyViolation { name: string; version: string; reason: string; source: "lockfile" | "registry"; lockPath: string; dependencyPath: string[] }
/** Deprecated transitive packages accepted on exact versions and paths beneath the exact pinned Pi. */
export const DOCUMENTED_DEPRECATED_EXCEPTIONS: readonly DocumentedDeprecatedException[];
export function inspectDependencies(options: { lockfilePath: string; queryRegistry?: boolean; fetchImplementation?: typeof fetch }): Promise<DeprecatedDependencyViolation[]>;
export function formatViolation(violation: DeprecatedDependencyViolation): string;
