## ADDED Requirements

### Requirement: Generic settings lead the screen with the exit-animation toggle
A1 SHALL declare `quitAnimation` as a boolean defaulting to `true`, labeled `Exit animation`, in a `Generic` section that SHALL be the first section of bare A1's owned settings screen, ahead of `Scroll`, `History`, `Quit`, and `Agent`. It SHALL use existing shared settings controls, profile-local A1 settings persistence, validation, and migration, and SHALL declare a live application boundary: the value stored when the session quits SHALL govern that quit. No Pi settings document SHALL be used, and `a1 pi` SHALL neither expose nor apply this setting.

#### Scenario: Resolve the default
- **WHEN** the active A1 profile has no stored `quitAnimation` value
- **THEN** `quitAnimation` SHALL resolve to `true`

#### Scenario: Inspect the Generic settings section
- **WHEN** the owned settings screen is presented
- **THEN** its first section SHALL be `Generic`
- **AND** that section SHALL offer `quitAnimation` as an on/off choice labeled `Exit animation`

#### Scenario: Reject an invalid value
- **WHEN** a stored `quitAnimation` value is not a boolean
- **THEN** existing settings validation SHALL reject that value and resolve `true` without blocking startup

## MODIFIED Requirements

### Requirement: Quit settings declare the outro effect and duration
A1 SHALL declare `quitEffect` as a choice of exactly `fall`, `dissolve`, `starburst`, and `waves`, in that order, defaulting to `fall`, and `quitEffectDurationMs` as an integer allowing 300 through 2000 in steps of 100, defaulting to 800. They SHALL appear in bare A1's `Quit` settings section as `Effect` and `Duration`, using existing shared settings controls, profile-local A1 settings persistence, validation, and migration. Both SHALL declare a live application boundary: the values stored when the session quits SHALL govern that quit. Both SHALL be retained while `quitAnimation` is `false` and SHALL govern playback again once it is `true`. A settings document whose stored `quitEffect` is `off` SHALL migrate to `quitAnimation` `false` with `quitEffect` resolving to its default. No Pi settings document SHALL be used, and `a1 pi` SHALL neither expose nor apply these settings.

#### Scenario: Resolve defaults
- **WHEN** the active A1 profile has no stored quit values
- **THEN** `quitEffect` SHALL resolve to `fall`
- **AND** `quitEffectDurationMs` SHALL resolve to 800

#### Scenario: Migrate an older settings document
- **WHEN** a settings document from the previous version is read and its stored `quitEffect` is not `off`
- **THEN** migration SHALL advance its version without altering stored values
- **AND** absent quit values SHALL resolve to the declared defaults

#### Scenario: Migrate a disabled effect into the toggle
- **WHEN** a settings document from the previous version stores `quitEffect` as `off`
- **THEN** migration SHALL store `quitAnimation` as `false`
- **AND** `quitEffect` SHALL resolve to `fall`
- **AND** the next quit SHALL leave the terminal without animating

#### Scenario: Reject an invalid value
- **WHEN** a stored effect is not one of the declared choices or a stored duration is not one of 300, 400, …, 2000
- **THEN** existing settings validation SHALL reject that value and resolve the declared default without blocking startup

#### Scenario: Change the effect before quitting
- **WHEN** the user saves a different effect or duration and then quits the same session while `quitAnimation` is `true`
- **THEN** that quit SHALL play the newly saved effect for the newly saved duration

#### Scenario: Inspect the Quit settings section
- **WHEN** the owned settings screen is presented
- **THEN** it SHALL offer exactly the four animation choices and the duration steps under `Quit`
- **AND** those controls SHALL be labeled `Effect` and `Duration`
- **AND** no `off` effect choice SHALL be offered
