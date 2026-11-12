## MODIFIED Requirements

### Requirement: The accent color is a live Appearance setting

Bare A1 SHALL expose one session-local A1 setting `accentColor`, labeled `Accent color`, in an `Appearance` section after `Generic`, followed by the `Background` and `Quit animation` settings. It SHALL offer exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in that order, SHALL default to `blue`, and SHALL declare live application. Every displayed value SHALL name an explicit A1 palette color and receive the same semantic-family projection behavior, with grey retaining an achromatic semantic family. The setting SHALL NOT be persisted to the profile settings document, written to Pi settings storage, or presented as an engine descriptor.

Every interactive launch, including a resumed transcript, and every successful active-session replacement SHALL start blue. An accepted color change SHALL last only for that active session lifetime and SHALL NOT propagate to other sessions, even when they share a profile or project. Shared profile reloads and unrelated settings writes SHALL neither overwrite the session color nor persist it. Legacy profile `accentColor` values SHALL be ignored for interactive resolution and preserved as user data. Unknown and unrelated settings SHALL retain their existing resolution and persistence behavior. A failed session replacement SHALL preserve the old session's color. Pre-trust bare-A1 presentation SHALL start blue independently of saved profile accents.

Settings and external color control SHALL share one authoritative live value and change path. A successful change SHALL repaint the active semantic family and accent-derived canvas before reporting application. Settings cancel and undo SHALL operate on the session-local value. The setting SHALL remain visible and editable when engine settings are absent or unavailable. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Present the Appearance section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** one `Appearance` section after `Generic` SHALL contain `Accent color`, `Background`, and `Quit animation` in that order
- **AND** the accent value menu SHALL offer exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in order without an automatic or dashed choice
- **AND** each accent choice SHALL show a square preview of its effective accent while the current-value check remains in the standard text color

#### Scenario: Resolve a missing or invalid value
- **WHEN** bare A1 launches with a fresh or resumed transcript and a profile containing a valid, invalid, or absent legacy accent
- **THEN** the initial interactive accent SHALL be blue without blocking startup
- **AND** the legacy key and every unrelated or unknown profile value SHALL remain intact

#### Scenario: Keep an explicit earlier choice
- **WHEN** the reader has explicitly selected a valid accent, including `purple`, in the current active session
- **THEN** that choice SHALL remain effective for that session lifetime despite shared profile refresh
- **AND** a later launch, resume, or successful replacement SHALL start blue instead of restoring it

#### Scenario: Change the accent live
- **WHEN** one of two running bare-A1 sessions sharing a profile selects another accent
- **THEN** only that active session SHALL adopt the new value and repaint before the change reports success
- **AND** its accent-derived canvas and keyboard-shortcut secondary tones SHALL update from the same selected accent
- **AND** neither the peer's accent nor any settings document SHALL change because of the accent write

#### Scenario: Refresh and save unrelated shared settings
- **WHEN** a session with a non-blue accent refreshes shared settings or changes another persisted setting
- **THEN** its accent SHALL retain its current session-local value
- **AND** the shared write SHALL neither serialize that session color nor remove the legacy saved accent
- **AND** the unrelated setting SHALL retain its existing shared behavior

#### Scenario: Reset after successful session replacement
- **WHEN** new, resume, fork, or import successfully replaces the active session
- **THEN** the replacement SHALL start blue rather than inherit the previous session's color
- **AND** a failed replacement SHALL leave the previous session and color unchanged

#### Scenario: Cancel or undo a Settings edit
- **WHEN** the reader cancels an unaccepted accent selection or undoes an accepted change in Settings
- **THEN** cancel SHALL retain the previous live color and undo SHALL restore the prior session-local color
- **AND** neither action SHALL import or write a profile accent

#### Scenario: Select the initial purple palette
- **WHEN** the reader explicitly selects `purple`
- **THEN** the active interface SHALL project A1's purple palette across the same semantic family as every other choice
- **AND** every family tone SHALL be derived from the selected primary purple by the same transform used for every named or future custom accent
- **AND** dialog bars SHALL use its darker neighboring-hue border tone rather than the base Pi border
- **AND** secondary headings and active dialog-filter values SHALL use its brighter complementary palette variation, with blue and purple using stronger sector-derived hue separation
- **AND** filled scope/default state markers SHALL match the neutral item text color
- **AND** selected rows SHALL use a half-strength, low-chroma background tint closer to the terminal background

#### Scenario: Select grey
- **WHEN** the reader selects `grey` in either supported appearance or terminal color mode
- **THEN** the primary accent, derived border, secondary tone, selection surface, and accent-derived canvas SHALL remain neutral with appropriate appearance contrast
- **AND** unrelated semantic success, warning, and error roles SHALL retain their normal colors

#### Scenario: Use the comparison profile
- **WHEN** the reader starts or configures `a1 pi`
- **THEN** no A1 `Accent color` or `Background` entry SHALL be presented
- **AND** Pi's configured theme, accent, and background behavior SHALL remain unchanged
