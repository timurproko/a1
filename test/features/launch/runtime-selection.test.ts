import { describe, expect, it, vi } from "vitest";
import { runSelectedInteractiveRuntime, selectInteractiveRuntime } from "../../../src/features/launch/index.js";

describe("interactive runtime selection", () => {
  it("enables product surfaces for bare A1", () => {
    expect(selectInteractiveRuntime("a1")).toEqual({ kind: "owned-ui", profileId: "a1", productMode: "bare" });
  });

  it("withholds product surfaces for the Pi comparison", () => {
    expect(selectInteractiveRuntime("pi")).toEqual({ kind: "owned-ui", profileId: "pi", productMode: "comparison" });
  });

  it("rejects an invalid profile", () => {
    expect(() => selectInteractiveRuntime("ui")).toThrow(/a1 launch profile is invalid/);
  });

  it.each([
    ["a1", "bare"],
    ["pi", "comparison"],
  ] as const)("starts the owned runtime for %s", async (profileId, productMode) => {
    const ownedUi = vi.fn(async () => 23);
    await expect(runSelectedInteractiveRuntime(profileId, { ownedUi })).resolves.toBe(23);
    expect(ownedUi).toHaveBeenCalledWith(profileId, productMode);
  });
});
