## ADDED Requirements

### Requirement: The update mode is a two-choice Generic-section owned setting
Bare A1 SHALL keep the persisted key `updateCheck`, present it as `Update` first in `Generic`, and offer exactly `Auto` (default) and `No`. `Auto` SHALL check the executing release's channel after first paint and on a bounded cadence, install verified updates silently, and surface only the `Update installed, restart to update` status; `No` SHALL skip the check. The value SHALL stay in the profile-local A1 settings document, take effect at the next launch, and be absent from `a1 pi`.

#### Scenario: Resolve an older profile
- **WHEN** an older profile stores `updateCheck: true`, `updateCheck: "notify"`, `updateCheck: false`, or omits the key
- **THEN** migration SHALL resolve those cases to `Auto`, `Auto`, `No`, and `Auto` respectively while preserving other existing and unknown values

#### Scenario: Present the Generic section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the `Generic` section SHALL offer `Update` first with choices `Auto` and `No`
- **AND** its description SHALL say that Auto installs silently and asks for a restart, and that No leaves updates manual

#### Scenario: Disable the check
- **WHEN** the user selects `No` and restarts bare A1
- **THEN** A1 SHALL neither read the release cache, contact the registry, start an automatic worker, nor observe automatic-update state for the startup flow

#### Scenario: Use the automatic default
- **WHEN** the profile has no explicit `Update` choice
- **THEN** bare A1 SHALL resolve `Auto` and silently install an eligible newer release when discovered, even if it was published after the session started

#### Scenario: Reject an invalid value
- **WHEN** a stored `updateCheck` value is not `auto` or `no` after migration
- **THEN** existing settings validation SHALL reject that value and resolve `Auto` without blocking startup

#### Scenario: Use the comparison profile
- **WHEN** the user opens or runs `a1 pi`
- **THEN** its pinned settings presentation SHALL contain no A1 `Update` entry

#### Scenario: Choices shrink without a version bump
- **WHEN** the stored settings document predates the two-choice `Update`
- **THEN** the stored settings version SHALL be unchanged and unknown values SHALL be preserved

#### Scenario: The session stays open
- **WHEN** an `Auto` session remains open past the fifteen-minute cache window
- **THEN** the next check SHALL fetch the channel head again and install a newer release silently without a restart

## MODIFIED Requirements

### Requirement: Time format is a live Generic-section owned setting
Bare A1 SHALL declare the persisted A1 setting `timeFormat`, labeled `Time format`, in `Generic` directly after `Update`. It SHALL allow exactly `20:00` and `8:00 PM`, default to `8:00 PM`, and apply live to every A1-owned wall-clock label, which after this change means the submitted-prompt timestamps. Twelve-hour output SHALL use uppercase `AM` or `PM`. The setting SHALL use profile-local A1 persistence; `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Resolve a profile without the setting
- **WHEN** a profile predates `timeFormat` or omits it
- **THEN** migration SHALL preserve all existing and unknown values
- **AND** `timeFormat` SHALL resolve to `8:00 PM`

#### Scenario: Present time-format choices
- **WHEN** bare A1 opens the owned Settings screen
- **THEN** `Time format` SHALL appear directly after `Update` in `Generic`
- **AND** its current value and menu choices SHALL use current local-time examples in `20:00` and `8:00 PM` form
- **AND** every twelve-hour example SHALL use uppercase `AM` or `PM`

#### Scenario: Change time format live
- **WHEN** the user selects the other time format
- **THEN** the accepted value SHALL be stored in the profile-local A1 settings document
- **AND** the active bare-A1 submitted-prompt timestamps SHALL use that format without a restart
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

## REMOVED Requirements

### Requirement: Resident tabs are an opt-in setting
**Reason**: Resident tabs are removed; there is no Tab Bar section.

**Migration**: Stored `tabs*` and `tabBar*` keys are deleted the next time the settings document is written.

### Requirement: Tabs settings expose tab-bar position
**Reason**: There is no tab bar.

**Migration**: The `tabsPosition` key is deleted on next save.

### Requirement: Tab Bar settings expose the plus menu
**Reason**: There is no tab bar.

**Migration**: The `tabBarPlusMenu` key is deleted on next save.

### Requirement: The Settings tab serves Agent settings without an engine
**Reason**: Settings is an in-shell route of the single agent; there is no engine-less Settings tab.

**Migration**: None; `/settings` opens the same screen inside the session.

### Requirement: Tab Bar right-side items are configured through a live multi-select setting
**Reason**: There is no tab bar.

**Migration**: The `tabBarRightItems` key is deleted on next save.

### Requirement: Tab Bar canvas is a live resident setting
**Reason**: There is no tab bar.

**Migration**: The `tabBarBackgroundStyle` key is deleted on next save.

### Requirement: The startup update check is a Generic-section owned setting
**Reason**: The `Notify` choice is removed.

**Migration**: Stored `notify` migrates to `auto`.
