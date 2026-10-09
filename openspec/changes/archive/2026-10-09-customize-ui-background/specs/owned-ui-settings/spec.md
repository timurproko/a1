## MODIFIED Requirements

### Requirement: Appearance settings own the exit-animation toggle
A1 SHALL declare `quitAnimation` as a boolean defaulting to `true`, labeled `Quit animation`, in the `Appearance` section immediately after `Background`; `Generic` SHALL remain the first section and contain `Update check`. `quitAnimation` SHALL be the only owned setting governing the quit outro: no `Quit` section, `quitEffect`, or `quitEffectDurationMs` SHALL be declared, and the outro SHALL always play the `fall` effect for 800 ms when the switch is `true`. It SHALL use existing shared settings controls, profile-local A1 settings persistence, validation, and migration, and SHALL declare a live application boundary: the value stored when the session quits SHALL govern that quit. A settings document from a version that stored `quitEffect` or `quitEffectDurationMs` SHALL migrate with those keys removed. No Pi settings document SHALL be used, and `a1 pi` SHALL neither expose nor apply this setting.

#### Scenario: Resolve the default
- **WHEN** the active A1 profile has no stored `quitAnimation` value
- **THEN** `quitAnimation` SHALL resolve to `true`

#### Scenario: Inspect the Generic settings section
- **WHEN** the owned settings screen is presented
- **THEN** its first section SHALL be `Generic`
- **AND** `Appearance` SHALL offer `Accent color`, `Background`, and then `quitAnimation` as an on/off choice labeled `Quit animation`
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

### Requirement: The UI accent is a live Appearance setting

Bare A1 SHALL expose one persisted A1 setting `accentColor`, labeled `Accent color`, in an `Appearance` section after `Generic`, followed by the `Background` and `Quit animation` settings. It SHALL offer `purple`, `blue`, `cyan`, `green`, `orange`, and `pink` in that order, SHALL default to `purple`, and SHALL declare live application. Every displayed value SHALL name an explicit A1 palette color and receive the same semantic-family projection behavior. The setting SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage or presented as an engine descriptor.

Introducing the setting SHALL advance the owned settings version with forward migrations that preserve existing and unknown values, while an earlier stored `default` accent value SHALL migrate to `purple`. A missing, malformed, or unsupported stored value SHALL resolve to `purple` without blocking startup. The setting SHALL remain visible and editable when engine settings are absent or unavailable. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Present the Appearance section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** one `Appearance` section after `Generic` SHALL contain `Accent color`, `Background`, and `Quit animation` in that order
- **AND** the accent value menu SHALL offer `purple`, `blue`, `cyan`, `green`, `orange`, and `pink` in order
- **AND** each accent choice SHALL show a square preview of its effective accent while the current-value check remains in the standard text color

#### Scenario: Resolve an older or invalid profile
- **WHEN** a profile predates `accentColor`, omits it, or stores a value outside the declared choices
- **THEN** migration and validation SHALL preserve every other existing and unknown value
- **AND** an earlier `default` accent value SHALL become `purple`
- **AND** `accentColor` SHALL resolve to `purple` without blocking startup

#### Scenario: Change the accent live
- **WHEN** the reader selects another accent color
- **THEN** the A1 profile SHALL persist that value
- **AND** the active bare-A1 interface SHALL repaint with the selected semantic accent before the change reports success
- **AND** an accent-derived canvas SHALL repaint from that same selected accent
- **AND** keyboard-shortcut key spans SHALL use the same derived secondary tone as active filters
- **AND** no Pi settings document SHALL change

#### Scenario: Select the initial purple palette
- **WHEN** the reader selects `purple` or has no stored accent preference
- **THEN** the active interface SHALL project A1's purple palette across the same semantic family as every other choice
- **AND** every family tone SHALL be derived from the selected primary purple by the same transform used for every named or future custom accent
- **AND** dialog bars SHALL use its darker neighboring-hue border tone rather than the base Pi border
- **AND** secondary headings and active dialog-filter values SHALL use its brighter complementary palette variation, with blue and purple using stronger sector-derived hue separation
- **AND** filled scope/default state markers SHALL match the neutral item text color
- **AND** selected rows SHALL use a half-strength, low-chroma background tint closer to the terminal background

#### Scenario: Use the comparison profile
- **WHEN** the reader starts or configures `a1 pi`
- **THEN** no A1 `Accent color` or `Background` entry SHALL be presented
- **AND** Pi's configured theme, accent, and background behavior SHALL remain unchanged

## ADDED Requirements

### Requirement: The fullscreen background is a live Appearance setting

Bare A1 SHALL expose one persisted A1 setting `backgroundStyle`, labeled `Background`, in the existing `Appearance` section immediately after `Accent color` and before `Quit animation`. It SHALL offer exactly `transparent`, `accent`, and `dark` in that order, SHALL default to `transparent`, and SHALL declare live application. The setting SHALL use profile-local A1 settings persistence and SHALL NOT be written to Pi settings storage or presented as an engine descriptor.

`transparent` SHALL leave unpainted fullscreen cells on the terminal's own background as before. `accent` SHALL use a dark, low-saturation, greyish background derived from the selected accent hue. `dark` SHALL use a fixed neutral dark background independent of the accent. Introducing the setting SHALL advance the owned settings version with a forward migration that preserves existing and unknown values. A missing, malformed, or unsupported stored value SHALL resolve to `transparent` without blocking startup. `a1 pi` SHALL neither expose nor apply the setting.

#### Scenario: Present the background choices
- **WHEN** bare A1 opens the Background value menu
- **THEN** it SHALL offer `transparent`, `accent`, and `dark` in that order
- **AND** the Appearance section SHALL contain only one Background entry between Accent color and Quit animation

#### Scenario: Preserve the current default
- **WHEN** a profile predates `backgroundStyle` or omits it
- **THEN** `backgroundStyle` SHALL resolve to `transparent`
- **AND** bare A1 SHALL continue to use the terminal's configured background for unpainted cells

#### Scenario: Reject an invalid stored background
- **WHEN** a stored `backgroundStyle` value is not one of the declared choices
- **THEN** existing settings validation SHALL reject it and resolve `transparent` without blocking startup
- **AND** every other existing and unknown stored value SHALL remain preserved

#### Scenario: Change the background live
- **WHEN** the reader selects another Background value
- **THEN** the A1 profile SHALL persist that value
- **AND** the complete visible bare-A1 canvas SHALL repaint to the selected behavior before the change reports success
- **AND** no cell from the previous canvas SHALL remain after the repaint
- **AND** no Pi settings document SHALL change

#### Scenario: Change the accent behind an accent background
- **WHEN** Background is `accent` and the reader changes Accent color
- **THEN** the complete visible canvas SHALL repaint to the dark greyish tint derived from the new accent in the same session
- **AND** Background SHALL remain selected as `accent`

#### Scenario: Use a fixed dark background
- **WHEN** Background is `dark` and the reader changes Accent color
- **THEN** the neutral dark canvas SHALL remain unchanged
- **AND** accent-controlled foregrounds and component surfaces SHALL still update normally

#### Scenario: Use the comparison profile
- **WHEN** the reader starts or configures `a1 pi`
- **THEN** no A1 Background entry SHALL be presented
- **AND** Pi and the terminal SHALL retain their existing background behavior
