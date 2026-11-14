## ADDED Requirements

### Requirement: Submitted prompt chrome is excluded in every frame selection

Bare A1 frame-selection copy SHALL omit renderer-owned submitted-prompt markers and padding for each selected submitted-prompt row, whether the selection contains only that prompt or also contains assistant replies, other submitted prompts, or eligible dock text. This requirement replaces the earlier mixed-range rule that preserved a submitted prompt's visible prefix and alignment. Automatic selection copy and explicit frame copy SHALL use the same extraction policy. The selected prompt text SHALL remain included in frame order, with source indentation, literal `>` and `❯` characters, internal blank lines, visible row boundaries, and selected Unicode graphemes preserved. Prompt-anchor provenance SHALL identify presentation-only cells; arbitrary pasted or selected text SHALL NOT be heuristically stripped. Existing assistant quote-border and padding exclusions SHALL remain effective alongside prompt exclusions. Clipboard filtering SHALL NOT change selection painting, ordinary paste normalization, editor-owned copy/cut, or the independent comparison profile.

#### Scenario: Copy a submitted prompt and an assistant quote

- **WHEN** a completed frame selection includes the submitted prompt `test text` and the following assistant quote
- **THEN** the payload SHALL include `test text` followed by the selected assistant content in frame order
- **AND** SHALL omit the submitted prompt's UI `❯` marker and padding as well as renderer-owned assistant quote borders and padding

#### Scenario: Copy several submitted prompts with their replies

- **WHEN** a forward or reverse frame selection spans multiple submitted prompts and assistant replies
- **THEN** each selected prompt row SHALL use its own current prompt anchor to exclude its presentation prefix
- **AND** every selected semantic prompt and reply character SHALL remain in frame order

#### Scenario: Preserve partial and wrapped prompt selections

- **WHEN** a mixed selection begins or ends inside a submitted prompt row, includes wrapped continuation rows, or retains document rows scrolled off-screen
- **THEN** extraction SHALL clip semantic text using the original display-column boundaries and current prompt anchors
- **AND** SHALL preserve selected graphemes, genuine indentation, blank lines, and literal marker characters without copying prompt chrome

#### Scenario: Preserve text without prompt provenance

- **WHEN** selected source content or external clipboard text contains literal `>` or `❯` characters that are not renderer-owned prompt chrome
- **THEN** those characters SHALL remain unchanged
- **AND** no blanket per-line trimming or marker-removal paste rule SHALL be introduced
