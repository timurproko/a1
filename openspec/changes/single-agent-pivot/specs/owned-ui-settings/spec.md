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

### Requirement: Time format is a live Generic-section owned setting
**Reason**: Submitted-prompt timestamps are removed and the tab bar clock goes with the tab bar, so nothing consumes a time format.

**Migration**: The `timeFormat` key is deleted on next save.
