export const RELEASE_USAGE = "Usage: npm run release -- <patch|minor|major|x.y.z>\nA target is required. Patch: 0.1.8-dev -> 0.1.8. The command prepares a draft Release, waits for its validation, then shows the draft; choosing Publish release on that draft publishes npm.";

/** Distinguishes mutation-free command usage failures from operational release failures. */
export class ReleaseUsageError extends Error {}

/** Check explicit target syntax before setup; semver arithmetic remains in the release plan owner. */
export function parseReleaseArguments(args) {
  const target = args[0];
  const stable = typeof target === "string" && target.trim() === target && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(target)
    && target.split(".").every(part => Number.isSafeInteger(Number(part)));
  if (args.length !== 1 || !["patch", "minor", "major"].includes(target) && !stable) throw new ReleaseUsageError(RELEASE_USAGE);
  return Object.freeze({ target });
}
