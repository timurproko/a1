## MODIFIED Requirements

### Requirement: Generic settings lead the screen with the exit-animation toggle
A1 SHALL declare `quitAnimation` as a boolean defaulting to `true`, labeled `Quit animation`, in a `Generic` section that SHALL be the first section of bare A1's owned settings screen, ahead of `Scroll`, `History`, and `Agent`. It SHALL be the only owned setting governing the quit outro: no `Quit` section, `quitEffect`, or `quitEffectDurationMs` SHALL be declared, and the outro SHALL always play the `fall` effect for 800 ms when the switch is `true`. It SHALL use existing shared settings controls, profile-local A1 settings persistence, validation, and migration, and SHALL declare a live application boundary: the value stored when the session quits SHALL govern that quit. A settings document from a version that stored `quitEffect` or `quitEffectDurationMs` SHALL migrate with those keys removed. No Pi settings document SHALL be used, and `a1 pi` SHALL neither expose nor apply this setting.

#### Scenario: Resolve the default
- **WHEN** the active A1 profile has no stored `quitAnimation` value
- **THEN** `quitAnimation` SHALL resolve to `true`

#### Scenario: Inspect the Generic settings section
- **WHEN** the owned settings screen is presented
- **THEN** its first section SHALL be `Generic`
- **AND** that section SHALL offer `quitAnimation` as an on/off choice labeled `Quit animation`
- **AND** no `Quit` section, `Effect` row, or `Duration` row SHALL be presented

#### Scenario: Migrate stored effect and duration values away
- **WHEN** a settings document from the previous version stores `quitEffect` or `quitEffectDurationMs`
- **THEN** migration SHALL remove those keys and advance the version without altering other stored values
- **AND** the next quit SHALL play the `fall` effect for 800 ms when `quitAnimation` is `true`

#### Scenario: Migrate a disabled effect into the toggle
- **WHEN** a settings document from version 5 stores `quitEffect` as `off`
- **THEN** migration SHALL store `quitAnimation` as `false` and remove `quitEffect`
- **AND** the next quit SHALL leave the terminal without animating

#### Scenario: Reject an invalid value
- **WHEN** a stored `quitAnimation` value is not a boolean
- **THEN** existing settings validation SHALL reject that value and resolve `true` without blocking startup

## REMOVED Requirements

### Requirement: Quit settings declare the outro effect and duration
**Reason**: The quit outro always plays the `fall` effect for 800 ms; a per-profile effect and duration choice is not wanted, so the `Quit` section and its two settings are removed and the `quitAnimation` switch in `Generic` is the single control.

**Migration**: The owned settings version advances with a migration that deletes stored `quitEffect` and `quitEffectDurationMs` values; a stored `off` effect from version 5 still becomes `quitAnimation: false` through the existing version-6 step.
