# owned-ui-settings Specification

## Purpose
Defines A1-owned settings declarations, profile-local persistence and migration, application boundaries, grouped presentation, and shared interaction behavior.

## Requirements

### Requirement: A1 settings have a declared shape, defaults, and validation
Every A1 setting SHALL have a declared identifier, type, allowed values, and default. A1 SHALL resolve a complete value set from defaults overlaid with accepted properties in the product-owned object of the selected global agent settings document. Invalid values SHALL fall back individually. A1 settings SHALL remain logically distinct from Pi settings: they SHALL NOT become Pi root fields or engine descriptors. One manager SHALL own declaration-derived resolution, compatibility transforms, persistence, sections, and typed getters.

#### Scenario: Resolve settings with no stored file
- **WHEN** the owned UI starts and the global agent settings document has no product-owned object
- **THEN** every A1 setting SHALL resolve to its declared default and A1 SHALL start normally without reporting an error

#### Scenario: Resolve settings with a partial stored file
- **WHEN** the stored product object supplies accepted values for some declared settings and omits others
- **THEN** the supplied values SHALL apply and every omitted setting SHALL resolve to its declared default

#### Scenario: Reject an out-of-range stored value
- **WHEN** a stored product value is present but violates its setting's declared type or allowed values
- **THEN** that setting SHALL resolve to its declared default, the remaining accepted values SHALL still apply, and A1 SHALL report the rejected setting once without failing startup

#### Scenario: Encounter an unknown stored key
- **WHEN** the product object contains a key that matches no declared setting
- **THEN** A1 SHALL ignore that key, SHALL preserve it on the next write so a downgrade does not destroy a newer release's value, and SHALL NOT expose it as a setting

#### Scenario: Read a declared setting through its typed getter
- **WHEN** production code reads a declared A1 setting by id
- **THEN** the value SHALL be typed by that setting's allowed values, SHALL be the value in effect for the running session, and SHALL never be absent

### Requirement: A1 settings persist profile-local and survive restart
A1 SHALL persist non-default A1 values as direct properties of a reserved product object in `<effective-home>/.a1/agent/settings.json`, scoped to the normal A1 profile. That object SHALL contain no schema version, `values` wrapper, or other implementation metadata. Pi-owned settings SHALL remain root properties. Shared-file writes SHALL be coordinated and atomic, and stored choices SHALL survive restart, update, reinstall, and materialized-release replacement.

#### Scenario: Change a setting and restart
- **WHEN** the user changes an A1 setting away from its default, the setting is stored, and A1 restarts with the same profile
- **THEN** the changed value SHALL resolve from the product object on the next start

#### Scenario: Return a setting to its default
- **WHEN** the user changes an A1 setting back to its declared default
- **THEN** A1 SHALL remove that setting's property from the product object
- **AND** the default SHALL resolve from its declaration on the next start

#### Scenario: Replace the installed package
- **WHEN** the user stores settings and then updates, reinstalls, or launches another A1 version under the same effective home
- **THEN** every version implementing this contract SHALL resolve the same global agent settings document
- **AND** no setting SHALL depend on the package root or materialized release directory

#### Scenario: Keep profiles isolated
- **WHEN** two A1 profiles have different stored values for the same setting
- **THEN** each profile SHALL resolve only its own stored value, and neither SHALL inherit from the other, from a prior process, or from Pi profile state

#### Scenario: Keep logical backends isolated
- **WHEN** the shared document contains Pi root settings and A1 namespaced settings
- **THEN** each backend SHALL resolve and modify only its owned portion
- **AND** neither backend SHALL interpret the other's keys as its own settings

#### Scenario: Vanilla Pi profile is untouched
- **WHEN** normal A1 writes its shared settings document
- **THEN** the contents and layout of `~/.pi/agent` SHALL be unchanged

#### Scenario: Interrupt a settings write
- **WHEN** a shared settings write is interrupted before completion
- **THEN** the next start SHALL resolve either the complete previous document or the complete new one
- **AND** it SHALL NOT resolve a truncated combination as authoritative

### Requirement: Unreadable or unsupported settings never block startup
A1 SHALL treat a global settings file or product object it cannot read, parse, or interpret as absent for A1-owned resolution. Startup SHALL continue with declared defaults, report the condition through diagnostics without replacing Settings footer guidance, and preserve unreadable content unless bounded leading-prefix recovery proves that the remaining bytes are exactly one JSON object. Unknown product properties SHALL be preserved as forward-compatible data rather than requiring a schema-version decision.

#### Scenario: Recover harmless leading corruption
- **WHEN** the global settings file has a bounded non-JSON prefix and removing that prefix leaves exactly one valid JSON object
- **THEN** A1 SHALL atomically rewrite the complete object before the engine loads settings
- **AND** every parsed root property SHALL be preserved
- **AND** the Settings footer SHALL remain on shortcut hints

#### Scenario: Corrupt settings file
- **WHEN** the global settings file or product object cannot be parsed and does not satisfy bounded leading-prefix recovery
- **THEN** A1 SHALL start with declared defaults, SHALL preserve the original bytes, and SHALL NOT exit or present a broken settings surface

#### Scenario: Settings file from a newer version
- **WHEN** the product object contains unknown properties written by a newer A1 release
- **THEN** the running A1 SHALL apply every recognized valid property, preserve every unknown property, and use declared defaults for omitted settings
- **AND** it SHALL NOT require or write a schema version to make that decision

#### Scenario: Settings location is not writable
- **WHEN** the shared settings location cannot be written
- **THEN** the session SHALL continue with resolved values, the failed change outcome SHALL remain authoritative, the optimistic change SHALL roll back, and the surface SHALL NOT claim the change was saved or replace shortcut hints

### Requirement: A changed setting applies to the running session
A1 SHALL apply a changed setting at the application boundary declared by its resolved entry and SHALL keep effective values consistent across every surface that reads them. Each presented setting SHALL declare one of `live`, `next-session`, `next-start`, or `current-exit`. A live setting SHALL take effect before the change reports success. A deferred setting SHALL store the selected value while the running owner retains its previous value until the declared boundary. A setting unavailable in the active product mode or environment SHALL be omitted from the settings UI without an unavailable placeholder row. These rules SHALL apply equally to A1 settings and settings supplied through the engine settings port.

#### Scenario: Change a live-applicable setting
- **WHEN** the user accepts a change to a setting declared as `live`
- **THEN** the new value SHALL take effect in the running session before success is reported
- **AND** every surface reading that setting SHALL observe the same effective value

#### Scenario: Change a restart-required setting
- **WHEN** the user accepts a change declared as `next-session`, `next-start`, or `current-exit`
- **THEN** the value SHALL be stored and the running owner SHALL retain the previous value until that boundary
- **AND** the Settings row SHALL show the selected stored value without inline effective-value or application-boundary text

#### Scenario: Setting is unavailable
- **WHEN** the active product mode or environment cannot provide a setting's effect
- **THEN** the settings UI SHALL omit the entry and any option-specific unavailability text
- **AND** no hidden route SHALL accept a persisted no-op

#### Scenario: Applying a change fails
- **WHEN** storage accepts a value but its declared live effect fails
- **THEN** the screen SHALL report the failure, SHALL not claim the value is effective, and SHALL restore one consistent effective value

#### Scenario: Abandon a change
- **WHEN** the user cancels out of editing a setting before accepting it
- **THEN** no value SHALL be stored and the running session SHALL be unaffected

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

### Requirement: A setting whose value is an object is edited through its own dialog
A setting whose value is an object SHALL be presented as one entry that opens a dialog rather than as
a value to be cycled. The dialog SHALL offer every part the engine declares for that setting, not only
the parts the stored value happens to mention, and a part the stored value says nothing about SHALL
show the default the engine would apply. A part changed in the dialog SHALL be written back as the
whole object, and the dialog SHALL show the change it made.

#### Scenario: Open a setting that holds an object
- **WHEN** the reader opens a setting whose value is an object
- **THEN** the dialog SHALL list every part the engine declares for it
- **AND** a part absent from the stored value SHALL show the engine's default rather than being omitted

#### Scenario: Change a part
- **WHEN** a part is changed in the dialog
- **THEN** the whole object SHALL be written with that part changed
- **AND** the dialog SHALL show the new value, so a further change steps from it

#### Scenario: A setting declares no parts
- **WHEN** a setting holds an object for which the engine declares no parts
- **THEN** the screen SHALL say there is nothing to configure rather than opening an empty dialog

### Requirement: A theme may follow the terminal appearance
The theme setting SHALL offer the installed themes and, ahead of them, the option to follow the
terminal appearance. The themes offered SHALL be resolved when read, so a theme the reader installs
appears without A1 being changed. While the theme follows the terminal, the screen SHALL present which
theme each appearance uses as entries of their own, and SHALL NOT present them while a single theme is
in use. Choosing to follow the terminal SHALL start from the theme already in use.

#### Scenario: Offer the themes
- **WHEN** the theme entry is opened
- **THEN** following the terminal appearance SHALL be offered first, then every installed theme

#### Scenario: Follow the terminal appearance
- **WHEN** the reader chooses to follow the terminal appearance
- **THEN** both appearances SHALL start from the theme already in use
- **AND** an entry for each appearance SHALL appear with the theme setting

#### Scenario: Return to a single theme
- **WHEN** a single theme is chosen again
- **THEN** the per-appearance entries SHALL no longer be presented

### Requirement: The search reads sections as well as settings
Filtering SHALL match a section's name as well as the settings inside it. A section the reader names
SHALL be presented whole, rather than narrowed to the settings whose own names repeat it.

#### Scenario: Search for a section
- **WHEN** the filter matches a section's name
- **THEN** every setting in that section SHALL be shown

#### Scenario: Search for a setting
- **WHEN** the filter matches no section name
- **THEN** only the settings whose own names match SHALL be shown

### Requirement: The settings list scrollbar follows the shared scrollbar settings
The owned settings screen SHALL present its list scrollbar through the shared scrollbar presentation policy using the currently effective `scrollbarAppearance` and `scrollbarStyle`, including an accepted live value pending source reflection, rather than drawing a rail whenever the list overflows. Under `always` the rail SHALL be drawn whenever the list overflows. Under `auto` the rail SHALL be drawn while the list scrolls and for the transcript's linger afterwards, or while the pointer is over the rail or dragging its thumb, and SHALL fade on its own once the linger passes. Under `hidden` no rail SHALL be drawn and no rail column SHALL be reserved. Under `auto` and `always` the rail column SHALL remain reserved while the list fits, so revealing the rail does not reflow the rows. Thin SHALL use the shared `┃` glyph for track and thumb, and thick SHALL use the shared `▐` glyph for track and thumb. Hover and drag SHALL retain the selected style. Tracks SHALL remain dim and thumbs accent-colored through the declared theme roles.

The settings rail SHALL own pointer reports inside its hit region: pointer motion SHALL update rail hover, pressing the thumb and moving SHALL scroll the list with the thumb, and pressing the track above or below the thumb SHALL page in that direction. Rail hover SHALL NOT set a row hover state. The whole-pane wheel ownership, the structured dialog, and the value menu SHALL keep their existing pointer precedence.

#### Scenario: Overflow under auto without a pointer
- **WHEN** `scrollbarAppearance` resolves to `auto`, the list overflows, it has not scrolled within the linger, and no pointer is over the rail
- **THEN** the rail column SHALL be reserved and blank
- **AND** no track or thumb glyph SHALL be drawn

#### Scenario: Scroll under auto
- **WHEN** the list scrolls under `auto` by wheel, drag, track page, keyboard jump, or a search that resets the position
- **THEN** the next frame SHALL draw the track and thumb
- **AND** the rail SHALL stay drawn for the shared linger and then be blanked by a repaint the screen requests itself

#### Scenario: Hover the rail under auto
- **WHEN** the list overflows under `auto` and the pointer moves onto the rail column within the track
- **THEN** the next frame SHALL draw the dim track and accent thumb using the selected style's glyph
- **AND** moving the pointer off the rail SHALL blank the rail again

#### Scenario: Overflow under always
- **WHEN** `scrollbarAppearance` resolves to `always` and the list overflows
- **THEN** the rail SHALL be drawn with the thin glyph for `thin` and the thick glyph for `thick`
- **AND** it SHALL remain drawn without pointer activity

#### Scenario: Hide the rail
- **WHEN** `scrollbarAppearance` resolves to `hidden` and the list overflows
- **THEN** no rail SHALL be drawn and the rows SHALL use the full pane width
- **AND** pointer reports at the former rail column SHALL be handled as ordinary list reports

#### Scenario: Change the mode on the settings screen
- **WHEN** the reader changes `Scrollbar mode` or `Scrollbar style` on the settings screen
- **THEN** the settings rail SHALL follow the accepted value on the next frame, before the store reflects it
- **AND** the transcript SHALL observe the same value through its existing live application

#### Scenario: Drag the thumb
- **WHEN** the reader presses the thumb and moves the pointer along the rail
- **THEN** the list SHALL scroll to the position the thumb row denotes, keeping the grab offset
- **AND** releasing the pointer SHALL end the drag without changing the selection

#### Scenario: Page from the track
- **WHEN** the reader presses the rail track above or below the thumb
- **THEN** the list SHALL scroll by the rows in view in that direction, clamped to the list extent

### Requirement: Settings boundary jumps use the content-boundary chords
The owned settings screen SHALL jump to the first setting on `Ctrl+Home` and to the last setting on `Ctrl+End`, in the list and while searching, matching the bare-A1 transcript's content-boundary chords. Unmodified `Home` and `End` SHALL NOT move the settings selection: in the list they SHALL be ignored, and while searching they SHALL move the search input's cursor to its start and end through the shared line input. The shortcut declarations SHALL name `ctrl+home` and `ctrl+end` for these actions so listings and the status bar derive from the effective bindings. The xterm modifier and rxvt Ctrl encodings of both chords SHALL produce the same action.

#### Scenario: Jump in the list
- **WHEN** the list has focus and the reader presses `Ctrl+Home` or `Ctrl+End`
- **THEN** the selection SHALL move to the first or the very last setting respectively
- **AND** `Ctrl+Home` SHALL restore the list's opening scroll position

#### Scenario: Jump while searching
- **WHEN** search is open with results and the reader presses `Ctrl+Home` or `Ctrl+End`
- **THEN** the selection SHALL move to the first or last result respectively
- **AND** the search text and cursor SHALL remain unchanged

#### Scenario: Move the search cursor
- **WHEN** search is open and the reader presses `Home` or `End`
- **THEN** the search input's cursor SHALL move to its start or end respectively
- **AND** the selection and scroll position SHALL remain unchanged

#### Scenario: Unmodified keys in the list
- **WHEN** the list has focus and the reader presses `Home` or `End`
- **THEN** the selection and scroll position SHALL remain unchanged

#### Scenario: Decode equivalent terminal reports
- **WHEN** a terminal delivers the xterm modifier or rxvt Ctrl encoding of `Ctrl+Home` or `Ctrl+End`
- **THEN** the settings screen SHALL perform the same boundary jump

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

### Requirement: The settings screen uses the framed A1 visual hierarchy
The owned settings screen SHALL keep a full-width rule in the active theme's border role fixed at the top, followed initially by a one-column-inset `Settings` title in bold accent role. One empty opening row SHALL separate that title from the first settings section. The title SHALL scroll away with settings content; only the active settings section header SHALL pin directly below the fixed top rule. An ordinary full-width border-role rule SHALL remain fixed between settings content and footer guidance. While search is active, the top rule of the established three-row shared input component SHALL replace that ordinary divider, followed by the input row and its bottom rule. No trailing empty result row SHALL separate the final visible result from the input's top rule. At the bottom of an overflowing search result list, the layout SHALL use every available body row when an earlier result is available, including when a section-boundary spacer is represented by the outgoing sticky heading, and scrollbar geometry SHALL describe that same filled viewport. Opening and closing an untouched search SHALL restore the list's prior scroll position. Wheel input anywhere over the search footer, including its bottom status row, SHALL scroll its result list through the final item. When bottom clamping lands on a section-boundary spacer, the outgoing sticky heading SHALL represent that transition without allowing the spacer to consume the row needed by the final setting. In the dark theme shown by the product these roles SHALL remain the established blue border and cyan accent colors. Settings section headers, including a sticky header, SHALL render bold in the theme's heading role, which SHALL match the yellow Markdown-heading color used by `What's New`. Section rows, setting-row leading markers, and footer guidance SHALL begin at the title's one-column inset. Setting labels, selected rows, values, notes, menus, dialogs, search, notices, and footer guidance SHALL retain their established semantic roles. A dropdown's effective-value checkmark SHALL use the accent role, including while that choice is highlighted.

The list, changing visible title offset, sticky-header calculation, scrollbar, pointer hit regions, value menus, structured dialog, search input, and footer SHALL share one current content rectangle below the fixed top rule. While the title is visible, the scrollbar track SHALL begin alongside the title, one row above the opening list body; after the title scrolls away, it SHALL begin alongside the pinned section at the top of the scrolling rectangle. Horizontal and vertical offsets SHALL be reflected in pointer and overlay coordinates. Every terminal size SHALL still produce exactly the requested row count with no row wider than the requested width.

#### Scenario: Open the framed settings screen
- **WHEN** the user opens `/settings` with the ordinary dark theme
- **THEN** the screen SHALL show a full-width blue top rule, a bold cyan `Settings` title inset by one column, and a full-width blue rule above the footer
- **AND** `Generic`, `Scroll`, `History`, `Agent`, and every other settings section heading SHALL be bold yellow
- **AND** one empty row SHALL separate the title from the first section heading
- **AND** section headings, setting-row leading markers, and footer guidance SHALL align with the title's left edge
- **AND** setting rows and values SHALL retain their existing selected, unselected, and hover colors

#### Scenario: Scroll the framed settings list
- **WHEN** the settings entries overflow and the user scrolls or jumps between sections
- **THEN** the top rule SHALL remain fixed while the `Settings` title scrolls out of view
- **AND** only the visible section heading SHALL pin immediately below the top rule in the yellow heading role
- **AND** the scrollbar SHALL begin alongside the title before scrolling and alongside the pinned section after the title disappears
- **AND** the footer divider and guidance SHALL remain fixed
- **AND** the scrollbar thumb and pointer targets SHALL correspond to the rows visibly drawn above the footer

#### Scenario: Open the established search input
- **WHEN** the user opens settings search
- **THEN** the shared input SHALL retain its top rule, prompt row, and bottom rule
- **AND** its top rule SHALL replace, rather than duplicate, the ordinary bottom divider
- **AND** the list SHALL yield only the additional rows needed by the prompt and bottom rule
- **AND** no trailing empty result row SHALL appear between the final result and the input's top rule
- **AND** wheel input anywhere over the search footer, including its bottom status row, SHALL scroll the results through their final item
- **AND** a section-boundary spacer at the top of the bottom viewport SHALL NOT hide the final setting
- **AND** closing the search without editing or navigating SHALL restore the scroll position from before search opened
- **AND** the left-aligned shortcut guidance SHALL remain below the input

#### Scenario: Reach the end of settings search
- **WHEN** an overflowing settings search is scrolled or jumped to its final result and bottom clamping encounters a section-boundary spacer
- **THEN** the final setting SHALL occupy the last result row immediately above the search input's top rule
- **AND** no synthetic or padded empty row SHALL separate that setting from the rule while an earlier result is available
- **AND** the sticky heading, scroll position, and scrollbar thumb SHALL describe the same filled bottom viewport

#### Scenario: Use menus or a structured dialog
- **WHEN** the user opens a scalar value menu or a structured-setting dialog
- **THEN** the fixed top rule and any visible title SHALL retain their border and accent roles
- **AND** a scalar menu's effective-value checkmark SHALL render in the accent role, even when its row is highlighted
- **AND** the active menu, dialog, notices, and guidance SHALL retain their established composition, colors, keyboard behavior, and pointer behavior without being displaced outside the screen

#### Scenario: Render a constrained settings frame
- **WHEN** the settings screen is rendered at a narrow width or a height smaller than its ordinary chrome and content
- **THEN** the frame SHALL prioritize rows from the top in stable order, clip ANSI-aware, and fill exactly the requested rectangle
- **AND** it SHALL NOT emit an over-width row, an embedded line break, or a pointer target for a row that is not visible

### Requirement: The Agent section exposes Pi's fullscreen copy preference

When bare A1 provides application-owned fullscreen frame selection, the owned settings screen SHALL expose pinned Pi's `fullscreenCopyOnSelect` setting exactly once in the existing Agent section. The entry SHALL use the concise bare-A1 label `Copy on select` and Pi's generated description, SHALL show the value persisted by Pi's settings manager, and SHALL remain an Agent-backend boolean rather than an A1-owned setting. It SHALL be writable through the engine settings port and SHALL declare live application.

Bare A1 SHALL NOT expose or bind Pi's `fullscreenWheelScrollLines` setting because the custom viewport's global A1-owned `scrollbarSpeed` setting is its sole wheel-distance and acceleration authority. The pinned comparison profile SHALL retain Pi's original `Fullscreen copy on select` and `Fullscreen wheel scrolling` wording, settings, persistence, and effects.

#### Scenario: Inspect the Agent section

- **WHEN** bare A1 opens the owned settings screen with its selection owner and custom viewport attached
- **THEN** the Agent section SHALL contain one `Copy on select` boolean entry backed by Pi's `fullscreenCopyOnSelect` key
- **AND** its displayed value SHALL match the persisted Pi setting
- **AND** no `Fullscreen wheel scrolling` entry SHALL appear

#### Scenario: Change automatic copy

- **WHEN** the reader changes `Copy on select`
- **THEN** the change SHALL be written through the engine settings port and applied live to the active bare-A1 selection owner
- **AND** no A1 settings document SHALL receive a duplicate value

#### Scenario: Use global owned scrolling

- **WHEN** bare A1's custom viewport handles wheel input
- **THEN** its distance and acceleration SHALL come from the global A1-owned Scroll settings
- **AND** Pi's `fullscreenWheelScrollLines` value SHALL NOT be bound as a competing bare-A1 shell effect

#### Scenario: Keep comparison settings behavior unchanged

- **WHEN** the reader uses the `a1 pi` comparison profile
- **THEN** its pinned settings presentation SHALL retain `Fullscreen copy on select` and `Fullscreen wheel scrolling`
- **AND** their fullscreen behavior SHALL remain owned by pinned Pi without a bare-A1 label override or duplicate setting

### Requirement: Pending setting values remain visually stable

The owned Settings screen SHALL show a requested scalar value immediately while its save is unresolved and SHALL continue to render the selected stored value after success. A scalar row SHALL NOT append effective-value or application-boundary text, whether the change is pending, live, or deferred. A failed setting SHALL restore the prior authoritative value and report the failure.

#### Scenario: Save a live scalar value

- **WHEN** the user changes a live scalar setting and its backend save has not settled
- **THEN** the value cell SHALL show only the requested value using its normal value formatting
- **AND** it SHALL NOT flash an effective-value or application-boundary suffix derived from the prior snapshot
- **WHEN** the save succeeds and the source reflects that live value
- **THEN** the same value SHALL remain visually stable without an intermediate replacement string

#### Scenario: Save a deferred scalar value

- **WHEN** the user changes a deferred scalar setting
- **THEN** the value cell SHALL show the selected stored value while the save is pending and after it succeeds
- **AND** it SHALL NOT append the current effective value or application boundary

#### Scenario: Reopen Settings with a deferred value

- **WHEN** Settings opens while a deferred stored value differs from the value currently in effect
- **THEN** the value cell SHALL show only the selected stored value

#### Scenario: Pending scalar save fails

- **WHEN** the optimistic scalar save fails or is unavailable
- **THEN** the row SHALL restore the authoritative source value
- **AND** the Settings screen SHALL report the failure rather than leaving the optimistic value displayed as saved

### Requirement: Settings edits can be undone within the open screen

The owned Settings screen SHALL retain transient reverse-order undo history for successful scalar and structured-setting edits made during that screen instance. `Ctrl+Z` SHALL restore the exact value that preceded the newest successful edit through the same backend and application boundary as an ordinary change. Each successful invocation SHALL remove one undo step, so repeated invocations restore earlier edits in reverse user-action order. An undo restoration SHALL NOT create a redo or another undo step, and closing the Settings screen SHALL discard its history.

Failed forward changes SHALL NOT become undoable. If restoration fails or is unavailable, the current authoritative value SHALL remain in effect, the failure SHALL be reported, and that undo step SHALL remain available for retry. For a structured setting, one step SHALL restore the preceding whole object and an open structured dialog SHALL show that restored object.

#### Scenario: Undo one scalar edit

- **WHEN** a scalar setting change succeeds and the user presses `Ctrl+Z`
- **THEN** the setting SHALL be changed through its owning backend to the scalar value that preceded that edit
- **AND** the restored value SHALL be shown without creating a redo step

#### Scenario: Undo multiple edits

- **WHEN** multiple setting changes succeed during one Settings screen instance
- **AND** the user presses `Ctrl+Z` repeatedly
- **THEN** each press SHALL restore one prior value in reverse user-action order
- **AND** asynchronous completion order SHALL NOT reorder those undo steps

#### Scenario: Undo a structured edit

- **WHEN** a structured-setting part change succeeds and the user presses `Ctrl+Z`
- **THEN** the preceding whole structured value SHALL be written through the owning backend
- **AND** an open structured dialog SHALL show the restored part values

#### Scenario: Forward change fails

- **WHEN** a setting change fails before it is successfully stored or applied
- **THEN** that attempted change SHALL NOT add an undo step
- **AND** `Ctrl+Z` SHALL NOT treat the failed optimistic value as saved history

#### Scenario: Undo restoration fails

- **WHEN** restoring the newest undo step fails or becomes unavailable
- **THEN** the Settings screen SHALL retain the current authoritative value and report the failure
- **AND** a later `Ctrl+Z` SHALL be able to retry that same undo step

#### Scenario: Close and reopen Settings

- **WHEN** the user closes a Settings screen that has undo history and later opens a new Settings screen
- **THEN** the new screen SHALL have no undo history from the prior screen

### Requirement: The per-model thinking setting uses the pinned stepped selector

The owned Settings screen SHALL present the Agent `modelThinkingLevels` structured setting through a keyboard-only two-step selector matching A1's modal hierarchy rather than through the generic object-part panel. Both steps SHALL use the title `Thinking Level` followed on the same line by a muted `(step N/2)` marker. Step 1 SHALL show the muted next-line description `Select a model to configure`, a focused searchable input using the exact ASCII `> ` prompt marker with the `>` in the active semantic accent role, and the models supplied by the setting descriptor. A bracketed provider suffix such as `[openai-codex]` SHALL use the muted role on selected and unselected model rows, matching the Models dialog. A selected model or thinking-level row SHALL place exactly one space between its arrow cursor and visible label; unselected levels SHALL NOT reserve hidden checkmark spacing. Typing SHALL filter model labels, Up/Down SHALL move the selected model, Enter SHALL advance to that model's supported level choices, and Escape SHALL close from step 1.

Step 2 SHALL retain the `Thinking Level` title with `(step 2/2)`, show the muted next-line description `Select default thinking level for {model label}`, offer only the supported levels declared for that model, and add pinned Pi's clear-override choice when that model has an override. The model label SHALL NOT replace or extend the title. Enter on clear override SHALL remove that model's override; Enter on a level SHALL write the whole updated object through the Agent backend and return to step 1 so another model can be configured. Escape SHALL return to step 1 without writing. The footer SHALL describe only the active step's keyboard behavior, including `Type search`, `Enter select`, and `Esc close` on step 1 and `Esc back` on step 2, rather than showing the main Settings adjustment or undo hints.

#### Scenario: Open per-model thinking levels

- **WHEN** the user opens the `modelThinkingLevels` setting
- **THEN** the dialog SHALL show `Thinking Level` with a muted `(step 1/2)`, the muted next-line description `Select a model to configure`, a focused search input beginning with exact ASCII `> ` whose `>` uses the active accent role, and descriptor-supplied model rows
- **AND** bracketed provider suffixes SHALL be muted as they are in the Models dialog
- **AND** its footer SHALL show `Type search`, `Enter select`, and `Esc close` rather than generic Settings guidance

#### Scenario: Filter and choose a model

- **WHEN** the user types a query in step 1
- **THEN** only matching descriptor-supplied model labels SHALL remain
- **AND** the marker, query, caret, and clipping SHALL retain shared input geometry
- **WHEN** the user navigates and presses Enter on a model
- **THEN** step 2 SHALL keep the `Thinking Level` title with muted `(step 2/2)`
- **AND** the next line SHALL say `Select default thinking level for {model label}` in the muted role
- **AND** the model label SHALL NOT appear in the title
- **AND** the menu SHALL show its declared supported levels plus clear override when an override exists
- **AND** the selected row's arrow SHALL be followed by exactly one space before its visible label

#### Scenario: Save a model level

- **WHEN** the user selects a supported level in step 2
- **THEN** the whole override object SHALL be written through the Agent backend with that model set to the selected level
- **AND** the dialog SHALL return to step 1 for another selection

#### Scenario: Restore the model default

- **WHEN** the user selects clear override in step 2
- **THEN** that model key SHALL be absent from the whole object written through the Agent backend
- **AND** other model overrides SHALL remain unchanged

#### Scenario: Go back without changing

- **WHEN** the user presses Escape in step 2 while its footer shows `Esc back`
- **THEN** the dialog SHALL return to step 1 without writing
- **WHEN** the user presses Escape in step 1 while its footer shows `Esc close`
- **THEN** the structured dialog SHALL close and restore the Settings list

### Requirement: Structured-setting dialogs are keyboard-only

While any structured-setting dialog is open, pointer motion, presses, and releases SHALL be consumed without moving its selection, changing a part, advancing a step, writing a value, or acting on Settings rows. Wheel input over the Settings content SHALL continue to scroll the list behind the fixed dialog. All dialog navigation and changes SHALL occur through the dialog's advertised keyboard shortcuts.

#### Scenario: Point or click in a structured dialog

- **WHEN** the user moves or presses the pointer over an open structured-setting dialog
- **THEN** the report SHALL be consumed without changing dialog selection or settings state

#### Scenario: Point outside a structured dialog

- **WHEN** a non-wheel pointer report lands outside the visible structured rows while the dialog is open
- **THEN** it SHALL NOT act on the Settings list, scrollbar, or values behind the dialog

#### Scenario: Scroll Settings content with a structured dialog open

- **WHEN** the user sends mouse-wheel input over the Settings content while a structured-setting dialog is open
- **THEN** the Settings list SHALL scroll by the configured wheel distance
- **AND** the structured dialog SHALL remain open and unchanged

### Requirement: Scalar value menus align choices with the source value

When the owned Settings screen opens a scalar value menu, the menu SHALL shift its frame one cell left of the source value column so the visible choice text aligns with the value text in the setting row. The effective-value mark SHALL occupy the preceding menu cells without pushing choice labels one cell to the right.

#### Scenario: Open a scalar value menu

- **WHEN** the user opens an enumerated setting's value menu
- **THEN** each choice label SHALL begin in the same terminal column as the source setting value
- **AND** the effective-value mark SHALL remain visible immediately before the current choice

### Requirement: Successful setting changes preserve standing guidance

The owned Settings screen SHALL keep its standing shortcut guidance visible after a successful scalar or structured change, including deferred changes and successful undo restorations. Only actionable conditions such as a save or restoration failure or an interrupt warning SHALL replace that guidance.

#### Scenario: Successfully change a setting

- **WHEN** a setting change succeeds at any application boundary
- **THEN** the standing shortcut guidance SHALL remain visible
- **AND** no successful-save notice SHALL replace it

#### Scenario: Successfully restore a setting

- **WHEN** an undo restoration succeeds
- **THEN** the standing shortcut guidance SHALL remain visible
- **AND** no successful-restoration notice SHALL replace it

#### Scenario: Setting operation fails

- **WHEN** a setting change or undo restoration fails
- **THEN** the Settings screen SHALL replace the standing shortcut guidance with the failure notice

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

### Requirement: Enter opens an enumerated setting menu before changing its value

When an editable enumerated scalar row has focus in the owned Settings screen, Enter SHALL open its existing value menu without changing the setting. A keyboard-opened menu SHALL make the current effective choice active immediately, with its effective-value mark retained, and SHALL render the source row's value in the terminal foreground used when the pointer rests over that value. While the menu is open, Up and Down SHALL navigate from that choice, Escape SHALL close it without a write, and Enter SHALL apply the active choice and close the menu. Closing a keyboard-opened menu SHALL restore the source value's ordinary selected-row role. Closed-menu Left and Right adjustment, numeric steppers, structured-setting dialogs, menu placement, and pointer interaction SHALL retain their existing behavior.

#### Scenario: Open a scalar menu with Enter

- **WHEN** an editable enumerated scalar Settings row has focus and the user presses Enter
- **THEN** its value menu SHALL open with the current effective choice active
- **AND** that choice SHALL retain the effective-value mark
- **AND** the source row's value SHALL use the same bright foreground as a pointer-opened value
- **AND** no setting value SHALL be written

#### Scenario: Navigate and confirm a keyboard-opened menu

- **WHEN** a scalar value menu was opened with Enter
- **THEN** Up and Down SHALL move the active choice within the menu's existing bounds
- **AND** pressing Enter SHALL apply the active choice through the setting's owning backend and close the menu

#### Scenario: Cancel a keyboard-opened menu

- **WHEN** a scalar value menu was opened with Enter and the user presses Escape
- **THEN** the menu SHALL close without changing or writing the setting
- **AND** the source row's value SHALL return to its ordinary selected-row presentation

#### Scenario: Retain specialized setting controls

- **WHEN** the focused setting is numeric or structured rather than an enumerated scalar
- **THEN** Enter SHALL retain that setting's existing stepper or structured-dialog behavior
- **AND** Left and Right on a closed enumerated row SHALL retain direct value adjustment

### Requirement: Settings footer always presents shortcut guidance
The Settings status row SHALL always render the active shortcut hints. Save results, unavailable-entry feedback, document diagnostics, and interrupt confirmation SHALL NOT replace those hints.

#### Scenario: A setting change fails
- **WHEN** an A1-owned or Agent-backed change cannot be stored or applied
- **THEN** any optimistic value SHALL roll back as appropriate
- **AND** the footer SHALL continue showing the same shortcut hints

#### Scenario: A setting cannot be changed from the surface
- **WHEN** the user attempts an unavailable or non-editable setting action
- **THEN** the footer SHALL remain unchanged and SHALL NOT display a transient message

### Requirement: The product section is a flat object inside global agent settings
The reserved root key SHALL equal the validated product command identity (`a1` for this product). Its value SHALL directly map setting identifiers to non-default values, with no version or `values` subsection. In this capability, “A1 settings document” means that object, while “Pi settings storage” or “Agent settings” means engine-owned root properties; sharing a physical file SHALL NOT transfer backend ownership or routing.

#### Scenario: Inspect the shared settings file
- **WHEN** Pi settings and non-default A1 settings are stored
- **THEN** Pi settings SHALL remain at their established root keys
- **AND** each A1 setting SHALL appear directly below the `a1` root object
- **AND** no A1 schema metadata or nested values object SHALL appear

#### Scenario: Change an A1-owned entry
- **WHEN** the user accepts a change through an A1-owned Settings entry
- **THEN** the namespaced product object SHALL change without sending that value through the engine settings port
- **AND** every Pi-owned root property SHALL remain unchanged

#### Scenario: Change an Agent entry
- **WHEN** the user accepts a change through an Agent-backed Settings entry
- **THEN** the engine settings port SHALL update its root property without adding that value to the product object
- **AND** the complete product object SHALL remain unchanged

#### Scenario: Store only deviations
- **WHEN** all declared A1 settings equal their defaults and the product object has no preserved unknown property
- **THEN** the shared file SHALL omit the product object entirely

### Requirement: Settings text inputs omit prompt markers
The owned full-screen Settings search input SHALL render no chevron or ASCII greater-than prompt marker. Its top and bottom rules, content inset, placeholder, block caret, filtering, navigation, and cancellation behavior SHALL remain unchanged. Settings-owned standard dialog searches, including the per-model Thinking Level selector's step-one model search, SHALL instead use the shared exact ASCII `> ` standard-dialog marker with the `>` in the active semantic accent role. Non-search structured text entries SHALL retain their established presentation.

#### Scenario: Open Settings search
- **WHEN** the user opens the `search settings` input
- **THEN** its input row SHALL begin with the placeholder or caret at the shared content inset
- **AND** no chevron or greater-than marker SHALL precede it

#### Scenario: Filter per-model thinking settings
- **WHEN** the per-model Thinking Level selector shows its step-one search input
- **THEN** exact ASCII `> ` SHALL precede the empty caret or typed query
- **AND** the `>` SHALL use the active semantic accent role
- **AND** model filtering, navigation, selection, focus, and Escape behavior SHALL remain unchanged

#### Scenario: Render a non-search structured text entry
- **WHEN** Settings presents a structured text editor that is not a search field
- **THEN** this requirement SHALL NOT add a search marker to that entry

### Requirement: Settings empty results use concise application copy

The owned Settings screen SHALL present its centered no-result state with the existing `👀` mark directly above the exact punctuation-free message `No settings found`, with the two-row group positioned one row lower than the original empty state.

#### Scenario: Search has no matching settings

- **WHEN** the active Settings search matches no entries
- **THEN** the centered empty state SHALL show `👀` on the row directly above `No settings found`
- **AND** the message row SHALL remain at its lowered position
- **AND** the message SHALL NOT end with a period

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

### Requirement: The default model has a dedicated Settings configurator

The owned Settings screen SHALL expose Pi's persisted default provider/model pair as one writable Agent entry labeled `Default model`. The entry SHALL display `configure` rather than treating the model catalog as a scalar value menu, and SHALL appear immediately above `Default thinking level per model` in the Agent section. It SHALL declare `next-session` application and SHALL use Pi's existing default-model settings fields as its sole persistence authority.

Activating `Default model` SHALL open a keyboard-only searchable selector using the authenticated models supplied by the Agent setting descriptor. The selector SHALL use the owned modal hierarchy, an accent title `Default Model`, a muted instruction `Select the model used for new sessions`, a focused search input with the exact ASCII `> ` prompt marker, and shortcut guidance for typing, Up/Down navigation, Enter selection, and Escape close. Each model row SHALL use the Models-dialog form `modelId [provider]` without a duplicate display-name column. Search SHALL still match model identifier, display name, provider, and full `provider/modelId` reference. The persisted default SHALL be the initial selection when it remains available and SHALL have one success-colored `✓` immediately after `[provider]`, independent of the active session model.

Enter SHALL accept the selected full model reference through the Agent settings backend, close the selector immediately, and continue persistence asynchronously without rendering a saving state. A successful write SHALL leave the Settings list visible and update Pi's persisted default provider/model pair without changing the active session model, active model indicator, current thinking level, or model cycling scope. Escape SHALL close without writing. If the write fails or becomes unavailable, the selector SHALL reopen with its query and selection preserved, the previous default SHALL remain authoritative, and the Settings failure channel SHALL report the error.

The pinned `a1 pi` comparison profile SHALL retain its existing model selector and select-as-default interaction without receiving the owned Settings configurator.

#### Scenario: Inspect the Agent Settings section

- **WHEN** bare A1 opens the owned Settings screen with authenticated models available
- **THEN** the Agent section SHALL contain one `Default model` entry whose value reads `configure`
- **AND** it SHALL appear immediately above `Default thinking level per model`
- **AND** the entry SHALL be backed by Pi's persisted default provider/model pair and declare `next-session` application

#### Scenario: Open default-model configuration

- **WHEN** the user activates `Default model`
- **THEN** the dialog SHALL show `Default Model`, the muted instruction `Select the model used for new sessions`, a focused search input beginning with ASCII `> `, and descriptor-supplied `modelId [provider]` rows without a duplicate display-name column
- **AND** the persisted default SHALL be selected and marked by one success-colored `✓` immediately after `[provider]` when it is available
- **AND** the active session model SHALL NOT be used as the default marker when it differs

#### Scenario: Filter default models

- **WHEN** the user types a query in the default-model selector
- **THEN** only models matching identifier, display name, provider, or full reference SHALL remain
- **AND** Up/Down navigation and the selected row SHALL remain bounded to the filtered results

#### Scenario: Save a different default model

- **WHEN** the user presses Enter on a different available model
- **THEN** the selector SHALL close immediately without showing a saving state
- **AND** a successful asynchronous write SHALL persist Pi's default provider/model pair as that model while the Settings list remains visible
- **AND** the active session model, thinking level, and cycling scope SHALL remain unchanged

#### Scenario: Close without changing the default

- **WHEN** the user presses Escape in the default-model selector
- **THEN** the selector SHALL close without writing
- **AND** the previous persisted default SHALL remain unchanged

#### Scenario: Default-model persistence fails

- **WHEN** an accepted model write later fails or is unavailable
- **THEN** the selector SHALL reopen with the same query and selected model
- **AND** the previous persisted default SHALL remain authoritative
- **AND** the failure SHALL be reported through the Settings failure channel

#### Scenario: Keep comparison model selection unchanged

- **WHEN** the user runs the `a1 pi` comparison profile
- **THEN** its pinned model selector SHALL retain its existing current-model and select-as-default actions
- **AND** the owned `Default model` Settings configurator SHALL NOT replace or modify that selector

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

### Requirement: Automatic session-name format is an owned live choice

Bare A1 SHALL expose the live **Session name format** Agent setting beside **Automatic session name**, with exactly Sentence case, Kebab case, and Title Case choices in that order. Its owned `sessionNameFormat` value SHALL be `sentence` (default), `kebab`, or `title`, persisted through the existing profile settings manager. Valid explicit saved choices SHALL remain effective when the default changes.

#### Scenario: Choose a readable format
- **WHEN** a user selects Sentence case or Title Case and restarts with the same profile
- **THEN** the selected format SHALL remain effective and appear as the current choice

#### Scenario: Keep or recover the default
- **WHEN** the format setting is missing or invalid
- **THEN** automatic naming SHALL use Sentence case and expose all three valid choices with Sentence case first

#### Scenario: Preserve a saved alternative
- **WHEN** the profile contains a valid explicit Kebab case or Title Case preference
- **THEN** that preference SHALL remain effective without being replaced by the new default

#### Scenario: Change the format of future names
- **WHEN** a user changes the format while a session already has a name
- **THEN** its existing name SHALL remain unchanged and no naming request SHALL start solely because of that setting change
- **AND** the next eligible generation or regeneration SHALL use the chosen format

### Requirement: Spinner style is a live Appearance setting with native previews
Bare A1 SHALL expose a persisted A1 setting `spinnerStyle`, labeled `Spinner style`, in Appearance. Its ordered display choices SHALL be lowercase `dots`, `circle`, `diamond`, `square`, and `none` in both the settings row and dropdown, stored respectively as `current`, `circle`, `diamond`, `square`, and `none`. The `dots` choice, stored as `current`, SHALL remain the default and individual fallback for omitted or invalid values. Existing saved `current` values SHALL display as `dots` without migration; other explicitly saved valid selections SHALL remain unchanged. The choice SHALL use the existing profile-local A1 settings manager and live application boundary, without modifying Pi root settings or engine descriptors. Ordinary acceptance, persistence, cancellation, failed-write rollback, reload, and profile isolation SHALL apply.

The setting's dropdown SHALL use the shared value-menu preview column, like Accent color, to show each animated style's native glyph in the active semantic accent. The focused animated choice SHALL animate in place using the same frame set as the actual status indicator; the other choices SHALL retain representative glyphs. `none` SHALL have an empty preview slot. All labels SHALL remain aligned and menu geometry SHALL remain stable across animation frames. Merely focusing an option SHALL NOT persist a value or change the actual running status. Closing, replacing, canceling, or disposing the menu SHALL stop its preview animation.

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
