import { describe, expect, it, vi } from "vitest";
import { runSelectedInteractiveRuntime, selectInteractiveRuntime } from "../../../src/features/launch/index.js";

describe("interactive runtime selection", () => {
  it("routes the AddOne profile to the owned UI", () => {
    expect(selectInteractiveRuntime("addone")).toEqual({ kind: "owned-ui" });
  });

  it.each(["pi", "sandbox"] as const)("routes %s through transparent attachment", profileId => {
    expect(selectInteractiveRuntime(profileId)).toEqual({ kind: "transparent", profileId });
  });

  it("rejects unknown profile identities", () => {
    expect(() => selectInteractiveRuntime("ui")).toThrow(/invalid AddOne launch profile/);
  });

  it("starts only the owned runtime for bare AddOne and returns its exit code", async () => {
    const ownedUi = vi.fn(async () => 23);
    const transparent = vi.fn(async () => 41);

    await expect(runSelectedInteractiveRuntime("addone", { ownedUi, transparent })).resolves.toBe(23);
    expect(ownedUi).toHaveBeenCalledOnce();
    expect(transparent).not.toHaveBeenCalled();
  });

  it.each(["pi", "sandbox"] as const)("keeps the owned runtime uninitialized for %s", async profileId => {
    const ownedUi = vi.fn(async () => 23);
    const transparent = vi.fn(async () => 41);

    await expect(runSelectedInteractiveRuntime(profileId, { ownedUi, transparent })).resolves.toBe(41);
    expect(transparent).toHaveBeenCalledOnce();
    expect(transparent).toHaveBeenCalledWith(profileId);
    expect(ownedUi).not.toHaveBeenCalled();
  });

  it("preserves startup failures from the selected runtime", async () => {
    const failure = new Error("owned startup failed");
    await expect(runSelectedInteractiveRuntime("addone", {
      ownedUi: async () => { throw failure; },
      transparent: async () => 0,
    })).rejects.toBe(failure);
  });
});
