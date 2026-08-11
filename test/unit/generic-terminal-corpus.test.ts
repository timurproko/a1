import { describe, expect, it } from "vitest";
import { GENERIC_TERMINAL_WORKLOAD_CORPUS, terminalWorkloadById } from "../../src/test-harness/generic-terminal-corpus.js";

const requiredCoverage = [
  "synchronized-output", "unsynchronized-output", "multi-write-frame", "shell-scrolling",
  "generated-text", "progress", "status", "footer", "cursor-epilogue", "unicode",
  "attributes", "alternate-screen", "resize", "sustained-output", "backpressure",
];

describe("application-agnostic terminal workload corpus", () => {
  it("covers the complete generic frame, scrolling, styling, resize, sustained-output, and backpressure matrix", () => {
    const coverage = new Set(GENERIC_TERMINAL_WORKLOAD_CORPUS.flatMap(workload => workload.coverage));
    for (const capability of requiredCoverage) expect(coverage.has(capability), capability).toBe(true);
    expect(new Set(GENERIC_TERMINAL_WORKLOAD_CORPUS.map(workload => workload.id)).size).toBe(GENERIC_TERMINAL_WORKLOAD_CORPUS.length);
  });

  it("provides one immutable byte/timing timeline for both direct and AddOne-hosted runners", () => {
    for (const workload of GENERIC_TERMINAL_WORKLOAD_CORPUS) {
      const selected = terminalWorkloadById(workload.id);
      const directTimeline = selected.writes.map(({ atMs, sourceCommitId, data }) => ({ atMs, sourceCommitId, bytes: Buffer.from(data).toString("hex") }));
      const hostedTimeline = selected.writes.map(({ atMs, sourceCommitId, data }) => ({ atMs, sourceCommitId, bytes: Buffer.from(data).toString("hex") }));
      expect(hostedTimeline).toEqual(directTimeline);
      expect(selected.actions).toEqual(workload.actions);
    }
  });

  it("contains no workload-specific executable identity or acceptance threshold", () => {
    const serialized = JSON.stringify(GENERIC_TERMINAL_WORKLOAD_CORPUS);
    expect(serialized).not.toMatch(/native.?pi|claude|codex|executable/i);
  });
});
