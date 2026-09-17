## ADDED Requirements

### Requirement: Suggestion requests reuse the primary request shape for prompt-cache continuity
A1 SHALL build its isolated suggestion request from the same inputs the primary agent loop would use for its next request: the run's selected provider and model, the session's current thinking level and thinking budgets, the session identifier, the configured transport, the primary loop's payload hook, and the conversation produced by the primary loop's context transform and LLM message conversion. The only difference from that primary request SHALL be the appended suggestion instruction. A1 SHALL NOT substitute a different reasoning effort, output limit, tool list, or message filtering for the suggestion request, so a provider that caches the conversation prefix can serve it from cache. This policy SHALL NOT change the primary session's model, thinking setting, persisted settings, or conversation, and SHALL NOT emit provider-response notifications to extensions for the suggestion request.

Each request SHALL retain a finite deadline of 15 seconds from generation start, remain cancellable, and start no automatic retry or substitute-model request. A timeout SHALL prevent any later result from publishing even if the provider ignores cancellation. A1 SHALL NOT lengthen the main run's working state or block the editor while waiting for a suggestion. Suggestion diagnostics SHALL record the reasoning level actually sent.

#### Scenario: Main session uses high thinking
- **WHEN** an eligible run used high thinking on a model with a per-request reasoning control
- **THEN** the suggestion request SHALL use that same high level with the same provider, model, thinking budgets, and session identifier
- **AND** subsequent primary requests SHALL retain the user's high-thinking setting

#### Scenario: Conversation contains a compaction summary
- **WHEN** the session's messages include a compaction summary, branch summary, shell execution, or custom message
- **THEN** the suggestion request SHALL carry the same converted user messages the primary loop would send in their place
- **AND** SHALL NOT drop or reorder them relative to the primary request

#### Scenario: Model has no reasoning control
- **WHEN** the selected model does not support reasoning controls
- **THEN** the suggestion request SHALL omit reasoning options exactly as the primary loop does and retain the same deadline and isolation guarantees

#### Scenario: Deadline expires before a result
- **WHEN** a suggestion request has not completed within 15 seconds
- **THEN** A1 SHALL cancel and retire it without retrying, exposing an error in the prompt, or changing the main session
- **AND** enabled private diagnostics SHALL distinguish timeout from an intentional empty response
- **AND** a later provider result SHALL NOT revive the suggestion

## REMOVED Requirements

### Requirement: Suggestion generation uses an independent bounded latency policy
**Reason**: Requesting the lowest supported reasoning effort and omitting the session identifier and message conversion changed the request's cache key, so every suggestion re-read the whole conversation and arrived seconds after settlement instead of being served from the primary turn's prompt cache.

**Migration**: The deadline, cancellation, no-retry, no-substitute-model, and no-session-mutation guarantees move unchanged into "Suggestion requests reuse the primary request shape for prompt-cache continuity"; the reasoning level now follows the session's current thinking level.
