# resident-terminal-host Delta

## ADDED Requirements

### Requirement: The attach client's interaction is a pure state machine
The attach client SHALL model its tab list, viewed tab, view transition, settings tab visibility, pending jump, deferred input, interaction mode, hover, failure, notices, and pending requests in one state type stepped by a pure function from events to effects. Interaction mode SHALL be one enumerated value, so at most one of popup, rename, or drag is active, and key, mouse, and paste precedence SHALL be resolved by that one value. The role loop SHALL own only the handshake, reader threads, the outer terminal, bindings, settings observation, encoding, and effect application. The simulator SHALL be able to drive the attach core with seeded server messages and input.

#### Scenario: A rename is requested while the context menu is open
- **WHEN** the rename action is chosen from the open context menu
- **THEN** the mode SHALL change from popup to rename in one step
- **AND** no frame SHALL show the menu and the rename editor together

#### Scenario: Input arrives while a view change is pending
- **WHEN** keys or a paste arrive after a tab switch was requested and before its surface arrived
- **THEN** the input SHALL be held, within the existing byte and frame limits, by the view transition for the tab it targets
- **AND** when the transition commits, input held for that tab SHALL be delivered to it in order and input held for any other target SHALL be dropped, exactly as the current attach client does

#### Scenario: A view transition completes
- **WHEN** the requested tab's complete surface arrives after its list snapshot was staged
- **THEN** one transition SHALL commit the tabs, the viewed tab, and the surface together
- **AND** any mode that belonged to the previous viewed tab SHALL be cleared in that same step

#### Scenario: The simulator drives the attach core
- **WHEN** the seeded simulator feeds interleaved server messages, key, mouse, paste, resize, and focus events
- **THEN** every step SHALL yield at most one mode, a paint effect after every state change, and no send effect after an exit effect

### Requirement: Registry commits and viewer fan-out go through one path
Every registry mutation in the resident server SHALL advance the revision through one bump function, stage its commit through one snapshot function while the lock is held, and commit after the lock is released through one commit path with bounded duration. Every lookup of the clients viewing a tab SHALL go through one viewer helper, and the runtime lock SHALL be taken through one function that reports a poisoned lock as one error. Holder respawn orders, the crash-restart budget, explicit child restart, surface subscription and bridge visibility pushes, and result bodies SHALL each have one implementation shared by the attach, holder, bridge, and lifecycle handlers.

#### Scenario: A handler mutates a tab record
- **WHEN** any role handler changes a tab's record
- **THEN** the revision SHALL advance exactly once for that change through the bump function
- **AND** the commit SHALL run on a snapshot taken under the lock, after the lock is released

#### Scenario: The runtime lock is poisoned
- **WHEN** a handler takes the poisoned runtime lock
- **THEN** it SHALL fail with the one poisoned-state error
- **AND** no document SHALL be committed by that handler

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
