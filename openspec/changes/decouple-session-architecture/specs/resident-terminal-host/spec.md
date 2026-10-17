# resident-terminal-host Delta

## ADDED Requirements

### Requirement: The attach client's interaction is a pure state machine
The attach client SHALL model its tab list, viewed tab, view transition, interaction mode, hover, failure, notices, and pending requests in one state type stepped by a pure function from events to effects. Interaction mode SHALL be one enumerated value, so at most one of popup, rename, confirm-close, or drag is active, and key, mouse, and paste precedence SHALL be resolved by that one value. The role loop SHALL own only the handshake, reader threads, the outer terminal, bindings, settings observation, encoding, and effect application. The simulator SHALL be able to drive the attach core with seeded server messages and input.

#### Scenario: A popup is open when a close is requested
- **WHEN** a close action arrives while the context menu is open
- **THEN** the mode SHALL change from popup to confirm-close or close in one step
- **AND** no frame SHALL show the menu and the confirmation together

#### Scenario: A view transition completes
- **WHEN** the requested tab's complete surface arrives after its list snapshot was staged
- **THEN** one transition SHALL commit the tabs, the viewed tab, and the surface together
- **AND** any mode that belonged to the previous viewed tab SHALL be cleared in that same step

#### Scenario: The simulator drives the attach core
- **WHEN** the seeded simulator feeds interleaved server messages, key, mouse, paste, resize, and focus events
- **THEN** every step SHALL yield at most one mode, a paint effect after every state change, and no send effect after an exit effect

### Requirement: Registry commits and viewer fan-out go through one path
Every registry mutation in the resident server SHALL go through one transaction helper that mutates under the lock, bumps the revision, clones the document, releases the lock, and commits with bounded duration. Every surface or control frame addressed to the clients viewing a tab SHALL go through one fan-out helper. Holder respawn, the restart budget, explicit child restart, and result replies SHALL each have one implementation shared by the attach, holder, bridge, and lifecycle handlers.

#### Scenario: A handler mutates a tab record
- **WHEN** any role handler changes a tab's record
- **THEN** it SHALL apply the change through the registry transaction helper
- **AND** the revision SHALL advance exactly once for that change

#### Scenario: A lock is poisoned during a transaction
- **WHEN** the runtime lock is poisoned
- **THEN** the transaction helper SHALL report one typed failure
- **AND** no partial document SHALL be committed

### Requirement: Role reader threads never block on recovery waits
A holder or bridge reader thread SHALL NOT sleep for a restart delay or block waiting for a recovery slot. Delays and slot waits SHALL be expressed as timer effects of the server core and completed by supervision, so input from that peer is processed while the wait is pending.

#### Scenario: A child restart is delayed by the budget
- **WHEN** a holder exits and the restart budget schedules a delayed restart
- **THEN** the holder's reader thread SHALL continue processing its frames during the delay
- **AND** the restart SHALL start when the timer effect completes

#### Scenario: Recovery slots are exhausted
- **WHEN** a respawn needs a recovery slot and none is free
- **THEN** the wait SHALL be a pending timer effect rather than a blocked thread
- **AND** the respawn SHALL proceed when a slot is released
