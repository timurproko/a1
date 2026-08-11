import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeTerminalPipelineTrace, type TerminalPipelineTraceEvent } from "../../src/test-harness/terminal-trace.js";

interface RegressionEvidence {
  readonly schema: string;
  readonly events: readonly TerminalPipelineTraceEvent[];
  readonly expectedViolation: {
    readonly sourceCommitId: string;
    readonly outerFrameCount: number;
    readonly latencyMs: number;
  };
}

describe("generic terminal frame-amplification regression evidence", () => {
  it("preserves every pipeline stage and proves one source commit became multiple delayed frames", async () => {
    const path = resolve("test/fixtures/terminal-pipeline/fragmented-source-commit.json");
    const evidence = JSON.parse(await readFile(path, "utf8")) as RegressionEvidence;
    const analysis = analyzeTerminalPipelineTrace(evidence.events);

    expect(evidence.schema).toBe("addone-terminal-pipeline-trace-v1");
    expect(analysis.requiredStagesPresent).toBe(true);
    expect(analysis.missingStages).toEqual([]);
    expect(analysis.amplifiedCommitIds).toContain(evidence.expectedViolation.sourceCommitId);
    expect(analysis.commits).toContainEqual(expect.objectContaining({
      sourceCommitId: evidence.expectedViolation.sourceCommitId,
      outerFrameCount: evidence.expectedViolation.outerFrameCount,
      latencyMs: evidence.expectedViolation.latencyMs,
      ptyReadCount: 2,
      virtualTransactionCount: 2,
      hostWriteCount: 2,
    }));
  });
});
