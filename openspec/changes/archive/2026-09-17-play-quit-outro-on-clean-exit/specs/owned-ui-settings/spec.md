## ADDED Requirements

### Requirement: Quit settings declare the outro effect and duration
A1 SHALL declare `quitEffect` as a choice of exactly `fall`, `dissolve`, `starburst`, `waves`, and `off`, in that order, defaulting to `fall`, and `quitEffectDurationMs` as an integer allowing 300 through 2000 in steps of 100, defaulting to 800. They SHALL appear in bare A1's `Quit` settings section as `Effect` and `Duration`, using existing shared settings controls, profile-local A1 settings persistence, validation, and migration. Both SHALL declare a live application boundary: the values stored when the session quits SHALL govern that quit. No Pi settings document SHALL be used, and `a1 pi` SHALL neither expose nor apply these settings.

#### Scenario: Resolve defaults
- **WHEN** the active A1 profile has no stored quit values
- **THEN** `quitEffect` SHALL resolve to `fall`
- **AND** `quitEffectDurationMs` SHALL resolve to 800

#### Scenario: Migrate an older settings document
- **WHEN** a settings document from the previous version is read
- **THEN** migration SHALL advance its version without altering stored values
- **AND** absent quit values SHALL resolve to the declared defaults

#### Scenario: Reject an invalid value
- **WHEN** a stored effect is not one of the declared choices or a stored duration is not one of 300, 400, …, 2000
- **THEN** existing settings validation SHALL reject that value and resolve the declared default without blocking startup

#### Scenario: Change the effect before quitting
- **WHEN** the user saves a different effect or duration and then quits the same session
- **THEN** that quit SHALL play the newly saved effect for the newly saved duration

#### Scenario: Inspect the Quit settings section
- **WHEN** the owned settings screen is presented
- **THEN** it SHALL offer the declared effect choices and duration steps under `Quit`
- **AND** those controls SHALL be labeled `Effect` and `Duration`
