## Purpose

Defines bounded provider retry progress, attempt-aware terminal failure reporting, and an explicit finite continuation path after automatic retries are exhausted.

## ADDED Requirements

### Requirement: Agent-level retry progress names the active finite budget
Bare A1 SHALL present an agent-level automatic retry as non-persistent working status that includes the retry number and the effective retry limit reported by the engine. The retry number SHALL count automatic retries, not the initial provider request. Retry progress SHALL retain the existing working-state placement, cancellation behavior, and configured backoff; it SHALL NOT be added to the conversation transcript or represented as a completed assistant response. Provider-level retries SHALL remain a separate engine concern and SHALL NOT be added to this count.

#### Scenario: Wait for an automatic retry
- **WHEN** the initial provider request fails retryably and the engine schedules automatic retry 2 of a configured limit of 10
- **THEN** bare A1 SHALL show non-persistent working status containing `Retrying (2/10)`
- **AND** the initial request SHALL not be described as retry 1

#### Scenario: A later retry succeeds
- **WHEN** an automatic retry returns a successful assistant response
- **THEN** retry working status SHALL clear through the ordinary run lifecycle
- **AND** A1 SHALL NOT show an exhaustion failure or continuation action

#### Scenario: The user cancels the retry wait
- **WHEN** the user cancels while an automatic retry is waiting
- **THEN** the retry wait SHALL end through the existing interrupt path
- **AND** A1 SHALL NOT describe that cancellation as retry-budget exhaustion or offer automatic continuation

#### Scenario: A provider performs its own internal retry
- **WHEN** a provider-level transport implementation retries below the agent session
- **THEN** that internal request SHALL NOT increment the agent-level `Retrying (current/limit)` count

### Requirement: Retry exhaustion reports requests and retries without hiding the cause
When a retryable provider request exhausts the effective agent-level budget, bare A1 SHALL present one terminal failure that states both the total request attempts and the number of automatic retries, retains the bounded provider error text, and offers the continuation shortcut only when continuation is available. Total request attempts SHALL equal the initial request plus completed automatic retries. The failure SHALL remain part of the visible failed turn until ordinary transcript lifecycle replaces or removes it; it SHALL not expose credentials, request bodies, or transport internals that the provider error did not already expose.

#### Scenario: Exhaust three automatic retries
- **WHEN** an initial retryable provider request and three automatic retries all fail with `fetch failed`
- **THEN** the terminal failure SHALL state `Request failed after 4 attempts (3 automatic retries): fetch failed`
- **AND** it SHALL not ambiguously describe the run as only three attempts

#### Scenario: Exhaust the configured maximum of ten
- **WHEN** the effective retry limit is 10 and every eligible request fails
- **THEN** the terminal failure SHALL state 11 total attempts and 10 automatic retries
- **AND** no eleventh automatic retry SHALL start

#### Scenario: Fail without automatic retry eligibility
- **WHEN** the engine classifies a provider error as non-retryable or automatic retry is disabled
- **THEN** A1 SHALL retain the ordinary provider failure presentation
- **AND** it SHALL not invent an exhausted retry count or a keep-retrying action

#### Scenario: Preserve a bounded provider diagnostic
- **WHEN** the terminal provider error already contains a bounded diagnostic
- **THEN** the attempt-aware failure SHALL retain that diagnostic after the count
- **AND** it SHALL not add request content, credentials, headers, or an unbounded response body

### Requirement: Exhausted work can be continued only by an explicit finite action
Bare A1 SHALL declare `Ctrl+R` as the keep-retrying action while the current failed turn is continuable after retry exhaustion. Accepting it SHALL continue that turn from the engine's retained context with a fresh instance of the effective finite automatic-retry budget. It SHALL preserve the current editor draft, keep the original user message and image attachments exactly once, and SHALL NOT replay a completed tool call or append a duplicate user message as part of admitting the continuation. A1 SHALL never invoke the action automatically, and every newly exhausted budget SHALL require another explicit action.

The action SHALL be disarmed when a different prompt is accepted, the session is replaced, continuation succeeds, or the engine reports that the failed turn cannot be continued. Outside that state, `Ctrl+R` SHALL NOT dispatch a stale retry command. The `a1 pi` comparison profile SHALL retain the selected pinned Pi package's own key handling and SHALL NOT receive A1's contextual shortcut.

#### Scenario: Continue an exhausted text turn
- **WHEN** a retryable text turn exhausts its budget and the user presses `Ctrl+R` while continuation is available
- **THEN** one continuation SHALL start from the retained failed-turn context with a fresh finite budget
- **AND** the editor draft SHALL remain unchanged
- **AND** no duplicate user message SHALL be appended

#### Scenario: Continue an exhausted image turn
- **WHEN** a prompt with image attachments exhausts its budget and the user invokes keep retrying
- **THEN** the continuation SHALL retain the original text and image context exactly once
- **AND** A1 SHALL not require the user to reconstruct or repaste the attachments

#### Scenario: Continue after completed tools
- **WHEN** the retained failed turn contains completed tool calls and results
- **THEN** accepting keep retrying SHALL preserve those calls and results as context
- **AND** A1 SHALL not execute those completed calls again merely to reconstruct the turn
- **AND** any subsequent tool execution SHALL require a new model tool request through the ordinary tool lifecycle

#### Scenario: The continued budget also exhausts
- **WHEN** a user-started continuation exhausts its fresh automatic-retry budget
- **THEN** the run SHALL stop again with an updated attempt-aware failure
- **AND** another continuation SHALL require another explicit `Ctrl+R`

#### Scenario: Continuation is stale or unavailable
- **WHEN** another prompt has been accepted, the session has changed, or the engine refuses continuation
- **THEN** A1 SHALL not dispatch the previous failed turn
- **AND** no keep-retrying hint SHALL claim that continuation is available

#### Scenario: Use the comparison profile
- **WHEN** the reader uses `a1 pi`
- **THEN** A1 SHALL not install its contextual `Ctrl+R` retry action or its owned retry-exhaustion presentation in that profile
