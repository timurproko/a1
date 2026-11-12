## MODIFIED Requirements

### Requirement: The accent color is a live Appearance setting

Bare A1 SHALL expose two A1 settings in an `Appearance` section after `Generic`: persisted `defaultAccentColor`, labeled `Default color`, followed by session-local `accentColor`, labeled `Current color`, then `Background` and `Quit animation`. Both color settings SHALL offer exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in that order. Default color SHALL initially resolve to blue and apply on next session start when no invocation color overrides initialization; Current color SHALL apply live. Every displayed value SHALL name an explicit A1 palette color and receive the same semantic-family projection behavior, with grey retaining an achromatic semantic family. Neither setting SHALL be written to Pi settings storage or presented as an engine descriptor. Current color SHALL NOT be persisted to the profile settings document.

Every interactive launch, including a resumed transcript, and every successful active-session replacement SHALL initialize Current color from the validated invocation-only startup color when supplied, otherwise from the latest valid Default color with blue fallback for a missing, malformed, or unsupported default. The invocation value SHALL be established before settings/session/theme initialization or visible rendering and SHALL remain the initial-color policy for successful new/resume/fork/import replacements in that runtime. Changing Current color through Settings or the live API SHALL NOT change that policy. Changing Default color SHALL persist the future startup preference without recoloring the current session, changing an invocation override policy, or recoloring any other running session. The settings presentation SHALL distinguish the saved startup preference from the current live color and SHALL NOT imply that saving a new default applied it to the active interface. Peer refresh MAY update the displayed default preference but SHALL NOT overwrite any Current color. Without an invocation override, in-process replacements SHALL use the latest saved default, not a stale process-start snapshot.

An accepted Current color change SHALL last only for that active session lifetime and SHALL NOT propagate to other sessions, even when they share a profile or project. Shared profile reloads and unrelated settings writes SHALL neither overwrite the session color nor persist it. Legacy profile `accentColor` values SHALL be ignored for interactive resolution and preserved as user data without initializing Default color from them. Unknown and unrelated settings SHALL retain their existing resolution and persistence behavior. A failed or cancelled session replacement SHALL preserve the old session and Current color. Pre-trust bare-A1 presentation SHALL use the invocation color when supplied, otherwise the configured Default with blue fallback, rather than the legacy saved accent. Invocation color SHALL never write profile/project settings or leak through an inheritable color environment variable.

Settings Current color and external color control SHALL share one authoritative live value and change path. A successful Current color change SHALL repaint the active semantic family and accent-derived canvas before reporting application. Settings cancel and undo SHALL respect each setting's scope: Current color undo restores the prior live color without changing invocation policy; Default color undo restores the saved startup preference without recoloring any running session or changing that policy. Both settings SHALL remain visible and editable when engine settings are absent or unavailable. `a1 pi` SHALL neither expose nor apply them.

#### Scenario: Present the Appearance section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** one `Appearance` section after `Generic` SHALL contain `Default color`, `Current color`, `Background`, and `Quit animation` in that order
- **AND** both color menus SHALL offer exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in order without an automatic or dashed choice
- **AND** each color choice SHALL show a square preview of its effective accent while the selected-value check remains in the standard text color

#### Scenario: Resolve a missing or invalid value
- **WHEN** bare A1 launches without an invocation override with a fresh or resumed transcript and a profile omitting Default color or storing an unsupported default
- **THEN** the startup default and initial Current color SHALL resolve to blue without blocking startup
- **AND** any legacy accent key and every unrelated or unknown profile value SHALL remain intact

#### Scenario: Keep an explicit earlier choice
- **WHEN** the reader has explicitly selected a valid Current color, including `purple`, in the current active session
- **THEN** that choice SHALL remain effective for that session lifetime despite shared profile refresh or Default color changes
- **AND** a later launch or successful replacement SHALL initialize from its invocation policy, or the latest Default when absent, rather than restore the earlier ephemeral Current value

#### Scenario: Change the accent live
- **WHEN** one of two running bare-A1 sessions sharing a profile selects another Current color
- **THEN** only that active session SHALL adopt the new value and repaint before the change reports success
- **AND** its accent-derived canvas and keyboard-shortcut secondary tones SHALL update from the same selected accent
- **AND** neither the peer's current color nor any settings document SHALL change because of the Current color write

#### Scenario: Save a new default without recoloring running sessions
- **WHEN** two running sessions use different Current colors and the reader saves green as Default color
- **THEN** the profile SHALL persist green as the startup preference and both running sessions SHALL retain their existing Current colors
- **AND** Default color SHALL reflect the saved preference without presenting it as a live recolor
- **AND** the next interactive launch or successful replacement without an invocation override SHALL initialize Current color to green
- **AND** an invocation override SHALL retain precedence for its runtime's successful replacements

#### Scenario: Refresh and save unrelated shared settings
- **WHEN** a session with a nondefault Current color refreshes shared settings or changes another persisted setting
- **THEN** its Current color SHALL retain its current session-local value
- **AND** the shared write SHALL neither serialize that session color nor remove the legacy saved accent
- **AND** Default color and unrelated settings SHALL retain their declared shared persistence behavior

#### Scenario: Reset after successful session replacement
- **WHEN** new, resume, fork, or import successfully replaces the active session after Default color has changed
- **THEN** the replacement SHALL initialize from the invocation override when present, otherwise from the latest saved Default color rather than inherit the previous Current color or process-start default
- **AND** a failed or cancelled replacement SHALL leave the previous session and Current color unchanged

#### Scenario: Cancel or undo a Settings edit
- **WHEN** the reader cancels an unaccepted Current color selection or undoes an accepted Current color change in Settings
- **THEN** cancel SHALL retain the previous live color and undo SHALL restore the prior session-local color
- **AND** neither action SHALL import or write a profile accent or change the invocation replacement policy

#### Scenario: Cancel or undo a default preference edit
- **WHEN** the reader cancels an unaccepted Default color selection or undoes an accepted Default color change
- **THEN** cancel SHALL retain the previous saved default and undo SHALL restore the prior saved startup preference
- **AND** neither action SHALL change any running session's Current color or invocation replacement policy

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

#### Scenario: Initialize an invocation before the first editor frame
- **WHEN** bare A1 launches or initially resumes with green as invocation color and pink as saved Default
- **THEN** its initial Current color and first editor frame SHALL use green without painting pink first
- **AND** Settings SHALL still show pink as Default without any durable startup-color write

#### Scenario: Preserve policy after a live API change
- **WHEN** a runtime launched green accepts a live Current color change to orange and later successfully replaces the session
- **THEN** the prior session SHALL immediately use orange and the successful replacement SHALL initialize green
- **AND** the saved Default, invocation policy, and all peer runtimes SHALL remain unchanged by that live write
