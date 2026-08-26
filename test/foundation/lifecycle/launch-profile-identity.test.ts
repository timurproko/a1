import { describe, expect, it } from "vitest";
import { assertLaunchProfileId, type LaunchProfileId } from "../../../src/foundation/lifecycle/index.js";

describe("launch profile identity", () => {
  it.each(["a1", "pi"] as const)("accepts %s", value => {
    expect(() => assertLaunchProfileId(value)).not.toThrow();
    const profile: LaunchProfileId = value;
    expect(profile).toBe(value);
  });

  it.each([undefined, "agent", "unknown", 1])("rejects %j", value => {
    expect(() => assertLaunchProfileId(value)).toThrow(/A1 launch profile is invalid/);
  });
});
