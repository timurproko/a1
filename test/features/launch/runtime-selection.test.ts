import { describe, expect, it, vi } from "vitest";
import { runSelectedInteractiveRuntime, selectInteractiveRuntime } from "../../../src/features/launch/index.js";

/**
 * Bare A1 is the product. `a1 pi` is the same rendering and input with A1's own
 * surfaces withheld, so only pinned Pi's interface is on screen — that is the
 * thing parity compares against pinned Pi, and it is a command anyone can run
 * rather than a mode kept alive for a test. `a1 sandbox` stays transparent: it
 * exists for trying extensions against Pi itself.
 */
describe("interactive runtime selection", () => {
  it("routes bare A1 to the owned UI with its own surfaces", () => {
    expect(selectInteractiveRuntime("a1")).toEqual({ kind: "owned-ui", profileId: "a1", ownedSurfaces: "on" });
  });

  it("routes pi to the owned UI with A1's surfaces withheld", () => {
    expect(selectInteractiveRuntime("pi")).toEqual({ kind: "owned-ui", profileId: "pi", ownedSurfaces: "off" });
  });

  it("routes sandbox through transparent attachment", () => {
    expect(selectInteractiveRuntime("sandbox")).toEqual({ kind: "transparent", profileId: "sandbox" });
  });

  it("rejects unknown profile identities", () => {
    expect(() => selectInteractiveRuntime("ui")).toThrow(/A1 launch profile is invalid/);
  });

  it("starts only the owned runtime for bare A1 and returns its exit code", async () => {
    const ownedUi = vi.fn(async () => 23);
    const transparent = vi.fn(async () => 41);

    await expect(runSelectedInteractiveRuntime("a1", { ownedUi, transparent })).resolves.toBe(23);
    expect(ownedUi).toHaveBeenCalledOnce();
    expect(ownedUi).toHaveBeenCalledWith("a1", "on");
    expect(transparent).not.toHaveBeenCalled();
  });

  it("starts the owned runtime for pi, telling it to withhold A1's surfaces", async () => {
    const ownedUi = vi.fn(async () => 23);
    const transparent = vi.fn(async () => 41);

    await expect(runSelectedInteractiveRuntime("pi", { ownedUi, transparent })).resolves.toBe(23);
    expect(ownedUi).toHaveBeenCalledWith("pi", "off");
    expect(transparent).not.toHaveBeenCalled();
  });

  it("keeps the owned runtime uninitialized for sandbox", async () => {
    const ownedUi = vi.fn(async () => 23);
    const transparent = vi.fn(async () => 41);

    await expect(runSelectedInteractiveRuntime("sandbox", { ownedUi, transparent })).resolves.toBe(41);
    expect(transparent).toHaveBeenCalledOnce();
    expect(transparent).toHaveBeenCalledWith("sandbox");
    expect(ownedUi).not.toHaveBeenCalled();
  });

  it("preserves startup failures from the selected runtime", async () => {
    const failure = new Error("owned startup failed");
    await expect(runSelectedInteractiveRuntime("a1", {
      ownedUi: async () => { throw failure; },
      transparent: async () => 0,
    })).rejects.toBe(failure);
  });
});
