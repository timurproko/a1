import { prerelease } from "semver";

/** The Pi comparison launch is a prerelease development instrument, not product. */
export interface CliCapabilities {
  readonly developmentComparison: boolean;
  readonly sessionColors?: boolean;
  /** Bare `update` stays on this build's channel; absent means stable. */
  readonly runningChannel?: "stable" | "next";
}

export function cliCapabilities(version: string): CliCapabilities {
  const development = isPrereleaseVersion(version);
  return Object.freeze({ developmentComparison: development, sessionColors: true, runningChannel: development ? "next" : "stable" });
}

export function isPrereleaseVersion(version: string): boolean {
  return (prerelease(version)?.length ?? 0) > 0;
}
