import { describe, expect, it } from "vitest";
import { PromptSuggestionProbeObservations } from "../../../support/prompt-suggestion-observations.js";
import type { OwnedUiPromptSuggestionObservation } from "../../../../src/contracts/owned-ui/index.js";

/** Probe collection bounds are tested offline; these tests never enable the credential-gated probe. */
describe("prompt suggestion probe observations", () => {
  it("bounds samples, strips extra fields, and releases records on take/disable", () => {
    const collector = new PromptSuggestionProbeObservations(2);
    const record = { phase: "generation", sequence: 1, outcome: "candidate", durationMs: 20,
      primaryUsage: { input: 10, output: null, cacheRead: null, cacheWrite: null, privateText: "secret" }, suggestionUsage: null,
      inferenceInvocations: { primary: null, suggestion: 1 }, networkAttempts: null,
      sessionId: "private-session", headers: { authorization: "secret" }, text: "private-suggestion",
    } as const;
    for (let index = 0; index < 5; index += 1) collector.observe(record);
    const records = collector.take();
    expect(records).toHaveLength(2);
    for (const forbidden of ["secret", "private", "sessionId", "authorization"]) expect(JSON.stringify(records)).not.toContain(forbidden);
    expect(collector.take()).toEqual([]);
    collector.observe(record);
    collector.disable();
    collector.observe(record);
    expect(collector.take()).toEqual([]);
  });
  it("rejects invalid sample bounds and nonnumeric/private availability fields", () => {
    expect(() => new PromptSuggestionProbeObservations(0)).toThrow(RangeError);
    expect(() => new PromptSuggestionProbeObservations(33)).toThrow(RangeError);
    const collector = new PromptSuggestionProbeObservations();
    collector.observe({ phase: "availability", sequence: 1, resultRelativeToSettlementMs: "private text" } as unknown as OwnedUiPromptSuggestionObservation);
    expect(collector.take()).toEqual([]);
  });
});
