import type { OwnedUiPromptSuggestionReasoning } from "./model.js";

export const SUGGESTION_DECISION_REASONS = [
  "disabled", "disposed", "early-conversation", "no-model", "failed-response", "incomplete-response",
  "tool-continuation", "replacement-input", "modal", "draft", "not-ready", "not-focused",
  "autocomplete", "prompt-mode", "presentation-unavailable", "ineligible", "stale-identity",
] as const;
export type SuggestionDecisionReason = typeof SUGGESTION_DECISION_REASONS[number];
export type SuggestionDecision = SuggestionDecisionReason | null;

export const SUGGESTION_DIAGNOSTIC_EVENTS = [
  "skipped", "started", "displayed", "empty", "rejected", "provider-failure", "unavailable",
  "timeout", "cancelled", "stale-result", "presentation-blocked", "late-result-discarded",
] as const;
export type SuggestionDiagnosticEvent = typeof SUGGESTION_DIAGNOSTIC_EVENTS[number];

/** Metadata only: never carry a session path, prompt, candidate, or raw error. */
export interface SuggestionDiagnosticRecord {
  readonly event: SuggestionDiagnosticEvent;
  readonly reason?: SuggestionDecisionReason;
  readonly session: number;
  readonly run: number;
  readonly response: number;
  readonly request: number;
  readonly provider: string;
  readonly model: string;
  readonly reasoning: OwnedUiPromptSuggestionReasoning;
  readonly elapsedMs: number;
}

export interface SuggestionDiagnosticObserver {
  record(record: SuggestionDiagnosticRecord): void;
}
