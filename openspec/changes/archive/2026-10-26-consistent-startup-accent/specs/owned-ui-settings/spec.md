## MODIFIED Requirements

### Requirement: The UI accent is a live Appearance setting

Bare A1 SHALL expose one persisted A1 setting `accentColor`, labeled `Accent color`, in an `Appearance` section after `Generic`, followed by the `Background` and `Quit animation` settings. It SHALL offer `blue`, `purple`, `cyan`, `green`, `orange`, and `pink` in that order, SHALL default to `blue`, and SHALL declare live application. Every displayed value SHALL name an explicit A1 palette color and receive the same semantic-family projection behavior. The setting SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage or presented as an engine descriptor.

Existing compatibility transforms SHALL preserve existing and unknown values, including an earlier stored `default` accent value which SHALL still migrate to `purple`. A missing, malformed, or unsupported stored value SHALL resolve to `blue` without blocking startup. Explicit stored `purple` and all other named choices SHALL retain their values. The setting SHALL remain visible and editable when engine settings are absent or unavailable. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Present the Appearance section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** one `Appearance` section after `Generic` SHALL contain `Accent color`, `Background`, and `Quit animation` in that order
- **AND** the accent value menu SHALL offer `blue`, `purple`, `cyan`, `green`, `orange`, and `pink` in order
- **AND** each accent choice SHALL show a square preview of its effective accent while the current-value check remains in the standard text color

#### Scenario: Resolve an older or invalid profile
- **WHEN** a profile predates `accentColor`, omits it, or stores a value outside the declared choices
- **THEN** migration and validation SHALL preserve every other existing and unknown value
- **AND** an earlier `default` accent value SHALL become `purple`
- **AND** an omitted or invalid `accentColor` SHALL resolve to `blue` without blocking startup

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
