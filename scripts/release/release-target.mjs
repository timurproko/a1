import semver from "semver";

export const RELEASE_USAGE = "Usage: npm run release -- <patch|minor|major|x.y.z> [--approve]\nPatch: 0.1.8-dev -> 0.1.8. A target is required. Preparation creates an editable draft GitHub Release; --approve snapshots and publishes it.";
const BUMPS = new Set(["patch", "minor", "major"]);
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/** Distinguishes mutation-free command usage failures from operational release failures. */
export class ReleaseUsageError extends Error {}

/** Accepts one explicit target and an optional explicit draft-approval flag. */
export function parseReleaseArguments(args) {
  if ((args.length !== 1 && args.length !== 2) || typeof args[0] !== "string"
    || (!BUMPS.has(args[0]) && !(STABLE.test(args[0]) && semver.valid(args[0]) === args[0]))
    || (args.length === 2 && args[1] !== "--approve")) {
    throw new ReleaseUsageError(RELEASE_USAGE);
  }
  return Object.freeze({ target: args[0], approve: args[1] === "--approve" });
}

/** Resolves patch promotion from the original semver, retaining minor/major core arithmetic. */
export function resolveReleasePlan(current, args) {
  const { target, approve } = parseReleaseArguments(args);
  const parsed = typeof current === "string" && current.trim() === current && /^(0|[1-9]\d*)\./u.test(current) ? semver.parse(current) : null;
  if (!parsed || parsed.raw !== current) throw new ReleaseUsageError(`Invalid current version: ${String(current)}\n${RELEASE_USAGE}`);
  const core = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  const version = BUMPS.has(target) ? semver.inc(target === "patch" ? current : core, target) : target;
  const next = version && semver.inc(version, "patch");
  if (!version || !next || !STABLE.test(version)) throw new ReleaseUsageError(`Cannot resolve a stable release from ${current}`);
  if (semver.lt(version, core)) throw new ReleaseUsageError(`Stable target ${version} is below the open development version ${current}`);
  return { current, version, opening: `${next}-dev`, approve };
}
