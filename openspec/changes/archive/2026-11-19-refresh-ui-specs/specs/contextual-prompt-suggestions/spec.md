## ADDED Requirements

### Requirement: Prompt suggestions are an owned Agent-section setting
Bare A1 SHALL expose the persisted A1 setting `promptSuggestions`, labeled `Prompt suggestions`, exactly once in the owned settings screen's `Agent` section. The setting SHALL remain A1-owned: its persistence key, A1 backend, profile-local storage, default-enabled value, and live application boundary SHALL NOT belong to the engine. Its description SHALL disclose that suggestions use a background request, plus one bounded recovery request when needed, with the selected model. Disabling it SHALL abort pending generation and clear any visible suggestion.

The screen SHALL contain only one Agent section, preserving the relative order and capability filtering of engine-provided settings and placing owned Agent controls after them. The owned control SHALL remain visible and editable even when engine settings are absent, unreadable, or not writable; engine-level availability SHALL NOT be applied to it. The `a1 pi` comparison SHALL NOT install the feature.

#### Scenario: Disable suggestions
- **WHEN** the user disables contextual prompt suggestions
- **THEN** A1 SHALL immediately clear visible suggestion state, abort pending generation, and make no later suggestion requests until re-enabled

#### Scenario: Re-enable suggestions
- **WHEN** the user re-enables contextual prompt suggestions
- **THEN** A1 SHALL consider subsequent eligible completed runs without retroactively generating for an earlier run

#### Scenario: Review the setting
- **WHEN** the user views the contextual prompt suggestion setting
- **THEN** its description SHALL state that suggestions use an additional background request with the selected model
- **AND** the `Prompt suggestions` row SHALL appear in the Agent section

#### Scenario: Present the Agent section
- **WHEN** bare A1 opens settings with presentable engine settings
- **THEN** one Agent section SHALL contain those engine settings in their relative order followed by the owned Agent controls, including the single Prompt suggestions control
- **AND** no second Agent section or duplicate control SHALL be rendered

#### Scenario: Change the control from Agent
- **WHEN** the user toggles Prompt suggestions in Agent
- **THEN** the A1 profile-local setting SHALL be updated and the live suggestion behavior SHALL follow that value
- **AND** no engine-setting write SHALL occur

#### Scenario: Engine settings cannot be presented
- **WHEN** the engine is absent, reading its settings fails, it advertises no setting-write capability, or it supplies no presentable settings
- **THEN** Prompt suggestions SHALL remain visible and editable in the single Agent section through its A1 backend
- **AND** section-wide unavailable or read-only presentation SHALL NOT disable the owned control

### Requirement: Suggestion decisions have opt-in bounded local diagnostics
A1 SHALL provide a documented, opt-in local diagnostic capture and inspection path for suggestion decisions. Diagnostics SHALL distinguish ineligible/disabled decisions, prefetch or settlement request start, empty model output, candidate rejection, provider failure, timeout, cancellation, stale-result rejection, deferred or blocked presentation, successful display, retry start, and retry exhaustion. Eligibility and presentation records SHALL include a bounded reason code rather than only a boolean. Request records SHALL include a process-local correlation identity, attempt number and trigger, selected provider/model identifiers, applied reasoning policy, elapsed time, and the terminal outcome when known. One request SHALL have at most one terminal outcome; late results SHALL NOT overwrite it or count as another request.

Capture SHALL be disabled by default, retain at most 128 bounded metadata records, and perform no remote upload. Records SHALL NOT contain prompts, assistant or candidate text, tool arguments/results, credentials, raw provider errors, or session-file/worktree paths. Diagnostic capture or export failure SHALL NOT alter suggestion generation, block input, or appear in the editor, transcript, or normal status rows. Disposal SHALL clear in-memory records; file export SHALL occur only through explicit local opt-in and remain bounded. Suggestion work SHALL NOT add a suggestion-generation instruction, response, or synthetic tool activity to the persisted session or the visible transcript.

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

## MODIFIED Requirements

### Requirement: The latest valid suggestion appears as editor ghost text
A valid suggestion SHALL appear in the ordinary bare-A1 editor only after its run settles and while that editor is focused, empty, enabled, in prompt mode, and not showing autocomplete. If generation completed before settlement, A1 SHALL reveal the complete suggestion in the same presentation cycle that makes the settled editor available. A1 SHALL not progressively type the suggestion and SHALL not retain or relabel the agent's working indicator or add a generation-status row. If generation remains pending at settlement, A1 SHALL reveal the complete suggestion immediately when it becomes available without adding an artificial animation delay.

If presentation is temporarily blocked only because the ordinary editor is not ready, not focused, showing autocomplete, or in a temporary prompt mode, A1 SHALL retain the current candidate and reevaluate it when that same editor becomes eligible. Deferred presentation SHALL NOT start another provider request, duplicate a terminal request outcome, or insert text into the editor. A user-authored draft SHALL hide but not discard an already prepared or shown candidate under the existing lifecycle. A1 SHALL retire the candidate when replacement input takes ownership, a new run starts, the model/session changes, the user accepts or submits, the feature is disabled, or the shell is disposed.

The ordinary bare-A1 prompt row SHALL be marker-free: every editable row, including continuation rows, SHALL keep a blank gutter of at least one cell on each side (the configured editor padding when that is larger) whether the prompt is empty, showing a suggestion, or containing typed text. The gutter SHALL remain presentation-only and SHALL NOT consume a semantic editor-text offset. The suggestion SHALL use faint ghost styling. It SHALL preserve the ordinary caret and editor geometry, wrap by terminal display width within the content width between the gutters, and remain absent from semantic editor text, selection, clipboard, history, queued input, and submitted prompts until accepted.

A1 SHALL preserve autocomplete priority: an active slash-command, path, resource, or extension autocomplete result SHALL own Tab and its presentation instead of a contextual suggestion.

#### Scenario: Suggestion is ready before settlement
- **WHEN** an eligible suggestion finishes while its originating run is still settling and the ordinary prompt editor becomes eligible at settlement
- **THEN** the complete suggestion SHALL appear in that settlement presentation after the leading gutter in faint ghost styling, with no prompt marker
- **AND** no typing animation, retained `Working...` state, or suggestion-generation status SHALL delay it
- **AND** reading or copying the editor value SHALL still observe an empty value

#### Scenario: Suggestion finishes after settlement
- **WHEN** the run settles before its current suggestion request finishes and the editor remains eligible
- **THEN** A1 SHALL show the complete suggestion as soon as the result is available
- **AND** A1 SHALL not add an artificial reveal delay

#### Scenario: Render ordinary prompt text
- **WHEN** the ordinary bare-A1 editor is empty or contains user-entered text without a contextual suggestion
- **THEN** its prompt row SHALL show the leading gutter and no prompt marker
- **AND** typed text SHALL retain the ordinary prompt text color

#### Scenario: Wrap a long visible suggestion
- **WHEN** a valid suggestion is wider than the available editor row
- **THEN** its ghost presentation SHALL wrap within the content width between the gutters without exceeding terminal width or changing the underlying editor value

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
- **AND** the caret SHALL move immediately after the accepted text
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
## REMOVED Requirements

### Requirement: Users control background suggestion requests
**Reason**: The text narrated the control's relocation between sections and referred to an `A1` section that does not exist.
**Migration**: Covered by "Prompt suggestions are an owned Agent-section setting".

### Requirement: Suggestion behavior is independently observable and bounded
**Reason**: Its first paragraph and three scenarios prescribed test seams and acceptance evidence rather than product behaviour.
**Migration**: The diagnostic behaviour is kept by "Suggestion decisions have opt-in bounded local diagnostics"; test and acceptance practice is owned by the shared delivery workflow.

### Requirement: Contextual suggestions preserve the inset main-prompt prefix
**Reason**: It required a `❯` marker that the ordinary prompt does not render; the prompt is marker-free with a blank gutter.
**Migration**: The gutter and wrapping rules are stated in "The latest valid suggestion appears as editor ghost text".
