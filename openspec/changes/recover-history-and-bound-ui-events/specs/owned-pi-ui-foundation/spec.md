## ADDED Requirements

### Requirement: Bounded engine delivery supersedes only equivalent replaceable state
The owned UI SHALL bound pending event count and retained queue payload without evicting arbitrary older notifications. Intermediate complete state updates SHALL be superseded only by a newer equivalent update for the same entity, session generation, and semantic ordering segment. Updates for different transcript blocks SHALL NOT displace one another without an explicit authoritative reconciliation that preserves all final content. Coalescing SHALL NOT remove or reorder command outcomes, lifecycle/run transitions, assistant-message completion semantics, tool finalization, or other side-effect-bearing events. A newer generation SHALL NOT receive an obsolete generation's state.

#### Scenario: One block emits a large streaming burst
- **WHEN** many accumulated updates for the same live block arrive before delivery
- **THEN** pending replaceable state SHALL converge to its newest complete revision without retaining every intermediate payload
- **AND** after drain the displayed block SHALL contain all final content, with no event-backpressure warning

#### Scenario: Several blocks stream concurrently
- **WHEN** updates alternate among distinct assistant, thinking, and tool blocks
- **THEN** every block's newest required state SHALL remain deliverable or recoverable from authoritative state
- **AND** pressure on one block SHALL NOT silently erase another block's content or completion

#### Scenario: A semantic boundary follows pending partial state
- **WHEN** completion, settlement, a command outcome, or a side-effect-bearing status transition follows pending intermediate updates
- **THEN** delivery SHALL preserve the boundary's required state and source ordering
- **AND** a later partial SHALL NOT revive finished content, clear unrelated working state, duplicate an action, or overwrite the post-boundary view

#### Scenario: Switch sessions with events pending
- **WHEN** a session generation is replaced while old state remains queued
- **THEN** old events SHALL NOT mutate the new transcript, editor, suggestions, status, or pending commands
- **AND** accepted old operations SHALL be settled or invalidated through their defined lifecycle rather than silently forgotten

### Requirement: Event saturation has bounded explicit recovery rather than silent semantic loss
If capacity is exhausted by nonreplaceable work, the adapter SHALL use a defined bounded overload transition rather than discarding control events, growing without limit, or claiming successful delivery. Accepted pending operations SHALL receive their ordered result or an explicit typed failure/cancellation disposition. Any recovery SHALL reconcile the authoritative session state and prevent stale events from being replayed into the recovered generation. Supported ordinary streaming bursts SHALL NOT require this exceptional path. Technical overflow telemetry SHALL remain outside the normal UI.

#### Scenario: Pending work contains only protected events
- **WHEN** a synthetic nonreplaceable-event flood exhausts the protected delivery allowance
- **THEN** the adapter SHALL enter controlled recovery and stop admitting new ordinary work until its state is reconciled or the affected run is safely stopped
- **AND** no pending command SHALL hang or be reported successful solely because its outcome was discarded
- **AND** recovery/control capacity SHALL remain available without an unbounded emergency queue

#### Scenario: Explicitly flush pending delivery
- **WHEN** a caller requests a flush after a supported streaming burst
- **THEN** the flush SHALL settle only after required final state and semantic events have been delivered
- **AND** an overload or disposal that prevents delivery SHALL produce an explicit result rather than a false successful flush or indefinite wait

### Requirement: Pressure handling remains cooperative and invisible to ordinary users
Engine-event pressure SHALL be handled without delaying keyboard, pointer, or timer turns until the stream drains and without bypassing the existing presentation cadence. Normal coalescing SHALL be an internal optimization rather than a warning condition. Event-pressure counts, diagnostics, and recovery telemetry SHALL NOT enter notifications, status text, transcript, stdout, stderr, or post-exit terminal output. Developer diagnostics SHALL use bounded counters and classified transitions rather than accumulating a message every fixed number of superseded events. This restriction SHALL NOT suppress genuine user-command or provider errors unrelated to background pressure telemetry.

#### Scenario: Type while output outpaces presentation
- **WHEN** a long transcript receives sustained high-rate output while the user types, scrolls, or cancels
- **THEN** input and timed indicators SHALL continue to receive event-loop turns and current-state presentation
- **AND** streaming work per update SHALL not grow with historical transcript length
- **AND** no coalescing/backpressure notice SHALL appear in any normal user-facing output channel

#### Scenario: Inspect internal pressure evidence
- **WHEN** a developer explicitly inspects diagnostics after a burst
- **THEN** bounded evidence SHALL distinguish safely superseded state, protected queue depth, and actual overload recovery
- **AND** those counters SHALL NOT be mirrored to user-visible diagnostic lists or statuses

### Requirement: Quiet pressure handling has combined correctness evidence
Acceptance SHALL verify both absence of technical messages and successful history/event recovery under combined load. Warning-string removal, larger arbitrary queues, longer synchronous drains, or timeouts alone SHALL NOT satisfy the change.

#### Scenario: History contention overlaps a streaming burst
- **WHEN** isolated validation holds the history database beyond its former short timeout while producing high-rate assistant/tool updates and interactive input, then releases the lock
- **THEN** eligible history writes and refresh SHALL recover, final transcript and control outcomes SHALL match authoritative state, and input SHALL remain responsive
- **AND** queue/worker/timer budgets SHALL remain bounded
- **AND** captured normal UI and terminal output SHALL contain no history, coalescing, backpressure, or recovery notices
