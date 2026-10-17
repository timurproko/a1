# owned-ui-settings Delta

## ADDED Requirements

### Requirement: Time format is a live Generic-section owned setting
Bare A1 SHALL declare the persisted A1 setting `timeFormat`, labeled `Time format`, in `Generic` after `Update check` and before `Resident tabs`. It SHALL allow exactly `20:00` and `8:00 PM`, default to `8:00 PM`, and apply live to every A1-owned wall-clock label. Twelve-hour output SHALL use uppercase `AM` or `PM`. The setting SHALL use profile-local A1 persistence; `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Resolve a profile without the setting
- **WHEN** a profile predates `timeFormat` or omits it
- **THEN** migration SHALL preserve all existing and unknown values
- **AND** `timeFormat` SHALL resolve to `8:00 PM`

#### Scenario: Present time-format choices
- **WHEN** bare A1 opens the owned Settings screen
- **THEN** `Time format` SHALL appear after `Update check` and before `Resident tabs` in `Generic`
- **AND** its current value and menu choices SHALL use current local-time examples in `20:00` and `8:00 PM` form
- **AND** every twelve-hour example SHALL use uppercase `AM` or `PM`

#### Scenario: Change time format live
- **WHEN** the user selects the other time format
- **THEN** the accepted value SHALL be stored in the profile-local A1 settings document
- **AND** the active bare-A1 submitted-prompt timestamps and resident strip clock SHALL use that format without a restart
- **AND** no Pi-owned settings value SHALL change

#### Scenario: Reject an invalid time format
- **WHEN** a stored `timeFormat` value is not `20:00` or `8:00 PM`
- **THEN** existing settings validation SHALL reject it and resolve `8:00 PM` without blocking startup

#### Scenario: Use twelve-hour boundaries
- **WHEN** A1 formats local midnight, noon, or an afternoon time with `8:00 PM`
- **THEN** it SHALL render `12` for the midnight and noon hour
- **AND** it SHALL use uppercase `AM` before noon and uppercase `PM` from noon onward

#### Scenario: Use the comparison profile
- **WHEN** the reader starts or configures `a1 pi`
- **THEN** no A1 `Time format` entry SHALL be presented
- **AND** the pinned comparison presentation SHALL retain its own timestamp behavior

## MODIFIED Requirements

### Requirement: The startup update check is a Generic-section owned setting

Bare A1 SHALL declare the persisted A1 setting `updateCheck` as a boolean defaulting to `true`, labeled `Update check`, as the first entry in the first `Generic` section. When `false`, bare A1 SHALL skip the startup release check entirely. The value SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage. Introducing it SHALL advance the stored settings version with a forward migration that preserves existing and unknown values. The setting SHALL take effect at the next launch. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Resolve an older profile
- **WHEN** a profile written before `updateCheck` is loaded
- **THEN** migration SHALL preserve existing and unknown values and `updateCheck` SHALL resolve to `true`

#### Scenario: Present the Generic section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the `Generic` section SHALL offer `Update check` first, followed by the other declared Generic settings
- **AND** `Appearance` SHALL follow it

#### Scenario: Disable the check
- **WHEN** the user sets `Update check` to off and restarts bare A1
- **THEN** A1 SHALL neither read the release cache nor contact the registry for the startup check

#### Scenario: Reject an invalid value
- **WHEN** a stored `updateCheck` value is not a boolean
- **THEN** existing settings validation SHALL reject it and resolve `true` without blocking startup
