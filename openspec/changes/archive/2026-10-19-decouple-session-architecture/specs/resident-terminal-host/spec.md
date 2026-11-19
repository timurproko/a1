# resident-terminal-host Delta

## ADDED Requirements

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
