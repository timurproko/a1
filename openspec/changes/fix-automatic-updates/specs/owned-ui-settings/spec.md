## MODIFIED Requirements

### Requirement: The startup update check is a Generic-section owned setting

Bare A1 SHALL retain the persisted key `updateCheck`, present it as `Update`, and offer exactly `Auto`, `Notify`, and `No`, with `Auto` as the default. `Auto` SHALL check the executing published version's own channel after first paint and at a bounded cadence while an interactive session remains open, using a same-channel successful result for at most fifteen minutes. It SHALL install verified updates silently in the background and prompt for restart only after approved activation. `Notify` SHALL preserve the startup-only check and existing update-available popup without installing; its successful same-channel cache may be reused for up to 24 hours. `No` SHALL skip the cache and registry check so updates remain manual.

The value SHALL remain stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage. Introducing the three-choice value SHALL retain the stored settings version. Migration SHALL map stored boolean `true` to `Notify`, stored boolean `false` to `No`, and an omitted key to the `Auto` default while preserving unknown values. The setting SHALL take effect at the next launch. `a1 pi` SHALL neither expose nor apply it and SHALL use Auto discovery when otherwise eligible.

#### Scenario: Resolve an older profile
- **WHEN** an older profile stores `updateCheck: true`, stores `updateCheck: false`, or omits the key
- **THEN** migration SHALL resolve those cases to `Notify`, `No`, and `Auto` respectively while preserving other existing and unknown values

#### Scenario: Present the Generic section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the `Generic` section SHALL offer `Update` first with choices `Auto`, `Notify`, and `No`
- **AND** its description SHALL distinguish periodic silent installation, startup-only notification, and fully manual updating

#### Scenario: Disable the check
- **WHEN** the user selects `No` and restarts bare A1
- **THEN** A1 SHALL neither read the release cache, contact the registry, start an automatic worker, nor observe automatic-update state for the startup flow

#### Scenario: Preserve check-only behavior
- **WHEN** the user selects `Notify` and restarts bare A1
- **THEN** A1 SHALL check for a newer release at startup and show the existing update-available popup without installing it or scheduling automatic rechecks

#### Scenario: Use the automatic default
- **WHEN** the profile has no explicit `Update` choice
- **THEN** bare A1 SHALL resolve `Auto` and silently install an eligible newer release when discovered, even if it was published after the session started

#### Scenario: Reject an invalid value
- **WHEN** a stored `updateCheck` value is not `auto`, `notify`, or `no` after migration
- **THEN** existing settings validation SHALL reject that value and resolve `Auto` without blocking startup

#### Scenario: Use the comparison profile
- **WHEN** the user opens or runs `a1 pi`
- **THEN** its pinned settings presentation SHALL contain no A1 `Update` entry
