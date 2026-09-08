import { PROMPT_SUGGESTION_OUTCOMES, type OwnedUiPromptSuggestionObservation, type OwnedUiPromptSuggestionUsage } from "../../src/contracts/owned-ui/index.js";

const count = (value: number | null): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
function usage(value: OwnedUiPromptSuggestionUsage | null): OwnedUiPromptSuggestionUsage | null {
  return value === null ? null : { input: count(value.input), output: count(value.output), cacheRead: count(value.cacheRead), cacheWrite: count(value.cacheWrite) };
}

/** Fixed-capacity, allowlisted collector used only by the explicit provider probe. */
export class PromptSuggestionProbeObservations {
  #records: OwnedUiPromptSuggestionObservation[] = [];
  #enabled = true;
  constructor(readonly capacity = 8) {
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 32) throw new RangeError("Probe capacity must be 1-32");
  }
  readonly observe = (record: OwnedUiPromptSuggestionObservation): void => {
    if (!this.#enabled || this.#records.length >= this.capacity || !Number.isSafeInteger(record.sequence) || record.sequence < 0) return;
    if (record.phase === "availability") {
      if (Number.isFinite(record.resultRelativeToSettlementMs)) this.#records.push({ phase: "availability", sequence: record.sequence, resultRelativeToSettlementMs: record.resultRelativeToSettlementMs });
    } else if (record.phase === "generation" && PROMPT_SUGGESTION_OUTCOMES.includes(record.outcome) && count(record.durationMs) !== null) {
      this.#records.push({ phase: "generation", sequence: record.sequence, outcome: record.outcome, durationMs: record.durationMs,
        primaryUsage: usage(record.primaryUsage), suggestionUsage: usage(record.suggestionUsage),
        inferenceInvocations: { primary: null, suggestion: record.inferenceInvocations.suggestion === 1 ? 1 : 0 }, networkAttempts: null,
      });
    }
  };
  take(): OwnedUiPromptSuggestionObservation[] { const records = this.#records; this.#records = []; return records; }
  disable(): void { this.#enabled = false; this.#records = []; }
}
