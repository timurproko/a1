## ADDED Requirements

### Requirement: A1-owned surfaces are declared as data the parity gate reads
Every A1-owned surface SHALL be declared with its id, the app that owns it, the route it answers, and
for a surface that replaces a pinned one, the pinned route it supersedes. The parity gate SHALL
classify checkpoints from that declaration. A1 SHALL NOT carry a list of parity checkpoints to skip
alongside the declaration, so a superseded checkpoint is superseded because something says what
replaced it.

#### Scenario: Classify a superseded checkpoint
- **WHEN** the parity gate meets a checkpoint for a pinned route a declared surface supersedes
- **THEN** it SHALL classify that checkpoint as superseded by the named surface

#### Scenario: Meet a divergence nobody declared
- **WHEN** a surface diverges from the pinned baseline and no declaration names it
- **THEN** parity SHALL fail

#### Scenario: An addition displaces a pinned surface
- **WHEN** a declared addition takes a route the pinned baseline already answers
- **THEN** parity SHALL fail rather than treating the addition as a replacement

### Requirement: A replacement drops no capability of the surface it supersedes
A surface declared as replacing a pinned one SHALL offer every capability that pinned surface offered.
A1 SHALL verify this rather than asserting it: for the settings screen, every setting the engine
reports SHALL be reachable from the screen.

#### Scenario: A reported setting is missing from the screen
- **WHEN** the engine reports a setting the settings screen does not present
- **THEN** validation SHALL fail and name the missing setting

#### Scenario: The vanilla path is untouched
- **WHEN** A1 is launched on the vanilla path
- **THEN** no declared surface SHALL be consulted and the pinned routes SHALL answer as they do
  without A1
