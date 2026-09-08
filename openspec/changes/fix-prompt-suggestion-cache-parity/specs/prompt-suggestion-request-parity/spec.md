## Purpose

Defines the context and settings A1 preserves when reconstructing isolated prompt-suggestion requests with current public APIs, the configurations it explicitly skips, and the private evidence used to assess cache behavior and remaining latency.

## ADDED Requirements

### Requirement: Supported suggestions preserve reconstructible conversation context
For an eligible response in a supported configuration, A1 SHALL build the suggestion context from an identity-bound copy of the public session messages, system prompt, tool definitions, selected model, and relevant settings at the completed-response boundary. The ordered context SHALL retain compaction and branch summaries, model-visible custom messages, included user-run command results, and the matching completed assistant response exactly once, followed by the isolated prediction instruction. It SHALL apply the main request's supported message-conversion and image-blocking policy and SHALL NOT discard context solely because its stored role differs from user, assistant, or tool result.

This contract covers reconstructible public inputs, not an exact snapshot of arbitrary extension-transformed provider payloads. Unsupported transformations SHALL be handled by the explicit configuration policy below, rather than reconstructed by replaying their hooks.

#### Scenario: Preserve summaries and custom context
- **WHEN** an eligible session contains compaction or branch summaries and model-visible custom messages
- **THEN** the suggestion SHALL contain their converted text in conversation order
- **AND** it SHALL include the candidate assistant response once before the prediction instruction

#### Scenario: Preserve included bash and excluded content
- **WHEN** one user-run command result is included in model context and another is excluded
- **THEN** the suggestion SHALL retain the included result and omit the excluded result
- **AND** entries intended only for UI or extension persistence SHALL NOT become model input

#### Scenario: Honor blocked images
- **WHEN** image reading is disabled for the supported parent configuration
- **THEN** the suggestion SHALL use the same image placeholders as the main path instead of sending the image bytes
- **AND** ordinary text and enabled image content SHALL otherwise retain the public conversion semantics

#### Scenario: Public state changes after capture
- **WHEN** the session messages or settings change after the suggestion context is copied
- **THEN** the pending request SHALL NOT read those mutable objects to replace its captured inputs
- **AND** a change that invalidates the originating response SHALL prevent publication

### Requirement: Request-mutating extension configurations are explicitly unsupported
A1 SHALL determine suggestion support from public loaded-extension metadata and supported provider capabilities, not from the mere presence of extensions. Active context, provider-payload, or provider-header transformation hooks whose effective changes cannot be reconstructed SHALL make suggestions unavailable for that configuration. A1 SHALL conservatively treat even an observation-only handler on one of those mutating hook surfaces as unsupported in this release. It SHALL neither invoke those hooks a second time nor send a suggestion that silently bypasses them.

Unavailability SHALL produce a bounded machine-readable reason distinct from a valid empty prediction, without exposing extension names, paths, or private content. Unknown metadata SHALL fail closed for that configuration. Unsupported configurations SHALL NOT prevent generation in otherwise supported sessions, block the primary agent, disable the user's persisted setting, or create a generation-status row.

#### Scenario: No request-transforming extensions are active
- **WHEN** an eligible configured built-in provider is used with no active request-transforming hooks
- **THEN** A1 SHALL generate using the corrected public context and settings without requiring an upstream request-snapshot API

#### Scenario: Extension only adds UI or persistent context
- **WHEN** an extension contributes UI, tools, or persistent model-visible messages without an unsupported request-transforming hook
- **THEN** its presence alone SHALL NOT suppress suggestions
- **AND** its persistent context SHALL participate through ordinary public message conversion

#### Scenario: Extension modifies the outgoing request
- **WHEN** an active extension registers a context, provider-payload, or provider-header transformation hook
- **THEN** A1 SHALL skip the suggestion with an unsupported-transformation reason
- **AND** the primary request SHALL still run its extension hooks normally and only once

#### Scenario: Extension inventory changes or cannot be classified
- **WHEN** extension reload or changed/unknown metadata invalidates a pending request's support classification
- **THEN** A1 SHALL discard that pending suggestion
- **AND** it SHALL classify later eligible responses independently instead of retaining a globally unavailable state

### Requirement: Suggestions retain applicable public model and request settings
For supported configurations, A1 SHALL retain the selected provider/model, public system prompt and tool schemas, named reasoning level, configured thinking budgets, and applicable model/default sampling, cache-retention, and output-limit policy. The authenticated runtime SHALL continue resolving current credentials and configured provider defaults. A1 SHALL NOT substitute a cheaper model, lower reasoning, remove tool schemas, add a suggestion-only output cap, or persist credentials to improve apparent latency. Provider-required context-window clamping SHALL remain authoritative.

#### Scenario: Preserve a custom thinking budget
- **WHEN** a supported parent configuration uses a custom high-reasoning budget of 4096 tokens
- **THEN** the suggestion SHALL pass that configured budget rather than silently use the provider's default high budget
- **AND** default configurations SHALL retain their existing matching thinking behavior

#### Scenario: Keep provider defaults and validity limits
- **WHEN** the selected model or authenticated provider configuration supplies supported sampling or cache defaults
- **THEN** the suggestion SHALL use the same selected model and runtime policy
- **AND** any output-limit adjustment required by the appended context SHALL respect provider validity rather than force byte equality

#### Scenario: Settings change during a run or pending generation
- **WHEN** relevant model, thinking, image, or provider settings change so the response's configuration can no longer be established
- **THEN** A1 SHALL skip or invalidate that candidate rather than generate or publish under an assumed parent configuration
- **AND** later stable eligible responses SHALL remain supported

#### Scenario: Credentials refresh
- **WHEN** credentials refresh between the main request and suggestion dispatch
- **THEN** the suggestion SHALL resolve fresh credentials through the authenticated runtime without replaying stored authorization headers

### Requirement: Cache routing does not share primary continuation state
For providers supporting session-derived cache routing, A1 SHALL pass the native engine/provider session identity rather than an unrelated UI identifier. Codex suggestions SHALL use an independent SSE request with that cache-routing identity, even when the main agent uses automatic or WebSocket transport. This deliberate suggestion-only transport choice SHALL NOT change the main transport, acquire its WebSocket entry, replace its cached continuation, or clear that continuation on suggestion failure/cancellation. Other providers SHALL retain compatible public transport behavior; unsupported transport combinations SHALL return an explicit unavailable outcome rather than use private transport state.

#### Scenario: OpenAI supports a prompt cache key
- **WHEN** a supported OpenAI or Codex request uses a session-derived prompt cache key
- **THEN** the suggestion SHALL include the equivalent native cache-routing identity
- **AND** evidence SHALL NOT claim that the key guarantees a provider cache hit

#### Scenario: Main Codex socket is idle or busy
- **WHEN** a Codex suggestion starts while the primary WebSocket is idle or busy
- **THEN** the suggestion SHALL use the independent SSE path in both cases
- **AND** the main connection's continuation state and settlement SHALL remain unaffected

#### Scenario: Cancel a Codex suggestion before the next primary prompt
- **WHEN** a pending Codex suggestion fails or is cancelled and the user submits another primary prompt
- **THEN** the next primary request SHALL remain valid and use its normal transport/continuation policy
- **AND** no suggestion message SHALL have entered its conversation history

### Requirement: Correction preserves the existing suggestion lifecycle
A1 SHALL keep the existing eligible completed-response generation boundary, one-current-request policy, deadline, cancellation, output filtering, settled-editor checks, and separate accept/submit actions. A prepared valid suggestion SHALL be available in the settlement presentation cycle; a later valid result SHALL be presented immediately when the editor remains eligible. A1 SHALL NOT retain a working indicator, wait for suggestions before settlement, add a reveal timer, speculate during streaming, or introduce a cold-context size threshold in this correction.

Captured data and unaccepted results SHALL remain transient and SHALL be released on completion, invalidation, disable, or disposal. Suggestion execution SHALL NOT invoke tools, mutate persisted sessions, change primary request behavior, or add suggestion usage to ordinary session/footer totals. Comparison and non-interactive modes SHALL remain unaffected.

#### Scenario: Suggestion is ready before settlement
- **WHEN** generation completes before matching settlement and the editor is eligible
- **THEN** the complete suggestion SHALL join the settlement presentation without another wait or status row

#### Scenario: Suggestion arrives late or user types
- **WHEN** a current result arrives after settlement
- **THEN** it SHALL appear immediately if the existing editor checks pass
- **AND** typing or pasting before publication SHALL invalidate it without modifying the draft

#### Scenario: Run or session is superseded
- **WHEN** continuation, tool execution, retry, compaction, session/model replacement, disable, or disposal invalidates a candidate
- **THEN** late completion SHALL NOT publish or restore its captured context

#### Scenario: Use vanilla or inspect primary accounting
- **WHEN** `a1 pi` or a non-interactive profile runs, or the primary session's transcript and usage totals are inspected
- **THEN** this correction SHALL not add suggestion requests to those profiles or suggestion content/usage to the primary accounting

### Requirement: Basic cache and latency observations remain private and truthful
A1 SHALL expose opt-in bounded diagnostic observations of suggestion outcome/reason, generation duration, available primary and suggestion usage counters separately, request counts at the observed inference boundary, and result availability relative to settlement when those times are known. Absent or unobservable metrics SHALL be marked unavailable rather than synthesized as cache misses, hits, or painted frames. A render request or completed prediction SHALL NOT be described as proof of actual terminal presentation.

Diagnostic records SHALL NOT include credentials, headers, conversation/suggestion text, image bytes, tool arguments/results, paths, raw session/cache keys, or stable hashes of private content. Observation SHALL not block input or inference and SHALL not enable automatic remote telemetry or unbounded retention. The existing explicit provider probe SHALL distinguish deterministic request correctness from measured cache/latency improvement; terminal-visible delay remains a manual acceptance observation.

#### Scenario: Inspect a supported prediction
- **WHEN** diagnostic observation is enabled and a prediction completes
- **THEN** evidence SHALL report available generation timing and usage separately from the parent
- **AND** it SHALL distinguish result-before-settlement from result-after-settlement without claiming a paint timestamp

#### Scenario: Provider metrics are absent
- **WHEN** a provider or observation boundary does not expose cache usage or individual retry attempts
- **THEN** evidence SHALL describe that limitation rather than interpreting absent counters as zero or claiming a count of unobserved network attempts

#### Scenario: Observation is disabled or fails
- **WHEN** no diagnostic observer is configured, its bounded capacity is reached, or the observer fails
- **THEN** A1 SHALL not accumulate unbounded records or block the main session
- **AND** disabling observation SHALL release any retained records owned by that observation
