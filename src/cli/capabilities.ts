import { prerelease } from "semver";

/**
 * `pi` and `sandbox` exist to compare A1 against pinned Pi and to try resources
 * against an isolated profile. Both are development instruments rather than
 * product, so a stable release does not carry them: what a released `a1` exposes
 * is the product plus its maintenance and package commands.
 *
 * Which build this is comes from its own version. A prerelease version is a
 * `next`-channel build, which is where that work happens; a release version is
 * not. Nothing to configure, and no way for a released build to be talked into it.
 */
export interface CliCapabilities {
  readonly developmentProfiles: boolean;
}

export function cliCapabilities(version: string): CliCapabilities {
  return Object.freeze({ developmentProfiles: isPrereleaseVersion(version) });
}

export function isPrereleaseVersion(version: string): boolean {
  return (prerelease(version)?.length ?? 0) > 0;
}
