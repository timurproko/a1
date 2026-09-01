import { describe, expect, it } from "vitest";
import { runRenderingMatrix } from "./rendering-matrix.js";

describe("three-producer two-mode rendering matrix", () => {
  it("separates default mode policy from mode-matched fullscreen and preserves comparison semantics", async () => {
    const result = await runRenderingMatrix("streamed-prose");
    expect(result.defaultMode.map(entry => [entry.producer, entry.requestedMode, entry.effectiveMode])).toEqual([
      ["bare-a1", "regular", "fullscreen"],
      ["a1-pi", "regular", "regular"],
      ["pinned-pi", "regular", "regular"],
    ]);
    expect(result.fullscreenMode.map(entry => entry.effectiveMode)).toEqual(["fullscreen", "fullscreen", "fullscreen"]);
    expect(result.comparisonSemanticParity).toEqual({ regular: true, fullscreen: true });
  }, 60_000);

  it("captures the baseline viewport-sized repaint when one followed line is exposed", async () => {
    const result = await runRenderingMatrix("long-transcript-follow");
    expect(result.findings.bareA1MaximumRowClearsPerStreamCheckpoint).toBeGreaterThanOrEqual(6);
    expect(result.findings.bareA1UnexpectedFullScreenClears).toBe(0);
    const bare = result.fullscreenMode.find(entry => entry.producer === "bare-a1")!;
    const broad = bare.checkpoints.find(checkpoint => checkpoint.name.includes("chunk") && checkpoint.paint.rowClears >= 6);
    expect(broad?.paint.addressedRowWrites).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.findings.transientOwnershipSource).toBe("custom-viewport-fit-transition");
  }, 60_000);
});
