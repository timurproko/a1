import semver from "semver";

import { RELEASE_USAGE, ReleaseUsageError, parseReleaseArguments } from "./release-arguments.mjs";
export { RELEASE_USAGE, ReleaseUsageError, parseReleaseArguments };
const BUMPS = new Set(["patch", "minor", "major"]);
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/** Resolves patch promotion from the original semver, retaining minor/major core arithmetic. */
export function resolveReleasePlan(current, args) {
  const { target } = parseReleaseArguments(args);
  const parsed = typeof current === "string" && current.trim() === current && /^(0|[1-9]\d*)\./u.test(current) ? semver.parse(current) : null;
  if (!parsed || parsed.raw !== current) throw new ReleaseUsageError(`Invalid current version: ${String(current)}\n${RELEASE_USAGE}`);
  const core = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  const version = BUMPS.has(target) ? semver.inc(target === "patch" ? current : core, target) : target;
  const next = version && semver.inc(version, "patch");
  if (!version || !next || !STABLE.test(version)) throw new ReleaseUsageError(`Cannot resolve a stable release from ${current}`);
  if (semver.lt(version, core)) throw new ReleaseUsageError(`Stable target ${version} is below the open development version ${current}`);
  return { current, version, opening: `${next}-dev` };
}
