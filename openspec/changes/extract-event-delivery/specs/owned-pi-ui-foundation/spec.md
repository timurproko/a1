## MODIFIED Requirements

### Requirement: Bounded engine delivery supersedes only equivalent replaceable state
The owned UI SHALL bound pending event count and retained queue payload without evicting arbitrary older notifications. Intermediate complete state updates SHALL be superseded only by a newer equivalent update for the same entity, session generation, and semantic ordering segment. Updates for different transcript blocks SHALL NOT displace one another without an explicit authoritative reconciliation that preserves all final content. Coalescing SHALL NOT remove or reorder command outcomes, lifecycle/run transitions, assistant-message completion semantics, tool finalization, or other side-effect-bearing events. A newer generation SHALL NOT receive an obsolete generation's state. Sequence stamping, listener registration, the bounded queue, the per-turn drain, generation invalidation, and the overload transition SHALL be one delivery component owned by the engine adapter and testable without the adapter: it SHALL obtain the session id, generation, lazily materialized blocks, asset retention, pending-command membership, cancellation, reconciliation, and listener-failure reporting through explicit ports, while the adapter alone decides what each event means and how a saturated session is rebuilt.

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

#### Scenario: Deliver events without an engine
- **WHEN** the delivery component is driven directly with emitted events, a replaced generation, a saturating burst, and a throwing listener
- **THEN** it SHALL stamp and deliver events in order one per event-loop turn, coalesce a live block to its newest revision, invalidate the replaced generation's state, reserve pending command outcomes through one overload and hand them to the reconciliation port in arrival order, and report the listener failure through its port
- **AND** the adapter SHALL observe the same ordering, coalescing, invalidation, and recovery through its public delivery surface
