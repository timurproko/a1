export interface NpmPackMetadata { filename: string; integrity: string; shasum: string; [key: string]: unknown }
/** Accepts one npm 11 array or npm 12 package-keyed result and rejects ambiguity. */
export function normalizeNpmPackMetadata(parsed: unknown): NpmPackMetadata;
/** Parses npm pack stdout and names the first non-JSON line on failure. */
export function parseNpmPackOutput(stdout: string): unknown;
/** The lowest npm major whose pack honours `--ignore-scripts` for the directory's prepare script. */
export const MINIMUM_PACK_NPM_MAJOR: number;
/** Throws when the npm version would rebuild the workspace during pack; returns the major. */
export function assertPackingNpm(version: string): number;
