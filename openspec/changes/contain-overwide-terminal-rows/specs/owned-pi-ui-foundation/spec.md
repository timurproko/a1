## ADDED Requirements

### Requirement: Over-width component rows are contained at the terminal boundary
The Pi TUI runtime boundary SHALL NOT end a session because a component returned a row wider than the available width. It SHALL clip such a row to the available width using the pinned renderer's own measurement and continue rendering. Rows that fit SHALL be returned unchanged, and the number of rows per component SHALL NOT change. A clipped row SHALL contain only complete graphemes and SHALL NOT leave an unterminated style or hyperlink. A Kitty image payload on the row SHALL be preserved while the ordinary cells around it are bounded. The runtime SHALL expose how many rows it has contained so that layout tests and evidence can detect overflow without a fatal exit.

#### Scenario: Render content the shared geometry under-measures
- **WHEN** a transcript row contains a character that A1's shared width helper measures narrower than the pinned renderer, such as a lone regional indicator, and the row consequently exceeds the terminal width
- **THEN** the session SHALL keep running and the row SHALL occupy at most the terminal width
- **AND** no fatal diagnostic SHALL be written

#### Scenario: Clip a styled over-width row
- **WHEN** an over-width row carries ANSI styling or an OSC hyperlink across the clip position
- **THEN** the clipped row SHALL NOT split a grapheme
- **AND** styling and hyperlink state SHALL NOT leak into following rows

#### Scenario: Bound ordinary cells beside an image payload
- **WHEN** a row carries a Kitty image payload followed by more ordinary cells than the available width
- **THEN** the payload SHALL be preserved and the ordinary cells SHALL be clipped to the available width

#### Scenario: Leave fitting rows untouched
- **WHEN** every row a component returns fits the available width
- **THEN** the boundary SHALL return those rows unchanged and SHALL report no contained rows

#### Scenario: Detect overflow without a fatal exit
- **WHEN** a root, mounted, or overlay component returns an over-width row
- **THEN** the runtime's contained-row count SHALL increase
- **AND** rendering SHALL NOT throw
