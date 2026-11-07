## ADDED Requirements

### Requirement: The Scroll section exposes scrollbar mode, style, and speed settings
A1 SHALL declare `scrollbarAppearance`, `scrollbarStyle`, and `scrollbarSpeed` as live-applicable A1 settings grouped under a `Scroll` settings section. The visible row labels SHALL be `Scrollbar mode`, `Scrollbar style`, and `Speed`, without a redundant `A1` section or `(default)` suffix. `scrollbarAppearance` SHALL allow exactly `auto`, `always`, and `hidden`, with `auto` as its default. `scrollbarStyle` SHALL allow exactly `thin` and `thick`, with `thin` as its default. `scrollbarSpeed` SHALL allow exactly `normal`, `fast`, and `high`, in that order, with `normal` as its default. The settings SHALL be stored and resolved through the existing profile-local A1 settings document and SHALL NOT be read from or written to agent settings.

#### Scenario: Resolve defaults
- **WHEN** the active A1 profile has no stored scrollbar values
- **THEN** `scrollbarAppearance` SHALL resolve to `auto`
- **AND** `scrollbarStyle` SHALL resolve to `thin`
- **AND** `scrollbarSpeed` SHALL resolve to `normal`

#### Scenario: Change appearance live
- **WHEN** the reader changes `scrollbarAppearance` to an allowed value
- **THEN** the running bare-A1 viewport SHALL apply that appearance without restart
- **AND** every surface reading the setting in that session SHALL observe the same value

#### Scenario: Change style live
- **WHEN** the reader changes `scrollbarStyle` to an allowed value
- **THEN** the running bare-A1 viewport SHALL apply that style without restart
- **AND** its scroll position and follow state SHALL remain unchanged

#### Scenario: Change speed live
- **WHEN** the reader changes `scrollbarSpeed` to `normal`
- **THEN** each transcript wheel event SHALL move three document rows
- **WHEN** the reader changes it to `fast`
- **THEN** each transcript wheel event SHALL move six document rows without restart
- **AND** selection edge auto-scroll SHALL run twice as fast as `normal`
- **WHEN** the reader changes it to `high`
- **THEN** each transcript wheel event SHALL move nine document rows without restart
- **AND** selection edge auto-scroll SHALL run at the combined `normal` plus `fast` rate

#### Scenario: Persist viewport settings
- **WHEN** any scrollbar setting is accepted and A1 is restarted with the same profile
- **THEN** the accepted value SHALL be restored from that profile's A1 settings document
- **AND** the same value SHALL survive a fresh repository-local launch instance and rebuilt development candidate
- **AND** future A1-owned settings sections SHALL use the same declaration, resolution, and atomic-store system
- **AND** no Pi or agent settings document SHALL be changed by that write

#### Scenario: Inspect the Scroll settings section
- **WHEN** the owned settings screen is presented
- **THEN** it SHALL offer the declared mode, style, and speed values under `Scroll`
- **AND** those controls SHALL be labeled `Scrollbar mode`, `Scrollbar style`, and `Speed`

#### Scenario: Point at and change settings
- **WHEN** the owned settings screen is open in fullscreen mode
- **THEN** pointer motion over a value SHALL show its hover state
- **AND** clicking an enumerated value SHALL open its dropdown
- **AND** clicking a numeric minus or plus control SHALL apply that step
- **AND** all other settings-screen pointer reports SHALL be consumed without starting terminal text selection

#### Scenario: Use the pinned comparison profile
- **WHEN** `a1 pi` presents its pinned interface
- **THEN** A1's stored scrollbar appearance, style, and speed SHALL NOT modify that interface's scrollbar or wheel behavior

### Requirement: Appearance settings own the quit-animation toggle
A1 SHALL declare `quitAnimation` as a boolean defaulting to `true`, labeled `Quit animation`, in the `Appearance` section immediately after `Background`; `Generic` SHALL remain the first section and contain `Update check`. `quitAnimation` SHALL be the only owned setting governing the quit outro: no `Quit` section, `quitEffect`, or `quitEffectDurationMs` SHALL be declared, and the outro SHALL always play the `fall` effect for 800 ms when the switch is `true`. It SHALL use existing shared settings controls, profile-local A1 settings persistence, and validation, and SHALL declare a live application boundary: the value stored when the session quits SHALL govern that quit. No Pi settings document SHALL be used, and `a1 pi` SHALL neither expose nor apply this setting.

#### Scenario: Resolve the default
- **WHEN** the active A1 profile has no stored `quitAnimation` value
- **THEN** `quitAnimation` SHALL resolve to `true`

#### Scenario: Inspect the Generic settings section
- **WHEN** the owned settings screen is presented
- **THEN** its first section SHALL be `Generic`
- **AND** `Appearance` SHALL offer `Accent color`, `Background`, and then `quitAnimation` as an on/off choice labeled `Quit animation`
- **AND** no `Quit` section, `Effect` row, or `Duration` row SHALL be presented

#### Scenario: Reject an invalid value
- **WHEN** a stored `quitAnimation` value is not a boolean
- **THEN** existing settings validation SHALL reject that value and resolve `true` without blocking startup

### Requirement: The prompt image limit is an owned Agent setting

Bare A1 SHALL expose the persisted A1 setting `promptImageLimit`, labeled `Prompt image limit`, exactly once in the owned settings screen's existing `Agent` section after `Prompt suggestions` and `Skills`. It SHALL accept every integer from 1 through 16, default to 8, and declare live application. The value SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage or presented as an engine descriptor. A profile without the key SHALL resolve to 8.

The setting SHALL remain visible and editable when engine settings are absent, unreadable, or not writable. `a1 pi` SHALL neither expose nor apply this A1-owned setting and SHALL retain its existing eight-image prompt policy.

#### Scenario: Present the Agent section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the existing Agent section SHALL contain one `Prompt image limit` numeric entry after `Prompt suggestions` and `Skills`
- **AND** it SHALL offer values from 1 through 16 without creating another Agent section

#### Scenario: Resolve a profile without the setting
- **WHEN** a profile that stores no `promptImageLimit` is loaded
- **THEN** its other stored and unknown settings values SHALL be preserved
- **AND** `promptImageLimit` SHALL resolve to 8

#### Scenario: Change the limit live
- **WHEN** the user changes `Prompt image limit` to an allowed value
- **THEN** the value SHALL be persisted in the A1 settings document
- **AND** subsequent image admission and prompt validation in the running bare-A1 session SHALL use that value without restart or reload
- **AND** no Pi settings document SHALL change

#### Scenario: Reject an invalid stored limit
- **WHEN** the stored `promptImageLimit` is not an integer from 1 through 16
- **THEN** existing settings validation SHALL reject that value and resolve 8 without blocking startup

#### Scenario: Engine settings cannot be presented
- **WHEN** the engine is absent, reading its settings fails, or it advertises no settings write capability
- **THEN** `Prompt image limit` SHALL remain visible and editable in the single Agent section through its A1 backend

#### Scenario: Use the comparison profile
- **WHEN** the user opens or runs `a1 pi`
- **THEN** its pinned settings presentation SHALL contain no A1 `Prompt image limit` entry
- **AND** its prompt image count policy SHALL remain eight

### Requirement: The accent color is a live Appearance setting

Bare A1 SHALL expose one persisted A1 setting `accentColor`, labeled `Accent color`, in an `Appearance` section after `Generic`, followed by the `Background` and `Quit animation` settings. It SHALL offer `blue`, `purple`, `cyan`, `green`, `orange`, and `pink` in that order, SHALL default to `blue`, and SHALL declare live application. Every displayed value SHALL name an explicit A1 palette color and receive the same semantic-family projection behavior. The setting SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage or presented as an engine descriptor.

Resolution SHALL preserve existing and unknown values. A missing, malformed, or unsupported stored value SHALL resolve to `blue` without blocking startup. Explicit stored `purple` and all other named choices SHALL retain their values. The setting SHALL remain visible and editable when engine settings are absent or unavailable. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Present the Appearance section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** one `Appearance` section after `Generic` SHALL contain `Accent color`, `Background`, and `Quit animation` in that order
- **AND** the accent value menu SHALL offer `blue`, `purple`, `cyan`, `green`, `orange`, and `pink` in order
- **AND** each accent choice SHALL show a square preview of its effective accent while the current-value check remains in the standard text color

#### Scenario: Resolve a missing or invalid value
- **WHEN** a profile omits `accentColor` or stores a value outside the declared choices
- **THEN** validation SHALL preserve every other existing and unknown value
- **AND** the omitted or invalid `accentColor` SHALL resolve to `blue` without blocking startup

#### Scenario: Keep an explicit earlier choice
- **WHEN** a profile stores a valid named accent, including `purple`
- **THEN** that value SHALL remain the effective accent across restart and update

#### Scenario: Change the accent live
- **WHEN** the reader selects another accent color
- **THEN** the A1 profile SHALL persist that value
- **AND** the active bare-A1 interface SHALL repaint with the selected semantic accent before the change reports success
- **AND** an accent-derived canvas SHALL repaint from that same selected accent
- **AND** keyboard-shortcut key spans SHALL use the same derived secondary tone as active filters
- **AND** no Pi settings document SHALL change

#### Scenario: Select the initial purple palette
- **WHEN** the reader explicitly selects `purple`
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

### Requirement: The update mode is a two-choice Generic setting
Bare A1 SHALL keep the persisted key `updateCheck`, present it as `Update` first in `Generic`, and offer exactly `Auto` (default) and `Manual`. `Auto` SHALL check the executing release's channel after first paint and on a bounded cadence, install verified updates silently, and surface only the `Update installed, restart to update` status; `Manual` SHALL skip the check and leave updating to `a1 update`. The value SHALL stay in the profile-local A1 settings document, take effect at the next launch, and be absent from `a1 pi`.

#### Scenario: Present the Generic section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the `Generic` section SHALL offer `Update` first with choices `Auto` and `Manual`
- **AND** its description SHALL say that Auto installs silently and asks for a restart, and that No leaves updates manual

#### Scenario: Disable the check
- **WHEN** the user selects `Manual` and restarts bare A1
- **THEN** A1 SHALL neither read the release cache, contact the registry, start an automatic worker, nor observe automatic-update state for the startup flow

#### Scenario: Use the automatic default
- **WHEN** the profile has no explicit `Update` choice
- **THEN** bare A1 SHALL resolve `Auto` and silently install an eligible newer release when discovered, even if it was published after the session started

#### Scenario: Reject an invalid value
- **WHEN** a stored `updateCheck` value is not `auto` or `manual`
- **THEN** existing settings validation SHALL reject that value and resolve `Auto` without blocking startup

#### Scenario: Use the comparison profile
- **WHEN** the user opens or runs `a1 pi`
- **THEN** its pinned settings presentation SHALL contain no A1 `Update` entry

#### Scenario: The session stays open
- **WHEN** an `Auto` session remains open past the fifteen-minute cache window
- **THEN** the next check SHALL fetch the channel head again and install a newer release silently without a restart

## MODIFIED Requirements

### Requirement: The skills presentation setting is an Agent-section owned choice
Bare A1 SHALL expose the persisted A1 setting `skillsPresentation`, labeled `Skills`, exactly once in the owned settings screen's existing `Agent` section, immediately after `Prompt suggestions` and after every engine-provided Agent entry. Its allowed values SHALL be `collapse` and `expand`, its default SHALL be `collapse`, and its application boundary SHALL be `live`. Its description SHALL state that `collapse` offers one `/skills` command with a searchable dialog and the `/skills:` shortcut while `expand` lists every `/skill:<name>` command directly. The setting SHALL keep its A1-owned backend, persistence key, and profile-local storage; it SHALL NOT be written to Pi settings storage or presented as an engine descriptor. A profile without the key SHALL resolve to `collapse`.

The screen SHALL still contain only one Agent section, preserving the relative order and capability filtering of engine-provided settings and the existing `Prompt suggestions` control. The owned control SHALL remain visible and editable when engine settings are absent, unreadable, or not writable. Other A1 controls and the `a1 pi` comparison SHALL retain their existing grouping and behavior.

#### Scenario: Present the Agent section with both owned controls
- **WHEN** bare A1 opens settings with presentable engine settings
- **THEN** one Agent section SHALL contain those engine settings in their existing relative order, then `Prompt suggestions`, then `Skills`
- **AND** no second Agent section, duplicate control, or empty A1 section SHALL be rendered

#### Scenario: Resolve the default
- **WHEN** a profile stores no `skillsPresentation` value
- **THEN** the setting SHALL resolve to `collapse` without rewriting any other stored value

#### Scenario: Change the presentation
- **WHEN** the user changes `Skills` between `collapse` and `expand`
- **THEN** the value SHALL be written to the A1 settings document and applied live to the running session
- **AND** no engine-setting write or Pi settings-file mutation SHALL occur

#### Scenario: Engine settings cannot be presented
- **WHEN** the engine is absent, reading its settings fails, it advertises no setting-write capability, or it supplies no presentable settings
- **THEN** `Skills` SHALL remain visible and editable in the single Agent section through its A1 backend
- **AND** section-wide unavailable or read-only presentation SHALL NOT falsely disable the owned control

#### Scenario: Find and operate the control
- **WHEN** the user searches for `Agent` or `Skills`, jumps between sections, or changes the control using keyboard or pointer input
- **THEN** the settings surface SHALL address the same single entry with its existing backend, value, shared controls, and live behavior

## REMOVED Requirements

### Requirement: The custom viewport exposes grouped appearance, style, and speed settings
**Reason**: Replaced by "The Scroll section exposes scrollbar mode, style, and speed settings", which keeps the same behaviour without the settings-upgrade scenarios; A1 has no released users whose settings need upgrading.

**Migration**: None.

### Requirement: Appearance settings own the exit-animation toggle
**Reason**: Replaced by "Appearance settings own the quit-animation toggle", which keeps the same behaviour without the settings-upgrade scenarios; A1 has no released users whose settings need upgrading.

**Migration**: None.

### Requirement: The prompt image limit is an Agent-section owned setting
**Reason**: Replaced by "The prompt image limit is an owned Agent setting", which keeps the same behaviour without the settings-upgrade scenarios; A1 has no released users whose settings need upgrading.

**Migration**: None.

### Requirement: The UI accent is a live Appearance setting
**Reason**: Replaced by "The accent color is a live Appearance setting", which keeps the same behaviour without the settings-upgrade scenarios; A1 has no released users whose settings need upgrading.

**Migration**: None.

### Requirement: The update mode is a two-choice Generic-section owned setting
**Reason**: Replaced by "The update mode is a two-choice Generic setting", which keeps the same behaviour without the settings-upgrade scenarios; A1 has no released users whose settings need upgrading.

**Migration**: None.

### Requirement: Stored settings migrate forward on read
**Reason**: A1 has no released users whose settings predate the shared product object, so the ordered upgrade steps and the former standalone document have nothing to read. Settings resolve directly from the flat product object.

**Migration**: None.

### Requirement: Former standalone A1 settings remain a non-destructive fallback
**Reason**: A1 has no released users whose settings predate the shared product object, so the ordered upgrade steps and the former standalone document have nothing to read. Settings resolve directly from the flat product object.

**Migration**: None.
