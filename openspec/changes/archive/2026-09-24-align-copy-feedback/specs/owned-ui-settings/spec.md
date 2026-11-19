## ADDED Requirements

### Requirement: The Agent section exposes Pi's fullscreen copy preference

When bare A1 provides application-owned fullscreen frame selection, the owned settings screen SHALL expose pinned Pi's `fullscreenCopyOnSelect` setting exactly once in the existing Agent section. The entry SHALL use Pi's generated `Fullscreen copy on select` label and generated description, SHALL show the value persisted by Pi's settings manager, and SHALL remain an Agent-backend boolean rather than an A1-owned setting. It SHALL be writable through the engine settings port and SHALL declare live application.

#### Scenario: Inspect the Agent section
- **WHEN** bare A1 opens the owned settings screen with its selection owner attached
- **THEN** the Agent section SHALL contain one `Fullscreen copy on select` boolean entry using Pi's generated wording
- **AND** its displayed value SHALL match the persisted Pi setting

#### Scenario: Change automatic copy
- **WHEN** the reader changes `Fullscreen copy on select`
- **THEN** the change SHALL be written through the engine settings port and applied live to the active bare-A1 selection owner
- **AND** no A1 settings document SHALL receive a duplicate value

#### Scenario: Keep comparison settings behavior unchanged
- **WHEN** the reader uses the `a1 pi` comparison profile
- **THEN** its pinned settings presentation and fullscreen copy behavior SHALL remain owned by pinned Pi
- **AND** the bare-A1 Agent-section integration SHALL NOT insert a second setting or selection owner
