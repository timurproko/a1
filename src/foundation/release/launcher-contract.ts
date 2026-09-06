import { createHash } from "node:crypto";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export type PackageRole = "combined" | "launcher" | "runtime";
export const LAUNCHER_PROTOCOL_VERSION = 1;
export const LAUNCHER_REQUIRED_FEATURES = Object.freeze(["immutable-release-selection.v1", "runtime-update-routing.v1"] as const);
export const LAUNCHER_OPTIONAL_FEATURES = Object.freeze(["combined-package-migration.v1", "launcher-diagnostics.v1"] as const);

export interface LauncherRuntimeCompatibility {
  readonly schema: typeof PRODUCT_IDENTITY.protocol.launcherRuntimeSchema;
  readonly protocolVersion: number;
  readonly requiredFeatures: readonly string[];
  readonly optionalFeatures: readonly string[];
}

export interface PackageRoleManifest {
  readonly schema: typeof PRODUCT_IDENTITY.evidence.packageRoleSchema;
  readonly role: PackageRole;
  readonly packageName: string;
  readonly packageVersion: string;
  readonly contentDigest: string;
  readonly compatibility: LauncherRuntimeCompatibility;
}

export interface LauncherCompatibilityResult {
  readonly compatible: boolean;
  readonly missingLauncherFeatures: readonly string[];
  readonly negotiatedOptionalFeatures: readonly string[];
}

/** Produce deterministic package-role evidence for independently published launcher/runtime bytes. */
export function createPackageRoleManifest(input: Omit<PackageRoleManifest, "schema">): PackageRoleManifest {
  const value: PackageRoleManifest = { schema: PRODUCT_IDENTITY.evidence.packageRoleSchema, ...input };
  validatePackageRoleManifest(value);
  return Object.freeze({ ...value, compatibility: freezeCompatibility(value.compatibility) });
}

/** Reject swapped package roles and malformed launcher/runtime compatibility evidence. */
export function validatePackageRoleManifest(value: unknown): asserts value is PackageRoleManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("package-role manifest must be an object");
  const manifest = value as PackageRoleManifest;
  if (manifest.schema !== PRODUCT_IDENTITY.evidence.packageRoleSchema || !["combined", "launcher", "runtime"].includes(manifest.role)
    || typeof manifest.packageVersion !== "string" || !/^[a-f0-9]{64}$/.test(manifest.contentDigest)) {
    throw new TypeError("package-role manifest identity is invalid");
  }
  const expectedPackage = manifest.role === "runtime" ? PRODUCT_IDENTITY.runtimePackageName : PRODUCT_IDENTITY.packageName;
  if (manifest.packageName !== expectedPackage) throw new TypeError(`package role ${manifest.role} has unexpected package identity`);
  validateLauncherRuntimeCompatibility(manifest.compatibility);
}

/** Negotiate additive launcher/runtime features before any selected runtime module executes. */
export function negotiateLauncherRuntimeCompatibility(
  launcher: LauncherRuntimeCompatibility,
  runtime: LauncherRuntimeCompatibility,
): LauncherCompatibilityResult {
  validateLauncherRuntimeCompatibility(launcher);
  validateLauncherRuntimeCompatibility(runtime);
  const launcherFeatures = new Set([...launcher.requiredFeatures, ...launcher.optionalFeatures]);
  const runtimeFeatures = new Set([...runtime.requiredFeatures, ...runtime.optionalFeatures]);
  const missingLauncherFeatures = runtime.requiredFeatures.filter(feature => !launcherFeatures.has(feature)).sort();
  return {
    compatible: launcher.protocolVersion >= runtime.protocolVersion && missingLauncherFeatures.length === 0,
    missingLauncherFeatures,
    negotiatedOptionalFeatures: launcher.optionalFeatures.filter(feature => runtimeFeatures.has(feature)).sort(),
  };
}

export function launcherCompatibilityDigest(value: LauncherRuntimeCompatibility): string {
  validateLauncherRuntimeCompatibility(value);
  return createHash("sha256").update(JSON.stringify(freezeCompatibility(value))).digest("hex");
}

export function currentLauncherCompatibility(): LauncherRuntimeCompatibility {
  return freezeCompatibility({
    schema: PRODUCT_IDENTITY.protocol.launcherRuntimeSchema,
    protocolVersion: LAUNCHER_PROTOCOL_VERSION,
    requiredFeatures: LAUNCHER_REQUIRED_FEATURES,
    optionalFeatures: LAUNCHER_OPTIONAL_FEATURES,
  });
}

function validateLauncherRuntimeCompatibility(value: LauncherRuntimeCompatibility): void {
  if (!value || value.schema !== PRODUCT_IDENTITY.protocol.launcherRuntimeSchema || !Number.isSafeInteger(value.protocolVersion) || value.protocolVersion < 1
    || !validFeatures(value.requiredFeatures) || !validFeatures(value.optionalFeatures)
    || value.requiredFeatures.some(feature => value.optionalFeatures.includes(feature))) {
    throw new TypeError("launcher/runtime compatibility metadata is invalid");
  }
}
function validFeatures(value: readonly string[]): boolean {
  return Array.isArray(value) && new Set(value).size === value.length && value.every(feature => /^[a-z][a-z0-9.-]+\.v[1-9][0-9]*$/.test(feature));
}
function freezeCompatibility(value: LauncherRuntimeCompatibility): LauncherRuntimeCompatibility {
  return Object.freeze({ ...value, requiredFeatures: Object.freeze([...value.requiredFeatures].sort()), optionalFeatures: Object.freeze([...value.optionalFeatures].sort()) });
}
