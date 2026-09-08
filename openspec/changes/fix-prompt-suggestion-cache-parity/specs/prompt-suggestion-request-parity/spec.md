## Purpose

Defines how isolated prompt-suggestion requests preserve the parent agent's model-visible context and cache-compatible configuration, and how A1 distinguishes request correctness from provider cache behavior and visible latency without exposing private session data.

## ADDED Requirements

### Requirement: Suggestions preserve the actual parent request prefix
For every supported eligible suggestion, A1 SHALL preserve the ordered model-visible context used by its originating successful assistant request, followed by that request's completed assistant response and the isolated suggestion instruction. The shared context SHALL preserve system instructions, tool definitions, included summaries and custom messages, included user-run command results, image policy, and effective supported extension transformations. A1 SHALL NOT substitute raw-role filtering, re-read a newer session state, or rerun stateful parent transformations to reconstruct the shared prefix.

#### Scenario: Suggest after compaction or branch navigation
- **WHEN** the parent request contains a model-visible compaction or branch summary
- **THEN** the suggestion request SHALL retain the same summary content and position in its shared prefix
- **AND** it SHALL include the matching completed assistant response exactly once

#### Scenario: Preserve included and excluded context
- **WHEN** the parent request includes custom context or user-run bash results and excludes another command result or image payload
- **THEN** the suggestion SHALL preserve the included model-visible content and the same exclusions or image placeholders
- **AND** it SHALL NOT reintroduce excluded image bytes or command output

#### Scenario: Extension transforms the parent request
- **WHEN** a supported extension changes the parent model-visible context or cache-relevant request configuration
- **THEN** the suggestion SHALL preserve the effective transformed shared portion
- **AND** snapshot reuse SHALL NOT invoke that parent transformation again or duplicate its side effects

### Requirement: Suggestions inherit compatible effective request configuration
A1 SHALL use the originating request's selected provider and model, system and tool configuration, effective thinking and sampling settings, configured thinking budgets, compatible output limits, and provider cache-retention and routing policy. A1 SHALL preserve the native provider session identity where the provider uses it for cache routing or affinity. A1 SHALL NOT lower reasoning, replace the model, remove tool schemas, or introduce a suggestion-only output cap as part of this optimization. Required provider context-limit enforcement and volatile authentication/request identifiers SHALL remain provider-owned and SHALL NOT be frozen for cache matching.

#### Scenario: Custom thinking budget is configured
- **WHEN** a parent request uses a configured thinking budget different from the provider default
- **THEN** the suggestion SHALL inherit that effective budget subject to the same provider validity rules
- **AND** selecting the same named reasoning level without its budget SHALL fail deterministic request conformance

#### Scenario: Provider uses an explicit prompt cache key
- **WHEN** the main request supplies a native session-derived cache key to a supporting provider
- **THEN** the suggestion SHALL supply the equivalent cache-routing identity rather than omit it or replace it with an unrelated UI session identifier

#### Scenario: Ordinary Anthropic settings already match
- **WHEN** the parent and suggestion use standard messages and default compatible Anthropic settings
- **THEN** the correction SHALL retain their matching thinking, tools, system, and output configuration
- **AND** cache-marker placement differences alone SHALL NOT be reported as proof of a server-side cache miss

#### Scenario: Credentials refresh between requests
- **WHEN** authentication changes after the parent request was captured
- **THEN** the suggestion SHALL resolve current credentials through the authenticated provider boundary
- **AND** it SHALL NOT replay a credential captured with the parent

### Requirement: Request reuse is isolated and identity checked
The reusable parent context SHALL be transient, bounded to the current candidate request, and associated with session generation, run, response, model, and effective configuration identity. A1 SHALL invalidate it on continuation, retry, compaction, session/model/configuration replacement, cancellation, feature disable, or disposal. Suggestion execution SHALL remain independent of the parent abort controller, transcript, tool execution, mutable transport continuation state, and session usage accounting. Cancellation of the suggestion SHALL NOT abort the parent or corrupt a later primary request.

#### Scenario: Parent continues while a suggestion is being prepared
- **WHEN** a newer assistant continuation or tool execution supersedes a captured response
- **THEN** A1 SHALL discard the snapshot and pending candidate before a replacement becomes current
- **AND** a late result SHALL NOT publish

#### Scenario: Provider connection is still busy
- **WHEN** the parent connection is in use when suggestion generation starts
- **THEN** generation SHALL use the provider's supported independent-request behavior without blocking settlement or forcing unsafe connection reuse
- **AND** it SHALL preserve compatible cache-routing identity independently of whether the connection can be reused

#### Scenario: Suggestion uses a reusable connection
- **WHEN** the provider publicly supports isolated background requests over an available reusable connection
- **THEN** suggestion execution SHALL preserve that optimization without replacing the primary conversation's continuation state
- **AND** aborting the suggestion SHALL leave the next main request valid

### Requirement: Faithful request capture is an explicit supported capability
A1 SHALL negotiate and validate faithful suggestion-request reuse through documented public integration APIs. Missing or incompatible capture, transformation, or isolated-completion support SHALL produce an explicit bounded unavailable outcome at the integration boundary, with a reason that diagnostics can distinguish from a model returning no suggestion. A1 SHALL NOT deep-import dependency implementation files, inspect private state, patch installed code, bypass a configured transformation, or silently issue a lossy fallback request. The main session SHALL remain usable when this optional suggestion capability is unavailable.

#### Scenario: Public API cannot expose a faithful snapshot
- **WHEN** the selected dependency or a configured transformation cannot support faithful isolated request reuse
- **THEN** compatibility evidence SHALL identify the unsupported capability and operation
- **AND** no fallback suggestion request SHALL be sent for that unsupported configuration
- **AND** the primary agent SHALL continue normally

#### Scenario: Compare the explicit vanilla profile
- **WHEN** the user launches `a1 pi` or uses a non-interactive profile
- **THEN** this capability SHALL NOT add suggestion requests or change the primary provider payload or extension lifecycle

### Requirement: Cache and latency evidence is bounded and private
A1 SHALL provide opt-in diagnostic observation of separately correlated primary and suggestion request counts, supported provider usage counters, and monotonic lifecycle timings. Evidence SHALL distinguish capture, generation start, generation completion, settlement, presentation eligibility, actual presentation when observable, cancellation, and unavailability. Missing usage or presentation data SHALL be marked unavailable rather than synthesized as zero or inferred from a render request. Diagnostic storage SHALL be bounded and SHALL NOT record credentials, header values, prompts, suggestion text, image bytes, tool arguments/results, filesystem paths, raw provider session/cache keys, or stable hashes of private content. Ordinary conversation usage/footer state SHALL NOT absorb suggestion usage.

#### Scenario: Observe a warm eligible turn
- **WHEN** diagnostic observation is enabled for a primary response and its suggestion
- **THEN** evidence SHALL separately report their available input, output, cache-read, and cache-write counters and request counts
- **AND** it SHALL distinguish suggestion generation duration from the interval after settlement before presentation

#### Scenario: Provider does not report cache usage
- **WHEN** a successful provider response omits cache counters
- **THEN** evidence SHALL identify those counters as unavailable rather than claiming a cache miss or full cache hit

#### Scenario: Diagnostic capacity is reached
- **WHEN** observation reaches its configured fixed capacity
- **THEN** it SHALL evict or summarize older records without blocking input or accumulating unbounded session content
- **AND** disabling observation SHALL stop collection and release retained diagnostic records

### Requirement: Cache optimization does not hide primary settlement latency
The suggestion path SHALL retain the existing completed-response generation boundary and settled-editor publication gate. A prepared valid suggestion SHALL be available in the same presentation cycle as settlement. A still-current result arriving later SHALL remain eligible for immediate complete presentation under the existing editor checks. A1 SHALL NOT retain the working indicator, block settlement, introduce a reveal timer, suppress suggestions solely because of cold-cache size, or generate speculatively from incomplete streaming text in this change.

#### Scenario: Result is prepared before settlement
- **WHEN** generation completes before matching settlement and the editor is eligible
- **THEN** the complete suggestion SHALL be included in the settlement presentation without an additional generation-status row or delay

#### Scenario: Provider finishes after settlement
- **WHEN** the provider completes after settlement and the editor remains eligible
- **THEN** A1 SHALL publish the complete result without an artificial wait
- **AND** evidence SHALL report the residual delay rather than claim zero-latency generation

#### Scenario: User starts typing while generation is pending
- **WHEN** the user enters or pastes a draft before the suggestion is presented
- **THEN** the existing cancellation and stale-result rules SHALL discard the suggestion without modifying the draft
