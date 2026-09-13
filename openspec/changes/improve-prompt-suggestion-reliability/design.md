## Context

See `proposal.md` for motivation and `specs/contextual-prompt-suggestions/spec.md` for the behavioral delta. This design is needed because the change crosses prediction instructions, request construction, controller lifecycle, and diagnostic plumbing.

At base `bd390775`, the predictor appends `CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION` to the selected model's context. It prefers concrete follow-ups but also permits empty output when the user should assess the result. `PiEngineAdapter.generate` inherits the main session's thinking level, reduces several unsuccessful results to `text: null`, and rejects tool-call results without execution. `ContextualPromptSuggestionController` has a 15-second deadline, catches failures silently, and drops invalid or stale candidates. The shell supplies boolean eligibility/presentation checks, which obscure why generation or display did not happen.

The supplied screenshot shows a completed merge/cleanup response explicitly offering `archive it`, followed by an optional `let me test` alternative, and an empty editor with high thinking selected. It does not show whether a request started, its duration, or its response. Timeout and ambiguity are hypotheses, not established causes. The existing normalizer accepts `archive it`; this is not evidence that the archive phrase needs a special filter exception.

## Goals / Non-Goals

**Goals:** Preserve the existing single-request lifecycle while separating prediction quality, request latency, and UI suppression into independently testable outcomes. Make the reported shape a named regression fixture and make future misses diagnosable without collecting conversation contents.

**Non-Goals:** Guaranteed output on every turn; regex extraction of assistant instructions; speculative approval; extra retries; a second model; changing the two-assistant-message threshold; suggestion cache parity or exact extension-transformed context reconstruction; dependency upgrades; new suggestion UI/status/settings controls; changing archive workflow rules or the comparison shell.

## Decisions

### 1. Improve prediction guidance, not forced fallback

Revise the next-input instruction to rank a clear offered action consistent with recent user intent above a merely optional alternative. Include a short archive-offer example and a counterexample where the user requires testing first. Keep the instruction generic: archive is a regression case, not a product-specific action parser. Preserve abstention for unresolved choices, failed responses, and required assessment.

Retain contextual model generation and the existing strict candidate filter. Test `archive it` through both adapter normalization and controller publication. Do not add `archive` to a single-word allowlist just to fix this two-word case, and do not relax formatting, voice, length, or control-character checks.

**Alternative rejected:** Extracting `Say ...` or retrying after empty output could make this screenshot appear fixed, but would bypass contextual judgment, mask provider failures, add cost, or suggest an action that conflicts with prior user instructions.

### 2. Isolate suggestion reasoning from main-session thinking

Construct request-local reasoning options using the selected model's supported capability metadata and the existing public model-runtime boundary. Choose the lowest supported effort, omit reasoning controls for ordinary non-reasoning models, and leave the primary session untouched. Verify provider mappings during implementation rather than assuming every provider accepts an `off` or `minimal` value. Unsupported settings or provider failures receive explicit outcomes, not an automatic second attempt.

Keep the existing 15-second deadline and selected model. Do not add an aggressive universal token limit that could consume its entire budget on provider-required reasoning. If a model cannot finish within the deadline, it remains a diagnosed miss rather than blocking input. Capture the applied policy so a provider's constraints can be distinguished from accidentally inherited high thinking.

**Alternatives rejected:** Raising the timeout alone prolongs silent failures; switching to a smaller model changes the selected-model contract; mutating the session's thinking level risks affecting the next main request. Low effort is a latency improvement to validate, not a guarantee of provider response time.

### 3. Preserve typed outcomes before information is lost

Extend the internal neutral generator result with a bounded discriminated outcome: candidate, empty output, rejected output, provider failure, unavailable request, or cancellation. Retain immutable request identity and candidate text only where needed for existing display; diagnostic projection never includes that text. Keep the controller's defensive normalization for generators that return an invalid candidate. Validation must reject impossible outcome/text combinations.

Replace opaque shell eligibility and presentation booleans at the diagnostic boundary with reason-coded decisions, while retaining their existing behavior. Enumerate disabled, early conversation, no active model, failed/incomplete response, tool continuation, and input/presentation suppression. Input-specific details can distinguish draft, modal, autocomplete, focus, and prompt mode without recording input text.

The controller owns lifecycle terminal outcomes. Record start once; then displayed, empty, rejected, provider failure/unavailable, timeout, cancellation, stale identity, or presentation blocked. A prepared candidate is not terminal until shown or retired. Store terminal state before aborting so an abort rejection cannot overwrite timeout or cancellation. Late callbacks may produce a nonterminal `late-result-discarded` record, but cannot create another request or terminal outcome. Eviction of older diagnostic records must not affect this lifecycle invariant.

**Alternative rejected:** Logging only the final `null` would still conflate provider abstention with filtering and errors, and logging raw exceptions would leak request data.

### 4. Opt-in metadata-only diagnostic capture

Use an injected, no-op-by-default diagnostic observer and a bounded local collector. Retain at most 128 records, with capped scalar fields and no arbitrary payloads; use a 64 KiB ceiling for serialized exports. Correlate by a process-local opaque session token and run/response/request sequence rather than session paths or globally identifying session IDs. Allow only event/reason codes, provider/model IDs, applied reasoning policy, elapsed milliseconds, and lifecycle correlation fields. Sanitize and cap even provider/model identifiers before export.

Provide a documented launch-time opt-in destination for a local diagnostic snapshot, wired through the product's existing launch-option conventions rather than a new interactive settings row. Enabling it installs the collector; an off-by-default observer alone is insufficient because a maintainer must be able to inspect misses from a real UI session. Coalesce asynchronous bounded snapshot writes to that explicitly selected destination, with at most one pending latest snapshot; never append an unbounded event log. Clear memory on disposal. No remote upload, transcript message, editor text, footer, or working indicator is added. Sink errors are isolated from generation and rendering and never include raw error text in the capture.

**Alternative rejected:** Always-on logs create unnecessary retention and privacy risk. A test-only callback cannot explain a maintainer's intermittent real-session miss. A visible debug row would change the accepted quiet UI contract.

### 5. Separate deterministic correctness from model-quality evidence

Use fake time and injected generators to exercise the archive offer end-to-end with a known `archive it` result before and after settlement. Request inspection proves the final response and amended guidance were supplied, not that a real model will always follow them. Cover every outcome, a timeout with ignored abort, cancellation races, bounded diagnostic export, disabled capture, sink failure, and unchanged primary session settings and persistence.

After deterministic coverage, use a credential-gated opt-in provider probe with a sanitized multi-turn accepted-merge fixture and its validation-required counterexample. Compare the original and revised request policies over five requests per variant of the archive fixture on the reported selected model where available. Report candidate counts, elapsed times, timeout/empty/rejection counts, and the applied reasoning policy; do not publish raw conversation/provider dumps. Five samples are a smoke comparison, not a statistical guarantee. Require at least one real `archive it` or equivalent concise archival continuation to establish that the target case works; otherwise leave quality acceptance open and investigate the recorded reason. Verify the counterexample does not treat required testing as optional.

Manual acceptance must additionally verify ghost-text rendering, Tab acceptance without submission, separate Enter submission, typing cancellation, settings opt-out, and the unchanged main thinking level. Do not use an actual archive execution as a prerequisite to testing suggestion presentation.

## Risks / Trade-offs

- [Lowest effort may reduce prediction quality] -> Keep context and conservative abstention; compare positive and negative provider fixtures instead of asserting that faster means correct.
- [Provider latency or rate limiting can still exceed 15 seconds] -> Record the actual outcome and retain a responsive empty editor; do not promise guaranteed suggestions.
- [Reasoning capabilities differ across models] -> Validate supported request options at the existing runtime boundary and test reasoning and non-reasoning models separately.
- [Lifecycle races produce misleading diagnostics] -> A single terminal-outcome owner, fake-time race tests, and nonterminal late-discard records prevent outcome rewriting.
- [Opt-in file writing creates I/O pressure or sensitive retention] -> Bounded allowlisted snapshots, coalesced nonblocking writes, explicit local destination, and no default capture/upload.
- [Existing context reconstruction loses some model-visible messages] -> Do not revive the cancelled cache-parity project here; retain this known limitation and diagnose misses without claiming exact request parity.

## Migration Plan

No settings or session-data migration is needed. The accepted suggestion setting remains the rollout/disable control. Introduce the typed outcome and diagnostic observer coherently across the adapter, controller, shell, and tests in the later implementation stream. Document the concrete diagnostic launch syntax with that implementation. Rollback is a code revert or disabling prompt suggestions; diagnostic snapshots are disposable local files and never session state.
