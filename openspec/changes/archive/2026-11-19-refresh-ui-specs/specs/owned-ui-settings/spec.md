## ADDED Requirements

### Requirement: Resolved settings are presented as declared sections with one Agent section

A1 SHALL expose the resolved settings as sections a consuming surface can present without knowing where a value is stored: the declared A1 settings grouped under the sections their declarations name (`Generic`, `Appearance`, `Scroll`, and `History`), followed by one `Agent` section that lists the available settings reported by the engine settings port and then the A1 settings declared for `Agent`. Each presented entry SHALL carry its current stored value, current effective value when different, whether it can be changed from A1, its application boundary, its available choices where its source declares them, and its description where its source provides one. Agent settings SHALL be read, written, and applied only through the engine settings port; A1 SHALL NOT write Pi settings storage directly. Where the engine does not advertise the write or effect capability required by an entry, that entry SHALL be filtered from the presented section. A descriptor without an application contract SHALL not be promoted to a UI entry. The consuming surface SHALL retain the shared input, list, menu, dialog, shortcut, and scrollbar components and the reviewed semantic styles and geometry for setting rows, labels, values, selected state, controls, menus, structured dialogs, deferred and failure notices, wrapping, and narrow-terminal clipping. The owned settings interaction SHALL remain a declared product difference: descriptions stay in entry metadata but do not render as selected-row details; ordinary printable input opens search and becomes the query; search uses the same configurable interactive input component as the bare-A1 agent prompt, configured as single-line and paste-disabled; the standing status bar derives from active shortcut declarations; wheel distance resolves the effective live `scrollbarSpeed` through the shared scrollbar policy rather than a settings-screen literal; scalar choices retain the shared `ValueMenu` while rendering as a visually distinct A1 floating panel; and the selected row retains its accent cursor, normal primary label, and existing background while values retain the muted presentation shared by selected and unselected rows. Only ordinary Settings values and enabled numeric controls SHALL use the owned-dialog foreground blend for mouse hover: 60% of their ordinary foreground and 40% of the current accent, without adding a background or moving keyboard selection. Setting labels and section titles SHALL remain visually unchanged on hover. A muted hovered value SHALL NOT become pure terminal white.

#### Scenario: Build sections with an attached engine

- **WHEN** sections are built while the engine reports its settings
- **THEN** each declared A1 section SHALL list its declared settings with their resolved value, choices, description, source, and application boundary
- **AND** the Agent section SHALL list every available setting the engine reports with its stored and effective state, writability, and application boundary, followed by the A1 settings declared for Agent

#### Scenario: Select a row

- **WHEN** a row is the keyboard selection
- **THEN** its cursor SHALL retain the accent role and its label SHALL retain the normal primary foreground and existing selection background
- **AND** its value SHALL render in the muted role, exactly as an unselected value does
- **AND** pointing at that value SHALL blend its muted foreground toward the current accent by 40%, exactly as pointing at an unselected value does, without moving keyboard selection or adding a hover background

#### Scenario: Present settings through the reviewed shared components

- **WHEN** the settings surface renders scalar, numeric, structured, selected, searched, deferred, failed, and narrow-width states
- **THEN** its rows, values, controls, menus, dialogs, notices, wrapping, and clipping SHALL preserve the reviewed shared-component terminal cells and semantic ANSI roles
- **AND** unavailable entries and their option-specific explanation SHALL remain absent
- **AND** no selected-entry description rows SHALL be rendered

#### Scenario: Invoke settings search explicitly

- **WHEN** search is closed and the user enters ordinary printable text
- **THEN** the settings surface SHALL open the shared input and preserve that exact text as the beginning of the query
- **AND** the first printable input SHALL NOT be lost or require a preceding activation key
- **AND** `/` SHALL have no dedicated search-activation behavior and SHALL be ordinary query text when typed

#### Scenario: Preserve Settings actions before type activation

- **WHEN** search is closed and the user enters a declared Settings navigation, section-jump, value-change, adjustment, undo, or close key
- **THEN** the declared Settings action SHALL retain precedence
- **AND** the search input SHALL NOT open from that non-text key

#### Scenario: Edit and select a settings query

- **WHEN** search is active and the user moves by character or word, deletes text, extends or selects all text, replaces a selection by typing, drags a pointer selection, double-clicks a word, or triple-clicks the query
- **THEN** the shared input SHALL apply the same applicable editing and selection behavior as the bare-A1 agent prompt
- **AND** triple-click SHALL select the complete single-line query
- **AND** Settings-owned result navigation keys SHALL continue moving through results without becoming query text

#### Scenario: Copy or cut a settings query selection

- **WHEN** search has a selected range and the user presses `Ctrl+C`
- **THEN** A1 SHALL submit the exact selected query text through the owned bounded clipboard path without changing the query
- **WHEN** the user presses `Ctrl+X`
- **THEN** A1 SHALL submit the exact selected query text and then remove that range from the query

#### Scenario: Reject paste in settings search

- **WHEN** Settings search receives a configured paste shortcut, a complete or fragmented bracketed paste frame, or another shared-input paste request
- **THEN** the shared component SHALL consume it without changing the query or filter results
- **AND** subsequent ordinary typing SHALL continue editing normally

#### Scenario: Render settings status guidance

- **WHEN** no transient save result or interrupt warning replaces the standing settings status
- **THEN** the status bar SHALL render `Type search` followed by the applicable navigation, section-jump, change, adjustment, and cancel hints assembled from active shortcut declarations
- **AND** `Type` SHALL use the shared key role while `search` uses the shared action role
- **AND** the status SHALL NOT advertise `/ search`

#### Scenario: Render the empty settings query

- **WHEN** Settings search is active with an empty query
- **THEN** the shared input placeholder SHALL read exactly `Search settings`
- **AND** it SHALL use the same caret, selection, and input rules as the shared input component

#### Scenario: Scroll the settings list

- **WHEN** the user sends a wheel event over the settings list or search footer
- **THEN** movement SHALL resolve the currently effective `scrollbarSpeed`, including an accepted live value pending source reflection
- **AND** distance SHALL be obtained from the shared scrollbar policy with no independent settings-screen row-count literal
- **AND** wheel ownership SHALL remain with search results rather than text selection

#### Scenario: Open a scalar setting menu

- **WHEN** the user opens the choices for a scalar setting
- **THEN** the menu SHALL retain shared `ValueMenu` placement, clipping, keyboard, and pointer behavior
- **AND** every choice SHALL render on A1's dark floating-panel background rather than blending into the settings rows
- **AND** the active choice SHALL render on A1's lighter panel background with white text
- **AND** the effective value SHALL carry a `✓` independently of the active choice

#### Scenario: Change an A1-owned setting

- **WHEN** a change is accepted for an entry whose backend is A1, in any section
- **THEN** the value SHALL be written to the A1 settings document, applied at its declared boundary, and SHALL NOT be sent to the engine settings port

#### Scenario: Change an engine setting

- **WHEN** a change is accepted for an engine-backed entry in the Agent section and the engine advertises the required write and effect capability
- **THEN** the value SHALL be written and applied through the engine settings port, flushed where the engine advertises flush capability, and SHALL NOT be written into the A1 settings document

#### Scenario: Engine advertises no settings write capability

- **WHEN** the engine settings port reports no write capability for its settings
- **THEN** those Agent entries SHALL be omitted from the settings UI
- **AND** an attempted change through any stale or hidden route SHALL be refused rather than silently dropped

#### Scenario: Engine advertises storage without an effect

- **WHEN** an engine descriptor can be persisted but has no application contract for the active mode
- **THEN** the Agent entry and its missing-effect explanation SHALL be omitted from the settings UI

#### Scenario: Agent settings cannot be read

- **WHEN** the engine settings port fails, reports no settings, or is absent
- **THEN** the declared A1 sections SHALL still be complete and usable
- **AND** no stale, invented, or unavailable-placeholder Agent entry SHALL appear

#### Scenario: Report a failed change

- **WHEN** a change cannot be stored or cannot be applied through the engine
- **THEN** the failure SHALL be reported to the caller and the change SHALL NOT be reported as effective

### Requirement: Default color and Current color are separate Appearance settings

Bare A1 SHALL expose two A1 settings in an `Appearance` section after `Generic`: persisted `defaultAccentColor`, labeled `Default color`, followed by session-local `accentColor`, labeled `Current color`, then `Background` and `Quit animation`. Both color settings SHALL offer exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in that order. Default color SHALL initially resolve to blue and apply on next session start when no invocation color overrides initialization; Current color SHALL apply live. Every displayed value SHALL name an explicit A1 palette color and receive the same semantic-family projection behavior, with grey retaining an achromatic semantic family. Neither setting SHALL be written to Pi settings storage or presented as an engine descriptor. Current color SHALL NOT be persisted to the profile settings document.

Every interactive launch, including a resumed transcript, and every successful active-session replacement SHALL initialize Current color from the validated invocation-only startup color when supplied, otherwise from the latest valid Default color with blue fallback for a missing, malformed, or unsupported default. The invocation value SHALL be established before settings/session/theme initialization or visible rendering and SHALL remain the initial-color policy for successful new/resume/fork/import replacements in that runtime. Changing Current color through Settings or the live API SHALL NOT change that policy. Changing Default color SHALL persist the future startup preference without recoloring the current session, changing an invocation override policy, or recoloring any other running session. The settings presentation SHALL distinguish the saved startup preference from the current live color and SHALL NOT imply that saving a new default applied it to the active interface. Peer refresh MAY update the displayed default preference but SHALL NOT overwrite any Current color. Without an invocation override, in-process replacements SHALL use the latest saved default, not a stale process-start snapshot.

An accepted Current color change SHALL last only for that active session lifetime and SHALL NOT propagate to other sessions, even when they share a profile or project. Shared profile reloads and unrelated settings writes SHALL neither overwrite the session color nor persist it. An `accentColor` value stored in the profile settings document SHALL be ignored for interactive resolution and preserved as user data without initializing Default color from it. Unknown and unrelated settings SHALL retain their existing resolution and persistence behavior. A failed or cancelled session replacement SHALL preserve the old session and Current color. Pre-trust bare-A1 presentation SHALL use the invocation color when supplied, otherwise the configured Default with blue fallback, never a profile-stored `accentColor`. Invocation color SHALL never write profile/project settings or leak through an inheritable color environment variable.

Settings Current color and external color control SHALL share one authoritative live value and change path. A successful Current color change SHALL repaint the active semantic family and accent-derived canvas before reporting application. Settings cancel and undo SHALL respect each setting's scope: Current color undo restores the prior live color without changing invocation policy; Default color undo restores the saved startup preference without recoloring any running session or changing that policy. Both settings SHALL remain visible and editable when engine settings are absent or unavailable. `a1 pi` SHALL neither expose nor apply them.

#### Scenario: Present the Appearance section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** one `Appearance` section after `Generic` SHALL contain `Default color`, `Current color`, `Background`, and `Quit animation` in that order
- **AND** both color menus SHALL offer exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in order without an automatic or dashed choice
- **AND** each color choice SHALL show a square preview of its effective accent while the selected-value check remains in the standard text color

#### Scenario: Resolve a missing or invalid value
- **WHEN** bare A1 launches without an invocation override with a fresh or resumed transcript and a profile omitting Default color or storing an unsupported default
- **THEN** the startup default and initial Current color SHALL resolve to blue without blocking startup
- **AND** any profile-stored `accentColor` key and every unrelated or unknown profile value SHALL remain intact

#### Scenario: Keep an explicit Current color for the session
- **WHEN** the reader has explicitly selected a valid Current color, including `purple`, in the current active session
- **THEN** that choice SHALL remain effective for that session lifetime despite shared profile refresh or Default color changes
- **AND** a later launch or successful replacement SHALL initialize from its invocation policy, or the latest Default when absent, rather than restore that session-local Current value

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
- **AND** the shared write SHALL neither serialize that session color nor remove a profile-stored `accentColor` key
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

#### Scenario: Select purple
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

## MODIFIED Requirements

### Requirement: The fullscreen background is a live Appearance setting

Bare A1 SHALL expose one persisted A1 setting `backgroundStyle`, labeled `Background`, in the existing `Appearance` section immediately after `Current color` and before `Quit animation`, with `Default color` preceding Current color. It SHALL offer exactly `transparent`, `accent`, and `dark` in that order, SHALL default to `transparent`, and SHALL declare live application. The setting SHALL use profile-local A1 settings persistence and SHALL NOT be written to Pi settings storage or presented as an engine descriptor.

`transparent` SHALL leave unpainted fullscreen cells on the terminal's own background. `accent` SHALL use a dark, low-saturation, greyish background derived from Current color. `dark` SHALL use a fixed neutral dark background independent of the accent. A missing, malformed, or unsupported stored value SHALL resolve to `transparent` without blocking startup. `a1 pi` SHALL neither expose nor apply the setting. Changing Default color alone SHALL NOT repaint the active canvas.

#### Scenario: Present the background choices
- **WHEN** bare A1 opens the Background value menu
- **THEN** it SHALL offer `transparent`, `accent`, and `dark` in that order
- **AND** the Appearance section SHALL contain only one Background entry between Current color and Quit animation

#### Scenario: Preserve the current default
- **WHEN** a profile omits `backgroundStyle`
- **THEN** `backgroundStyle` SHALL resolve to `transparent`
- **AND** bare A1 SHALL use the terminal's configured background for unpainted cells

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

### Requirement: The in-shell settings screen renders the section model
A1 SHALL present its settings as an A1-owned application rendering the grouped section model rather than deriving its own view of where a value lives. In bare `a1` it SHALL be reachable through the Launcher and SHALL NOT be an Agent slash command. The screen SHALL show every section with its entries, keep the current section's header visible while its entries are on screen, and let the user move between entries, jump between sections, filter, change a value, and close using its declared keyboard interactions. Pointer input SHALL follow the existing screen contracts. The screen SHALL be built from the shared component layer rather than drawing a list, menu, dialog, control, input row, or status line of its own. A change SHALL be routed by the entry's backend, and a change that could not be stored or written SHALL be reported rather than displayed as saved. An entry the model reports as not editable SHALL state why rather than accepting input. While the settings module is still loading, the screen SHALL render blank rows rather than a loading placeholder; only a failed module load SHALL print its failure message. Closing Settings SHALL restore the previous surface.

#### Scenario: Open the settings screen
- **WHEN** the user opens Settings from the Launcher in bare `a1`
- **THEN** the screen SHALL open showing the declared A1 sections and the Agent section with current values
- **AND** the pinned settings selector SHALL NOT open

#### Scenario: Navigate and edit settings
- **WHEN** the Settings screen receives its declared navigation, section-jump, search, value-change, adjustment, undo, or close shortcut
- **THEN** it SHALL perform that Settings action exactly once
- **AND** the input SHALL NOT reach the agent prompt

#### Scenario: Navigate between sections
- **WHEN** the user jumps between sections
- **THEN** the selection SHALL land on the first changeable entry of the target section and that section SHALL be brought into view

#### Scenario: Keep the section visible while scrolling
- **WHEN** entries are scrolled so their section header would leave the screen
- **THEN** that section's header SHALL remain visible above the entries

#### Scenario: Change a setting
- **WHEN** the user changes a value
- **THEN** it SHALL be routed to the backend the model names for that entry and the screen SHALL show the resulting global value

#### Scenario: Change cannot be saved
- **WHEN** a change cannot be stored or written through its backend
- **THEN** the screen SHALL report the failure and SHALL NOT display the new value as saved

#### Scenario: Entry is not editable
- **WHEN** the user selects an entry the model reports as not editable
- **THEN** the screen SHALL state the reported reason and SHALL NOT accept a change for it

#### Scenario: Filter the entries
- **WHEN** the user filters
- **THEN** only matching entries SHALL remain under their sections and no matches SHALL be stated explicitly

#### Scenario: Close the screen
- **WHEN** the user closes Settings
- **THEN** the previous surface SHALL be restored unchanged

#### Scenario: Open before the settings module has loaded
- **WHEN** the screen is painted before its module has finished loading
- **THEN** every row SHALL be blank and no `Loading settings…` text SHALL appear
- **AND** the next paint after loading SHALL show the sections and entries

#### Scenario: Settings module fails to load
- **WHEN** the settings module cannot be loaded
- **THEN** the screen SHALL print the load failure on its first row

### Requirement: Appearance settings own the quit-animation toggle
A1 SHALL declare `quitAnimation` as a boolean defaulting to `true`, labeled `Quit animation`, in the `Appearance` section immediately after `Background`; `Generic` SHALL be the first section and contain `Update`. `quitAnimation` SHALL be the only owned setting governing the quit outro: no `Quit` section, `quitEffect`, or `quitEffectDurationMs` SHALL be declared, and the outro SHALL always play the `fall` effect for 800 ms when the switch is `true`. It SHALL use existing shared settings controls, profile-local A1 settings persistence, and validation, and SHALL declare a live application boundary: the value stored when the session quits SHALL govern that quit. No Pi settings document SHALL be used, and `a1 pi` SHALL neither expose nor apply this setting.

#### Scenario: Resolve the default
- **WHEN** the active A1 profile has no stored `quitAnimation` value
- **THEN** `quitAnimation` SHALL resolve to `true`

#### Scenario: Inspect the Generic settings section
- **WHEN** the owned settings screen is presented
- **THEN** its first section SHALL be `Generic`
- **AND** `Appearance` SHALL offer `Default color`, `Current color`, `Background`, and then `quitAnimation` as an on/off choice labeled `Quit animation`
- **AND** no `Quit` section, `Effect` row, or `Duration` row SHALL be presented

#### Scenario: Reject an invalid value
- **WHEN** a stored `quitAnimation` value is not a boolean
- **THEN** existing settings validation SHALL reject that value and resolve `true` without blocking startup

### Requirement: The update mode is a two-choice Generic setting
Bare A1 SHALL persist the update mode under the key `updateCheck`, present it as `Update` first in `Generic`, and offer exactly `Auto` (default) and `Manual`. `Auto` SHALL check the executing release's channel after first paint and on a bounded cadence, install verified updates silently, and surface only the `Update installed, restart to update` status; `Manual` SHALL skip the check and leave updating to `a1 update`. The value SHALL stay in the profile-local A1 settings document, take effect at the next launch, and be absent from `a1 pi`.

#### Scenario: Present the Generic section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the `Generic` section SHALL offer `Update` first with choices `Auto` and `Manual`
- **AND** its description SHALL say that Auto installs silently and asks for a restart, and that Manual leaves updating to the user through `a1 update`

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

### Requirement: Automatic session-name format is an owned live choice

Bare A1 SHALL expose the live **Session name format** Agent setting beside **Automatic session name**, with exactly Sentence case, Kebab case, and Title Case choices in that order. Its owned `sessionNameFormat` value SHALL be `sentence` (default), `kebab`, or `title`, persisted through the existing profile settings manager. A valid explicit saved choice SHALL take precedence over the default.

#### Scenario: Choose a readable format
- **WHEN** a user selects Sentence case or Title Case and restarts with the same profile
- **THEN** the selected format SHALL remain effective and appear as the current choice

#### Scenario: Keep or recover the default
- **WHEN** the format setting is missing or invalid
- **THEN** automatic naming SHALL use Sentence case and expose all three valid choices with Sentence case first

#### Scenario: Preserve a saved alternative
- **WHEN** the profile contains a valid explicit Kebab case or Title Case preference
- **THEN** that preference SHALL remain effective without being replaced by the default

#### Scenario: Change the format of future names
- **WHEN** a user changes the format while a session already has a name
- **THEN** its existing name SHALL remain unchanged and no naming request SHALL start solely because of that setting change
- **AND** the next eligible generation or regeneration SHALL use the chosen format

### Requirement: Prompt history settings declare persistence, retention, and live-scope boundaries
A1 SHALL declare `promptHistoryEnabled` as a boolean defaulting to true, `promptHistoryMaxItems` as an integer allowing 10 through 100 in steps of 10 and defaulting to 100, and `promptHistoryScope` as `unique` (default) or `shared`. They SHALL appear in bare A1's History settings section as `Persistent history`, `History limit`, and `History scope`, using existing shared settings controls, profile-local A1 settings persistence, validation, and stored/effective-state presentation. `promptHistoryEnabled` and `promptHistoryMaxItems` SHALL declare a `next-start` application boundary; `promptHistoryScope` SHALL be live and apply to running bare-A1 agents sharing that profile. Unique SHALL select a durable history per agent session, while Shared SHALL select the profile-wide history. Saving a scope SHALL switch each running agent's selected durable history and image sidecars without migrating, merging, deleting, or rerouting already-submitted prompts; unsent drafts SHALL remain intact. No Pi settings document or separate history settings file SHALL be used, and `a1 pi` SHALL neither expose nor apply these A1 settings.

#### Scenario: Start without stored history settings
- **WHEN** a bare-A1 profile has no stored history settings, including an existing profile created before History scope was introduced
- **THEN** its effective values SHALL enable persistence with a 100-entry count limit and Unique scope
- **AND** byte retention limits SHALL still apply independently
- **AND** any old shared profile history SHALL remain intact, but SHALL NOT appear in the new session's unique durable recall

#### Scenario: Change retention
- **WHEN** the user saves a valid history limit
- **THEN** the settings surface SHALL show that it applies on the next start rather than claiming a live effect
- **AND** the next enabled launch SHALL apply that count to its selected history store, pruning oldest entries if necessary
- **AND** existing writers using that store SHALL follow its newly applied limit without restoring their older startup limit

#### Scenario: Reject an invalid limit
- **WHEN** a stored history limit is not one of 10, 20, 30, 40, 50, 60, 70, 80, 90, or 100
- **THEN** existing settings validation SHALL reject that value and resolve the declared default without blocking startup

#### Scenario: Set scope to Shared
- **WHEN** the user saves Shared scope or starts a new enabled agent with Shared selected
- **THEN** that agent SHALL read and write the unchanged profile-wide history store used before this setting existed
- **AND** other sessions in Shared mode SHALL see its committed prompts

#### Scenario: Reject an invalid scope
- **WHEN** a stored history scope is neither `unique` nor `shared`
- **THEN** existing settings validation SHALL reject that value and resolve Unique without blocking startup

#### Scenario: Change scope while agents are running
- **WHEN** the user saves another scope while an agent is already running
- **THEN** that agent SHALL select the newly chosen store and show its own existing entries, preserving any unsent draft
- **AND** submissions already captured SHALL finish in their original store, while future submissions use the newly selected one
- **AND** no existing history store SHALL be copied, merged, or erased

#### Scenario: Switch scope across concurrent agent processes
- **WHEN** one agent changes History scope while other agents in the same profile are running
- **THEN** each SHALL apply the saved scope on its next accepted settings notification, showing the selected store's recall rather than appending the other store's entries
- **AND** a prompt submitted before that agent observes the change SHALL remain in its then-selected store
- **AND** persistence enablement and retention count SHALL remain next-start settings

#### Scenario: Disable history for subsequent launches
- **WHEN** the user disables persistent history and restarts A1
- **THEN** that process SHALL not create, read, write, or poll the durable history store in either scope
- **AND** it SHALL keep existing current-session history behavior
- **AND** disabling SHALL leave retained records intact rather than claiming to erase them

#### Scenario: Another enabled process is already running
- **WHEN** one instance saves disabled persistence while another enabled instance remains running
- **THEN** the setting SHALL remain next-start and SHALL NOT claim to stop persistence in existing instances
- **AND** the setting metadata and maintained documentation SHALL explain this boundary

#### Scenario: Re-enable persistence
- **WHEN** the user re-enables history and starts a new enabled process
- **THEN** compatible previously retained records in that process's selected scope SHALL become available again under the configured count and byte limits

#### Scenario: Keep history settings profile-local
- **WHEN** different A1 profiles store different history settings or the Pi comparison starts
- **THEN** each bare-A1 launch SHALL apply only its own profile's values
- **AND** the Pi comparison and `~/.pi/agent` SHALL remain untouched

### Requirement: Spinner style is a live Appearance setting with native previews
Bare A1 SHALL expose a persisted A1 setting `spinnerStyle`, labeled `Spinner style`, in Appearance. Its ordered display choices SHALL be lowercase `dots`, `circle`, `diamond`, `square`, and `none` in both the settings row and dropdown, stored respectively as `current`, `circle`, `diamond`, `square`, and `none`. The `dots` choice, stored as `current`, SHALL remain the default and individual fallback for omitted or invalid values. A saved `current` value SHALL display as `dots`. The choice SHALL use the existing profile-local A1 settings manager and live application boundary, without modifying Pi root settings or engine descriptors. Ordinary acceptance, persistence, cancellation, failed-write rollback, reload, and profile isolation SHALL apply.

The setting's dropdown SHALL use the shared value-menu preview column, as the color settings do, to show each animated style's native glyph in the active semantic accent. The focused animated choice SHALL animate in place using the same frame set as the actual status indicator; the other choices SHALL retain representative glyphs. `none` SHALL have an empty preview slot. All labels SHALL remain aligned and menu geometry SHALL remain stable across animation frames. Merely focusing an option SHALL NOT persist a value or change the actual running status. Closing, replacing, canceling, or disposing the menu SHALL stop its preview animation.

#### Scenario: Open the spinner choice menu
- **WHEN** the reader opens Spinner style in bare-A1 Settings
- **THEN** the dropdown SHALL offer exactly lowercase `dots`, `circle`, `diamond`, `square`, and `none` in order with aligned native previews
- **AND** the focused animated choice SHALL animate without shifting its label or neighboring rows

#### Scenario: Preview and cancel
- **WHEN** the reader navigates among spinner options and cancels the dropdown
- **THEN** no value SHALL be saved or applied to the running status
- **AND** the dropdown's preview animation SHALL stop

#### Scenario: Accept a spinner style
- **WHEN** the reader accepts a valid different spinner style
- **THEN** the normal settings path SHALL persist and apply the new style live to every eligible owned progress surface
- **AND** a failed change SHALL retain or restore one consistent previous effective value
- **AND** accepting `dots` SHALL use the existing `current` storage identifier and unchanged dot animation

#### Scenario: Load a missing or invalid choice
- **WHEN** the profile omits Spinner style or stores an unsupported value
- **THEN** `dots`, represented internally as `current`, SHALL apply without blocking startup or changing other accepted settings

#### Scenario: Load existing saved choices
- **WHEN** the profile contains an existing valid Spinner style selection
- **THEN** saved `current` SHALL display as `dots` and retain the existing dot animation
- **AND** saved circle, diamond, square, and none selections SHALL remain selected rather than being reset to the default

#### Scenario: Keep the comparison profile pinned
- **WHEN** the reader launches the explicit comparison profile
- **THEN** it SHALL neither expose nor apply the A1 Spinner style setting

## REMOVED Requirements

### Requirement: Resolved settings are offered to a surface as grouped sections
**Reason**: The text and two scenario titles described a single `A1` section; the code groups A1 settings under Generic, Appearance, Scroll and History and appends A1-owned Agent controls to the one Agent section.
**Migration**: Covered by "Resolved settings are presented as declared sections with one Agent section".

### Requirement: The accent color is a live Appearance setting
**Reason**: The name described one accent setting, and the text and scenario titles narrated the earlier saved accent and an initial purple choice.
**Migration**: Covered by "Default color and Current color are separate Appearance settings" with the same behaviour.
