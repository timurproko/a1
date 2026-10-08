## ADDED Requirements

### Requirement: The UI accent is a live Appearance setting

Bare A1 SHALL expose one persisted A1 setting `accentColor`, labeled `Accent color`, in an `Appearance` section after `Generic`, followed by the existing `Quit animation` setting. It SHALL offer `purple`, `blue`, `cyan`, `green`, `orange`, and `pink` in that order, SHALL default to `purple`, and SHALL declare live application. Every displayed value SHALL name an explicit A1 palette color and receive the same semantic-family projection behavior. The setting SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage or presented as an engine descriptor.

Introducing the setting SHALL advance the owned settings version with forward migrations that preserve existing and unknown values, while an earlier stored `default` accent value SHALL migrate to `purple`. A missing, malformed, or unsupported stored value SHALL resolve to `purple` without blocking startup. The setting SHALL remain visible and editable when engine settings are absent or unavailable. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Present the Appearance section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** one `Appearance` section after `Generic` SHALL contain `Accent color` followed by `Quit animation`
- **AND** the value menu SHALL offer `purple`, `blue`, `cyan`, `green`, `orange`, and `pink` in order
- **AND** each choice SHALL show a square preview of its effective accent while the current-value check remains in the standard text color

#### Scenario: Resolve an older or invalid profile
- **WHEN** a profile predates `accentColor`, omits it, or stores a value outside the declared choices
- **THEN** migration and validation SHALL preserve every other existing and unknown value
- **AND** an earlier `default` accent value SHALL become `purple`
- **AND** `accentColor` SHALL resolve to `purple` without blocking startup

#### Scenario: Change the accent live
- **WHEN** the reader selects another accent color
- **THEN** the A1 profile SHALL persist that value
- **AND** the active bare-A1 interface SHALL repaint with the selected semantic accent before the change reports success
- **AND** no Pi settings document SHALL change

#### Scenario: Select the initial purple palette
- **WHEN** the reader selects `purple` or has no stored accent preference
- **THEN** the active interface SHALL project A1's purple palette across the same semantic family as every other choice
- **AND** dialog bars SHALL use its darker neighboring-hue border tone rather than the base Pi border
- **AND** secondary headings SHALL use its brighter complementary palette variation

#### Scenario: Use the comparison profile
- **WHEN** the reader starts or configures `a1 pi`
- **THEN** no A1 `Accent color` entry SHALL be presented
- **AND** Pi's configured theme and accent behavior SHALL remain unchanged

## RENAMED Requirements

- FROM: `### Requirement: Generic settings lead the screen with the exit-animation toggle`
- TO: `### Requirement: Appearance settings own the exit-animation toggle`

## MODIFIED Requirements

### Requirement: Appearance settings own the exit-animation toggle
A1 SHALL declare `quitAnimation` as a boolean defaulting to `true`, labeled `Quit animation`, in the `Appearance` section immediately after `Accent color`; `Generic` SHALL remain the first section and contain `Update check`. `quitAnimation` SHALL be the only owned setting governing the quit outro: no `Quit` section, `quitEffect`, or `quitEffectDurationMs` SHALL be declared, and the outro SHALL always play the `fall` effect for 800 ms when the switch is `true`. It SHALL use existing shared settings controls, profile-local A1 settings persistence, validation, and migration, and SHALL declare a live application boundary: the value stored when the session quits SHALL govern that quit. A settings document from a version that stored `quitEffect` or `quitEffectDurationMs` SHALL migrate with those keys removed. No Pi settings document SHALL be used, and `a1 pi` SHALL neither expose nor apply this setting.

#### Scenario: Resolve the default
- **WHEN** the active A1 profile has no stored `quitAnimation` value
- **THEN** `quitAnimation` SHALL resolve to `true`

#### Scenario: Inspect the Generic settings section
- **WHEN** the owned settings screen is presented
- **THEN** its first section SHALL be `Generic`
- **AND** `Appearance` SHALL offer `Accent color` followed by `quitAnimation` as an on/off choice labeled `Quit animation`
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

### Requirement: The startup update check is a Generic-section owned setting

Bare A1 SHALL declare the persisted A1 setting `updateCheck` as a boolean defaulting to `true`, labeled `Update check`, as the sole entry in the first `Generic` section. When `false`, bare A1 SHALL skip the startup release check entirely. The value SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage. Introducing it SHALL advance the stored settings version with a forward migration that preserves existing and unknown values. The setting SHALL take effect at the next launch. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Resolve an older profile
- **WHEN** a profile written before `updateCheck` is loaded
- **THEN** migration SHALL preserve existing and unknown values and `updateCheck` SHALL resolve to `true`

#### Scenario: Present the Generic section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the `Generic` section SHALL offer only `Update check`
- **AND** `Appearance` SHALL follow it

#### Scenario: Disable the check
- **WHEN** the user sets `Update check` to off and restarts bare A1
- **THEN** A1 SHALL neither read the release cache nor contact the registry for the startup check

#### Scenario: Reject an invalid value
- **WHEN** a stored `updateCheck` value is not a boolean
- **THEN** existing settings validation SHALL reject it and resolve `true` without blocking startup
