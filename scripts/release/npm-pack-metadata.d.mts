export interface NpmPackMetadata { filename: string; integrity: string; shasum: string; [key: string]: unknown }
/** Accepts one npm 11 array or npm 12 package-keyed result and rejects ambiguity. */
export function normalizeNpmPackMetadata(parsed: unknown): NpmPackMetadata;
/** Parses npm pack stdout and names the first non-JSON line on failure. */
export function parseNpmPackOutput(stdout: string): unknown;
