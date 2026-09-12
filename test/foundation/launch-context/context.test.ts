import { describe, expect, it } from "vitest";
import { PRIVATE_ENVIRONMENT, PRIVATE_LAUNCH_CONTRACT, assertCurrentLaunchContract, readLaunchContext, withLaunchContext, withoutLaunchContext } from "../../../src/foundation/launch-context/index.js";
import { PRODUCT_IDENTITY, validateProductIdentity } from "../../../src/product-identity.js";

const release = {
  releaseRoot: process.cwd(),
  releaseId: `1.0.0-${"a".repeat(20)}`,
  releaseDigest: "a".repeat(64),
  releaseLayers: "",
  launchProfile: "a1" as const,
};

describe("neutral private launch contract", () => {
  it("reads and writes only one supported set of private keys", () => {
    const environment = withLaunchContext({}, { ...release, immutableWarmup: "1" });
    expect(readLaunchContext(environment, "warmup")).toEqual({ ...release, immutableWarmup: "1" });
    expect(Object.keys(environment).every(key => key.startsWith("LAUNCH_CONTEXT_"))).toBe(true);
    expect(Object.values(PRIVATE_ENVIRONMENT).every(key => !/a1/i.test(key))).toBe(true);
  });

  it("does not translate obsolete-only input or use a default release", () => {
    const obsolete = JSON.parse('{"A1_RELEASE_ROOT":"old","A1_RELEASE_ID":"old","A1_IMMUTABLE_WARMUP":"1","A1_LAUNCH_PROFILE":"pi"}');
    expect(readLaunchContext(obsolete)).toEqual({});
    for (const required of ["profile", "release", "warmup"] as const) {
      expect(() => readLaunchContext(obsolete, required)).toThrow(/required current-contract field/);
    }
  });

  it("obsolete ambient variables cannot override current selection", () => {
    const obsolete = JSON.parse('{"A1_RELEASE_ID":"wrong","A1_RELEASE_ROOT":"wrong","A1_LAUNCH_PROFILE":"pi"}');
    expect(readLaunchContext(withLaunchContext(obsolete, release), "release")).toEqual(release);
  });

  it("replaces stale owned context and preserves public and third-party settings", () => {
    const environment = {
      ...withLaunchContext({}, { ...release, immutableWarmup: "1" }),
      A1_CONFIG_DIR: "my-config", PATH: "my-path", THIRD_PARTY_SETTING: "keep",
    };
    const result = withLaunchContext(environment, { ...release, releaseId: `2.0.0-${"b".repeat(20)}`, launchProfile: "pi" });
    expect(readLaunchContext(result, "release")).toMatchObject({ releaseId: `2.0.0-${"b".repeat(20)}`, launchProfile: "pi" });
    expect(result[PRIVATE_ENVIRONMENT.immutableWarmup]).toBeUndefined();
    expect(withoutLaunchContext(result)).toEqual({ A1_CONFIG_DIR: "my-config", PATH: "my-path", THIRD_PARTY_SETTING: "keep" });
  });

  it("rejects conflicting Windows key casing without exposing values", () => {
    const environment = { ...withLaunchContext({}, release), launch_context_release_id: "secret-other-release" };
    expect(() => readLaunchContext(environment, "release", "win32")).toThrow(/releaseId.*conflicting/);
    try { readLaunchContext(environment, "release", "win32"); } catch (error) { expect(String(error)).not.toContain("secret-other-release"); }
    const replaced = withLaunchContext(environment, release, "win32");
    expect(replaced.launch_context_release_id).toBeUndefined();
    expect(readLaunchContext(replaced, "release", "win32")).toEqual(release);
  });

  it.each([
    { launchProfile: "other" }, { immutableWarmup: "yes" }, { releaseDigest: "invalid" }, { releaseRoot: "bad\0root" },
  ])("rejects invalid current values: %j", value => {
    const environment = Object.fromEntries(Object.entries(value).map(([key, entry]) => [PRIVATE_ENVIRONMENT[key as keyof typeof PRIVATE_ENVIRONMENT], entry]));
    expect(() => readLaunchContext(environment)).toThrow(/Invalid private launch context/);
  });

  it("requires all release fields even when some are valid", () => {
    expect(() => readLaunchContext(withLaunchContext({}, { releaseRoot: release.releaseRoot }), "release")).toThrow(/releaseId/);
  });

  it("rejects unsupported metadata rather than negotiating an old target", () => {
    expect(() => assertCurrentLaunchContract({})).toThrow(/Unsupported private launch contract/);
    expect(() => assertCurrentLaunchContract({ launchContract: "unknown" })).toThrow(/Unsupported private launch contract/);
    expect(() => assertCurrentLaunchContract({ launchContract: PRIVATE_LAUNCH_CONTRACT })).not.toThrow();
  });

  it("separates public identity validation from neutral private definitions", () => {
    expect(validateProductIdentity(structuredClone(PRODUCT_IDENTITY))).toEqual(PRODUCT_IDENTITY);
    expect(PRODUCT_IDENTITY.environment.configDir).toBe("A1_CONFIG_DIR");
    expect(PRODUCT_IDENTITY.environment).not.toHaveProperty("releaseId");
    expect(PRODUCT_IDENTITY.state.piAgentProfile).toBe(".a1/agent");
    expect(PRODUCT_IDENTITY.protocol.promptHistorySchema).toBe("a1-prompt-history-v1");
  });
});
