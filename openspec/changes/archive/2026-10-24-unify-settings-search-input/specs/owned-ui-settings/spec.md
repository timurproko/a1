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
- **AND** direct and resident Settings SHALL render the same placeholder, caret, selection, and input rules

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
