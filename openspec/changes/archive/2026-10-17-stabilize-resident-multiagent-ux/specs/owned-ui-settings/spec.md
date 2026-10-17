# owned-ui-settings Delta

## MODIFIED Requirements

### Requirement: The settings screen renders the section model
A1 SHALL present its settings as an A1-owned application rendering the grouped section model rather than deriving its own view of where a value lives. In direct bare `a1 solo` it SHALL remain reachable through `/settings`. In resident bare A1 it SHALL instead occupy the singleton global Settings utility tab reached through the launcher or effective `tabs.settings` shortcut; resident Agent command discovery and execution SHALL omit `/settings`. The screen SHALL show every section with its entries, keep the current section's header visible while its entries are on screen, and let the user move between entries, jump between sections, filter, change a value, and close using the same declared keyboard interactions as direct Settings. Resident Settings pointer input SHALL follow the existing screen contracts. The screen SHALL be built from the shared component layer rather than drawing a list, menu, dialog, control, input row, or status line of its own. A change SHALL be routed by the entry's backend, and a change that could not be stored or written SHALL be reported rather than displayed as saved. An entry the model reports as not editable SHALL state why rather than accepting input. While the settings module is still loading, the screen SHALL render blank rows rather than a loading placeholder; only a failed module load SHALL print its failure message. Closing direct Settings SHALL restore the previous surface; closing resident Settings SHALL remove its utility tab and restore the prior surviving tab.

#### Scenario: Open the settings screen
- **WHEN** the user invokes `/settings` in `a1 solo`
- **THEN** the screen SHALL open showing the A1 and Agent sections with current values
- **AND** the pinned settings selector SHALL NOT open

#### Scenario: Open resident settings
- **WHEN** the user invokes the Settings launcher row or effective Settings tab shortcut in resident bare A1
- **THEN** the singleton Settings utility tab SHALL open with the same global sections, values, navigation, and change behavior
- **AND** resident Agent autocomplete SHALL not contain `settings`

#### Scenario: Navigate and edit resident settings
- **WHEN** the Settings utility receives its declared navigation, section-jump, search, value-change, adjustment, undo, or close shortcut
- **THEN** it SHALL perform the same Settings action as the direct owned screen exactly once
- **AND** the attach host SHALL NOT consume or reject that input as Agent input

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
- **WHEN** the user closes direct Settings
- **THEN** the previous direct surface SHALL be restored unchanged
- **AND** when the user closes resident Settings, its utility tab SHALL close and the prior surviving tab SHALL be restored unchanged

#### Scenario: Open before the settings module has loaded
- **WHEN** the screen is painted before its module has finished loading
- **THEN** every row SHALL be blank and no `Loading settings…` text SHALL appear
- **AND** the next paint after loading SHALL show the sections and entries

#### Scenario: Settings module fails to load
- **WHEN** the settings module cannot be loaded
- **THEN** the screen SHALL print the load failure on its first row
