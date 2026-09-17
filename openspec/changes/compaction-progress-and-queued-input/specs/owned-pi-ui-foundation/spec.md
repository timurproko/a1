## ADDED Requirements

### Requirement: Compaction progress is estimated in the working status
While a compaction is shown, bare A1 SHALL estimate its progress from the summarization stream and present it in the working status as `Compacting (n%)` beside the spinner, where `n` is an integer percent. The engine adapter SHALL observe the stream through the session agent's public stream function only while the session reports compaction in progress, SHALL count streamed summary text against an expected summary size taken from the previous compaction summary on the current branch or a fixed default when there is none, and SHALL publish the percent as engine status data separate from the semantic `Compacting` word. The percent SHALL start at 0 when the stream begins, SHALL never decrease within one compaction, SHALL NOT reach 100 while the compaction is still running, and SHALL be removed together with the compacting state when compaction ends. When the stream cannot be observed the status SHALL remain `Compacting`. This SHALL be a declared bare-A1 presentation difference; the `a1 pi` comparison route SHALL keep its existing `Compacting` label.

#### Scenario: Watch a compaction progress
- **WHEN** a compaction streams its summary and the branch holds a previous summary of 4,000 characters
- **THEN** bare A1 SHALL show `Compacting (0%)...` when the stream starts and `Compacting (50%)...` after 2,000 characters have streamed
- **AND** the label SHALL show at most `Compacting (99%)...` until the compaction ends, after which no compaction label SHALL remain

#### Scenario: First compaction without a previous summary
- **WHEN** the branch holds no previous compaction summary
- **THEN** the percent SHALL be measured against the fixed default size and SHALL still be clamped below 100 while running

#### Scenario: Stream is not observable
- **WHEN** the session agent exposes no callable stream function
- **THEN** the status SHALL show `Compacting...` without a percent and compaction SHALL proceed unchanged

#### Scenario: Comparison route
- **WHEN** the same compaction runs through `a1 pi`
- **THEN** the status SHALL show `Compacting...` without a percent

### Requirement: Input during compaction joins the pending queue and is delivered when compaction ends
A steering or follow-up submission made while a compaction is in progress SHALL be queued through the engine's own steering and follow-up queue with its attachments, SHALL appear immediately in the pending `Steering:` rows with the same edit hint as queued steering during a run, and SHALL be returned to the editor by the same dequeue action. Extension slash commands SHALL execute immediately as during a run. No submission made during compaction SHALL be dropped or replaced by a notice. When an automatic compaction ends, the engine's continuing run or pending prompt SHALL consume the queue. When a manual compaction ends, in any outcome, the engine adapter SHALL start one run from the first queued message with that message's mode and attachments and SHALL keep the remaining messages queued for that run, so every queued message reaches the agent in submission order; a failed start SHALL restore the queue and report a diagnostic.

#### Scenario: Queue during manual compaction
- **WHEN** the user submits `first` and then `second` while `/compact` is running
- **THEN** both SHALL appear as `Steering:` rows during the compaction
- **AND** when the compaction ends `first` SHALL start a run and `second` SHALL be injected into that run

#### Scenario: Queue during automatic compaction
- **WHEN** the user submits messages while a threshold compaction runs after a turn or before a pending prompt
- **THEN** they SHALL appear as `Steering:` rows and SHALL be delivered by the continuing run or the pending prompt without a separate start from the adapter

#### Scenario: Dequeue during compaction
- **WHEN** the user presses Alt+Up while messages are queued during compaction
- **THEN** every queued message SHALL return to the editor and none SHALL be sent when the compaction ends

#### Scenario: Attachments travel with a queued message
- **WHEN** a message queued during compaction carries an image attachment
- **THEN** the message delivered after compaction SHALL carry the same attachment

#### Scenario: Delivery fails to start
- **WHEN** starting the run from the first queued message after a manual compaction fails
- **THEN** the queued messages SHALL remain in the pending rows and a diagnostic SHALL be shown
