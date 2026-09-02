## ADDED Requirements

### Requirement: Text selection ranges use display-column boundaries
The shared text-selection model SHALL represent drag ranges using ordered display-column boundaries independently from pointer-cell identity. It SHALL distinguish an unextended press from a dragged one-cell range, normalize forward and reverse gestures to the same half-open source range, and keep grapheme clusters atomic. Rendering and plain-text extraction SHALL consume the same normalized range so highlighted cells and copied text cannot disagree.

#### Scenario: Normalize a one-grapheme drag
- **WHEN** a drag resolves to the boundaries immediately before and after one grapheme
- **THEN** the normalized range SHALL be nonempty and contain exactly that grapheme
- **AND** rendering and extraction SHALL use the same bounds

#### Scenario: Normalize reverse endpoints
- **WHEN** two drag endpoints are supplied in reverse document order
- **THEN** normalization SHALL produce the same range as the corresponding forward endpoints
- **AND** it SHALL preserve which boundary is active for subsequent extension

#### Scenario: Keep an unextended press empty
- **WHEN** a press is released without an accepted drag extension and without word or line selection
- **THEN** normalization SHALL produce no selected range

#### Scenario: Resolve display-width text
- **WHEN** a boundary intersects a wide character, emoji sequence, or combining sequence
- **THEN** it SHALL resolve to a complete grapheme boundary
- **AND** extraction SHALL preserve the original code-point sequence

#### Scenario: Extract a multiline range
- **WHEN** a normalized range crosses source rows
- **THEN** extraction SHALL include selected source text and semantic newlines only
- **AND** it SHALL omit ANSI styling, visual padding, and overlay cells

### Requirement: Selection composition declares and reuses row-level damage
A selectable viewport component SHALL retain a bounded reusable representation of stable visible rows and selected row variants. For a selection-only revision with unchanged content, rectangle, layout, and theme revisions, it SHALL identify each visible row whose normalized selected range changed and reuse every other row byte-for-byte. Reuse SHALL be bounded in memory and SHALL be invalidated by any revision that can change row content, display width, style, overlay order, or geometry.

#### Scenario: Extend within one row
- **WHEN** only the active selection boundary changes within one visible row
- **THEN** that row SHALL be the only selection-painted row recomputed
- **AND** every other visible row SHALL retain its cached rendered value

#### Scenario: Extend onto the next row
- **WHEN** a selection endpoint crosses into one adjacent visible row
- **THEN** the prior endpoint row and new endpoint row SHALL be recomputed as needed
- **AND** stable interior selected rows and unrelated rows SHALL be reused

#### Scenario: Reverse or shrink a selection
- **WHEN** the active boundary moves backward across previously selected rows
- **THEN** rows leaving or changing the selected range SHALL be restored from current unselected content
- **AND** no stale selection background SHALL remain

#### Scenario: Change a non-selection revision
- **WHEN** content, rectangle, layout, theme, source style, or overlay ordering changes
- **THEN** reuse SHALL be invalidated for every affected row
- **AND** the next frame SHALL reflect the new revision rather than cached bytes

#### Scenario: Bound retained variants
- **WHEN** pointer motion produces many distinct endpoint ranges over time
- **THEN** retained row and range variants SHALL stay within a declared bound related to the visible viewport
- **AND** evicting an old variant SHALL affect performance only, never selection correctness
