## Purpose

Defines how A1 predicts a likely next user prompt after an agent run and presents it as non-authoritative, user-controlled ghost text in the empty editor.

## ADDED Requirements

### Requirement: Eligible completing runs may produce one contextual suggestion
When prompt suggestions are enabled, bare A1 SHALL start at most one current background suggestion request for an eligible run at the earliest trustworthy final assistant-response boundary before that run settles. The boundary SHALL represent a successful completed text response with no indicated tool continuation. The request SHALL use the model selected for that run and enough conversation context including the completed response to predict what the user would naturally type next, rather than merely extracting a phrase from the final assistant text. It SHALL be eligible after at least two completed assistant messages and SHALL be independent of whether the assistant explicitly requested approval.

The request SHALL be tool-free in effect, SHALL NOT append messages to or otherwise mutate the user's session, SHALL NOT block settlement or editor input, and SHALL treat no suggestion as a valid result. A1 SHALL NOT start suggestion generation in comparison or non-interactive modes, while the feature is disabled, while a permission or other modal input is active, after a failed or incomplete assistant response, while tool continuation is indicated, or without an active model. If the run continues after an apparently terminal response, A1 SHALL invalidate that request before starting any replacement request.

#### Scenario: Predict an explicit approval response before settlement
- **WHEN** an eligible final assistant response asks the user to approve a clearly stated next action and completes without a tool continuation
- **THEN** A1 SHALL start a short likely-user-response request through the model selected for that run before final run settlement
- **AND** the main session SHALL continue settling without waiting for that request

#### Scenario: Predict a non-approval follow-up
- **WHEN** an eligible final assistant response has an obvious next step that does not use explicit approval wording
- **THEN** A1 MAY prepare that likely follow-up before settlement under the same generation and filtering rules

#### Scenario: No obvious next input exists
- **WHEN** the suggestion request produces no text or indicates that no natural next input is obvious
- **THEN** A1 SHALL leave the editor without a contextual suggestion

#### Scenario: Conversation is too early
- **WHEN** a final assistant response completes before two assistant messages exist in the current conversation
- **THEN** A1 SHALL NOT start a suggestion request

#### Scenario: Another interaction owns input
- **WHEN** a permission request, dialog, overlay, selector, replacement editor, or other modal input owns the session when a candidate response completes or the run settles
- **THEN** A1 SHALL NOT generate or reveal a contextual prompt suggestion behind that interaction

#### Scenario: Assistant continues with tools
- **WHEN** an assistant message completes with a tool-use stop or a later continuation begins before settlement
- **THEN** A1 SHALL not generate from that incomplete boundary or SHALL invalidate generation already made obsolete by the continuation

#### Scenario: Generation fails
- **WHEN** the background request is rejected, times out, is aborted, or returns a provider error
- **THEN** the primary session SHALL remain usable and no failed suggestion text or diagnostic SHALL be inserted into the conversation or editor

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

#### Scenario: A replacement input surface opens
- **WHEN** a dialog, selector, extension editor, or other replacement input surface becomes active
- **THEN** the contextual suggestion SHALL not appear on that surface

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
A1 SHALL associate each suggestion request and result with the session generation, run, candidate assistant-response sequence, and model that produced it. Starting or continuing a run after that candidate response, typing or pasting, accepting or submitting, clearing the editor, interrupting, changing model, replacing or clearing the session, disabling the feature, or disposing the shell SHALL abort pending generation and clear any unaccepted suggestion. A late result whose identity no longer matches current state SHALL be discarded.

A newly generated current suggestion SHALL replace an older unaccepted suggestion. A suggestion SHALL not be persisted in the session transcript or restored after restart or resume.

#### Scenario: User types before generation completes
- **WHEN** the user changes the editor while a suggestion request is pending
- **THEN** A1 SHALL abort or invalidate that request
- **AND** its eventual result SHALL not replace the user's text or appear later

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
Bare A1 SHALL expose a persisted A1 setting that enables or disables contextual prompt suggestions. The setting SHALL be enabled by default, SHALL disclose that enabled suggestions make an additional background request using the selected model, and SHALL take effect in the active session. Disabling it SHALL abort pending generation and clear any visible suggestion.

#### Scenario: Disable suggestions
- **WHEN** the user disables contextual prompt suggestions
- **THEN** A1 SHALL immediately clear visible suggestion state, abort pending generation, and make no later suggestion requests until re-enabled

#### Scenario: Re-enable suggestions
- **WHEN** the user re-enables contextual prompt suggestions
- **THEN** A1 SHALL consider subsequent eligible completed runs without retroactively generating for an earlier run

#### Scenario: Review the setting
- **WHEN** the user views the contextual prompt suggestion setting
- **THEN** its description SHALL state that each eligible suggestion uses an additional background request with the selected model

### Requirement: Suggestion behavior is independently observable and bounded
A1 SHALL provide deterministic test seams for suggestion generation, cancellation, request identity, and time, and SHALL verify the feature with a fake model boundary before using real provider credentials. Acceptance evidence SHALL distinguish the primary agent request from the additional suggestion request and SHALL confirm that suggestion work never invokes tools or changes persisted conversation content.

#### Scenario: Count model requests
- **WHEN** one eligible run settles and generation succeeds without cancellation
- **THEN** evidence SHALL record one primary agent request and at most one additional suggestion request

#### Scenario: Exercise a deterministic race
- **WHEN** a stale suggestion request resolves after a newer run, model, or session generation becomes current
- **THEN** deterministic evidence SHALL show that the stale text was discarded

#### Scenario: Verify session isolation
- **WHEN** suggestion generation completes or fails
- **THEN** the persisted session path and user-visible transcript SHALL contain no suggestion-generation instruction, response, or synthetic tool activity
