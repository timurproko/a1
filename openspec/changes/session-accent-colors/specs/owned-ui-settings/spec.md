## MODIFIED Requirements

### Requirement: The accent color is a live Appearance setting

Bare A1 SHALL expose two A1 settings in an `Appearance` section after `Generic`: persisted `defaultAccentColor`, labeled `Default color`, followed by session-local `accentColor`, labeled `Current color`, then `Background` and `Quit animation`. Both color settings SHALL offer exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in that order. Default color SHALL initially resolve to blue and apply on next session start; Current color SHALL apply live. Every displayed value SHALL name an explicit A1 palette color and receive the same semantic-family projection behavior, with grey retaining an achromatic semantic family. Neither setting SHALL be written to Pi settings storage or presented as an engine descriptor. Current color SHALL NOT be persisted to the profile settings document.

Every interactive launch, including a resumed transcript, and every successful active-session replacement SHALL initialize Current color from the latest valid Default color, with blue fallback for a missing, malformed, or unsupported default. Changing Default color SHALL persist the future startup preference without recoloring the current session or any other running session. The settings presentation SHALL distinguish the saved startup preference from the current live color and SHALL NOT imply that saving a new default applied it to the active interface. Peer refresh MAY update the displayed default preference but SHALL NOT overwrite any Current color. In-process replacements SHALL use the latest saved default, not a stale process-start snapshot.

An accepted Current color change SHALL last only for that active session lifetime and SHALL NOT propagate to other sessions, even when they share a profile or project. Shared profile reloads and unrelated settings writes SHALL neither overwrite the session color nor persist it. Legacy profile `accentColor` values SHALL be ignored for interactive resolution and preserved as user data without initializing Default color from them. Unknown and unrelated settings SHALL retain their existing resolution and persistence behavior. A failed session replacement SHALL preserve the old session's color. Pre-trust bare-A1 presentation SHALL use the new configured default with blue fallback rather than the legacy saved accent.

Settings Current color and external color control SHALL share one authoritative live value and change path. A successful Current color change SHALL repaint the active semantic family and accent-derived canvas before reporting application. Settings cancel and undo SHALL respect each setting's scope: Current color undo restores the prior live color; Default color undo restores the saved startup preference without recoloring any running session. Both settings SHALL remain visible and editable when engine settings are absent or unavailable. `a1 pi` SHALL neither expose nor apply them.

#### Scenario: Present the Appearance section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** one `Appearance` section after `Generic` SHALL contain `Default color`, `Current color`, `Background`, and `Quit animation` in that order
- **AND** both color menus SHALL offer exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in order without an automatic or dashed choice
- **AND** each color choice SHALL show a square preview of its effective accent while the selected-value check remains in the standard text color

#### Scenario: Resolve a missing or invalid value
- **WHEN** bare A1 launches with a fresh or resumed transcript and a profile omitting Default color or storing an unsupported default
- **THEN** the startup default and initial Current color SHALL resolve to blue without blocking startup
- **AND** any legacy accent key and every unrelated or unknown profile value SHALL remain intact

#### Scenario: Keep an explicit earlier choice
- **WHEN** the reader has explicitly selected a valid Current color, including `purple`, in the current active session
- **THEN** that choice SHALL remain effective for that session lifetime despite shared profile refresh or Default color changes
- **AND** a later launch, resume, or successful replacement SHALL initialize from the latest Default color instead of restoring the ephemeral current override

#### Scenario: Change the accent live
- **WHEN** one of two running bare-A1 sessions sharing a profile selects another Current color
- **THEN** only that active session SHALL adopt the new value and repaint before the change reports success
- **AND** its accent-derived canvas and keyboard-shortcut secondary tones SHALL update from the same selected accent
- **AND** neither the peer's current color nor any settings document SHALL change because of the Current color write

#### Scenario: Save a new default without recoloring running sessions
- **WHEN** two running sessions use different Current colors and the reader saves green as Default color
- **THEN** the profile SHALL persist green as the startup preference and both running sessions SHALL retain their existing Current colors
- **AND** Default color SHALL reflect the saved preference without presenting it as a live recolor
- **AND** the next interactive launch or successful session replacement SHALL initialize Current color to green

#### Scenario: Refresh and save unrelated shared settings
- **WHEN** a session with a nondefault Current color refreshes shared settings or changes another persisted setting
- **THEN** its Current color SHALL retain its current session-local value
- **AND** the shared write SHALL neither serialize that session color nor remove the legacy saved accent
- **AND** Default color and unrelated settings SHALL retain their declared shared persistence behavior

#### Scenario: Reset after successful session replacement
- **WHEN** new, resume, fork, or import successfully replaces the active session after Default color has changed
- **THEN** the replacement SHALL initialize from the latest saved Default color rather than inherit the previous Current color or process-start default
- **AND** a failed replacement SHALL leave the previous session and Current color unchanged

#### Scenario: Cancel or undo a Settings edit
- **WHEN** the reader cancels an unaccepted Current color selection or undoes an accepted Current color change in Settings
- **THEN** cancel SHALL retain the previous live color and undo SHALL restore the prior session-local color
- **AND** neither action SHALL import or write a profile accent

#### Scenario: Cancel or undo a default preference edit
- **WHEN** the reader cancels an unaccepted Default color selection or undoes an accepted Default color change
- **THEN** cancel SHALL retain the previous saved default and undo SHALL restore the prior saved startup preference
- **AND** neither action SHALL change any running session's Current color

#### Scenario: Select the initial purple palette
- **WHEN** the reader explicitly selects `purple` as Current color
- **THEN** the active interface SHALL project A1's purple palette across the same semantic family as every other choice
- **AND** every family tone SHALL be derived from the selected primary purple by the same transform used for every named or future custom accent
- **AND** dialog bars SHALL use its darker neighboring-hue border tone rather than the base Pi border
- **AND** secondary headings and active dialog-filter values SHALL use its brighter complementary palette variation, with blue and purple using stronger sector-derived hue separation
- **AND** filled scope/default state markers SHALL match the neutral item text color
- **AND** selected rows SHALL use a half-strength, low-chroma background tint closer to the terminal background

#### Scenario: Select grey
- **WHEN** the reader selects `grey` as Current color in either supported appearance or terminal color mode
- **THEN** the primary accent, derived border, secondary tone, selection surface, and accent-derived canvas SHALL remain neutral with appropriate appearance contrast
- **AND** unrelated semantic success, warning, and error roles SHALL retain their normal colors

#### Scenario: Use the comparison profile
- **WHEN** the reader starts or configures `a1 pi`
- **THEN** no A1 `Default color`, `Current color`, or `Background` entry SHALL be presented
- **AND** Pi's configured theme, accent, and background behavior SHALL remain unchanged

### Requirement: The fullscreen background is a live Appearance setting

Bare A1 SHALL expose one persisted A1 setting `backgroundStyle`, labeled `Background`, in the existing `Appearance` section immediately after `Current color` and before `Quit animation`, with `Default color` preceding Current color. It SHALL offer exactly `transparent`, `accent`, and `dark` in that order, SHALL default to `transparent`, and SHALL declare live application. The setting SHALL use profile-local A1 settings persistence and SHALL NOT be written to Pi settings storage or presented as an engine descriptor.

`transparent` SHALL leave unpainted fullscreen cells on the terminal's own background as before. `accent` SHALL use a dark, low-saturation, greyish background derived from Current color. `dark` SHALL use a fixed neutral dark background independent of the accent. Introducing the setting SHALL advance the owned settings version with a forward migration that preserves existing and unknown values. A missing, malformed, or unsupported stored value SHALL resolve to `transparent` without blocking startup. `a1 pi` SHALL neither expose nor apply the setting. Changing Default color alone SHALL NOT repaint the active canvas.

#### Scenario: Present the background choices
- **WHEN** bare A1 opens the Background value menu
- **THEN** it SHALL offer `transparent`, `accent`, and `dark` in that order
- **AND** the Appearance section SHALL contain only one Background entry between Current color and Quit animation

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
- **WHEN** Background is `accent` and the reader changes Current color
- **THEN** the complete visible canvas SHALL repaint to the dark greyish tint derived from the new current accent in the same session
- **AND** Background SHALL remain selected as `accent`

#### Scenario: Use a fixed dark background
- **WHEN** Background is `dark` and the reader changes Current color
- **THEN** the neutral dark canvas SHALL remain unchanged
- **AND** accent-controlled foregrounds and component surfaces SHALL still update normally

#### Scenario: Use the comparison profile
- **WHEN** the reader starts or configures `a1 pi`
- **THEN** no A1 Background entry SHALL be presented
- **AND** Pi and the terminal SHALL retain their existing background behavior
