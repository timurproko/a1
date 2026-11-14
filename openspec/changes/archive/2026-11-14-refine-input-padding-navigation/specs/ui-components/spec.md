## ADDED Requirements

### Requirement: Owned input body gutters span every editable row

The shared input component SHALL provide bare A1's Agent prompt and Settings search with a minimum one-terminal-cell blank gutter on both the left and right of every editable body row. This policy SHALL apply consistently to the first row, soft-wrapped continuation rows, explicit newline rows, empty rows, placeholders, and rows containing a caret or selection. Larger explicitly configured editor padding SHALL remain supported without accumulating a second copy of the component gutter. The component SHALL own this geometry rather than requiring screen-specific leading or trailing spaces. Top and bottom rules SHALL retain their full available width and the existing prompt-marker policy SHALL remain unchanged.

Wrapping, caret positioning, selection painting, pointer hit testing, and completion anchoring SHALL use the same effective content rectangle. Padding SHALL remain presentation-only and SHALL NOT enter draft contents, copied text, or submitted prompts. Narrow terminals SHALL clip safely without exceeding the available row width. The independent `a1 pi` comparison route SHALL retain its existing presentation.

#### Scenario: Render an explicit multiline draft
- **WHEN** an Agent draft contains two or more explicit lines
- **THEN** every editable row SHALL retain the same minimum one-cell left and right gutters
- **AND** copied and submitted text SHALL preserve only the semantic draft characters and newlines

#### Scenario: Wrap and resize a draft
- **WHEN** a draft wraps into continuation rows or the terminal width changes
- **THEN** each body row SHALL use the same effective gutters and remain within the available width
- **AND** the caret, selection, and pointer targets SHALL follow the reflowed content rectangle

#### Scenario: Render Settings search and an empty Agent prompt
- **WHEN** Settings search or an empty Agent prompt renders text, a placeholder, or a caret
- **THEN** the shared component SHALL apply the same minimum one-cell body gutters without a screen-specific spacer
- **AND** the surrounding rules SHALL remain full width

#### Scenario: Retain larger editor padding
- **WHEN** the Agent has explicitly configured editor padding larger than one cell
- **THEN** the shared effective geometry SHALL retain that larger padding without adding duplicate gutters
