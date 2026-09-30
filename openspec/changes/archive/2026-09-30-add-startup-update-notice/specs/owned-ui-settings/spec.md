## ADDED Requirements

### Requirement: The startup update check is a Generic-section owned setting

Bare A1 SHALL declare the persisted A1 setting `updateCheck` as a boolean defaulting to `true`, labeled `Update check`, in the `Generic` section after `Quit animation`. When `false`, bare A1 SHALL skip the startup release check entirely. The value SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage. Introducing it SHALL advance the stored settings version with a forward migration that preserves existing and unknown values. The setting SHALL take effect at the next launch. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Resolve an older profile
- **WHEN** a profile written before `updateCheck` is loaded
- **THEN** migration SHALL preserve existing and unknown values and `updateCheck` SHALL resolve to `true`

#### Scenario: Present the Generic section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the `Generic` section SHALL offer `Update check` as an on/off choice after `Quit animation`

#### Scenario: Disable the check
- **WHEN** the user sets `Update check` to off and restarts bare A1
- **THEN** A1 SHALL neither read the release cache nor contact the registry for the startup check

#### Scenario: Reject an invalid value
- **WHEN** a stored `updateCheck` value is not a boolean
- **THEN** existing settings validation SHALL reject it and resolve `true` without blocking startup
