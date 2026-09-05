## ADDED Requirements

### Requirement: Follow-tail streaming paints stable viewport frames
While bare A1 follows the transcript end, the custom viewport SHALL present streamed assistant, thinking, and tool content without a blank, partially cleared, or geometrically inconsistent intermediate frame. Ordinary streamed growth SHALL NOT clear the complete screen. Rows whose visible cells remain unchanged SHALL NOT be cleared and rewritten merely because the transcript window advanced; a necessary follow-tail shift SHALL move the bounded transcript region atomically and repaint only newly exposed or genuinely changed rows. The editor, footer, and other stable dock rows SHALL remain outside that movement.

Updates arriving within one presentation interval SHALL be coalesced into the newest complete semantic state. Input-triggered feedback and a stream's final state SHALL not wait behind an obsolete queued streaming frame.

#### Scenario: Stream within the current final row
- **WHEN** assistant content grows without adding or reflowing a visible row
- **THEN** the frame SHALL repaint only rows whose visible cells changed
- **AND** stable transcript and dock rows SHALL not be cleared or rewritten

#### Scenario: Stream one newly wrapped row while following
- **WHEN** streamed content adds one row to an overflowing followed transcript
- **THEN** the transcript viewport SHALL advance by one row without repainting every stable transcript row
- **AND** the newly exposed row and any source row whose cells changed SHALL be painted as one complete update
- **AND** the dock SHALL remain at the same terminal rows

#### Scenario: Reflow incomplete Markdown
- **WHEN** a streaming Markdown construct changes the wrapping or presentation of multiple visible source rows
- **THEN** every row whose visible cells genuinely changed MAY be repainted
- **AND** rows outside the affected presentation and follow-tail movement SHALL remain untouched
- **AND** no intermediate frame SHALL show cleared content

#### Scenario: Pinned Pi has no viewport-damage API
- **WHEN** bare A1 can safely express a followed viewport transition as bounded transcript movement but the pinned Pi fullscreen renderer exposes no damage-hint method
- **THEN** an A1-owned adapter SHALL apply the movement through Pi's public terminal/runtime boundary
- **AND** it SHALL keep the pinned package files, private renderer state, and comparison producers untouched
- **AND** it SHALL transform a terminal write only when the write and semantic frame match the declared safe presentation contract

#### Scenario: Coalesce a burst of chunks
- **WHEN** multiple semantic stream updates arrive before the next presentation interval
- **THEN** the viewport SHALL present the newest complete state in one frame
- **AND** it SHALL not paint each superseded intermediate state

#### Scenario: Receive input while a streaming frame is pending
- **WHEN** editor or viewport input arrives while a coalesced streaming frame is pending
- **THEN** its visible feedback SHALL use the runtime's immediate input path
- **AND** a later streaming frame SHALL be recomputed from current state rather than overwrite that feedback with an obsolete frame

### Requirement: Transient surface ownership is stable across overflow
Queued-input rows, non-working status, widgets, active input, and footer SHALL retain one dock ownership and relative order while a run crosses from fitting content to overflowing content or back. Live working and extension-working rows SHALL retain one non-selectable scrollable-tail ownership after semantic transcript content across the same transition. The fit/overflow boundary SHALL NOT move a transient row between these regions, duplicate or omit it for an intermediate frame, or move the stable editor/footer group.

#### Scenario: Cross from fitting to overflowing while working
- **WHEN** a streamed row causes the transcript plus live working tail to exceed the rows above the dock
- **THEN** the working status SHALL remain in its scrollable-tail region and order
- **AND** queued input and the editor/footer group SHALL remain in the dock
- **AND** only scroll extent, transcript allocation, and follow position SHALL change
- **AND** no frame SHALL show the status twice or omit its visible portion

#### Scenario: Queue input at the fit boundary
- **WHEN** a queued-input row appears while streamed content is at the fit/overflow boundary
- **THEN** the queued row SHALL remain in its declared dock order and the working status SHALL remain in the scrollable tail
- **AND** the transcript viewport SHALL surrender the required dock rows without moving either transient into semantic transcript history

#### Scenario: Detach while the run continues
- **WHEN** the reader detaches from the end while queued or working rows are present
- **THEN** queued rows SHALL remain dock content and working rows SHALL remain transient scrollable-tail content according to their lifecycles
- **AND** transcript scrolling SHALL be able to scroll the working rows out of view
- **AND** neither surface SHALL count as selectable transcript content
