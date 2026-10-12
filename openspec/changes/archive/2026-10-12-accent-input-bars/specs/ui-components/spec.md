## RENAMED Requirements

- FROM: `### Requirement: Owned input bars and arrows have consistent neutral presentation`
- TO: `### Requirement: Owned input bars and arrows have consistent themed presentation`

## MODIFIED Requirements

### Requirement: Owned input bars and arrows have consistent themed presentation
Bare A1's agent prompt and shared ruled inputs, including Settings search, SHALL render their top and bottom bars with the active theme's semantic `border` role used by modal bars, without thinking-level or bash-mode tint. Both input `❯` arrows SHALL match the existing undimmed submitted-prompt arrow foreground and SHALL NOT be dimmed or faint. Rule and prefix styles SHALL be owned by the shared component's presentation policy rather than hardcoded at individual call sites. Quiet placeholder styling SHALL NOT leak into the arrow or rules.

#### Scenario: Compare the two inputs with a submitted prompt
- **WHEN** a submitted prompt, the bare-A1 agent prompt, Settings search, and a modal are viewed under the same theme and terminal color capability
- **THEN** both inputs' rules SHALL match the modal rule's semantic `border` foreground
- **AND** both input arrows SHALL retain the submitted-prompt arrow's undimmed foreground

#### Scenario: Change the active accent
- **WHEN** the active accent preference changes while an agent prompt or shared ruled input is visible
- **THEN** its top and bottom rules SHALL repaint with the new accent family's modal-border tone in the same session
- **AND** its arrow, body text, placeholder treatment, and caret SHALL retain their established roles

#### Scenario: Change the agent thinking level or input mode
- **WHEN** a level changes or the bare-A1 agent draft enters or leaves bash mode
- **THEN** the shared input rules SHALL remain on the semantic modal-border role rather than adopting a level or bash tint
- **AND** draft text, mode semantics, and caret position SHALL remain unchanged by restyling

#### Scenario: Resize and edit a multiline draft
- **WHEN** a user wraps a draft, resizes the terminal, moves the caret, selects text, or opens prompt suggestions
- **THEN** the shared prefix and rules SHALL preserve content width, continuation alignment, pointer hit geometry, and caret placement
- **AND** no rule or prefix SHALL become part of the submitted draft or copied text
