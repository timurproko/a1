import { getCapabilities, setCapabilities, type TerminalCapabilities } from "#pi-tui";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  parityModeUsesTrueColor,
  PI_PARITY_COLOR_MODES,
  withPiParityColorMode,
} from "../../../support/pi-terminal-capabilities.js";

let original: TerminalCapabilities;
const baseline: TerminalCapabilities = { images: "kitty", trueColor: false, hyperlinks: false };

beforeEach(() => {
  original = getCapabilities();
  setCapabilities(baseline);
});

afterEach(() => setCapabilities(original));

describe("declared Pi parity color capability", () => {
  it("maps both declared modes without consulting the host", () => {
    expect(PI_PARITY_COLOR_MODES).toEqual(["truecolor", "256color"]);
    expect(parityModeUsesTrueColor("truecolor")).toBe(true);
    expect(parityModeUsesTrueColor("256color")).toBe(false);
  });

  it("returns synchronously and restores every prior capability field", () => {
    const result = withPiParityColorMode("truecolor", () => {
      expect(getCapabilities()).toEqual({ ...baseline, trueColor: true, hyperlinks: true });
      return "captured";
    }, { hyperlinks: true });
    expect(result).toBe("captured");
    expect(getCapabilities()).toBe(baseline);
  });

  it("restores after a synchronous throw", () => {
    expect(() => withPiParityColorMode("truecolor", () => {
      throw new Error("sync failure");
    })).toThrow("sync failure");
    expect(getCapabilities()).toBe(baseline);
  });

  it("restores after asynchronous resolution and rejection", async () => {
    await expect(withPiParityColorMode("truecolor", async () => {
      await Promise.resolve();
      expect(getCapabilities().trueColor).toBe(true);
      return "resolved";
    })).resolves.toBe("resolved");
    expect(getCapabilities()).toBe(baseline);

    await expect(withPiParityColorMode("truecolor", async () => {
      await Promise.resolve();
      throw new Error("async failure");
    })).rejects.toThrow("async failure");
    expect(getCapabilities()).toBe(baseline);
  });

  it("restores nested scopes in LIFO order", async () => {
    await withPiParityColorMode("truecolor", async () => {
      const outer = getCapabilities();
      expect(outer).toEqual({ ...baseline, trueColor: true });
      await withPiParityColorMode("256color", async () => {
        expect(getCapabilities()).toEqual({ ...baseline, trueColor: false });
      });
      expect(getCapabilities()).toBe(outer);
    });
    expect(getCapabilities()).toBe(baseline);
  });

  it("keeps sequential captures independent", () => {
    const observed = PI_PARITY_COLOR_MODES.map(mode => withPiParityColorMode(mode, () => ({
      trueColor: getCapabilities().trueColor,
      images: getCapabilities().images,
      hyperlinks: getCapabilities().hyperlinks,
    })));
    expect(observed).toEqual([
      { trueColor: true, images: "kitty", hyperlinks: false },
      { trueColor: false, images: "kitty", hyperlinks: false },
    ]);
    expect(getCapabilities()).toBe(baseline);
  });
});
