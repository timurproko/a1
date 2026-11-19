## MODIFIED Requirements

### Requirement: Compaction progress is estimated in the working status
While a compaction is shown, bare A1 SHALL estimate its progress from the summarization stream and present it in the working status as `Compacting(n%)` beside the spinner, where `n` is an integer percent. The engine adapter SHALL observe the stream through the session agent's public stream function only between the compaction's start and end, SHALL count streamed summary text against an expected summary size taken from the previous compaction summary on the current branch or a fixed default when there is none, and SHALL publish the percent as engine status data separate from the semantic `Compacting` word. When the bound session exposes a callable stream function, the percent SHALL start at 0 immediately when compaction starts, including while summary preparation and provider authentication are pending; it SHALL never decrease within one compaction; estimated text progress SHALL NOT exceed 99 while the summary stream is active; and the progress SHALL reach 100 only when that stream completes normally. Stream completion SHALL NOT end, abort, or otherwise control the compaction. The progress SHALL be removed together with the compacting state when the real compaction-end lifecycle event arrives. When the stream cannot be observed the status SHALL remain `Compacting`. This SHALL be a declared bare-A1 presentation difference; the `a1 pi` comparison route SHALL keep its existing `Compacting` label.

#### Scenario: Enter observable compaction before streaming
- **WHEN** bare A1 receives `compaction_start` from a bound session with a callable public stream function and summary preparation or provider authentication is still pending
- **THEN** bare A1 SHALL immediately show `Compacting(0%)...`

#### Scenario: Watch a compaction progress
- **WHEN** a compaction streams its summary and the branch holds a previous summary of 4,000 characters
- **THEN** bare A1 SHALL retain `Compacting(0%)...` until summary text streams and SHALL show `Compacting(50%)...` after 2,000 characters have streamed
- **AND** the estimated label SHALL show at most `Compacting(99%)...` while summary text can still arrive

#### Scenario: Finish an observable summary stream
- **WHEN** the active summary stream completes normally after estimated progress reached 99
- **THEN** bare A1 SHALL show `Compacting(100%)...` without ending or aborting the compaction
- **AND** the real compaction-end event SHALL remove the compaction label and progress

#### Scenario: Summary stream fails or becomes stale
- **WHEN** summary observation throws, is disposed, or belongs to a superseded compaction generation
- **THEN** bare A1 SHALL NOT publish `100%` from that observation
- **AND** the real session lifecycle SHALL remain responsible for clearing or replacing the compacting state

#### Scenario: First compaction without a previous summary
- **WHEN** the branch holds no previous compaction summary
- **THEN** the percent SHALL be measured against the fixed default size and estimated text progress SHALL still be clamped below 100 until the stream completes normally

#### Scenario: Stream is not observable
- **WHEN** the session agent exposes no callable stream function
- **THEN** the status SHALL show `Compacting...` without a percent and compaction SHALL proceed unchanged

#### Scenario: Comparison route
- **WHEN** the same compaction runs through `a1 pi`
- **THEN** the status SHALL show `Compacting...` without a percent
