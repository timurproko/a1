# resident-terminal-host Delta

## ADDED Requirements

### Requirement: The attach client's interaction is a pure state machine
The attach client SHALL model its interaction mode, its own view intent (the view a prompt opened in, Settings tab visibility and prewarm, the pending jump, and a pending tab creation), deferred input, hover, failure, notices, and the pending manual name in one state type stepped by a pure function from events to effects. Interaction mode SHALL be one enumerated value, so at most one of popup, rename, or drag is active, and key, mouse, and paste precedence SHALL be resolved by that one value. The coherent view transition (the requested tab, staged registry, and pending surface) SHALL stay with the presentation view model that owns the surfaces. The role loop SHALL own only the handshake, reader threads, the outer terminal, bindings, settings observation, encoding, presentation, and effect application. The simulator SHALL be able to drive the attach core with seeded server messages and input.

#### Scenario: A rename is requested while the context menu is open
- **WHEN** the rename action is chosen from the open context menu
- **THEN** the mode SHALL change from popup to rename in one step
- **AND** no frame SHALL show the menu and the rename editor together

#### Scenario: Input arrives while a view change is pending
- **WHEN** keys or a paste arrive after a tab switch was requested and before its surface arrived
- **THEN** the input SHALL be held, within the existing byte and frame limits, for the tab it targets
- **AND** when the view commits, input held for that tab SHALL be delivered to it in order and input held for any other target SHALL be dropped, exactly as the attach client did before

#### Scenario: A view transition completes
- **WHEN** the requested tab's complete surface arrives after its list snapshot was staged
- **THEN** the presentation view model SHALL commit the tabs, the viewed tab, and the surface together
- **AND** any popup or rename prompt that belonged to the previous viewed tab SHALL be cleared in that same step

#### Scenario: The simulator drives the attach core
- **WHEN** the seeded simulator feeds interleaved server messages, key, mouse, paste, resize, focus, and tick events
- **THEN** every step SHALL yield at most one mode and a paint effect after every change to what a paint shows
- **AND** once the client exits, no step SHALL yield any effect

### Requirement: Role reader threads never block on recovery waits
A holder or bridge reader thread SHALL NOT sleep for a restart delay or block waiting for a recovery slot. A respawn's delay SHALL be a timer effect of the server core, and the delay, the session-writer check, and the recovery-slot wait SHALL complete outside the reader thread, so input from that peer is processed while they are pending.

#### Scenario: A child restart is delayed by the budget
- **WHEN** a holder exits and the restart budget schedules a delayed restart
- **THEN** the holder's reader thread SHALL continue processing its frames during the delay
- **AND** the restart SHALL start when the timer effect completes, unless a newer restart for that tab superseded it

#### Scenario: Recovery slots are exhausted
- **WHEN** a respawn needs a recovery slot and none is free
- **THEN** the holder's reader thread SHALL keep processing its frames while the respawn waits
- **AND** the respawn SHALL proceed when a slot is released, or the tab SHALL be marked failed when the start gate stays closed past its bound
