# owned-ui-settings Specification

## Purpose
TBD - created by archiving change establish-owned-ui-component-system. Update Purpose after archive.

## Requirements

### Requirement: The settings screen renders the section model
A1 SHALL present its settings as an A1-owned application reached by `/settings` in bare A1, rendering
the grouped section model rather than deriving its own view of where a value lives. The screen SHALL
show every section with its entries, keep the current section's header visible while its entries are
on screen, and let the user move between entries, jump between sections, filter, change a value, and
close. The screen SHALL be built from the shared component layer rather than drawing a list, a menu,
a dialog, a control, an input row, or a status line of its own. A change SHALL be routed by the entry's backend, and a change that could not be stored or
written SHALL be reported rather than displayed as saved. An entry the model reports as not editable
SHALL state why rather than accepting input.

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

### Requirement: A1 settings have a declared shape, defaults, and validation
Every A1 setting SHALL have a declared identifier, type, allowed values, and default. A1 SHALL
resolve a complete settings value set at startup from declared defaults overlaid with accepted
stored values. A1 SHALL reject an individual stored value that violates its declaration and fall
back to that setting's default rather than to an undeclared or partially applied state. A1 settings
SHALL be distinct from Pi settings and SHALL NOT be derived from, written into, or read out of Pi
settings storage.

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
A1 SHALL apply a changed setting to the running session at the point the change is accepted,
without requiring a restart, and SHALL keep resolved values consistent across every surface that
reads them within that session. A setting whose effect cannot be applied to a running session SHALL
declare that, and its surface SHALL say so when it is changed rather than appearing to take effect.

#### Scenario: Change a live-applicable setting
- **WHEN** the user accepts a change to a setting declared as live-applicable
- **THEN** the new value SHALL take effect in the running session and every surface reading that
  setting SHALL observe the same value

#### Scenario: Change a restart-required setting
- **WHEN** the user accepts a change to a setting declared as requiring a restart
- **THEN** the value SHALL be stored, the surface SHALL state that it applies on the next start, and
  the running session SHALL continue with the previous value

#### Scenario: Abandon a change
- **WHEN** the user cancels out of editing a setting before accepting it
- **THEN** no value SHALL be stored and the running session SHALL be unaffected

### Requirement: Resolved settings are offered to a surface as grouped sections
A1 SHALL expose the resolved settings as sections a consuming surface can present without knowing
where a value is stored: the declared A1 settings in their own section, and the settings reported by
the engine settings port under a distinct Agent section. Each entry SHALL carry its current value,
whether it can be changed from A1, its available choices where its source declares them, and its
description where its source provides one. Agent settings SHALL be read and written only through the
engine settings port; A1 SHALL NOT write Pi settings storage directly. Where the engine does not
advertise settings write capability, its entries SHALL be reported as not editable with a stated
reason rather than appearing editable. This change ships no user-visible surface: the pinned settings
route is unchanged, and the surface that renders these sections arrives with the owned UI component
system.

#### Scenario: Build sections with an attached engine
- **WHEN** sections are built while the engine reports its settings
- **THEN** the A1 section SHALL list every declared setting with its resolved value, choices,
  description, and whether the value came from a default, and the Agent section SHALL list every
  setting the engine reported

#### Scenario: Change a setting in the A1 section
- **WHEN** a change is accepted for an entry in the A1 section
- **THEN** the value SHALL be written to the A1 settings document and SHALL NOT be sent to the engine
  settings port

#### Scenario: Change a setting in the Agent section
- **WHEN** a change is accepted for an entry in the Agent section and the engine advertises settings
  write capability
- **THEN** the value SHALL be written through the engine settings port, flushed where the engine
  advertises flush capability, and SHALL NOT be written into the A1 settings document

#### Scenario: Engine advertises no settings write capability
- **WHEN** the engine settings port reports no write capability
- **THEN** every Agent entry SHALL be reported as not editable with a stated reason, and an attempted
  change SHALL be refused rather than silently dropped

#### Scenario: Agent settings cannot be read
- **WHEN** the engine settings port fails, reports no settings, or is absent
- **THEN** the A1 section SHALL still be complete and usable, the Agent section SHALL report why it is
  unavailable, and no stale or invented agent entry SHALL appear

#### Scenario: Report a failed change
- **WHEN** a change cannot be stored or cannot be written through the engine
- **THEN** the failure SHALL be reported to the caller and the change SHALL NOT be reported as applied

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
