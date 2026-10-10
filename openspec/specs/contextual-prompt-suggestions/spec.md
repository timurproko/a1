# contextual-prompt-suggestions Specification

## Purpose

Defines how A1 predicts a likely next user prompt after an agent run and presents it as non-authoritative, user-controlled ghost text in the empty editor.

## Requirements

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

### Requirement: Suggestions are bounded and user-voiced
A1 SHALL expose only a single-line suggestion that represents one likely next user action in the user's voice. A valid suggestion SHALL contain between 2 and 12 words and fewer than 100 characters, except that an established single-word affirmation, negation, action, or slash command MAY be accepted. A1 SHALL reject multiple sentences, markup, terminal-control characters, model errors, meta-commentary about producing a suggestion, assistant-voiced text, evaluative pleasantries, and empty output.

A generated suggestion SHALL be data only. It SHALL NOT constitute approval, permission, command execution, or submission until the user explicitly accepts and submits it.

#### Scenario: Model returns a concise user response
- **WHEN** generation returns `go ahead and merge it`
- **THEN** A1 SHALL make that text eligible for presentation

#### Scenario: Model returns assistant-voiced prose
- **WHEN** generation returns text beginning with wording such as `I'll`, `Let me`, or `Here's`
- **THEN** A1 SHALL discard it without changing the editor

#### Scenario: Model returns unsafe formatting or excess content
- **WHEN** generation returns multiple lines, Markdown formatting, terminal-control characters, multiple sentences, more than 12 words, or at least 100 characters
- **THEN** A1 SHALL discard it without displaying a truncated or partially accepted form

#### Scenario: Suggestion resembles authorization
- **WHEN** a valid suggestion says to continue, apply, merge, deploy, or perform another consequential action
- **THEN** A1 SHALL still treat it only as inert ghost text until the user accepts it into the editor and separately submits it

### Requirement: The latest valid suggestion appears as editor ghost text
A valid suggestion SHALL appear in the ordinary bare-A1 editor only after its run settles and while that editor is focused, empty, enabled, in prompt mode, and not showing autocomplete. If generation completed before settlement, A1 SHALL reveal the complete suggestion in the same presentation cycle that makes the settled editor available. A1 SHALL not progressively type the suggestion and SHALL not retain or relabel the agent's working indicator or add a generation-status row. If generation remains pending at settlement, A1 SHALL reveal the complete suggestion immediately when it becomes available without adding an artificial animation delay.

If presentation is temporarily blocked only because the ordinary editor is not ready, not focused, showing autocomplete, or in a temporary prompt mode, A1 SHALL retain the current candidate and reevaluate it when that same editor becomes eligible. Deferred presentation SHALL NOT start another provider request, duplicate a terminal request outcome, or insert text into the editor. A user-authored draft SHALL hide but not discard an already prepared or shown candidate under the existing lifecycle. A1 SHALL retire the candidate when replacement input takes ownership, a new run starts, the model/session changes, the user accepts or submits, the feature is disabled, or the shell is disposed.

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

### Requirement: Acceptance and submission remain two deliberate actions
When a contextual suggestion is visible, the configured `tui.input.tab` action SHALL accept the complete suggestion into the ordinary editor, place the caret at its end, and leave it editable. Acceptance SHALL NOT submit the prompt. The existing submit action SHALL send the accepted text only when the user invokes it afterward. Pressing submit on an otherwise empty editor SHALL remain a no-op.

#### Scenario: Accept with Tab
- **WHEN** a contextual suggestion is visible and the user invokes `tui.input.tab`
- **THEN** the complete suggestion SHALL become ordinary editable editor text in the same text color as current typed prompts
- **AND** the `❯` glyph SHALL retain the shared settings-search prompt color and the caret SHALL move immediately after the accepted text
- **AND** no prompt SHALL have been submitted

#### Scenario: Submit after acceptance
- **WHEN** the user accepts a suggestion and then invokes the ordinary submit action
- **THEN** A1 SHALL submit the accepted or subsequently edited text through the normal prompt path exactly once
- **AND** that submitted text SHALL enter prompt history normally

#### Scenario: Press Enter without accepting
- **WHEN** a contextual suggestion is visible over an empty editor and the user invokes submit
- **THEN** A1 SHALL not submit the suggestion or start an agent run

#### Scenario: User edits the accepted text
- **WHEN** the user accepts a suggestion and changes it before submitting
- **THEN** A1 SHALL submit only the edited editor text and SHALL not restore or separately submit the original suggestion

### Requirement: Suggestion lifecycle rejects stale work
A1 SHALL associate each suggestion request and result with the session generation, run, candidate assistant-response sequence, and model that produced it. Starting or continuing a run after that candidate response, accepting or submitting, interrupting, changing model, replacing or clearing the session, replacing the input surface, disabling the feature, or disposing the shell SHALL abort pending generation and clear any unaccepted suggestion. A late result whose identity no longer matches current state SHALL be discarded.

Typing, pasting, deleting, or clearing draft text SHALL abort pending generation but SHALL NOT discard a suggestion that has already been prepared or shown. While the editor contains text the suggestion SHALL NOT be painted, accepted, or submitted, and Tab and the submit action SHALL act on the draft as they do without a suggestion. When the editor becomes empty again and is otherwise eligible, the same suggestion SHALL reappear in that presentation cycle without a new request, a new diagnostic outcome, or an artificial delay. Every supported character-deletion, whole-draft deletion, and non-shutdown clear route SHALL reevaluate this eligibility after synchronizing autocomplete with the resulting text; autocomplete created by a removed draft SHALL NOT remain active over an empty editor or prevent the retained suggestion from repainting. The final Backspace that removes a multi-character draft SHALL restore the suggestion through the production terminal frame path, not only make it observable through a direct component render. A prepared suggestion whose run settles while the editor still contains a draft SHALL be discarded as blocked by that draft.

A newly generated current suggestion SHALL replace an older unaccepted suggestion. A suggestion SHALL not be persisted in the session transcript or restored after restart or resume.

#### Scenario: User types before generation completes
- **WHEN** the user changes the editor while a suggestion request is pending
- **THEN** A1 SHALL abort or invalidate that request
- **AND** its eventual result SHALL not replace the user's text or appear later

#### Scenario: User types over a visible suggestion and deletes the draft
- **WHEN** a suggestion is visible in the empty editor, the user types one or more characters, and then deletes them so the editor is empty again
- **THEN** the suggestion SHALL not be painted while the draft exists
- **AND** the same suggestion SHALL reappear as ghost text once the editor is empty
- **AND** Tab SHALL then accept it and no additional suggestion request SHALL have been made

#### Scenario: Repeated Backspace restores an unaccepted suggestion
- **WHEN** a visible unaccepted suggestion is hidden by a multi-character draft and the user removes that draft one character at a time with Backspace
- **THEN** the suggestion SHALL remain hidden while any draft character remains
- **AND** the final Backspace SHALL repaint the same suggestion in the emitted terminal frame for the now-empty prompt
- **AND** restoration SHALL not require another input event, direct component render, model request, or diagnostic outcome

#### Scenario: Draft removal closes its autocomplete before restoring the suggestion
- **WHEN** text typed over a visible suggestion activates ordinary autocomplete and a supported deletion action removes the complete draft
- **THEN** autocomplete derived from that removed draft SHALL relinquish presentation and Tab ownership when the editor becomes empty
- **AND** the original contextual suggestion SHALL be painted in that same presentation cycle
- **AND** the restoration SHALL produce neither another model request nor another terminal diagnostic outcome

#### Scenario: User clears the draft with the clear shortcut
- **WHEN** a suggestion is visible, the user types a draft, and then presses the clear shortcut once so the editor is emptied without shutting down
- **THEN** the suggestion SHALL reappear in the emptied editor

#### Scenario: User submits after typing over a suggestion
- **WHEN** a suggestion is visible and the user types a different prompt and submits it
- **THEN** A1 SHALL submit only the typed text
- **AND** the suggestion SHALL be cleared and SHALL not reappear when the editor is empty after submission

#### Scenario: A new agent run starts
- **WHEN** a suggestion is pending or visible and a new prompt, steering message, follow-up, retry, or compaction starts an agent run
- **THEN** A1 SHALL clear the suggestion and prevent its old request from publishing

#### Scenario: Session is replaced
- **WHEN** the user starts, resumes, imports, forks, or clones into another session while generation is pending
- **THEN** A1 SHALL abort the request and SHALL not display its result in the replacement session

#### Scenario: Model changes
- **WHEN** the selected model changes before a pending result is published
- **THEN** A1 SHALL discard that result rather than presenting text generated by the former model as current

#### Scenario: Suggestion is not persisted
- **WHEN** a session containing a visible but unaccepted suggestion is closed and resumed
- **THEN** the resumed editor SHALL not restore that suggestion from session history

### Requirement: Users control background suggestion requests
Bare A1 SHALL expose the persisted A1 setting `promptSuggestions`, labeled `Prompt suggestions`, exactly once in the owned settings screen's existing `Agent` section rather than `A1`. This named presentation-grouping exception SHALL NOT transfer the setting to the engine: its persistence key, A1-owned backend, profile-local storage, default-enabled value, and live application boundary SHALL remain unchanged. The setting SHALL disclose that enabled suggestions make an additional background request using the selected model. Disabling it SHALL abort pending generation and clear any visible suggestion.

The screen SHALL contain only one Agent section, preserving the relative order and capability filtering of engine-provided settings and placing this owned control after them. No duplicate suggestion control or empty A1 section SHALL remain because of the move. The owned control SHALL remain visible and editable even when engine settings are absent, unreadable, or not writable; engine-level availability SHALL NOT be misapplied to it. Other A1 controls and the `a1 pi` comparison SHALL retain their existing grouping and behavior.

#### Scenario: Disable suggestions
- **WHEN** the user disables contextual prompt suggestions
- **THEN** A1 SHALL immediately clear visible suggestion state, abort pending generation, and make no later suggestion requests until re-enabled

#### Scenario: Re-enable suggestions
- **WHEN** the user re-enables contextual prompt suggestions
- **THEN** A1 SHALL consider subsequent eligible completed runs without retroactively generating for an earlier run

#### Scenario: Review the setting
- **WHEN** the user views the contextual prompt suggestion setting
- **THEN** its description SHALL state that each eligible suggestion uses an additional background request with the selected model
- **AND** the `Prompt suggestions` row SHALL appear in Agent, not A1

#### Scenario: Present the existing Agent section
- **WHEN** bare A1 opens settings with presentable engine settings
- **THEN** one Agent section SHALL contain those engine settings in their existing relative order followed by the single Prompt suggestions control
- **AND** no second Agent section, duplicate control, or now-empty A1 section SHALL be rendered
- **AND** Scroll, History, and other controls SHALL retain their existing placement

#### Scenario: Change the control from Agent
- **WHEN** the user toggles Prompt suggestions in Agent
- **THEN** the existing A1 profile-local setting SHALL be updated and the live suggestion behavior SHALL follow that value
- **AND** no engine-setting write, Pi settings-file mutation, or setting-value migration SHALL occur

#### Scenario: Preserve a saved opt-out
- **WHEN** a profile already stores `promptSuggestions` as false before the control is relocated and A1 restarts
- **THEN** the Agent control SHALL still show false and suggestion requests SHALL remain disabled
- **AND** the move SHALL NOT reset the value to its default or copy it into engine settings

#### Scenario: Engine settings cannot be presented
- **WHEN** the engine is absent, reading its settings fails, it advertises no setting-write capability, or it supplies no presentable settings
- **THEN** Prompt suggestions SHALL remain visible and editable in the single Agent section through its A1 backend
- **AND** unavailable engine settings SHALL remain filtered according to their existing rules
- **AND** section-wide unavailable or read-only presentation SHALL NOT falsely disable the owned control

#### Scenario: Find and operate the moved control
- **WHEN** the user searches for Agent or Prompt suggestions, jumps between sections, or changes the control using keyboard or pointer input
- **THEN** the settings surface SHALL address the same single entry with its existing backend, value, shared controls, and live behavior
- **AND** refreshing settings SHALL NOT recreate a duplicate or change the control's identity

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

### Requirement: Prediction prioritizes a clear offered next action
For an otherwise eligible run, A1 SHALL instruct the suggestion model to prefer a clearly offered next action that agrees with the user's recent intent. An optional alternative SHALL NOT by itself be treated as evidence that no natural continuation exists. The instruction SHALL distinguish an optional alternative from genuinely unresolved choices, contradictory user intent, and outstanding required assessment; those conditions SHALL retain the ability to produce no suggestion.

Prediction SHALL remain contextual rather than a deterministic extraction of assistant wording. A1 SHALL NOT synthesize an approval from quoted assistant text when the model returns nothing, fails, or is cancelled. Existing eligibility, candidate bounds, filtering, settlement, and explicit acceptance/submission requirements SHALL remain in force.

#### Scenario: Archive offer with an optional testing alternative
- **WHEN** the conversation records accepted merged work and the final assistant response says `Say archive it` to perform its stated closeout, with `let me test` offered only as an optional alternative
- **THEN** the suggestion request SHALL include the completed response and guidance favoring that concrete continuation rather than abstention solely because the optional alternative exists
- **AND** a timely current model result of `archive it` SHALL pass validation and appear when the ordinary settled editor is eligible
- **AND** that ghost text SHALL neither record acceptance nor perform archival until the user accepts and submits it

#### Scenario: Required validation remains outstanding
- **WHEN** the user has explicitly required testing before closeout and the conversation has not established that testing is complete
- **THEN** prediction guidance SHALL NOT favor archival merely because the assistant mentioned it
- **AND** a no-suggestion result SHALL remain valid

#### Scenario: Equally unresolved alternatives
- **WHEN** an assistant offers materially different choices without a clear default or user preference
- **THEN** prediction guidance SHALL preserve abstention instead of directing the model to select the first quoted response

#### Scenario: Empty or failed generation after a clear offer
- **WHEN** generation returns no suggestion or fails despite a clear offered next action
- **THEN** A1 SHALL leave the editor empty and classify the actual outcome in enabled private diagnostics
- **AND** A1 SHALL NOT insert an extracted approval as a fallback

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
