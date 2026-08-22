import { describe, expect, it, vi } from "vitest";
import { runSelectedInteractiveRuntime, selectInteractiveRuntime } from "../../../src/features/launch/index.js";

/**
 * Every interactive command is one composition. Bare A1 is the product and
 * reaches its own screens; `a1 pi` and `a1 sandbox` present pinned Pi's
 * interface and nothing of A1's own, and differ from each other only in the
 * configuration root they read.
 */
describe("interactive runtime selection", () => {
  it("routes bare A1 to the owned UI with its own surfaces", () => {
    expect(selectInteractiveRuntime("a1")).toEqual({ kind: "owned-ui", profileId: "a1", ownedSurfaces: "on" });
  });

  it("routes pi to the owned UI with A1's surfaces withheld", () => {
    expect(selectInteractiveRuntime("pi")).toEqual({ kind: "owned-ui", profileId: "pi", ownedSurfaces: "off" });
  });

  it("routes sandbox the same way as pi, against its own profile", () => {
    expect(selectInteractiveRuntime("sandbox")).toEqual({ kind: "owned-ui", profileId: "sandbox", ownedSurfaces: "off" });
  });

  it("rejects unknown profile identities", () => {
    expect(() => selectInteractiveRuntime("ui")).toThrow(/A1 launch profile is invalid/);
  });

  it("starts the owned runtime for bare A1 and returns its exit code", async () => {
    const ownedUi = vi.fn(async () => 23);

    await expect(runSelectedInteractiveRuntime("a1", { ownedUi })).resolves.toBe(23);
    expect(ownedUi).toHaveBeenCalledOnce();
    expect(ownedUi).toHaveBeenCalledWith("a1", "on");
  });

  it("starts the owned runtime for pi, telling it to withhold A1's surfaces", async () => {
    const ownedUi = vi.fn(async () => 23);

    await expect(runSelectedInteractiveRuntime("pi", { ownedUi })).resolves.toBe(23);
    expect(ownedUi).toHaveBeenCalledWith("pi", "off");
  });

  it("starts the owned runtime for sandbox, telling it to withhold A1's surfaces", async () => {
    const ownedUi = vi.fn(async () => 19);

    await expect(runSelectedInteractiveRuntime("sandbox", { ownedUi })).resolves.toBe(19);
    expect(ownedUi).toHaveBeenCalledWith("sandbox", "off");
  });

  it("preserves startup failures from the selected runtime", async () => {
    const failure = new Error("owned startup failed");
    await expect(runSelectedInteractiveRuntime("a1", {
      ownedUi: async () => { throw failure; },
    })).rejects.toBe(failure);
  });
});
