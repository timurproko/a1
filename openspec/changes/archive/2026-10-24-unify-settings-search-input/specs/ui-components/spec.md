## MODIFIED Requirements

### Requirement: An input row and a status line are components
The component layer SHALL provide one configurable interactive input component for search, inline editing, and the bare-A1 agent prompt. The component SHALL own its prompt presentation, text and block caret rendering, quiet placeholder, cursor movement, text insertion and deletion, selection, pointer gestures, copy/cut dispatch, and declared capability handling. A screen SHALL NOT independently recreate those interactions or compose equivalent input chrome from escapes of its own.

The component SHALL support explicit single-line or multiline configuration, optional presentation-only prompt markers, placeholders, accept and cancel callbacks, and paste capability. Bare A1's agent prompt and Settings search SHALL instantiate this same component while supplying different options: the agent retains multiline editing and its enabled history, autocomplete, submission, chip, and paste adapters; Settings remains a single-line filter with paste disabled. The component SHALL keep one geometry and rendering implementation for rules, caret, selection, placeholder, clipping, content width, and pointer hit testing. Sharing only color constants or presentation while retaining independent editing controllers SHALL NOT satisfy this requirement.

The component layer SHALL also provide the status line a screen uses to say one thing at a time.

#### Scenario: Render an empty input row
- **WHEN** the shared input is shown with no text and a placeholder
- **THEN** the placeholder SHALL be shown quietly with the caret over its first cell
- **AND** the placeholder SHALL begin at the content start selected by that instance's prefix configuration

#### Scenario: Configure agent and Settings inputs
- **WHEN** the bare-A1 agent prompt and Settings search are created
- **THEN** both SHALL instantiate the same interactive input component
- **AND** the agent SHALL enable its multiline and paste capabilities while Settings SHALL select single-line behavior and disable paste

#### Scenario: Edit through shared interactions
- **WHEN** either input receives applicable character movement, word movement, deletion, selection extension, select-all, replacement typing, pointer drag, double-click, triple-click, copy, or cut input
- **THEN** the shared component SHALL apply the same editing and selection rules to its configured document
- **AND** caller-specific filtering or submission SHALL observe the resulting semantic text rather than reconstructing the edit

#### Scenario: Render agent and search input chrome
- **WHEN** the bare-A1 main agent prompt is rendered
- **THEN** the shared component SHALL supply one leading blank cell, the `❯` marker, and the established marker-to-content spacing
- **AND** those presentation cells SHALL NOT change semantic text offsets
- **WHEN** Settings search or another A1-owned auxiliary input is rendered
- **THEN** the same component SHALL supply its rules and configured content inset without an agent prompt marker

#### Scenario: Render an auxiliary input without a marker
- **WHEN** Settings search or an A1-owned Agent auxiliary input is rendered
- **THEN** the shared component SHALL supply its rules and configured content inset without a chevron or greater-than marker
- **AND** the surface SHALL retain its configured interactive input behavior

#### Scenario: Disable paste for an input instance
- **WHEN** an input instance has paste disabled and receives a clipboard-paste binding, bracketed terminal paste frame, or paste callback
- **THEN** the component SHALL consume the paste interaction without inserting or replacing text
- **AND** ordinary typed text SHALL remain editable through the same component

#### Scenario: Report something on the status line
- **WHEN** a screen has both a standing hint and something to report
- **THEN** the status line SHALL show what is reported until it is superseded
