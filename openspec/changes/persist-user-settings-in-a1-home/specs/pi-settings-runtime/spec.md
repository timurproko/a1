# Spec Delta

## ADDED Requirements

### Requirement: Shared profile settings preserve namespace ownership
Normal A1 SHALL place a generic shared-profile storage boundary beneath every pinned Pi settings manager it constructs. The engine storage view SHALL exclude the reserved product namespace, while product reads and writes SHALL access only that namespace. Both views SHALL use one compatible lock and atomic read-modify-write path so current file content, rather than a stale in-memory snapshot, is the merge base.

#### Scenario: Pi writes a root setting
- **WHEN** the pinned settings manager persists a Pi setting
- **THEN** the shared store SHALL preserve the product namespace byte-for-value
- **AND** Pi SHALL not receive the namespace as an engine setting

#### Scenario: A1 writes its namespace
- **WHEN** the product settings manager persists an A1 setting
- **THEN** the shared store SHALL preserve every Pi-owned root property byte-for-value
- **AND** it SHALL replace only the reserved product section

#### Scenario: Writers overlap
- **WHEN** Pi and A1 settings writes overlap in one or multiple processes
- **THEN** the resulting valid JSON document SHALL contain both accepted updates
- **AND** neither writer SHALL lose an unrelated root or namespaced value

#### Scenario: Construct every Pi settings manager
- **WHEN** normal runtime startup, project-trust preflight, or an A1 package command constructs a pinned Pi settings manager for the A1 profile
- **THEN** construction SHALL use the shared-profile storage boundary
- **AND** no normal A1 path SHALL bypass it with an independent writer for the same global settings file

### Requirement: The reserved product namespace cannot collide with Pi settings
The reserved root key SHALL be derived from validated product identity rather than embedded in internal type or class names. Compatibility validation SHALL compare it with the complete pinned Pi root setting inventory and SHALL fail before release if Pi claims that key. Runtime storage SHALL also refuse an engine write that returns the reserved key rather than choosing one owner's data.

#### Scenario: Current Pi has no collision
- **WHEN** compatibility validation inspects the pinned Pi settings schema
- **THEN** the product identity key SHALL be absent from Pi's root setting names
- **AND** shared settings support MAY proceed

#### Scenario: A Pi upgrade adds the reserved key
- **WHEN** a candidate Pi version declares a root setting equal to the product namespace key
- **THEN** the Pi compatibility gate SHALL fail and name the collision
- **AND** the candidate SHALL not be released until the namespace design is explicitly revised

#### Scenario: Runtime encounters a colliding engine document
- **WHEN** the engine storage callback attempts to persist the reserved root key
- **THEN** the shared store SHALL reject the write without changing the existing settings file
