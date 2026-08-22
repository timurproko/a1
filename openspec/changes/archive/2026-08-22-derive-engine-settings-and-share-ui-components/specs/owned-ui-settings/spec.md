## ADDED Requirements

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

## MODIFIED Requirements

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
