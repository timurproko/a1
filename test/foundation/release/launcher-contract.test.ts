import { describe, expect, it } from "vitest";
import {
  createPackageRoleManifest,
  currentLauncherCompatibility,
  launcherCompatibilityDigest,
  negotiateLauncherRuntimeCompatibility,
  validatePackageRoleManifest,
} from "../../../src/foundation/release/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

const digest = "a".repeat(64);

describe("stable launcher package contract", () => {
  it.each([
    ["launcher", PRODUCT_IDENTITY.packageName],
    ["combined", PRODUCT_IDENTITY.packageName],
    ["runtime", PRODUCT_IDENTITY.runtimePackageName],
  ] as const)("binds the %s role to its authoritative package", (role, packageName) => {
    expect(createPackageRoleManifest({
      role,
      packageName,
      packageVersion: "1.2.3",
      contentDigest: digest,
      compatibility: currentLauncherCompatibility(),
    })).toMatchObject({ schema: PRODUCT_IDENTITY.evidence.packageRoleSchema, role, packageName });
  });

  it("rejects missing, swapped, and malformed package-role evidence", () => {
    const valid = createPackageRoleManifest({
      role: "runtime",
      packageName: PRODUCT_IDENTITY.runtimePackageName,
      packageVersion: "1.2.3",
      contentDigest: digest,
      compatibility: currentLauncherCompatibility(),
    });
    expect(() => validatePackageRoleManifest({ ...valid, packageName: PRODUCT_IDENTITY.packageName })).toThrow(/unexpected package identity/);
    expect(() => validatePackageRoleManifest({ ...valid, role: "unknown" })).toThrow(/identity is invalid/);
    expect(() => validatePackageRoleManifest({ ...valid, contentDigest: "short" })).toThrow(/identity is invalid/);
    expect(() => validatePackageRoleManifest({ ...valid, compatibility: { ...valid.compatibility, requiredFeatures: ["invalid"] } })).toThrow(/compatibility metadata/);
  });

  it("negotiates additive features and rejects unavailable runtime requirements", () => {
    const launcher = currentLauncherCompatibility();
    const additive = {
      ...launcher,
      optionalFeatures: [...launcher.optionalFeatures, "future-observability.v1"],
    };
    expect(negotiateLauncherRuntimeCompatibility(launcher, additive)).toMatchObject({ compatible: true, missingLauncherFeatures: [] });

    const incompatible = {
      ...launcher,
      requiredFeatures: [...launcher.requiredFeatures, "future-required.v2"],
    };
    expect(negotiateLauncherRuntimeCompatibility(launcher, incompatible)).toEqual({
      compatible: false,
      missingLauncherFeatures: ["future-required.v2"],
      negotiatedOptionalFeatures: [...launcher.optionalFeatures].sort(),
    });
    expect(launcherCompatibilityDigest(launcher)).toMatch(/^[a-f0-9]{64}$/);
  });
});
