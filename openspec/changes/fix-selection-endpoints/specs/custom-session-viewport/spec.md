## MODIFIED Requirements

### Requirement: Transcript drag selection is boundary-precise
Bare A1's custom transcript viewport SHALL interpret an accepted ordinary pointer drag as an inclusive span of the source graphemes intersected by its anchor and moving pointer cells, represented by normalized display-column boundaries. Movement into an immediately adjacent distinct grapheme SHALL select both the pressed and adjacent graphemes. After accepted distinct motion, returning to the starting cell SHALL retain exactly the starting grapheme; further movement to either side SHALL extend from that grapheme without an intervening empty selection. A press and release with no distinct reported drag movement SHALL remain an ordinary click and SHALL NOT create a transcript selection.

The same endpoint cells SHALL highlight and copy identically whether selected forward or in reverse. Selection SHALL keep wide characters and combining sequences atomic, SHALL preserve source row boundaries in multiline copied text, and SHALL exclude viewport padding, scrollbar glyphs, pinned copies, controls, and dock rows. Existing double-click word selection, triple-click line selection, active-selection continuation, ANSI source styling, and copy clearing SHALL remain available.

#### Scenario: Drag the smallest distance forward
- **WHEN** a transcript drag begins on `c` in `abcde` and its first distinct motion report enters `d`
- **THEN** `cd` SHALL be highlighted
- **AND** copying SHALL emit exactly `cd`

#### Scenario: Drag the smallest distance backward
- **WHEN** a transcript drag begins on `c` in `abcde` and its first distinct motion report enters `b`
- **THEN** `bc` SHALL be highlighted
- **AND** copying SHALL emit exactly `bc`, identical to a drag beginning on `b` and ending on `c`

#### Scenario: Select one character and extend to either side
- **WHEN** a transcript drag starts on `c` in `abcde`, moves to a neighboring cell, and returns to `c`
- **THEN** exactly `c` SHALL remain highlighted and copyable, including if released there
- **AND** before release, moving next to `b` SHALL select `bc`, returning to `c` SHALL select `c`, and moving next to `d` SHALL select `cd`
- **AND** reversing this sequence SHALL retain the same anchor without an empty intermediate selection

#### Scenario: Click without dragging
- **WHEN** the pointer is pressed and released on the same transcript cell without a distinct drag-motion report
- **THEN** no transcript range SHALL remain selected
- **AND** `Ctrl+C` SHALL remain available to the focused surface rather than copying a synthetic empty or one-cell range

#### Scenario: Cross rows in either direction
- **WHEN** a drag spans `b` in source row `abcd` and `g` in the following source row `efgh`, in either direction
- **THEN** both directions SHALL highlight `bcd` and `efg`, including both boundary characters
- **AND** both directions SHALL copy exactly `bcd\nefg` with a source newline and without visual padding

#### Scenario: Include the first and last source characters of a block
- **WHEN** a multiline drag spans the first source character of its first row and the last source character of its last row, in either direction
- **THEN** every source character in that block SHALL be highlighted and copied
- **AND** stopping directly on either boundary character SHALL NOT require moving one extra cell beyond it

#### Scenario: Cross a wide or combining grapheme
- **WHEN** a drag endpoint reaches a wide character or combining sequence
- **THEN** selection SHALL expand to the complete grapheme boundary
- **AND** highlighting and copied text SHALL NOT split its code points or terminal cells

#### Scenario: Use word or line selection
- **WHEN** the reader double-clicks a word or triple-clicks a transcript line
- **THEN** the existing semantic word or full-row range SHALL remain selected
- **AND** the ordinary drag model SHALL NOT shrink that range to pointer-motion semantics
