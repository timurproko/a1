## MODIFIED Requirements

### Requirement: An input row and a status line are components
The component layer SHALL provide one configurable interactive input component for search, inline editing, and the bare-A1 agent prompt. The component SHALL own its prompt presentation, text and block caret rendering, quiet placeholder, cursor movement, text insertion and deletion, selection, pointer gestures, copy/cut dispatch, and declared capability handling. A screen SHALL NOT independently recreate those interactions or compose equivalent input chrome from escapes of its own.

The component SHALL support explicit single-line or multiline configuration, optional presentation-only prompt markers and semantic marker roles, placeholders, accept and cancel callbacks, and paste capability. Bare A1's agent prompt and Settings search SHALL instantiate this same component while supplying different options: the agent retains multiline editing and its enabled history, autocomplete, submission, chip, and paste adapters; Settings remains a single-line filter with paste disabled. Standard dialog search inputs SHALL request the exact ASCII `> ` marker in the active accent role, while non-dialog auxiliary inputs MAY remain marker-free. The component SHALL keep one geometry and rendering implementation for rules, marker width, caret, selection, placeholder, clipping, content width, and pointer hit testing. Sharing only color constants or presentation while retaining independent editing controllers SHALL NOT satisfy this requirement.

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
- **WHEN** the full-screen Settings search input is rendered
- **THEN** the same component SHALL supply its rules and configured content inset without an agent or dialog prompt marker

#### Scenario: Render a standard dialog search input
- **WHEN** a bare-A1 standard dialog renders a typing-based search field
- **THEN** the shared presentation SHALL place exact ASCII `> ` before the caret or query
- **AND** the `>` SHALL use the active semantic accent role resolved during render
- **AND** marker width SHALL be included in caret, clipping, and pointer geometry

#### Scenario: Render an auxiliary input without a marker
- **WHEN** full-screen Settings search or another explicitly marker-free A1-owned auxiliary input is rendered
- **THEN** the shared component SHALL supply its rules and configured content inset without a chevron or greater-than marker
- **AND** the surface SHALL retain its configured interactive input behavior

#### Scenario: Disable paste for an input instance
- **WHEN** an input instance has paste disabled and receives a clipboard-paste binding, bracketed terminal paste frame, or paste callback
- **THEN** the component SHALL consume the paste interaction without inserting or replacing text
- **AND** ordinary typed text SHALL remain editable through the same component

#### Scenario: Report something on the status line
- **WHEN** a screen has both a standing hint and something to report
- **THEN** the status line SHALL show what is reported until it is superseded

### Requirement: Owned input bars and arrows have consistent themed presentation
Bare A1's agent prompt and shared ruled inputs, including Settings search, SHALL render their top and bottom bars with the active theme's semantic `border` role used by modal bars, without thinking-level or bash-mode tint. The agent input `❯` SHALL match the existing undimmed submitted-prompt arrow foreground and SHALL NOT be dimmed or faint. Standard dialog search inputs SHALL render the ASCII `>` in the active semantic `accent` role. Rule and prefix styles SHALL be owned by shared component or explicit dialog-adapter presentation policy rather than hardcoded at individual call sites. Quiet placeholder styling SHALL NOT leak into the agent arrow, dialog marker, or rules.

#### Scenario: Compare the two inputs with a submitted prompt
- **WHEN** a submitted prompt, the bare-A1 agent prompt, Settings search, a standard dialog search field, and a modal are viewed under the same theme and terminal color capability
- **THEN** the ruled inputs' bars SHALL match the modal rule's semantic `border` foreground
- **AND** the agent `❯` SHALL retain the submitted-prompt arrow's undimmed foreground
- **AND** the standard dialog `>` SHALL use the active accent foreground

#### Scenario: Change the active accent
- **WHEN** the active accent preference changes while an agent prompt or standard dialog search input is visible
- **THEN** shared input rules SHALL repaint with the new accent family's modal-border tone in the same session
- **AND** a standard dialog search marker SHALL repaint with the new semantic accent
- **AND** body text, placeholder treatment, caret, query, and geometry SHALL retain their established behavior

#### Scenario: Change the agent thinking level or input mode
- **WHEN** a level changes or the bare-A1 agent draft enters or leaves bash mode
- **THEN** the shared input rules SHALL remain on the semantic modal-border role rather than adopting a level or bash tint
- **AND** draft text, mode semantics, and caret position SHALL remain unchanged by restyling

#### Scenario: Resize and edit a multiline draft
- **WHEN** a user wraps a draft, resizes the terminal, moves the caret, selects text, or opens prompt suggestions
- **THEN** the shared prefix and rules SHALL preserve content width, continuation alignment, pointer hit geometry, and caret placement
- **AND** no rule or prefix SHALL become part of the submitted draft or copied text
