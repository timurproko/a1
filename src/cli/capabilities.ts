import { prerelease } from "semver";

/** The Pi comparison launch is a prerelease development instrument, not product. */
export interface CliCapabilities {
  readonly developmentComparison: boolean;
}

export function cliCapabilities(version: string): CliCapabilities {
  return Object.freeze({ developmentComparison: isPrereleaseVersion(version) });
}

export function isPrereleaseVersion(version: string): boolean {
  return (prerelease(version)?.length ?? 0) > 0;
}
