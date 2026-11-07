## ADDED Requirements

### Requirement: The update mode is a two-choice Generic-section owned setting
Bare A1 SHALL keep the persisted key `updateCheck`, present it as `Update` first in `Generic`, and offer exactly `Auto` (default) and `No`. `Auto` SHALL check the executing release's channel after first paint and on a bounded cadence, install verified updates silently, and surface only the `Update installed, restart to update` status; `No` SHALL skip the check. The value SHALL stay in the profile-local A1 settings document, take effect at the next launch, and be absent from `a1 pi`.

#### Scenario: Resolve an older profile
- **WHEN** an older profile stores `updateCheck: true`, `updateCheck: "notify"`, `updateCheck: false`, or omits the key
- **THEN** migration SHALL resolve those cases to `Auto`, `Auto`, `No`, and `Auto` respectively while preserving other existing and unknown values

#### Scenario: Present the Generic section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** the `Generic` section SHALL offer `Update` first with choices `Auto` and `No`
- **AND** its description SHALL say that Auto installs silently and asks for a restart, and that No leaves updates manual

#### Scenario: Disable the check
- **WHEN** the user selects `No` and restarts bare A1
- **THEN** A1 SHALL neither read the release cache, contact the registry, start an automatic worker, nor observe automatic-update state for the startup flow

#### Scenario: Use the automatic default
- **WHEN** the profile has no explicit `Update` choice
- **THEN** bare A1 SHALL resolve `Auto` and silently install an eligible newer release when discovered, even if it was published after the session started

#### Scenario: Reject an invalid value
- **WHEN** a stored `updateCheck` value is not `auto` or `no` after migration
- **THEN** existing settings validation SHALL reject that value and resolve `Auto` without blocking startup

#### Scenario: Use the comparison profile
- **WHEN** the user opens or runs `a1 pi`
- **THEN** its pinned settings presentation SHALL contain no A1 `Update` entry

#### Scenario: Choices shrink without a version bump
- **WHEN** the stored settings document predates the two-choice `Update`
- **THEN** the stored settings version SHALL be unchanged and unknown values SHALL be preserved

#### Scenario: The session stays open
- **WHEN** an `Auto` session remains open past the fifteen-minute cache window
- **THEN** the next check SHALL fetch the channel head again and install a newer release silently without a restart

### Requirement: The in-shell settings screen renders the section model
A1 SHALL present its settings as an A1-owned application rendering the grouped section model rather than deriving its own view of where a value lives. In bare `a1` it SHALL be reachable through `/settings`. The screen SHALL show every section with its entries, keep the current section's header visible while its entries are on screen, and let the user move between entries, jump between sections, filter, change a value, and close using its declared keyboard interactions. Pointer input SHALL follow the existing screen contracts. The screen SHALL be built from the shared component layer rather than drawing a list, menu, dialog, control, input row, or status line of its own. A change SHALL be routed by the entry's backend, and a change that could not be stored or written SHALL be reported rather than displayed as saved. An entry the model reports as not editable SHALL state why rather than accepting input. While the settings module is still loading, the screen SHALL render blank rows rather than a loading placeholder; only a failed module load SHALL print its failure message. Closing Settings SHALL restore the previous surface.

#### Scenario: Open the settings screen
- **WHEN** the user invokes `/settings` in bare `a1`
- **THEN** the screen SHALL open showing the A1 and Agent sections with current values
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

### Requirement: Prompt history settings declare persistence, retention, and live-scope boundaries
A1 SHALL declare `promptHistoryEnabled` as a boolean defaulting to true, `promptHistoryMaxItems` as an integer allowing 10 through 100 in steps of 10 and defaulting to 100, and `promptHistoryScope` as `unique` (default) or `shared`. They SHALL appear in bare A1's History settings section as `Persistent history`, `History limit`, and `History scope`, using existing shared settings controls, profile-local A1 settings persistence, validation, and stored/effective-state presentation. `promptHistoryEnabled` and `promptHistoryMaxItems` SHALL declare a `next-start` application boundary; `promptHistoryScope` SHALL be live and apply to running bare-A1 agents sharing that profile. Unique SHALL select a durable history per agent session, while Shared SHALL retain the former profile-wide history. Saving a scope SHALL switch each running agent's selected durable history and image sidecars without migrating, merging, deleting, or rerouting already-submitted prompts; unsent drafts SHALL remain intact. No Pi settings document or separate history settings file SHALL be used, and `a1 pi` SHALL neither expose nor apply these A1 settings.

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

## MODIFIED Requirements

### Requirement: Resolved settings are offered to a surface as grouped sections
A1 SHALL expose the resolved settings as sections a consuming surface can present without knowing where a value is stored: the declared available A1 settings in their own section, and the available settings reported by the engine settings port under a distinct Agent section. Each presented entry SHALL carry its current stored value, current effective value when different, whether it can be changed from A1, its application boundary, its available choices where its source declares them, and its description where its source provides one. Agent settings SHALL be read, written, and applied only through the engine settings port; A1 SHALL NOT write Pi settings storage directly. Where the engine does not advertise the write or effect capability required by an entry, that entry SHALL be filtered from the presented section. A descriptor without an application contract SHALL not be promoted to a UI entry. The consuming surface SHALL retain the shared input, list, menu, dialog, shortcut, and scrollbar components and the reviewed semantic styles and geometry for setting rows, labels, values, selected state, controls, menus, structured dialogs, deferred and failure notices, wrapping, and narrow-terminal clipping. The owned settings interaction SHALL remain a declared product difference: descriptions stay in entry metadata but do not render as selected-row details; ordinary printable input opens search and becomes the query; search uses the same configurable interactive input component as the bare-A1 agent prompt, configured as single-line and paste-disabled; the standing status bar derives from active shortcut declarations; wheel distance resolves the effective live `scrollbarSpeed` through the shared scrollbar policy rather than a settings-screen literal; scalar choices retain the shared `ValueMenu` while rendering as a visually distinct A1 floating panel; and the selected row carries the accent on its cursor and label only, while its value keeps the muted presentation and pointer-hover brightening of every unselected value.

#### Scenario: Build sections with an attached engine
- **WHEN** sections are built while the engine reports its settings
- **THEN** the A1 section SHALL list every declared setting with its resolved value, choices, description, source, and application boundary
- **AND** the Agent section SHALL list every available setting the engine reports with its stored and effective state, writability, and application boundary

#### Scenario: Select a row
- **WHEN** a row is the keyboard selection
- **THEN** its cursor and label SHALL render in the accent role
- **AND** its value SHALL render in the muted role, exactly as an unselected value does
- **AND** pointing at that value SHALL brighten it to the terminal's own foreground, exactly as pointing at an unselected value does

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

#### Scenario: Change a setting in the A1 section
- **WHEN** a change is accepted for an entry in the A1 section
- **THEN** the value SHALL be written to the A1 settings document, applied at its declared boundary, and SHALL NOT be sent to the engine settings port

#### Scenario: Change a setting in the Agent section
- **WHEN** a change is accepted for an entry in the Agent section and the engine advertises the required write and effect capability
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
- **THEN** the A1 section SHALL still be complete and usable
- **AND** no stale, invented, or unavailable-placeholder Agent entry SHALL appear

#### Scenario: Report a failed change
- **WHEN** a change cannot be stored or cannot be applied through the engine
- **THEN** the failure SHALL be reported to the caller and the change SHALL NOT be reported as effective

### Requirement: Every Settings configure workflow uses one centered modal frame

When the owned Settings screen opens a configure workflow, it SHALL keep the Settings list and standing footer visible as a dimmed backdrop and present the workflow on the shared centered floating configure-modal frame. Warnings, generic object-valued settings, both steps of the per-model Thinking Level selector, and future structured settings SHALL use that frame rather than replacing the Settings footer with a full-width docked panel.

The centered modal SHALL use the shared component's native-matching floating panel background across its complete rectangular area, retain the active theme's semantic title, description, row, selection, input, and shortcut roles, and use the established compact dialog width when the terminal permits. Warnings, both Thinking Level steps, generic structured settings, and future configure workflows SHALL receive that palette through the same semantic panel role rather than route- or dialog-specific background values. Its selected row SHALL fill the inner content width with the active selection background while the two-column outer inset remains on the panel background. The existing configure workflow SHALL continue to own its keyboard behavior, pointer policy, writes, undo state, filtering, step transitions, and close behavior. The model and choice windows SHALL adapt to available height so title, active search or selection, and shortcut guidance remain visible on compact terminals.

#### Scenario: Configure warnings

- **WHEN** the user activates `Warnings` from Settings
- **THEN** Settings SHALL remain visible at reduced intensity behind a centered floating `Warnings` modal
- **AND** the modal SHALL show the selected warning description, warning rows, and semantic `Enter change`, `Ctrl+Z undo`, and `Esc close` guidance

#### Scenario: Configure per-model thinking levels

- **WHEN** the user opens either step of the per-model Thinking Level workflow
- **THEN** that step SHALL use the same centered floating frame and dimmed Settings backdrop as other configure workflows
- **AND** model search, provider suffix styling, level selection, step markers, and active-step shortcut guidance SHALL retain their existing behavior

#### Scenario: Configure another structured setting

- **WHEN** a current or future object-valued setting opens through `configure`
- **THEN** it SHALL inherit the centered configure frame without a setting-specific placement branch
- **AND** changing, undoing, or closing it SHALL retain the setting's declared backend behavior

#### Scenario: Render Settings on a compact terminal

- **WHEN** a configure workflow opens with fewer rows or columns than its preferred modal geometry
- **THEN** the modal SHALL stay within the Settings frame and preserve its title, active control or selected row, and shortcut guidance
- **AND** the returned Settings frame SHALL still contain exactly the requested rows with no row wider than the requested width

## REMOVED Requirements

### Requirement: Resident tabs are an opt-in setting
**Reason**: Resident tabs are removed; there is no Tab Bar section.

**Migration**: Stored `tabs*` and `tabBar*` keys are deleted the next time the settings document is written.

### Requirement: Tabs settings expose tab-bar position
**Reason**: There is no tab bar.

**Migration**: The `tabsPosition` key is deleted on next save.

### Requirement: Tab Bar settings expose the plus menu
**Reason**: There is no tab bar.

**Migration**: The `tabBarPlusMenu` key is deleted on next save.

### Requirement: The Settings tab serves Agent settings without an engine
**Reason**: Settings is an in-shell route of the single agent; there is no engine-less Settings tab.

**Migration**: None; `/settings` opens the same screen inside the session.

### Requirement: Tab Bar right-side items are configured through a live multi-select setting
**Reason**: There is no tab bar.

**Migration**: The `tabBarRightItems` key is deleted on next save.

### Requirement: Tab Bar canvas is a live resident setting
**Reason**: There is no tab bar.

**Migration**: The `tabBarBackgroundStyle` key is deleted on next save.

### Requirement: The startup update check is a Generic-section owned setting
**Reason**: The `Notify` choice is removed.

**Migration**: Stored `notify` migrates to `auto`.

### Requirement: Time format is a live Generic-section owned setting
**Reason**: Submitted-prompt timestamps are removed and the tab bar clock goes with the tab bar, so nothing consumes a time format.

**Migration**: The `timeFormat` key is deleted on next save.

### Requirement: The settings screen renders the section model
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "The in-shell settings screen renders the section model".

### Requirement: Prompt history settings declare persistence and retention boundaries
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Prompt history settings declare persistence, retention, and live-scope boundaries".
