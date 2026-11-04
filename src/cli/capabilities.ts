import { prerelease } from "semver";

/** The Pi comparison launch is a prerelease development instrument, not product. */
export interface CliCapabilities {
  readonly developmentComparison: boolean;
  /** The channel this build was published on; bare `update` stays on it. Absent means stable. */
  readonly runningChannel?: "stable" | "next";
}

export function cliCapabilities(version: string): CliCapabilities {
  const development = isPrereleaseVersion(version);
  return Object.freeze({ developmentComparison: development, runningChannel: development ? "next" : "stable" });
}

export function isPrereleaseVersion(version: string): boolean {
  return (prerelease(version)?.length ?? 0) > 0;
}
