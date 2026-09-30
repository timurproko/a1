## ADDED Requirements

### Requirement: The prompt image limit is an Agent-section owned setting

Bare A1 SHALL expose the persisted A1 setting `promptImageLimit`, labeled `Prompt image limit`, exactly once in the owned settings screen's existing `Agent` section after `Prompt suggestions` and `Skills`. It SHALL accept every integer from 1 through 16, default to 8, and declare live application. The value SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage or presented as an engine descriptor. Introducing it SHALL advance the stored settings version with a forward migration that preserves existing and unknown values, so a profile without the key resolves to 8.

The setting SHALL remain visible and editable when engine settings are absent, unreadable, or not writable. `a1 pi` SHALL neither expose nor apply this A1-owned setting and SHALL retain its existing eight-image prompt policy.

#### Scenario: Present the Agent section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the existing Agent section SHALL contain one `Prompt image limit` numeric entry after `Prompt suggestions` and `Skills`
- **AND** it SHALL offer values from 1 through 16 without creating another Agent section

#### Scenario: Resolve an older profile
- **WHEN** a profile written before `promptImageLimit` is loaded
- **THEN** migration SHALL preserve its existing and unknown settings values
- **AND** `promptImageLimit` SHALL resolve to 8

#### Scenario: Change the limit live
- **WHEN** the user changes `Prompt image limit` to an allowed value
- **THEN** the value SHALL be persisted in the A1 settings document
- **AND** subsequent image admission and prompt validation in the running bare-A1 session SHALL use that value without restart or reload
- **AND** no Pi settings document SHALL change

#### Scenario: Reject an invalid stored limit
- **WHEN** the stored `promptImageLimit` is not an integer from 1 through 16
- **THEN** existing settings validation SHALL reject that value and resolve 8 without blocking startup

#### Scenario: Engine settings cannot be presented
- **WHEN** the engine is absent, reading its settings fails, or it advertises no settings write capability
- **THEN** `Prompt image limit` SHALL remain visible and editable in the single Agent section through its A1 backend

#### Scenario: Use the comparison profile
- **WHEN** the user opens or runs `a1 pi`
- **THEN** its pinned settings presentation SHALL contain no A1 `Prompt image limit` entry
- **AND** its prompt image count policy SHALL remain eight
