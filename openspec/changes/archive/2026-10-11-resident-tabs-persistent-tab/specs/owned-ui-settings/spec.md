## ADDED Requirements

### Requirement: Resident tabs are an opt-in setting
Bare A1 SHALL declare the persisted A1 setting `residentTabs` as a boolean defaulting to `false`, labeled `Resident tabs`, in the existing `Generic` section after `Update check`. Its description SHALL state that the agent keeps running after the terminal closes, that the change applies at the next launch, and that turning it off does not stop a tab that is already running. The value SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage. Introducing it SHALL advance the stored settings version with a forward migration that preserves existing and unknown values. The bare-A1 launch path SHALL read it before the launch guardian starts without loading the owned UI. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Resolve an older profile
- **WHEN** a profile written before `residentTabs` is loaded
- **THEN** migration SHALL preserve existing and unknown values and `residentTabs` SHALL resolve to `false`

#### Scenario: Enable resident tabs
- **WHEN** the user sets `Resident tabs` to on and runs bare `a1` again
- **THEN** the new launch SHALL take the resident route, and the session that was running when the setting changed SHALL be unaffected

#### Scenario: Reject an invalid value
- **WHEN** a stored `residentTabs` value is not a boolean
- **THEN** existing settings validation SHALL reject it and resolve `false` without blocking startup
