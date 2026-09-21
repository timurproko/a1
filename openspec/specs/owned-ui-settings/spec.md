# owned-ui-settings Specification

## Purpose
Defines A1-owned settings declarations, profile-local persistence and migration, application boundaries, grouped presentation, and shared interaction behavior.

## Requirements

### Requirement: The settings screen renders the section model
A1 SHALL present its settings as an A1-owned application reached by `/settings` in bare A1, rendering
the grouped section model rather than deriving its own view of where a value lives. The screen SHALL
show every section with its entries, keep the current section's header visible while its entries are
on screen, and let the user move between entries, jump between sections, filter, change a value, and
close. The screen SHALL be built from the shared component layer rather than drawing a list, a menu,
a dialog, a control, an input row, or a status line of its own. A change SHALL be routed by the entry's backend, and a change that could not be stored or
written SHALL be reported rather than displayed as saved. An entry the model reports as not editable
SHALL state why rather than accepting input. While the settings module is still loading, the screen SHALL render blank rows rather than a loading placeholder; only a failed module load SHALL print its failure message.

#### Scenario: Open the settings screen
- **WHEN** the user invokes `/settings` in bare A1
- **THEN** the screen SHALL open showing the A1 section and the Agent section, each entry with its
  current value, and the pinned settings selector SHALL NOT open

#### Scenario: Navigate between sections
- **WHEN** the user jumps between sections
- **THEN** the selection SHALL land on the first changeable entry of the target section and that
  section SHALL be brought into view

#### Scenario: Keep the section visible while scrolling
- **WHEN** entries are scrolled so their section header would leave the screen
- **THEN** that section's header SHALL remain visible above the entries

#### Scenario: Change a setting
- **WHEN** the user changes a value
- **THEN** it SHALL be routed to the backend the model names for that entry, and the screen SHALL show
  the resulting value

#### Scenario: Change cannot be saved
- **WHEN** a change cannot be stored or cannot be written through the engine
- **THEN** the screen SHALL report the failure and SHALL NOT display the new value as saved

#### Scenario: Entry is not editable
- **WHEN** the user selects an entry the model reports as not editable
- **THEN** the screen SHALL state the reported reason and SHALL NOT accept a change for it

#### Scenario: Filter the entries
- **WHEN** the user filters
- **THEN** only matching entries SHALL remain, each still under its own section, and a filter matching
  nothing SHALL say so rather than presenting an empty screen

#### Scenario: Close the screen
- **WHEN** the user closes the screen
- **THEN** the previous surface SHALL be restored unchanged

#### Scenario: Open before the settings module has loaded
- **WHEN** the screen is painted before its module has finished loading
- **THEN** every row SHALL be blank and no `Loading settings…` text SHALL appear
- **AND** the next paint after loading SHALL show the sections and entries

#### Scenario: Settings module fails to load
- **WHEN** the settings module cannot be loaded
- **THEN** the screen SHALL print the load failure on its first row

### Requirement: A1 settings have a declared shape, defaults, and validation
Every A1 setting SHALL have a declared identifier, type, allowed values, and default. A1 SHALL
resolve a complete settings value set at startup from declared defaults overlaid with accepted
stored values. A1 SHALL reject an individual stored value that violates its declaration and fall
back to that setting's default rather than to an undeclared or partially applied state. A1 settings
SHALL be distinct from Pi settings and SHALL NOT be derived from, written into, or read out of Pi
settings storage. The declarations SHALL be one table keyed by setting id from which the ordered
declaration list derives, and one settings manager SHALL own resolution, atomic persistence, the
grouped sections, and routing of accepted changes; a declared setting SHALL be readable through a
getter typed by its own declaration, answering the declared default when the resolved set omits it.

#### Scenario: Resolve settings with no stored file
- **WHEN** the owned UI starts and no A1 settings file exists for the active profile
- **THEN** every setting SHALL resolve to its declared default and A1 SHALL start normally without
  reporting an error

#### Scenario: Resolve settings with a partial stored file
- **WHEN** the stored file supplies accepted values for some declared settings and omits others
- **THEN** the supplied values SHALL apply and every omitted setting SHALL resolve to its declared
  default

#### Scenario: Reject an out-of-range stored value
- **WHEN** a stored value is present but violates its setting's declared type or allowed values
- **THEN** that setting SHALL resolve to its declared default, the remaining accepted values SHALL
  still apply, and A1 SHALL report the rejected setting once without failing startup

#### Scenario: Encounter an unknown stored key
- **WHEN** the stored file contains a key that matches no declared setting
- **THEN** A1 SHALL ignore that key, SHALL preserve it on the next write so a downgrade does not
  destroy a newer version's value, and SHALL NOT expose it as a setting

#### Scenario: Read a declared setting through its typed getter
- **WHEN** production code reads a declared A1 setting by id
- **THEN** the value SHALL be typed by that setting's allowed values, SHALL be the value in effect for
  the running session, and SHALL never be absent

### Requirement: A1 settings persist profile-local and survive restart
A1 SHALL store settings under the active A1 configuration root, scoped to the active A1 profile.
A1 SHALL NOT write settings into a Pi profile directory, and SHALL NOT let one profile's settings
be observed or modified from another. A stored value SHALL survive process restart and SHALL be
written durably enough that an interrupted write cannot leave the file unreadable.

#### Scenario: Change a setting and restart
- **WHEN** the user changes a setting, the setting is stored, and A1 is restarted with the same
  profile
- **THEN** the changed value SHALL resolve on the next start

#### Scenario: Keep profiles isolated
- **WHEN** two A1 profiles have different stored values for the same setting
- **THEN** each profile SHALL resolve only its own stored value, and neither SHALL inherit from the
  other, from a prior process, or from Pi profile state

#### Scenario: Vanilla Pi profile is untouched
- **WHEN** A1 writes its settings
- **THEN** the contents and layout of `~/.pi/agent` SHALL be unchanged

#### Scenario: Interrupt a settings write
- **WHEN** a settings write is interrupted before completion
- **THEN** the next start SHALL resolve either the complete previous value set or the complete new
  one, and SHALL NOT resolve a truncated file as authoritative

### Requirement: Unreadable or unsupported settings never block startup
A1 SHALL treat a settings file it cannot read, parse, or interpret as absent. Startup SHALL
continue with declared defaults, the condition SHALL be reported once, and the unreadable file
SHALL be preserved rather than deleted or silently overwritten before the user has been told.

#### Scenario: Corrupt settings file
- **WHEN** the settings file exists but cannot be parsed
- **THEN** A1 SHALL start with declared defaults, SHALL report that the file was ignored and where
  it is, and SHALL NOT exit or present a broken settings surface

#### Scenario: Settings file from a newer version
- **WHEN** the stored version stamp is newer than the running A1 understands
- **THEN** A1 SHALL start with declared defaults for anything it cannot interpret, SHALL report the
  version mismatch, and SHALL NOT rewrite the file into an older shape without the user changing a
  setting

#### Scenario: Settings location is not writable
- **WHEN** the settings location cannot be written
- **THEN** the session SHALL continue with resolved values, a change SHALL report that it could not
  be stored, and the surface SHALL NOT claim the change was saved

### Requirement: Stored settings migrate forward on read
A1 SHALL stamp stored settings with a version. When a stored version is older than the running
version, A1 SHALL migrate the values forward on read through declared migrations, apply the
migrated values, and persist the migrated form on the next write. A migration SHALL preserve the
user's intent for a renamed or restructured setting rather than resetting it to its default.

#### Scenario: Read an older supported version
- **WHEN** the stored version is older and every intervening migration is declared
- **THEN** the migrated values SHALL apply and the resolved set SHALL match what the user last chose

#### Scenario: Migrate a renamed setting
- **WHEN** a declared migration renames or restructures a setting the user had changed
- **THEN** the user's value SHALL appear under the new declaration rather than reverting to the
  default

#### Scenario: Migration cannot complete
- **WHEN** a required migration is missing or fails
- **THEN** A1 SHALL resolve declared defaults, report the condition, and preserve the original file

### Requirement: A changed setting applies to the running session
A1 SHALL apply a changed setting at the application boundary declared by its resolved entry and SHALL keep effective values consistent across every surface that reads them. Each presented setting SHALL declare one of `live`, `next-session`, `next-start`, or `current-exit`. A live setting SHALL take effect before the change reports success. A deferred setting SHALL state its boundary when changed rather than appearing live. A setting unavailable in the active product mode or environment SHALL be omitted from the settings UI without an unavailable placeholder row. These rules SHALL apply equally to A1 settings and settings supplied through the engine settings port.

#### Scenario: Change a live-applicable setting
- **WHEN** the user accepts a change to a setting declared as `live`
- **THEN** the new value SHALL take effect in the running session before success is reported
- **AND** every surface reading that setting SHALL observe the same effective value

#### Scenario: Change a restart-required setting
- **WHEN** the user accepts a change declared as `next-session`, `next-start`, or `current-exit`
- **THEN** the value SHALL be stored, the surface SHALL state the exact application boundary, and the running owner SHALL retain the previous value until that boundary

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
A1 SHALL expose the resolved settings as sections a consuming surface can present without knowing where a value is stored: the declared available A1 settings in their own section, and the available settings reported by the engine settings port under a distinct Agent section. Each presented entry SHALL carry its current stored value, current effective value when different, whether it can be changed from A1, its application boundary, its available choices where its source declares them, and its description where its source provides one. Agent settings SHALL be read, written, and applied only through the engine settings port; A1 SHALL NOT write Pi settings storage directly. Where the engine does not advertise the write or effect capability required by an entry, that entry SHALL be filtered from the presented section. A descriptor without an application contract SHALL not be promoted to a UI entry. The consuming surface SHALL retain the shared input, list, menu, dialog, shortcut, and scrollbar components and the reviewed semantic styles and geometry for setting rows, labels, values, selected state, controls, menus, structured dialogs, deferred and failure notices, wrapping, and narrow-terminal clipping. The owned settings interaction SHALL remain a declared product difference: descriptions stay in entry metadata but do not render as selected-row details; `/` alone opens search; search uses the shared ruled line-input composition; the standing status bar derives from active shortcut declarations; wheel distance resolves the effective live `scrollbarSpeed` through the shared scrollbar policy rather than a settings-screen literal; scalar choices retain the shared `ValueMenu` while rendering as a visually distinct A1 floating panel; and the selected row carries the accent on its cursor and label only, while its value keeps the muted presentation and pointer-hover brightening of every unselected value.

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
- **THEN** the settings surface SHALL not open search or consume that text as a query
- **WHEN** the user enters `/`
- **THEN** the settings surface SHALL open the shared ruled line input with the `search settings` placeholder
- **AND** subsequent editing, navigation, cancellation, and filtering SHALL remain owned by that input until search closes

#### Scenario: Render settings status guidance
- **WHEN** no transient save result or interrupt warning replaces the standing settings status
- **THEN** the status bar SHALL render the applicable search, navigation, section-jump, change, adjustment, and cancel hints assembled from the active shortcut declarations
- **AND** it SHALL not advertise type-to-search behavior

#### Scenario: Scroll the settings list
- **WHEN** the user sends a wheel event over the settings list
- **THEN** movement SHALL resolve the currently effective `scrollbarSpeed`, including an accepted live value pending source reflection
- **AND** distance SHALL be obtained from the shared scrollbar policy with no independent settings-screen row-count literal

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

### Requirement: The custom viewport exposes grouped appearance, style, and speed settings
A1 SHALL declare `scrollbarAppearance`, `scrollbarStyle`, and `scrollbarSpeed` as live-applicable A1 settings grouped under a `Scroll` settings section. The visible row labels SHALL be `Scrollbar mode`, `Scrollbar style`, and `Speed`, without a redundant `A1` section or `(default)` suffix. `scrollbarAppearance` SHALL allow exactly `auto`, `always`, and `hidden`, with `auto` as its default. `scrollbarStyle` SHALL allow exactly `thin` and `thick`, with `thin` as its default. `scrollbarSpeed` SHALL allow exactly `normal`, `fast`, and `high`, in that order, with `normal` as its default. The settings SHALL be stored and resolved through the existing profile-local A1 settings document and SHALL NOT be read from or written to agent settings.

#### Scenario: Resolve defaults
- **WHEN** the active A1 profile has no stored scrollbar values
- **THEN** `scrollbarAppearance` SHALL resolve to `auto`
- **AND** `scrollbarStyle` SHALL resolve to `thin`
- **AND** `scrollbarSpeed` SHALL resolve to `normal`

#### Scenario: Migrate the former appearance value
- **WHEN** a version-two settings document stores `scrollbarAppearance` as `hover`
- **THEN** migration SHALL store and resolve it as `auto`

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
- **AND** future A1-owned settings sections SHALL use the same declaration, resolution, migration, and atomic-store system
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

### Requirement: Prompt history settings declare persistence and retention boundaries
A1 SHALL declare `promptHistoryEnabled` as a boolean defaulting to true and `promptHistoryMaxItems` as an integer allowing 10 through 100 in steps of 10, defaulting to 100. They SHALL appear in bare A1's History settings section as `Persistent history` and `History limit`, using existing shared settings controls, profile-local A1 settings persistence, validation, and stored/effective-state presentation. Both SHALL declare a `next-start` application boundary. No Pi settings document or separate history settings file SHALL be used, and `a1 pi` SHALL neither expose nor apply these A1 settings.

#### Scenario: Start without stored history settings
- **WHEN** a bare-A1 profile has no stored history settings
- **THEN** its next-start effective values SHALL enable persistence with a 100-entry count limit
- **AND** byte retention limits SHALL still apply independently

#### Scenario: Change retention
- **WHEN** the user saves a valid history limit
- **THEN** the settings surface SHALL show that it applies on the next start rather than claiming a live effect
- **AND** the next enabled launch SHALL apply that count to the shared profile store, pruning oldest entries if necessary
- **AND** existing writers SHALL follow the store's newly applied limit without restoring their older startup limit

#### Scenario: Reject an invalid limit
- **WHEN** a stored history limit is not one of 10, 20, 30, 40, 50, 60, 70, 80, 90, or 100
- **THEN** existing settings validation SHALL reject that value and resolve the declared default without blocking startup

#### Scenario: Disable history for subsequent launches
- **WHEN** the user disables persistent history and restarts A1
- **THEN** that process SHALL not create, read, write, or poll the durable history store
- **AND** it SHALL keep existing current-session history behavior
- **AND** disabling SHALL leave retained records intact rather than claiming to erase them

#### Scenario: Another enabled process is already running
- **WHEN** one instance saves disabled persistence while another enabled instance remains running
- **THEN** the setting SHALL remain next-start and SHALL NOT claim to stop persistence in existing instances
- **AND** the setting metadata and maintained documentation SHALL explain this boundary

#### Scenario: Re-enable persistence
- **WHEN** the user re-enables history and starts a new enabled process
- **THEN** compatible previously retained records SHALL become available again under the configured count and byte limits

#### Scenario: Keep history settings profile-local
- **WHEN** different A1 profiles store different history settings or the Pi comparison starts
- **THEN** each bare-A1 launch SHALL apply only its own profile's values
- **AND** the Pi comparison and `~/.pi/agent` SHALL remain untouched

### Requirement: The settings list scrollbar follows the shared scrollbar settings
The owned settings screen SHALL present its list scrollbar through the shared scrollbar presentation policy using the currently effective `scrollbarAppearance` and `scrollbarStyle`, including an accepted live value pending source reflection, rather than drawing a rail whenever the list overflows. Under `always` the rail SHALL be drawn whenever the list overflows. Under `auto` the rail SHALL be drawn while the list scrolls and for the transcript's linger afterwards, or while the pointer is over the rail or dragging its thumb, and SHALL fade on its own once the linger passes. Under `hidden` no rail SHALL be drawn and no rail column SHALL be reserved. Under `auto` and `always` the rail column SHALL remain reserved while the list fits, so revealing the rail does not reflow the rows. `thick`, a hovered thumb, and a dragged thumb SHALL use the shared thick glyph.

The settings rail SHALL own pointer reports inside its hit region: pointer motion SHALL update rail hover, pressing the thumb and moving SHALL scroll the list with the thumb, and pressing the track above or below the thumb SHALL page in that direction. Rail hover SHALL NOT set a row hover state. The whole-pane wheel ownership, the structured dialog, and the value menu SHALL keep their existing pointer precedence.

#### Scenario: Overflow under auto without a pointer
- **WHEN** `scrollbarAppearance` resolves to `auto`, the list overflows, it has not scrolled within the linger, and no pointer is over the rail
- **THEN** the rail column SHALL be reserved and blank
- **AND** no track or thumb glyph SHALL be drawn

#### Scenario: Scroll under auto
- **WHEN** `scrollbarAppearance` resolves to `auto` and the list scrolls by wheel, drag, track page, keyboard jump, or a search that resets the position
- **THEN** the next frame SHALL draw the track and thumb
- **AND** the rail SHALL stay drawn for the shared linger and then be blanked by a repaint the screen requests itself

#### Scenario: Hover the rail under auto
- **WHEN** `scrollbarAppearance` resolves to `auto`, the list overflows, and the pointer moves onto the rail column within the track
- **THEN** the next frame SHALL draw the track and a thick thumb
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

### Requirement: Generic settings lead the screen with the exit-animation toggle
A1 SHALL declare `quitAnimation` as a boolean defaulting to `true`, labeled `Quit animation`, in a `Generic` section that SHALL be the first section of bare A1's owned settings screen, ahead of `Scroll`, `History`, and `Agent`. It SHALL be the only owned setting governing the quit outro: no `Quit` section, `quitEffect`, or `quitEffectDurationMs` SHALL be declared, and the outro SHALL always play the `fall` effect for 800 ms when the switch is `true`. It SHALL use existing shared settings controls, profile-local A1 settings persistence, validation, and migration, and SHALL declare a live application boundary: the value stored when the session quits SHALL govern that quit. A settings document from a version that stored `quitEffect` or `quitEffectDurationMs` SHALL migrate with those keys removed. No Pi settings document SHALL be used, and `a1 pi` SHALL neither expose nor apply this setting.

#### Scenario: Resolve the default
- **WHEN** the active A1 profile has no stored `quitAnimation` value
- **THEN** `quitAnimation` SHALL resolve to `true`

#### Scenario: Inspect the Generic settings section
- **WHEN** the owned settings screen is presented
- **THEN** its first section SHALL be `Generic`
- **AND** that section SHALL offer `quitAnimation` as an on/off choice labeled `Quit animation`
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

### Requirement: The skills presentation setting is an Agent-section owned choice
Bare A1 SHALL expose the persisted A1 setting `skillsPresentation`, labeled `Skills`, exactly once in the owned settings screen's existing `Agent` section, immediately after `Prompt suggestions` and after every engine-provided Agent entry. Its allowed values SHALL be `collapse` and `expand`, its default SHALL be `collapse`, and its application boundary SHALL be `live`. Its description SHALL state that `collapse` offers one `/skills` command with a searchable dialog and the `/skills:` shortcut while `expand` lists every `/skill:<name>` command directly. The setting SHALL keep its A1-owned backend, persistence key, and profile-local storage; it SHALL NOT be written to Pi settings storage or presented as an engine descriptor. Introducing it SHALL advance the stored settings version with a forward migration that leaves existing values unchanged, so a profile without the key resolves to `collapse`.

The screen SHALL still contain only one Agent section, preserving the relative order and capability filtering of engine-provided settings and the existing `Prompt suggestions` control. The owned control SHALL remain visible and editable when engine settings are absent, unreadable, or not writable. Other A1 controls and the `a1 pi` comparison SHALL retain their existing grouping and behavior.

#### Scenario: Present the Agent section with both owned controls
- **WHEN** bare A1 opens settings with presentable engine settings
- **THEN** one Agent section SHALL contain those engine settings in their existing relative order, then `Prompt suggestions`, then `Skills`
- **AND** no second Agent section, duplicate control, or empty A1 section SHALL be rendered

#### Scenario: Resolve the default
- **WHEN** a profile stores no `skillsPresentation` value, including a profile written before the setting existed
- **THEN** the setting SHALL resolve to `collapse` after migration without rewriting any other stored value

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
The owned settings screen SHALL keep a full-width rule in the active theme's border role fixed at the top, followed initially by a one-column-inset `Settings` title in bold accent role. One empty opening row SHALL separate that title from the first settings section. The title SHALL scroll away with settings content; only the active settings section header SHALL pin directly below the fixed top rule. An ordinary full-width border-role rule SHALL remain fixed between settings content and footer guidance. While search is active, the top rule of the established three-row shared input component SHALL replace that ordinary divider, followed by the input row and its bottom rule. No trailing empty result row SHALL separate the final visible result from the input's top rule. Opening and closing an untouched search SHALL restore the list's prior scroll position. In the dark theme shown by the product these roles SHALL remain the established blue border and cyan accent colors. Settings section headers, including a sticky header, SHALL render bold in the theme's heading role, which SHALL match the yellow Markdown-heading color used by `What's New`. Section rows, setting-row leading markers, and footer guidance SHALL begin at the title's one-column inset. Setting labels, selected rows, values, notes, menus, dialogs, search, notices, and footer guidance SHALL retain their established semantic roles. A dropdown's effective-value checkmark SHALL use the accent role, including while that choice is highlighted.

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
- **AND** closing the search without editing or navigating SHALL restore the scroll position from before search opened
- **AND** the left-aligned shortcut guidance SHALL remain below the input

#### Scenario: Use menus or a structured dialog
- **WHEN** the user opens a scalar value menu or a structured-setting dialog
- **THEN** the fixed top rule and any visible title SHALL retain their border and accent roles
- **AND** a scalar menu's effective-value checkmark SHALL render in the accent role, even when its row is highlighted
- **AND** the active menu, dialog, notices, and guidance SHALL retain their established composition, colors, keyboard behavior, and pointer behavior without being displaced outside the screen

#### Scenario: Render a constrained settings frame
- **WHEN** the settings screen is rendered at a narrow width or a height smaller than its ordinary chrome and content
- **THEN** the frame SHALL prioritize rows from the top in stable order, clip ANSI-aware, and fill exactly the requested rectangle
- **AND** it SHALL NOT emit an over-width row, an embedded line break, or a pointer target for a row that is not visible
