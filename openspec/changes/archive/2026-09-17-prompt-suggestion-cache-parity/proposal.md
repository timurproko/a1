## Why

Contextual prompt suggestions in bare A1 appear several seconds after the agent stops, while Claude Code shows its suggestion almost as soon as the turn ends. Both tools start the suggestion request at the same point (the final assistant message) and both send the whole conversation plus one short instruction. The difference is that Claude Code deliberately sends a request whose cache-relevant shape is identical to the main turn, so the provider serves nearly the entire prompt from its cache and only the short answer costs time. A1's request differs from the primary loop's request in three ways that each break provider prompt-cache continuity: it requests the lowest available reasoning effort instead of the session's thinking level (Anthropic invalidates cached message content when thinking parameters change), it omits the session identifier that Pi passes as the OpenAI `prompt_cache_key` and as provider affinity headers, and it filters the raw agent messages to `user`/`assistant`/`toolResult` instead of applying the primary loop's context transform and LLM conversion, so after a compaction summary, bash execution, or custom message the message list diverges from the cached prefix. Each miss re-reads the full conversation and turns a sub-second answer into a multi-second one.

## What Changes

- Build the suggestion request from the same shape the primary agent loop uses for its next turn: the run's model, the session's current thinking level and thinking budgets, the session identifier, the transport, and the conversation produced by the primary loop's context transform and LLM message conversion, with only the suggestion instruction appended.
- Replace the "lowest supported reasoning effort" policy with this parity policy while keeping the 15-second deadline, cancellation, no-retry, no-substitute-model, and no-session-mutation guarantees.
- Keep reporting the reasoning level actually sent in suggestion diagnostics so a capture still shows which level each request used.
- Cover the parity with tests that compare the suggestion request against the primary loop's request options and message list, including a conversation containing a compaction summary.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contextual-prompt-suggestions`: Suggestion requests SHALL reuse the primary request shape for prompt-cache continuity instead of an independent lowest-effort reasoning policy.

## Impact

- Affected areas: `PiEngineAdapter.generate` and `suggestionReasoningPolicy` in `src/integrations/pi/engine/adapter.ts`, their adapter, conformance, and provider-integration tests, and the `contextual-prompt-suggestions` specification.
- No settings, session format, editor, controller lifecycle, or `a1 pi` changes are intended. The suggestion request stays tool-free in effect and never appends to the user's session.
- Provider cost per suggestion falls when the cache is hit; when the session runs a budget-based thinking model at a high level, the suggestion may spend thinking tokens where it previously did not, bounded by the existing deadline.
