import semver from "semver";

export const RELEASE_USAGE = "Usage: npm run release -- <patch|minor|major|x.y.z>\nPatch: 0.1.8-dev -> 0.1.8; stable 0.1.8 -> 0.1.9. A target is required.";
const BUMPS = new Set(["patch", "minor", "major"]);
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/** Distinguishes mutation-free command usage failures from operational release failures. */
export class ReleaseUsageError extends Error {}

/** Accepts exactly one explicit bump or canonical stable version; missing arguments never release. */
export function parseReleaseArguments(args) {
  if (args.length !== 1 || typeof args[0] !== "string"
    || (!BUMPS.has(args[0]) && !(STABLE.test(args[0]) && semver.valid(args[0]) === args[0]))) {
    throw new ReleaseUsageError(RELEASE_USAGE);
  }
  return args[0];
}

/** Resolves patch promotion from the original semver, retaining minor/major core arithmetic. */
export function resolveReleasePlan(current, args) {
  const target = parseReleaseArguments(args);
  const parsed = typeof current === "string" && current.trim() === current && /^(0|[1-9]\d*)\./u.test(current) ? semver.parse(current) : null;
  if (!parsed || parsed.raw !== current) throw new ReleaseUsageError(`Invalid current version: ${String(current)}\n${RELEASE_USAGE}`);
  const core = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  const version = BUMPS.has(target) ? semver.inc(target === "patch" ? current : core, target) : target;
  const next = version && semver.inc(version, "patch");
  if (!version || !next || !STABLE.test(version)) throw new ReleaseUsageError(`Cannot resolve a stable release from ${current}`);
  return { current, version, opening: `${next}-dev` };
}
