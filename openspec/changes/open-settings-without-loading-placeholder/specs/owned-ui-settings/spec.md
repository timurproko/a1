## MODIFIED Requirements

### Requirement: The settings screen renders the section model
A1 SHALL present its settings as an A1-owned application reached by `/settings` in bare A1, rendering
the grouped section model rather than deriving its own view of where a value lives. The screen SHALL
show every section with its entries, keep the current section's header visible while its entries are
on screen, and let the user move between entries, jump between sections, filter, change a value, and
close. The screen SHALL be built from the shared component layer rather than drawing a list, a menu,
a dialog, a control, an input row, or a status line of its own. A change SHALL be routed by the entry's backend, and a change that could not be stored or
written SHALL be reported rather than displayed as saved. An entry the model reports as not editable
SHALL state why rather than accepting input. While the settings module or its session is still loading, the screen SHALL render blank rows rather than a loading placeholder; only a failed module load SHALL print its failure message.

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
- **WHEN** the screen is painted before its module or its session has finished loading
- **THEN** every row SHALL be blank and no `Loading settings…` text SHALL appear
- **AND** the next paint after loading SHALL show the sections and entries

#### Scenario: Settings module fails to load
- **WHEN** the settings module cannot be loaded
- **THEN** the screen SHALL print the load failure on its first row
