## MODIFIED Requirements

### Requirement: The startup update check is a Generic-section owned setting

Bare A1 SHALL retain the persisted compatibility key `updateCheck` as a boolean defaulting to `true`, but SHALL present it as `Automatic updates`, as the first entry in the first `Generic` section. Its description SHALL state that A1 checks its running channel at most once per day, installs verified updates silently in the background, and prompts for restart only after installation. When `false`, bare A1 SHALL skip the startup release cache, registry check, automatic-update worker, and automatic-update observation entirely. The value SHALL remain stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage. The setting SHALL take effect at the next launch. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Resolve an older profile
- **WHEN** a profile already stores `updateCheck` or omits the key
- **THEN** existing boolean values SHALL be preserved and an omitted value SHALL resolve to `true` without a migration to another key

#### Scenario: Present the Generic section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the `Generic` section SHALL offer `Automatic updates` first, followed by the other declared Generic settings
- **AND** its description SHALL explain silent background installation and restart readiness

#### Scenario: Disable the check
- **WHEN** the user sets `Automatic updates` to off and restarts bare A1
- **THEN** A1 SHALL neither read the release cache, contact the registry, start an automatic worker, nor observe automatic-update state for the startup flow

#### Scenario: Reject an invalid value
- **WHEN** a stored `updateCheck` value is not a boolean
- **THEN** existing settings validation SHALL reject that value and resolve `true` without blocking startup

#### Scenario: Use the comparison profile
- **WHEN** the user opens or runs `a1 pi`
- **THEN** its pinned settings presentation SHALL contain no A1 `Automatic updates` entry
