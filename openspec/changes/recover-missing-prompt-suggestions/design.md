## Context

See `proposal.md` for motivation and `specs/contextual-prompt-suggestions/spec.md` for the behavioral delta. The current shell calls `consider` only when it receives `assistant-message-completed`; `agent-run-settled` only calls `settle`. The controller records an identity as considered before applying eligibility, suppresses reconsideration of that identity, permits one request, returns to idle after every no-candidate outcome, and discards a valid candidate when presentation is temporarily blocked. An idle settlement produces no diagnostic record, so a missing activation cannot be distinguished from an absent eligible boundary after the fact.

The ordinary path is ordered and covered: a successful final assistant message starts prefetch, settlement marks the matching request ready to publish, and a valid candidate appears. There is no evidence that this happy path randomly omits the call. The user-visible symptom can instead result from four lifecycle gaps that are intentionally terminal today: no prefetch attempt, one transient no-candidate result, one temporary presentation blocker, or a timeout/failure with no retry.

## Goals / Non-Goals

**Goals:**
- Give each successful eligible final response a settlement backstop when no prefetch request started.
- Recover once from an intermittent no-candidate generation result without allowing retry loops or concurrent duplicate requests.
- Keep a valid current candidate through temporary non-user presentation blockers and reveal it when the ordinary editor is eligible.
- Make attempt origin, bounded retry, exhaustion, and deferred presentation observable through private metadata.
- Preserve cancellation, identity, request parity, filtering, and deliberate Tab/Enter behavior.

**Non-Goals:**
- Guarantee that a model produces a useful suggestion or deterministically extract text from the assistant response.
- Special-case plan approval, implementation, archival, or any other workflow wording.
- Expand the one-word allowlist or weaken candidate validation.
- Retry after user interaction, stale identity, a new run, model/session replacement, disposal, or a permanently ineligible response.
- Switch models, lower thinking, remove tools, mutate conversation, or execute a suggested action.

## Decisions

### 1. Represent one settled response as a bounded attempt lifecycle

Replace the one-shot `lastConsidered` gate with per-identity state that records eligibility, settlement, attempt count, active request, candidate, and final disposition. Keep prefetch at `assistant-message-completed` for latency. Extend authoritative settlement metadata with the final assistant response facts needed to independently reject failed, incomplete, tool-continuation, no-model, and early-conversation runs.

When `agent-run-settled` arrives for a successful eligible final response and no request started, start the first request from settlement and mark it settled so a timely candidate can publish immediately. If prefetch is active or already produced a candidate, settlement only advances that existing attempt. This guarantees a backstop without duplicating the ordinary request.

A response skipped for a permanent reason remains skipped. A response whose preparation is blocked by transient shell state records that reason and may start only when the same settled identity becomes eligible; any user-authored draft, new run, changed model/session, submission, interruption, or disposal retires the pending activation.

**Alternative rejected:** calling `consider` unconditionally a second time at settlement. The current deduplication suppresses it, and removing deduplication without explicit attempt state can create concurrent duplicate provider requests.

### 2. Allow exactly one retry for a current no-candidate attempt

A current eligible response may make at most two sequential requests. The first `empty`, `rejected`, `provider-failure`, `unavailable`, or `timeout` result schedules one retry. If the first result arrives before settlement, start the retry at settlement; if it arrives after settlement, start it immediately while identity and eligibility still match. The retry uses the identical transformed conversation, selected model, reasoning, session identity, tools, budgets, transport, payload hook, instruction, validation, and per-request deadline.

Never retry `cancelled`, `stale-result`, user-driven invalidation, or an ineligible assistant boundary. Never overlap attempts. Any candidate ends generation recovery, and a second no-candidate result records exhaustion and returns to idle. Existing cancellation paths abort the active attempt and prevent a scheduled retry. The setting and documentation will disclose up to two background requests for a response that needs recovery.

**Alternative rejected:** unlimited retry or a substitute model. Both increase cost unpredictably, weaken request parity, and can outlive the context that authorized the request.

### 3. Defer rather than discard valid candidates for temporary presentation blockers

When a valid candidate cannot be shown solely because the ordinary editor is `not-ready`, `not-focused`, showing `autocomplete`, or in a temporary `prompt-mode`, retain it under the same identity and record deferred presentation. Reevaluate it on existing readiness, focus, autocomplete, and input coordination boundaries. Publish it once when eligible, without another provider request or another terminal result for either request.

Continue to retire candidates on a user-authored draft, replacement input that changes interaction ownership, new run, changed model/session, acceptance/submission, interruption, feature disablement, or disposal. A retained candidate remains semantic ghost text only and never enters editor content until Tab.

**Alternative rejected:** retrying generation after a presentation failure. The candidate already exists; another provider request adds cost and cannot repair UI eligibility.

### 4. Make recovery evidence explicit and private

Extend bounded diagnostics with attempt number and trigger (`prefetch`, `settlement`, or `retry`) plus records for settlement without prefetch, retry exhaustion, and deferred presentation. Preserve one terminal generation outcome per request. Records remain metadata-only and exclude prompts, assistant/candidate text, tool data, raw errors, credentials, and paths.

Deterministic tests will force each transition. Real-provider probing is not required because this change concerns lifecycle behavior rather than prompt quality; manual review uses ordinary runs and the opt-in diagnostic snapshot to confirm whether recovery was used.

## Risks / Trade-offs

- **[A failed response can cost a second request]** → Cap recovery at one sequential retry, retain prompt-cache-compatible inputs, and disclose the bound in settings/docs.
- **[A retry can still return no candidate]** → Record exhaustion and leave the editor empty without fabricating fallback text.
- **[Late recovery can race with user input]** → Preserve identity and cancellation checks before every retry and publication.
- **[Settlement metadata can disagree with an earlier completion event]** → Treat authoritative final settlement facts as the backstop and fail closed on ambiguity.
- **[Deferred ghost text can become stale]** → Retain it only for non-user temporary presentation blockers and retire it on every context-changing action.

## Migration Plan

No data, setting, or session migration is required. Implement the state machine, settlement metadata, bounded retry, deferred publication, diagnostics, tests, and documentation in the existing boundaries. Rollback is an ordinary code revert; users can disable prompt suggestions independently at any time.
