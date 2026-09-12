/** The contract this build emits; supersedes the pre-cutover key set it still accepts. */
export const PRIVATE_LAUNCH_CONTRACT = "neutral-launch-v1";

export const PRIVATE_ENVIRONMENT = Object.freeze({
  releaseRoot: "LAUNCH_CONTEXT_RELEASE_ROOT",
  releaseId: "LAUNCH_CONTEXT_RELEASE_ID",
  releaseDigest: "LAUNCH_CONTEXT_RELEASE_DIGEST",
  releaseLayers: "LAUNCH_CONTEXT_RELEASE_LAYERS",
  launchProfile: "LAUNCH_CONTEXT_PROFILE",
  immutableWarmup: "LAUNCH_CONTEXT_WARMUP",
});

/**
 * Keys published by releases that predate the neutral cutover. They are read when
 * an older launcher hands this build a process, and written when this build
 * starts a release that declares no contract of its own, so an upgrade never
 * depends on both sides having been rebuilt at the same moment.
 */
export const SUPERSEDED_ENVIRONMENT = Object.freeze({
  releaseRoot: "A1_RELEASE_ROOT",
  releaseId: "A1_RELEASE_ID",
  releaseDigest: "A1_RELEASE_DIGEST",
  releaseLayers: "A1_RELEASE_LAYERS",
  launchProfile: "A1_LAUNCH_PROFILE",
  immutableWarmup: "A1_IMMUTABLE_WARMUP",
});

/** A release either declares the current contract or predates contract declaration. */
export type LaunchContractTarget = typeof PRIVATE_LAUNCH_CONTRACT | "superseded";

const PRIVATE_ENTRIES = Object.entries(PRIVATE_ENVIRONMENT);
const SUPERSEDED_ENTRIES = Object.entries(SUPERSEDED_ENVIRONMENT);
const PRIVATE_KEYS = new Set<string>([...Object.values(PRIVATE_ENVIRONMENT), ...Object.values(SUPERSEDED_ENVIRONMENT)]);
const LOGICAL_KEYS = new Map<string, string>(PRIVATE_ENTRIES.map(([logical, key]) => [key, logical]));
const SUPERSEDED_LOGICAL_KEYS = new Map<string, string>(SUPERSEDED_ENTRIES.map(([logical, key]) => [key, logical]));

export interface LaunchContext {
  readonly releaseRoot?: string;
  readonly releaseId?: string;
  readonly releaseDigest?: string;
  readonly releaseLayers?: string;
  readonly launchProfile?: "a1" | "pi";
  readonly immutableWarmup?: "1";
}

export type LaunchContextRequirement = "optional" | "profile" | "release" | "warmup";

/** Read current keys, fall back to superseded keys per field, with bounded diagnostics. */
export function readLaunchContext(
  environment: NodeJS.ProcessEnv,
  requirement: LaunchContextRequirement = "optional",
  platform: NodeJS.Platform = process.platform,
): LaunchContext {
  const values: Record<string, string> = {};
  const superseded: Record<string, string> = {};
  // Performance: enumerate names only for Windows casing; never fetch unrelated environment values.
  if (platform === "win32") {
    for (const name of Object.keys(environment)) {
      const upper = name.toUpperCase();
      const logical = LOGICAL_KEYS.get(upper);
      if (logical !== undefined) acceptValue(values, logical, environment[name]);
      const supersededLogical = SUPERSEDED_LOGICAL_KEYS.get(upper);
      if (supersededLogical !== undefined) acceptValue(superseded, supersededLogical, environment[name]);
    }
  } else {
    for (const [logical, key] of PRIVATE_ENTRIES) {
      if (Object.prototype.propertyIsEnumerable.call(environment, key)) acceptValue(values, logical, environment[key]);
    }
    for (const [logical, key] of SUPERSEDED_ENTRIES) {
      if (Object.prototype.propertyIsEnumerable.call(environment, key)) acceptValue(superseded, logical, environment[key]);
    }
  }
  // Compatibility: the current key wins wherever both are present, so a launcher that
  // emits this contract is never overruled by an inherited pre-cutover value.
  for (const [logical, value] of Object.entries(superseded)) if (values[logical] === undefined) values[logical] = value;
  if (values.launchProfile !== undefined && values.launchProfile !== "a1" && values.launchProfile !== "pi") {
    throw invalidContext("launchProfile", "unsupported profile");
  }
  if (values.immutableWarmup !== undefined && values.immutableWarmup !== "1") throw invalidContext("immutableWarmup", "invalid permission flag");
  if (values.releaseDigest !== undefined && !/^[a-f0-9]{64}$/.test(values.releaseDigest)) throw invalidContext("releaseDigest", "invalid digest");
  if (requirement === "profile") requireFields(values, ["launchProfile"]);
  if (requirement === "release" || requirement === "warmup") {
    requireFields(values, ["releaseRoot", "releaseId", "releaseDigest"]);
    // Compatibility: Windows drops an empty value from a child environment block, so a
    // release with no dependency layer arrives without the key it was given. The
    // layer list is metadata of the release being started, never authority, and an
    // absent list means the same thing the empty string does.
    if (values.releaseLayers === undefined) values.releaseLayers = "";
  }
  if (requirement === "warmup") requireFields(values, ["immutableWarmup"]);
  return Object.freeze(values) as LaunchContext;
}

/** The key set a process started for this release must receive. */
export function launchEnvironmentKeys(contract: LaunchContractTarget): Readonly<Record<string, string>> {
  return contract === PRIVATE_LAUNCH_CONTRACT ? PRIVATE_ENVIRONMENT : SUPERSEDED_ENVIRONMENT;
}

/** Classify metadata by the contract it declares rather than rejecting what it omits. */
export function launchContractTarget(value: { readonly launchContract?: unknown }): LaunchContractTarget {
  return value.launchContract === PRIVATE_LAUNCH_CONTRACT ? PRIVATE_LAUNCH_CONTRACT : "superseded";
}

/** Whether metadata was produced by a build that declares this contract. */
export function isCurrentLaunchContract(value: { readonly launchContract?: unknown }): boolean {
  return value.launchContract === PRIVATE_LAUNCH_CONTRACT;
}

/**
 * Rebuild owned context without inheriting a prior session's private selection. The
 * contract selects which key set is written, so this build can start either its
 * own releases or a retained pre-cutover release it must keep serving.
 */
export function withLaunchContext(
  environment: NodeJS.ProcessEnv,
  context: LaunchContext,
  platform: NodeJS.Platform = process.platform,
  contract: LaunchContractTarget = PRIVATE_LAUNCH_CONTRACT,
): NodeJS.ProcessEnv {
  const result = withoutLaunchContext(environment, platform);
  for (const [logical, key] of Object.entries(launchEnvironmentKeys(contract))) {
    const value = context[logical as keyof LaunchContext];
    if (value !== undefined) result[key] = value;
  }
  readLaunchContext(result, "optional", platform);
  return result;
}

/** Remove both key sets, leaving user and integration settings intact. */
export function withoutLaunchContext(environment: NodeJS.ProcessEnv, platform: NodeJS.Platform = process.platform): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(environment).filter(([key]) => !PRIVATE_KEYS.has(platform === "win32" ? key.toUpperCase() : key)));
}

/** Require this build's own contract where nothing older can be accepted, such as recovery capsules. */
export function assertCurrentLaunchContract(value: { readonly launchContract?: unknown }): void {
  if (value.launchContract !== PRIVATE_LAUNCH_CONTRACT) {
    throw new Error("Unsupported private launch contract. Stop existing processes and install the current package directly with npm; review disposable runtime/release state before any manual reset. User settings, sessions, and history must be preserved.");
  }
}

function acceptValue(values: Record<string, string>, logical: string, value: string | undefined): void {
  if (value === undefined) return;
  if (values[logical] !== undefined && values[logical] !== value) throw invalidContext(logical, "conflicting environment key casing");
  if (typeof value !== "string" || value.includes("\0") || (value.length === 0 && logical !== "releaseLayers")) throw invalidContext(logical, "invalid value");
  values[logical] = value;
}

function requireFields(values: Record<string, string>, fields: readonly string[]): void {
  for (const field of fields) if (values[field] === undefined) throw invalidContext(field, "required current-contract field is missing");
}

function invalidContext(logical: string, reason: string): Error {
  return new Error(`Invalid private launch context (${logical}): ${reason}`);
}
