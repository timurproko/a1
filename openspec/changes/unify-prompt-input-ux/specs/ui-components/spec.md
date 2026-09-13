## MODIFIED Requirements

### Requirement: An input row and a status line are components
The component layer SHALL provide the input row a screen uses for search and inline editing — a prompt, the text, a block caret over the cell it is on, and a quiet placeholder while empty — and the status line a screen uses to say one thing at a time. A screen SHALL NOT compose either from escapes of its own. Bare A1's agent prompt and Settings search SHALL use the same reusable input presentation component for their bars, prompt prefix, and layout geometry, while retaining their respective multiline editor and single-line filter behavior. Sharing only color constants while independently composing equivalent input chrome SHALL NOT satisfy this requirement.

#### Scenario: Render an empty input row
- **WHEN** the input row is shown with no text
- **THEN** the placeholder SHALL be shown quietly with the caret over its first cell

#### Scenario: Report something on the status line
- **WHEN** a screen has both a standing hint and something to report
- **THEN** the status line SHALL show what is reported until it is superseded

#### Scenario: Render agent and search input chrome
- **WHEN** the bare-A1 agent prompt and Settings search are rendered at the same width
- **THEN** the shared component SHALL supply their top and bottom rules, prompt prefix, and content inset with coherent styling
- **AND** each surface SHALL retain its existing text editing, caret, focus, and submission or filtering behavior

## ADDED Requirements

### Requirement: Owned input bars and arrows have consistent neutral presentation
Bare A1's agent prompt and Settings search SHALL render top and bottom bars in the same neutral white foreground as the existing Settings search reference, without thinking-level tint. Both input `❯` arrows SHALL match the existing undimmed submitted-prompt arrow foreground and SHALL NOT be dimmed or faint. Rule and prefix styles SHALL be owned by the shared component's presentation policy rather than hardcoded at individual call sites. Quiet placeholder styling SHALL NOT leak into the arrow or rules.

#### Scenario: Compare the two inputs with a submitted prompt
- **WHEN** a submitted prompt, the agent input, and Settings search are viewed under the same theme and terminal color capability
- **THEN** both input arrows SHALL have the submitted-prompt arrow's undimmed foreground
- **AND** both inputs' rules SHALL match the reference Settings search rule foreground

#### Scenario: Change the agent thinking level or input mode
- **WHEN** a level changes or the bare-A1 agent draft enters or leaves bash mode
- **THEN** the shared input rules SHALL remain neutral white rather than adopting a level or bash tint
- **AND** draft text, mode semantics, and caret position SHALL remain unchanged by restyling

#### Scenario: Resize and edit a multiline draft
- **WHEN** a user wraps a draft, resizes the terminal, moves the caret, selects text, or opens prompt suggestions
- **THEN** the shared prefix and rules SHALL preserve content width, continuation alignment, pointer hit geometry, and caret placement
- **AND** no rule or prefix SHALL become part of the submitted draft or copied text
