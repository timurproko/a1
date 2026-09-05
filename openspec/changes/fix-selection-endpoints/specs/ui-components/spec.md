## MODIFIED Requirements

### Requirement: Text selection ranges use display-column boundaries
The shared text-selection model SHALL represent accepted ordinary pointer drags as ordered, half-open display-column ranges that include the complete graphemes intersected by both the anchor cell and the current pointer cell. It SHALL distinguish an unextended press from a dragged one-cell range, normalize the same endpoint cells in either direction to the same source range, and keep grapheme clusters atomic. Once distinct drag motion has been accepted, returning to the anchor cell SHALL retain exactly the anchor grapheme rather than produce an empty range. Rendering and plain-text extraction SHALL consume the same normalized range so highlighted cells and copied text cannot disagree.

#### Scenario: Normalize a one-grapheme drag
- **WHEN** an accepted drag returns to its anchor cell after distinct motion
- **THEN** the normalized range SHALL span the boundaries immediately before and after the anchor grapheme
- **AND** rendering and extraction SHALL contain exactly that grapheme, including after release

#### Scenario: Include adjacent endpoint graphemes
- **WHEN** a drag in `abcde` starts on `c` and moves to `b` or `d`
- **THEN** the selected source text SHALL be `bc` or `cd`, respectively
- **AND** neither endpoint grapheme SHALL be excluded

#### Scenario: Normalize reverse endpoints
- **WHEN** two drag endpoint cells are supplied in reverse document order
- **THEN** normalization SHALL produce the same range as the corresponding forward endpoints, including both endpoint graphemes
- **AND** it SHALL preserve the moving endpoint for subsequent extension

#### Scenario: Cross the anchor without deselection
- **WHEN** a drag anchored on `c` in `abcde` visits `b`, `c`, and `d` in sequence
- **THEN** the selected source text SHALL be `bc`, `c`, and `cd` in sequence
- **AND** the mirrored sequence through `d`, `c`, and `b` SHALL produce `cd`, `c`, and `bc`
- **AND** repeated reports at the anchor and release there SHALL retain `c` without an empty intermediate range

#### Scenario: Keep an unextended press empty
- **WHEN** a press is released without an accepted distinct drag extension and without word or line selection
- **THEN** normalization SHALL produce no selected range
- **AND** repeated reports at the unchanged press cell SHALL NOT activate selection

#### Scenario: Resolve display-width text
- **WHEN** either endpoint intersects a wide character, emoji sequence, or combining sequence
- **THEN** it SHALL resolve to a complete grapheme boundary
- **AND** extraction SHALL preserve the original code-point sequence
- **AND** distinct pointer-cell motion within the same wide grapheme SHALL select that grapheme exactly once

#### Scenario: Extract a multiline range
- **WHEN** a normalized range crosses source rows
- **THEN** extraction SHALL include selected source text and semantic newlines only, including the source graphemes under both endpoint cells
- **AND** it SHALL omit ANSI styling, visual padding, and overlay cells
