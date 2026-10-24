## ADDED Requirements

### Requirement: Constrained A1 session footer truncates with a dim one-cell marker
When the bare-A1 session footer's usage row must truncate its left-hand text to fit the terminal, it SHALL use exactly one terminal-column `…` as its truncation marker. The marker SHALL have the same semantic dim foreground as the adjacent A1 footer usage text, not the default white foreground. Rendering SHALL remain within the terminal width and SHALL close ANSI styles correctly without recoloring a neighboring thinking-level span, the next line, or a pull-request hyperlink. This requirement SHALL NOT change untruncated footer rows, the path-row PR badge's reservation and hyperlink policy, or the Pi comparison profile's footer rendering.

#### Scenario: Truncate the A1 footer at narrow width
- **WHEN** a narrow terminal forces the bare-A1 footer usage row's left-hand segment to truncate
- **THEN** its visible truncation marker SHALL be one `…` cell in the same dim foreground as the surrounding usage text
- **AND** no bright three-cell `...` marker SHALL appear on that row

#### Scenario: Preserve neighboring footer semantics
- **WHEN** truncation happens near styled context, a thinking-level segment, or a linked PR badge on the path row
- **THEN** the marker SHALL not leak foreground or hyperlink state into adjacent text or another row
- **AND** the complete `#<number>` badge SHALL remain linked where the existing width policy can fit it

#### Scenario: Comparison and wide footer remain unchanged
- **WHEN** the A1 footer fits without truncation or the Pi comparison profile renders its footer
- **THEN** the existing text, width policy, and semantic coloring SHALL remain unchanged
