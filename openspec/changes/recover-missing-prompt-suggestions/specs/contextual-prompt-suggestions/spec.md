## MODIFIED Requirements

### Requirement: Eligible completing runs may produce one contextual suggestion
When prompt suggestions are enabled, bare A1 SHALL prepare one contextual suggestion lifecycle for a successful eligible final assistant response. A1 SHOULD start the first background request at the earliest trustworthy completed-response boundary before settlement. If the matching successful eligible run settles and no request started, A1 SHALL start that first request from the authoritative settlement boundary instead of silently leaving the lifecycle idle. The boundary SHALL represent completed text with no tool continuation, use the model selected for that run, include the completed response, and remain ineligible before two completed assistant messages exist.

The lifecycle SHALL have at most one active request and at most two sequential requests in total. Suggestion work SHALL be tool-free in effect, SHALL NOT append messages to or otherwise mutate the user's session, SHALL NOT block settlement or editor input, and SHALL treat an exhausted no-suggestion result as valid. A1 SHALL NOT start suggestion generation in comparison or non-interactive modes, while the feature is disabled, while a permission or other modal input remains active, after a failed or incomplete assistant response, while tool continuation is indicated, or without an active model. If the run continues after an apparently terminal response, A1 SHALL invalidate that lifecycle before starting any replacement request.

#### Scenario: Predict an explicit approval response before settlement
- **WHEN** an eligible final assistant response asks the user to approve a clearly stated next action and completes without a tool continuation
- **THEN** A1 SHOULD start a short likely-user-response request through the model selected for that run before final run settlement
- **AND** the main session SHALL continue settling without waiting for that request

#### Scenario: Predict a non-approval follow-up
- **WHEN** an eligible final assistant response has an obvious next step that does not use explicit approval wording
- **THEN** A1 MAY prepare that likely follow-up before settlement under the same generation and filtering rules

#### Scenario: No obvious next input exists
- **WHEN** both bounded suggestion requests produce no text or indicate that no natural next input is obvious
- **THEN** A1 SHALL leave the editor without a contextual suggestion

#### Scenario: Conversation is too early
- **WHEN** a final assistant response completes before two assistant messages exist in the current conversation
- **THEN** A1 SHALL NOT start a prefetch, settlement fallback, or retry

#### Scenario: Another interaction owns input
- **WHEN** a permission request, dialog, overlay, selector, replacement editor, or other modal input owns the session when a candidate response completes or the run settles
- **THEN** A1 SHALL NOT generate or reveal a contextual prompt suggestion behind that interaction

#### Scenario: Assistant continues with tools
- **WHEN** an assistant message completes with a tool-use stop or a later continuation begins before settlement
- **THEN** A1 SHALL not generate from that incomplete boundary or SHALL invalidate generation already made obsolete by the continuation
- **AND** settlement SHALL NOT reinterpret it as an eligible final response

#### Scenario: Generation fails
- **WHEN** both bounded background requests are rejected, time out, are aborted, or return provider errors
- **THEN** the primary session SHALL remain usable and no failed suggestion text or diagnostic SHALL be inserted into the conversation or editor

#### Scenario: Settlement recovers a missing prefetch
- **WHEN** a successful eligible final response reaches authoritative run settlement without a request having started
- **THEN** A1 SHALL start the first request for that settled response
- **AND** a timely valid current result SHALL be eligible for immediate ghost-text presentation

#### Scenario: Settlement does not duplicate active work
- **WHEN** the matching prefetch request is active or has already produced a candidate at settlement
- **THEN** settlement SHALL advance that lifecycle without starting another request

### Requirement: The latest valid suggestion appears as editor ghost text
A valid suggestion SHALL appear in the ordinary bare-A1 editor only after its run settles and while that editor is focused, empty, enabled, in prompt mode, and not showing autocomplete. If generation completed before settlement, A1 SHALL reveal the complete suggestion in the same presentation cycle that makes the settled editor available. A1 SHALL not progressively type the suggestion and SHALL not retain or relabel the agent's working indicator or add a generation-status row. If generation remains pending at settlement, A1 SHALL reveal the complete suggestion immediately when it becomes available without adding an artificial animation delay.

If presentation is temporarily blocked only because the ordinary editor is not ready, not focused, showing autocomplete, or in a temporary prompt mode, A1 SHALL retain the current candidate and reevaluate it when that same editor becomes eligible. Deferred presentation SHALL NOT start another provider request, duplicate a terminal request outcome, or insert text into the editor. A1 SHALL retire the candidate when a user-authored draft or replacement input takes ownership, a new run starts, the model/session changes, the user accepts or submits, the feature is disabled, or the shell is disposed.

The ordinary bare-A1 prompt row SHALL use the same `❯` glyph and glyph foreground style as the shared settings search input whether it is empty, showing a suggestion, or containing typed text; the glyph SHALL remain presentation-only and shall not consume a semantic editor-text offset. The suggestion SHALL use that input's quiet placeholder styling. It SHALL preserve the ordinary caret and editor geometry, wrap by terminal display width after reserving the glyph width, and remain absent from semantic editor text, selection, clipboard, history, queued input, and submitted prompts until accepted.

A1 SHALL preserve autocomplete priority: an active slash-command, path, resource, or extension autocomplete result SHALL own Tab and its presentation instead of a contextual suggestion.

#### Scenario: Suggestion is ready before settlement
- **WHEN** an eligible suggestion finishes while its originating run is still settling and the ordinary prompt editor becomes eligible at settlement
- **THEN** the complete suggestion SHALL appear in that settlement presentation after the shared grey `❯` prompt glyph using the same quiet style as the `search settings` placeholder
- **AND** no typing animation, retained `Working...` state, or suggestion-generation status SHALL delay it
- **AND** reading or copying the editor value SHALL still observe an empty value

#### Scenario: Suggestion finishes after settlement
- **WHEN** the run settles before its current suggestion request finishes and the editor remains eligible
- **THEN** A1 SHALL show the complete suggestion as soon as the result is available
- **AND** A1 SHALL not add an artificial reveal delay

#### Scenario: Render ordinary prompt text
- **WHEN** the ordinary bare-A1 editor is empty or contains user-entered text without a contextual suggestion
- **THEN** its prompt row SHALL retain the shared settings-search `❯` glyph and glyph color
- **AND** typed text SHALL retain the ordinary prompt text color

#### Scenario: Wrap a long visible suggestion
- **WHEN** a valid suggestion is wider than the available editor row
- **THEN** its ghost presentation SHALL wrap within the width remaining after the prompt glyph without exceeding terminal width or changing the underlying editor value

#### Scenario: Editor already contains a draft
- **WHEN** a valid suggestion arrives while the editor contains user text
- **THEN** the draft SHALL remain unchanged and the suggestion SHALL not be displayed

#### Scenario: Autocomplete is active
- **WHEN** contextual suggestion state exists and ordinary autocomplete is visible
- **THEN** autocomplete SHALL remain visible and SHALL retain ownership of Tab
- **AND** the contextual suggestion SHALL not be painted or accepted
- **AND** a valid current candidate SHALL remain eligible for presentation after autocomplete closes

#### Scenario: A replacement input surface opens
- **WHEN** a dialog, selector, extension editor, or other replacement input surface becomes active
- **THEN** the contextual suggestion SHALL not appear on that surface
- **AND** interaction ownership SHALL retire it so it cannot appear later as stale text

#### Scenario: Candidate arrives before editor readiness
- **WHEN** a valid current candidate is ready after settlement while the ordinary editor is temporarily not ready
- **THEN** A1 SHALL retain it and present it when the same editor becomes ready
- **AND** A1 SHALL make no additional suggestion request

#### Scenario: Focus temporarily blocks presentation
- **WHEN** a valid current candidate cannot be shown because the ordinary editor is not focused
- **THEN** A1 SHALL defer presentation until focus returns to that same editor
- **AND** the candidate SHALL remain inert throughout the deferral

### Requirement: Suggestion behavior is independently observable and bounded
A1 SHALL provide deterministic test seams for suggestion generation, cancellation, request identity, attempt trigger, and time, and SHALL verify the feature with a fake model boundary before using real provider credentials. Acceptance evidence SHALL distinguish the primary agent request from up to two sequential suggestion requests and SHALL confirm that suggestion work never invokes tools or changes persisted conversation content.

A1 SHALL provide a documented, opt-in local diagnostic capture and inspection path for suggestion decisions. Diagnostics SHALL distinguish ineligible/disabled decisions, prefetch or settlement request start, empty model output, candidate rejection, provider failure, timeout, cancellation, stale-result rejection, deferred or blocked presentation, successful display, retry start, and retry exhaustion. Eligibility and presentation records SHALL include a bounded reason code rather than only a boolean. Request records SHALL include a process-local correlation identity, attempt number and trigger, selected provider/model identifiers, applied reasoning policy, elapsed time, and the terminal outcome when known. One request SHALL have at most one terminal outcome; late results SHALL NOT overwrite it or count as another request.

Capture SHALL be disabled by default, retain at most 128 bounded metadata records, and perform no remote upload. Records SHALL NOT contain prompts, assistant or candidate text, tool arguments/results, credentials, raw provider errors, or session-file/worktree paths. Diagnostic capture or export failure SHALL NOT alter suggestion generation, block input, or appear in the editor, transcript, or normal status rows. Disposal SHALL clear in-memory records; file export SHALL occur only through explicit local opt-in and remain bounded.

#### Scenario: Count model requests
- **WHEN** one eligible run settles and its first generation succeeds without cancellation
- **THEN** evidence SHALL record one primary agent request and exactly one suggestion request
- **AND** no settlement fallback or retry SHALL start

#### Scenario: Exercise a deterministic race
- **WHEN** a stale suggestion request resolves after a newer run, model, or session generation becomes current
- **THEN** deterministic evidence SHALL show that the stale text was discarded

#### Scenario: Verify session isolation
- **WHEN** suggestion generation completes or fails
- **THEN** the persisted session path and user-visible transcript SHALL contain no suggestion-generation instruction, response, or synthetic tool activity

#### Scenario: Inspect a missing suggestion
- **WHEN** local capture is enabled and an eligible response ends without a visible suggestion
- **THEN** inspection SHALL distinguish missing prefetch, empty output, invalid candidate, provider failure, timeout, cancellation, stale result, deferred/blocked presentation, and exhausted retry according to the actual observed outcome
- **AND** absence of a suggestion SHALL NOT alone be labeled a timeout or model abstention

#### Scenario: No request was started
- **WHEN** capture is enabled and a response is permanently ineligible because suggestions are disabled, the conversation is too early, no model is active, or the response failed or continues with tools
- **THEN** inspection SHALL show the applicable eligibility reason and SHALL NOT claim a provider request occurred

#### Scenario: Cancellation wins a late-result race
- **WHEN** cancellation retires a request and the provider subsequently resolves it
- **THEN** inspection SHALL preserve its cancellation outcome and identify the late result as discarded without another terminal outcome or retry

#### Scenario: Diagnostics are private and bounded
- **WHEN** more than 128 diagnostic records are produced, including failures containing sensitive raw error text
- **THEN** retained/exported records SHALL remain bounded, evict older records as needed, and contain only the permitted metadata
- **AND** disabled capture SHALL retain and export no suggestion diagnostic records

#### Scenario: Diagnostic sink fails
- **WHEN** enabled diagnostic capture or local export fails
- **THEN** the primary session and suggestion lifecycle SHALL continue normally without transcript, editor, or status-row diagnostic output

#### Scenario: Inspect a recovered missing activation
- **WHEN** settlement starts the first request because prefetch did not start
- **THEN** diagnostics SHALL identify settlement as the attempt trigger without recording conversation or candidate text

#### Scenario: Inspect bounded retry
- **WHEN** the first request fails and the retry succeeds or exhausts recovery
- **THEN** diagnostics SHALL identify both ordered attempts, their terminal outcomes, and the final display or exhaustion

#### Scenario: Inspect deferred presentation
- **WHEN** a valid candidate waits for a temporary presentation blocker to clear
- **THEN** diagnostics SHALL distinguish deferred presentation from empty generation or provider failure

### Requirement: Suggestion requests reuse the primary request shape for prompt-cache continuity
A1 SHALL build every initial or retry request from the same inputs the primary agent loop would use for its next request: the run's selected provider and model, the session's current thinking level and thinking budgets, the session identifier, the configured transport, the primary loop's payload hook, and the conversation produced by the primary loop's context transform and LLM message conversion. The only difference from that primary request SHALL be the appended suggestion instruction. A1 SHALL NOT substitute a different reasoning effort, output limit, tool list, or message filtering for recovery, so a provider that caches the conversation prefix can serve it from cache. This policy SHALL NOT change the primary session's model, thinking setting, persisted settings, or conversation, and SHALL NOT emit provider-response notifications to extensions for a suggestion request.

Each request SHALL retain a finite deadline of 15 seconds from its own generation start, remain cancellable, and start no substitute-model request. One response SHALL have at most two sequential requests and never more than one active request. A timeout of the first current eligible attempt MAY start the one bounded retry; a retry timeout SHALL end recovery. A1 SHALL NOT lengthen the main run's working state or block the editor while waiting for a suggestion. Suggestion diagnostics SHALL record the reasoning level actually sent.

#### Scenario: Main session uses high thinking
- **WHEN** an eligible run used high thinking on a model with a per-request reasoning control
- **THEN** every suggestion attempt SHALL use that same high level with the same provider, model, thinking budgets, and session identifier
- **AND** subsequent primary requests SHALL retain the user's high-thinking setting

#### Scenario: Conversation contains a compaction summary
- **WHEN** the session's messages include a compaction summary, branch summary, shell execution, or custom message
- **THEN** every suggestion attempt SHALL carry the same converted user messages the primary loop would send in their place
- **AND** SHALL NOT drop or reorder them relative to the primary request

#### Scenario: Model has no reasoning control
- **WHEN** the selected model does not support reasoning controls
- **THEN** every suggestion attempt SHALL omit reasoning options exactly as the primary loop does and retain the same deadline and isolation guarantees

#### Scenario: Deadline expires before a result
- **WHEN** a suggestion request has not completed within 15 seconds
- **THEN** A1 SHALL cancel and retire that attempt without exposing an error in the prompt or changing the main session
- **AND** enabled private diagnostics SHALL distinguish timeout from an intentional empty response
- **AND** a later provider result SHALL NOT revive that attempt

#### Scenario: Retry preserves request parity
- **WHEN** a current response receives its one retry
- **THEN** inspection SHALL show the same model, reasoning, identity inputs, transformed prefix, tools, and runtime options as the first attempt
- **AND** the primary session settings and messages SHALL remain unchanged

#### Scenario: Retry timeout is exhausted
- **WHEN** the retry reaches its finite deadline
- **THEN** A1 SHALL retire it, record exhaustion, and ignore any later provider result

## ADDED Requirements

### Requirement: Missing candidates receive one bounded recovery attempt
When the first current request for a successful eligible settled response ends with `empty`, `rejected`, `provider-failure`, `unavailable`, or `timeout`, A1 SHALL permit exactly one sequential retry while the response identity and editor lifecycle remain current. A result received before settlement SHALL defer the retry until matching settlement; a result received after settlement MAY start the retry immediately. The retry SHALL use the same request construction and candidate validation as the first attempt.

A1 SHALL NOT overlap attempts, make more than two requests for one response, retry a candidate, retry a cancelled or stale attempt, or retry after user input, submission, a new run, interruption, model/session replacement, feature disablement, or disposal. If the retry also produces no candidate, A1 SHALL leave the editor empty and record bounded exhaustion without extracting fallback text from the assistant response.

#### Scenario: First provider attempt fails transiently
- **WHEN** the first request returns `provider-failure` for a current eligible response and the retry returns a valid candidate
- **THEN** A1 SHALL present the retry candidate after settlement
- **AND** evidence SHALL show exactly two sequential requests

#### Scenario: First attempt returns no candidate before settlement
- **WHEN** the first request returns `empty` or `rejected` before its run settles
- **THEN** A1 SHALL wait for matching settlement before starting its one retry

#### Scenario: Recovery is exhausted
- **WHEN** both bounded requests finish without a valid candidate
- **THEN** A1 SHALL leave the editor empty, record retry exhaustion, and start no third request

#### Scenario: User action cancels recovery
- **WHEN** the user types, submits, interrupts, or starts another run before a scheduled or active retry completes
- **THEN** A1 SHALL retire that recovery and SHALL NOT publish its eventual result
