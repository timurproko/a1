import { describe, expect, it } from "vitest";
import { acceptsTranscriptUpdate, assertOwnedUiTranscriptBlock, type OwnedUiToolState, type OwnedUiTranscriptBlock } from "../../../src/contracts/owned-ui/index.js";

function block(execution: OwnedUiToolState["execution"], argsComplete: boolean, revision: number): OwnedUiTranscriptBlock {
  const live = execution === "pending" || execution === "running";
  return { id: "tool", kind: live ? "tool-call" : "tool-result", status: live ? "live" : "finalized", revision,
    title: "Tool", text: "", payload: null, toolState: { execution, argsComplete } };
}

describe("owned tool lifecycle", () => {
  it("validates argument completion independently of execution completion", () => {
    for (const state of [block("pending", false, 1), block("pending", true, 2), block("running", true, 3),
      block("succeeded", true, 4), block("failed", true, 4), block("aborted", false, 4)]) {
      expect(() => assertOwnedUiTranscriptBlock(state)).not.toThrow();
    }
    expect(() => assertOwnedUiTranscriptBlock({ ...block("pending", true, 2), status: "finalized" })).toThrow("finality");
    expect(() => assertOwnedUiTranscriptBlock({ ...block("succeeded", true, 4), status: "live" })).toThrow("finality");
    expect(() => assertOwnedUiTranscriptBlock({ ...block("succeeded", true, 4), kind: "assistant" })).toThrow("requires a tool");
  });

  it("allows later phases while rejecting stale revisions and phase regressions", () => {
    expect(acceptsTranscriptUpdate(block("pending", false, 1), block("pending", true, 2))).toBe(true);
    expect(acceptsTranscriptUpdate(block("pending", true, 2), block("running", true, 3))).toBe(true);
    expect(acceptsTranscriptUpdate(block("running", true, 3), block("succeeded", true, 4))).toBe(true);
    expect(acceptsTranscriptUpdate(block("running", true, 3), block("running", true, 2))).toBe(false);
    expect(acceptsTranscriptUpdate(block("pending", true, 2), block("pending", false, 3))).toBe(false);
    expect(acceptsTranscriptUpdate(block("running", true, 3), block("pending", true, 4))).toBe(false);
    for (const execution of ["succeeded", "failed", "aborted"] as const) {
      expect(acceptsTranscriptUpdate(block(execution, true, 4), block("running", true, 50))).toBe(false);
      expect(acceptsTranscriptUpdate(block(execution, true, 4), block("pending", true, 50))).toBe(false);
    }
  });

  it("does not treat a legacy finalized argument declaration as a finalized execution", () => {
    const { toolState: _state, ...legacy } = block("pending", true, 2);
    expect(acceptsTranscriptUpdate({ ...legacy, status: "finalized", payload: { argsComplete: true } }, block("running", true, 3))).toBe(true);
    const assistant = { ...legacy, kind: "assistant" as const, status: "finalized" as const };
    expect(acceptsTranscriptUpdate(assistant, { ...assistant, revision: 3, status: "live" })).toBe(false);
  });
});
