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
  }, 240_000);

  it("replaces the baseline viewport-sized repaint with bounded followed damage", async () => {
    const result = await runRenderingMatrix("long-transcript-follow");
    expect(result.findings.bareA1MaximumRowClearsPerStreamCheckpoint).toBeLessThanOrEqual(3);
    expect(result.findings.bareA1UnexpectedFullScreenClears).toBe(0);
    const bare = result.fullscreenMode.find(entry => entry.producer === "bare-a1")!;
    const shifted = bare.checkpoints.find(checkpoint => checkpoint.name === "long-tail-chunk-1");
    expect(shifted?.paint).toMatchObject({
      rowClears: 3,
      addressedRowWrites: [1, 5, 6],
      scrollRegions: [{ top: 1, bottom: 6 }],
      scrollUpRows: 1,
    });
    expect(result.findings.safeShiftCheckpoints.length).toBeGreaterThan(0);
    expect(result.findings.dockGeometry.length).toBeGreaterThan(0);
  }, 240_000);

  it("derives deterministic findings in back-to-back matrix runs", async () => {
    const first = await runRenderingMatrix("streamed-prose");
    const second = await runRenderingMatrix("streamed-prose");
    expect(second.findings).toEqual(first.findings);
    expect(second.comparisonSemanticParity).toEqual(first.comparisonSemanticParity);
  }, 300_000);
});
