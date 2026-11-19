## Context

See `proposal.md` for the report and `specs/contextual-prompt-suggestions/spec.md` for the observable contract. At planning base `e52df799` the suggestion pipeline already prefetches: `PiEngineAdapter` emits `assistant-message-completed` on Pi's `message_end`, `SessionShell` calls `ContextualPromptSuggestionController.consider` there, and `agent-run-settled` reveals a prepared candidate in the same presentation cycle. The delay the user sees is therefore the provider round-trip itself, and that round-trip is slow because the request cannot reuse the primary turn's prompt cache.

The primary loop's request is built in Pi's `agent-loop.ts`: it applies `agent.transformContext` (extension `context` handlers) and `agent.convertToLlm` (which turns `compactionSummary`, `branchSummary`, `bashExecution`, and `custom` messages into user messages and drops excluded ones) to the state messages, then calls `agent.streamFunction` with `model`, `reasoning` (the state thinking level, `undefined` when `off`), `sessionId`, `thinkingBudgets`, `transport`, `onPayload`, and `onResponse`. Pi's Anthropic path derives `thinking` from `reasoning`, and Anthropic invalidates cached message content when thinking parameters change; Pi's OpenAI paths derive `prompt_cache_key` and the `session_id`/`x-session-id` headers from `sessionId`.

`PiEngineAdapter.generate` at the same base calls `modelRuntime.completeSimple` with `agentState.messages` filtered to `user`/`assistant`/`toolResult`, no `sessionId`, no `thinkingBudgets`, no `transport`, and `reasoning` set by `suggestionReasoningPolicy` to the lowest level the model supports. Claude Code's `generateSuggestion` documents the opposite rule after measuring it: overriding effort or output limits on the forked request dropped its cache hit rate from 92.7% to 61%, so it changes nothing that reaches the provider except the appended instruction.

## Goals / Non-Goals

**Goals:**
- Make the suggestion request byte-equivalent to the next primary request wherever the provider derives its cache key, so the conversation prefix is served from cache and only the short answer is generated.
- Keep every existing isolation guarantee: no session mutation, tool-free in effect, 15-second deadline, cancellation, no retry, no substitute model.
- Keep diagnostics honest about the reasoning level actually sent.

**Non-Goals:**
- Changing when generation starts, how the candidate is filtered, or how the editor reveals it.
- Speculatively executing the suggested prompt, as Claude Code's separate speculation feature does.
- Patching installed Pi packages or changing `a1 pi`.
- Guaranteeing a cache hit: the provider owns its cache, and a conversation whose last primary request exceeded the cache window still pays a cold read.

## Decisions

### 1. Derive the request from the agent's own loop inputs

`generate` reads `session.agent.transformContext`, `session.agent.convertToLlm`, `session.agent.sessionId`, `session.agent.thinkingBudgets`, `session.agent.transport`, `session.agent.onPayload`, and `agent.state.thinkingLevel`, and passes `{ reasoning, sessionId, thinkingBudgets, transport, onPayload, signal }` alongside the transformed and converted messages plus the appended instruction. Missing optional members fall back to today's behavior (raw filtered messages, no extra options) so fake sessions and older runtimes still work. `onResponse` is not forwarded: it exists to notify extensions about primary responses, and a background suggestion should not emit `after_provider_response` into extensions.

Alternative rejected: calling `agent.streamFunction` directly. It would also inherit the SDK's timeout, retry, and attribution-header wrapper, but those do not affect cache keys, and the existing `modelRuntime.completeSimple` seam is what the adapter tests and the opt-in provider test already fake.

### 2. Replace the lowest-effort reasoning policy with the session's level

`suggestionReasoningPolicy` returns `"unavailable"` without a model, `"ordinary"` for a model without reasoning, and otherwise the session's current thinking level (`agent.state.thinkingLevel`, defaulting to `"off"`). `generate` sends `reasoning` exactly as the loop does: `undefined` for `"off"`, the level otherwise. The diagnostic record keeps the `reasoning` field, so a capture now shows the level that was actually sent rather than the one that was avoided.

Alternative rejected: keeping the low-effort override for adaptive-thinking models only. Adaptive models already scale thinking to the task, so the override buys little, and any per-provider exception recreates the drift this change removes.

### 3. Prove parity in tests instead of measuring latency in CI

Adapter tests build a fake session whose `agent` carries `convertToLlm`, `transformContext`, `sessionId`, `thinkingBudgets`, and `transport`, seed the conversation with a `compactionSummary` message, and assert that the `completeSimple` call received the converted messages plus the instruction and the loop's options. The opt-in real-provider test gains a warm-cache probe that reports `cacheRead` usage and elapsed time for consecutive suggestion requests so the improvement can be confirmed against a live provider without making CI depend on provider timing.

## Risks / Trade-offs

- **[Risk] A high thinking level on a budget-based model makes the suggestion think longer.** → Adaptive models decide their own effort; for budget models the existing 15-second deadline still bounds the wait, and the request no longer pays the full-context re-read that dominated before.
- **[Risk] Extension `context` handlers run once more per suggestion.** → Pi already runs them for compaction and every primary turn; they are documented as pure transforms, and the suggestion never persists their output.
- **[Trade-off] Diagnostics no longer show a fixed "low" policy.** → They show the truth about the request, which is what the diagnostic requirement asks for.

## Migration Plan

No data or configuration migration is required. Rollback is the ordinary code revert.
