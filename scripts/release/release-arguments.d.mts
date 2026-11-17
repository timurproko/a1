export const RELEASE_USAGE: string;
export class ReleaseUsageError extends Error {}
export function parseReleaseArguments(args: readonly string[]): { readonly target: string };
