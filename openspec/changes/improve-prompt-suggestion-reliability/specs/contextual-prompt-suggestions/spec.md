## ADDED Requirements

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

### Requirement: Suggestion generation uses an independent bounded latency policy
A1 SHALL use the run's selected provider and model for its isolated suggestion request without inheriting the primary session's reasoning effort. Where the provider supports a per-request reasoning control, A1 SHALL request its lowest supported effort suitable for a short prediction; models without that control SHALL use their supported ordinary completion path. This policy SHALL NOT change the primary session's model, thinking setting, persisted settings, or conversation.

Each request SHALL retain a finite deadline of 15 seconds from generation start, remain cancellable, and start no automatic retry or substitute-model request. A timeout SHALL prevent any later result from publishing even if the provider ignores cancellation. A1 SHALL NOT lengthen the main run's working state or block the editor while waiting for a suggestion.

#### Scenario: Main session uses high thinking
- **WHEN** an eligible run used high thinking and its selected model supports a lower per-request reasoning effort
- **THEN** the suggestion request SHALL use that lower effort with the same provider and model
- **AND** subsequent primary requests SHALL retain the user's high-thinking setting

#### Scenario: Model has no reasoning control
- **WHEN** the selected model does not support reasoning controls
- **THEN** the suggestion request SHALL omit unsupported reasoning options and retain the same deadline and isolation guarantees

#### Scenario: Deadline expires before a result
- **WHEN** a suggestion request has not completed within 15 seconds
- **THEN** A1 SHALL cancel and retire it without retrying, exposing an error in the prompt, or changing the main session
- **AND** enabled private diagnostics SHALL distinguish timeout from an intentional empty response
- **AND** a later provider result SHALL NOT revive the suggestion

## MODIFIED Requirements

### Requirement: Suggestion behavior is independently observable and bounded
A1 SHALL provide deterministic test seams for suggestion generation, cancellation, request identity, and time, and SHALL verify the feature with a fake model boundary before using real provider credentials. Acceptance evidence SHALL distinguish the primary agent request from the additional suggestion request and SHALL confirm that suggestion work never invokes tools or changes persisted conversation content.

A1 SHALL provide a documented, opt-in local diagnostic capture and inspection path for suggestion decisions. Diagnostics SHALL distinguish ineligible/disabled decisions, request start, empty model output, candidate rejection, provider failure, timeout, cancellation, stale-result rejection, blocked presentation, and successful display. Eligibility and presentation records SHALL include a bounded reason code rather than only a boolean. Request records SHALL include a process-local correlation identity, selected provider/model identifiers, applied reasoning policy, elapsed time, and the terminal outcome when known. One request SHALL have at most one terminal outcome; late results SHALL NOT overwrite it or count as another request.

Capture SHALL be disabled by default, retain at most 128 bounded metadata records, and perform no remote upload. Records SHALL NOT contain prompts, assistant or candidate text, tool arguments/results, credentials, raw provider errors, or session-file/worktree paths. Diagnostic capture or export failure SHALL NOT alter suggestion generation, block input, or appear in the editor, transcript, or normal status rows. Disposal SHALL clear in-memory records; file export SHALL occur only through explicit local opt-in and remain bounded.

#### Scenario: Count model requests
- **WHEN** one eligible run settles and generation succeeds without cancellation
- **THEN** evidence SHALL record one primary agent request and at most one additional suggestion request

#### Scenario: Exercise a deterministic race
- **WHEN** a stale suggestion request resolves after a newer run, model, or session generation becomes current
- **THEN** deterministic evidence SHALL show that the stale text was discarded

#### Scenario: Verify session isolation
- **WHEN** suggestion generation completes or fails
- **THEN** the persisted session path and user-visible transcript SHALL contain no suggestion-generation instruction, response, or synthetic tool activity

#### Scenario: Inspect a missing suggestion
- **WHEN** local capture is enabled and an eligible request ends without a visible suggestion
- **THEN** inspection SHALL distinguish empty output, invalid candidate, provider failure, timeout, cancellation, stale result, or blocked presentation according to the actual observed outcome
- **AND** absence of a suggestion SHALL NOT alone be labeled a timeout or model abstention

#### Scenario: No request was started
- **WHEN** capture is enabled and a candidate response is ineligible because suggestions are disabled, the conversation is too early, input is owned elsewhere, no model is active, or the response failed or continues with tools
- **THEN** inspection SHALL show the applicable eligibility reason and SHALL NOT claim a provider request occurred

#### Scenario: Cancellation wins a late-result race
- **WHEN** cancellation retires a request and the provider subsequently resolves it
- **THEN** inspection SHALL preserve its cancellation outcome and identify the late result as discarded without another terminal outcome

#### Scenario: Diagnostics are private and bounded
- **WHEN** more than 128 diagnostic records are produced, including failures containing sensitive raw error text
- **THEN** retained/exported records SHALL remain bounded, evict older records as needed, and contain only the permitted metadata
- **AND** disabled capture SHALL retain and export no suggestion diagnostic records

#### Scenario: Diagnostic sink fails
- **WHEN** enabled diagnostic capture or local export fails
- **THEN** the primary session and suggestion lifecycle SHALL continue normally without transcript, editor, or status-row diagnostic output
