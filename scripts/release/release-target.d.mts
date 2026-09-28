export const RELEASE_USAGE: string;
export class ReleaseUsageError extends Error {}
export interface ReleasePlan {
  readonly current: string;
  readonly version: string;
  readonly opening: string;
  readonly approve: boolean;
}
export function parseReleaseArguments(args: readonly string[]): { readonly target: string; readonly approve: boolean };
export function resolveReleasePlan(current: unknown, args: readonly string[]): ReleasePlan;
