/** The one supported private process contract; public settings remain product identity data. */
export const PRIVATE_LAUNCH_CONTRACT = "neutral-launch-v1";

export const PRIVATE_ENVIRONMENT = Object.freeze({
  releaseRoot: "LAUNCH_CONTEXT_RELEASE_ROOT",
  releaseId: "LAUNCH_CONTEXT_RELEASE_ID",
  releaseDigest: "LAUNCH_CONTEXT_RELEASE_DIGEST",
  releaseLayers: "LAUNCH_CONTEXT_RELEASE_LAYERS",
  launchProfile: "LAUNCH_CONTEXT_PROFILE",
  immutableWarmup: "LAUNCH_CONTEXT_WARMUP",
});
const PRIVATE_ENTRIES = Object.entries(PRIVATE_ENVIRONMENT);
const PRIVATE_KEYS = new Set<string>(Object.values(PRIVATE_ENVIRONMENT));
const LOGICAL_KEYS = new Map<string, string>(PRIVATE_ENTRIES.map(([logical, key]) => [key, logical]));

export interface LaunchContext {
  readonly releaseRoot?: string;
  readonly releaseId?: string;
  readonly releaseDigest?: string;
  readonly releaseLayers?: string;
  readonly launchProfile?: "a1" | "pi";
  readonly immutableWarmup?: "1";
}

export type LaunchContextRequirement = "optional" | "profile" | "release" | "warmup";

/** Read current private keys only, with entry-specific required fields and bounded diagnostics. */
export function readLaunchContext(
  environment: NodeJS.ProcessEnv,
  requirement: LaunchContextRequirement = "optional",
  platform: NodeJS.Platform = process.platform,
): LaunchContext {
  const values: Record<string, string> = {};
  // Performance: enumerate names only for Windows casing; never fetch unrelated environment values.
  if (platform === "win32") {
    for (const name of Object.keys(environment)) {
      const logical = LOGICAL_KEYS.get(name.toUpperCase());
      if (logical !== undefined) acceptValue(values, logical, environment[name]);
    }
  } else {
    for (const [logical, key] of PRIVATE_ENTRIES) {
      if (Object.prototype.propertyIsEnumerable.call(environment, key)) acceptValue(values, logical, environment[key]);
    }
  }
  if (values.launchProfile !== undefined && values.launchProfile !== "a1" && values.launchProfile !== "pi") {
    throw invalidContext("launchProfile", "unsupported profile");
  }
  if (values.immutableWarmup !== undefined && values.immutableWarmup !== "1") throw invalidContext("immutableWarmup", "invalid permission flag");
  if (values.releaseDigest !== undefined && !/^[a-f0-9]{64}$/.test(values.releaseDigest)) throw invalidContext("releaseDigest", "invalid digest");
  if (requirement === "profile") requireFields(values, ["launchProfile"]);
  if (requirement === "release" || requirement === "warmup") requireFields(values, ["releaseRoot", "releaseId", "releaseDigest", "releaseLayers"]);
  if (requirement === "warmup") requireFields(values, ["immutableWarmup"]);
  return Object.freeze(values) as LaunchContext;
}

/** Rebuild owned context without inheriting a prior session's private selection. */
export function withLaunchContext(
  environment: NodeJS.ProcessEnv,
  context: LaunchContext,
  platform: NodeJS.Platform = process.platform,
): NodeJS.ProcessEnv {
  const result = withoutLaunchContext(environment, platform);
  for (const [logical, key] of PRIVATE_ENTRIES) {
    const value = context[logical as keyof LaunchContext];
    if (value !== undefined) result[key] = value;
  }
  readLaunchContext(result, "optional", platform);
  return result;
}

/** Remove only this implementation's private keys, leaving user and integration settings intact. */
export function withoutLaunchContext(environment: NodeJS.ProcessEnv, platform: NodeJS.Platform = process.platform): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(environment).filter(([key]) => !PRIVATE_KEYS.has(platform === "win32" ? key.toUpperCase() : key)));
}

/** Reject unsupported target metadata instead of negotiating or rewriting an older contract. */
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
