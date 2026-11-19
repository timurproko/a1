## ADDED Requirements

### Requirement: Transcript drag selection is boundary-precise
Bare A1's custom transcript viewport SHALL interpret pointer drags as ranges between display-column boundaries rather than as two unconditionally inclusive cells. A press followed by movement into the immediately adjacent cell SHALL be able to select exactly the complete grapheme in the pressed cell. A press and release with no reported drag movement SHALL remain an ordinary click and SHALL NOT create a transcript selection.

The same source range SHALL highlight and copy identically whether selected forward or in reverse. Selection SHALL keep wide characters and combining sequences atomic, SHALL preserve source row boundaries in multiline copied text, and SHALL exclude viewport padding, scrollbar glyphs, pinned copies, controls, and dock rows. Existing double-click word selection, triple-click line selection, active-selection continuation, ANSI source styling, and copy clearing SHALL remain available.

#### Scenario: Drag the smallest distance forward
- **WHEN** a transcript drag begins on one grapheme and its first distinct motion report enters the immediately following cell
- **THEN** exactly the pressed grapheme SHALL be selected
- **AND** copying SHALL emit only that grapheme

#### Scenario: Drag the smallest distance backward
- **WHEN** a transcript drag begins on one grapheme and its first distinct motion report enters the immediately preceding cell
- **THEN** exactly the pressed grapheme SHALL be selected
- **AND** its highlighted and copied range SHALL equal the corresponding forward selection

#### Scenario: Click without dragging
- **WHEN** the pointer is pressed and released on the same transcript cell without a distinct drag-motion report
- **THEN** no transcript range SHALL remain selected
- **AND** `Ctrl+C` SHALL remain available to the focused surface rather than copying a synthetic empty or one-cell range

#### Scenario: Cross rows in either direction
- **WHEN** a drag selects the same multiline source range from start to end or from end to start
- **THEN** both directions SHALL highlight the same graphemes
- **AND** both directions SHALL copy identical text with source newlines and without visual padding

#### Scenario: Cross a wide or combining grapheme
- **WHEN** a drag boundary reaches a wide character or combining sequence
- **THEN** selection SHALL expand to the complete grapheme boundary
- **AND** highlighting and copied text SHALL NOT split its code points or terminal cells

#### Scenario: Use word or line selection
- **WHEN** the reader double-clicks a word or triple-clicks a transcript line
- **THEN** the existing semantic word or full-row range SHALL remain selected
- **AND** the new drag-boundary model SHALL NOT shrink that range to pointer-motion semantics

### Requirement: Selection motion presents the latest endpoint with bounded visible work
A transcript selection motion SHALL use the immediate input presentation path and SHALL NOT wait for the stream-presentation interval. If multiple motion reports arrive before presentation, the viewport SHALL retain at most the newest unpublished endpoint and SHALL NOT paint obsolete intermediate endpoints after it. A pending or concurrent streaming frame SHALL be recomputed from current selection state and SHALL NOT overwrite newer pointer feedback.

For unchanged viewport geometry and document content, selection composition SHALL reuse unchanged visible rows and SHALL recompute only rows whose selected display-column range changed. Per-motion selection work SHALL be bounded by visible selection damage rather than by complete transcript length or by every row already inside a growing selection. Resize, content, theme, hyperlink-style, scrollbar, sticky-row, or viewport-position changes SHALL invalidate the affected reuse and produce a correct complete frame rather than stale styling.

#### Scenario: Move through a multiline selection
- **WHEN** successive motion reports extend a selection by one ordinary visible row at a time
- **THEN** each presentation SHALL update the newly changed endpoint or crossed row and any row whose previous endpoint styling must be removed
- **AND** already stable selected and unselected rows SHALL be reused rather than remeasured and repainted

#### Scenario: Burst pointer reports before a frame
- **WHEN** several selection-motion reports arrive before the runtime can present another frame
- **THEN** only the newest endpoint SHALL remain pending
- **AND** no later frame SHALL regress to one of the superseded endpoints

#### Scenario: Select while output streams
- **WHEN** transcript updates and selection-motion reports overlap
- **THEN** pointer feedback SHALL use the immediate runtime cadence rather than the streaming cadence
- **AND** the next content frame SHALL include the newest selection endpoint and newest semantic transcript state

#### Scenario: Select within a long transcript
- **WHEN** the visible range and pointer movement are identical in a short and a very long transcript
- **THEN** selection-state lookup and per-motion composition work SHALL remain equivalent
- **AND** the implementation SHALL NOT scan off-screen transcript rows

#### Scenario: Invalidate stable row reuse
- **WHEN** resize, reflow, theme, source styling, viewport position, sticky content, or scrollbar presentation changes a reused row
- **THEN** every affected row SHALL be recomputed before presentation
- **AND** no stale highlight, color, link, rail, or padding SHALL remain

#### Scenario: Auto-scroll an active selection
- **WHEN** edge-held selection auto-scroll changes the visible document range
- **THEN** the endpoint SHALL continue to follow the declared auto-scroll cadence and distance
- **AND** repaint MAY include rows damaged by the viewport movement but SHALL still present the newest endpoint without a stale intermediate frame

### Requirement: Selection precision and latency use exact-artifact acceptance
Selection acceptance SHALL include deterministic component, shell, and terminal-paint evidence plus a user-controlled physical-terminal comparison of the exact built candidate. Automated evidence SHALL cover one-grapheme forward and reverse drags, multiline growth, copy output, stale-frame suppression, long transcripts, streaming overlap, resize, styling, links, scrollbar modes, auto-scroll, and terminal restoration. It SHALL distinguish bare A1's owned fullscreen selection from terminal-owned regular-mode selection and SHALL prove that `a1 pi`, untouched Pi, and installed Pi packages remain unchanged.

#### Scenario: Exercise representative fullscreen geometry
- **WHEN** deterministic selection evidence runs at a declared large geometry including 192 columns by 54 rows
- **THEN** it SHALL record selection-state transitions, recomputed visible rows, render requests, terminal writes, final cells, and copy output
- **AND** a regression that recomputes every already-selected visible row per one-row motion, presents stale endpoints, or scans the complete transcript SHALL fail

#### Scenario: Compare the exact candidate physically
- **WHEN** the exact built candidate is tested in Windows Terminal beside vanilla Pi
- **THEN** the reader SHALL be able to select and copy one grapheme and drag multiline selections with the highlight tracking the pointer at the available input-frame cadence
- **AND** terminal/version, geometry, relevant viewport settings, and the acceptance result SHALL be recorded before merge

#### Scenario: Physical testing contradicts automation
- **WHEN** the exact candidate still visibly trails the pointer or cannot select one grapheme despite automated checks passing
- **THEN** selection acceptance SHALL fail
- **AND** the code change SHALL remain unmerged until corrected and revalidated
