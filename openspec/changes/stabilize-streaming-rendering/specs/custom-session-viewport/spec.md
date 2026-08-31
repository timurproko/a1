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

#### Scenario: Coalesce a burst of chunks
- **WHEN** multiple semantic stream updates arrive before the next presentation interval
- **THEN** the viewport SHALL present the newest complete state in one frame
- **AND** it SHALL not paint each superseded intermediate state

#### Scenario: Receive input while a streaming frame is pending
- **WHEN** editor or viewport input arrives while a coalesced streaming frame is pending
- **THEN** its visible feedback SHALL use the runtime's immediate input path
- **AND** a later streaming frame SHALL be recomputed from current state rather than overwrite that feedback with an obsolete frame

### Requirement: Transient dock ownership is stable across overflow
Queued-input rows, working status, extension working content, active input, widgets, and footer SHALL retain one dock ownership and relative order while a run crosses from fitting content to overflowing content or back. The fit/overflow boundary SHALL only change the number and source range of transcript rows; it SHALL NOT move a transient row between document history and dock, duplicate it, omit it for an intermediate frame, or move the stable editor/footer group.

#### Scenario: Cross from fitting to overflowing while working
- **WHEN** a streamed row causes the transcript plus working status to exceed the rows above the dock
- **THEN** the working status SHALL remain in its existing dock region and order
- **AND** only transcript allocation and follow position SHALL change
- **AND** no frame SHALL show the status twice or not at all

#### Scenario: Queue input at the fit boundary
- **WHEN** a queued-input row appears while streamed content is at the fit/overflow boundary
- **THEN** the queued row and working status SHALL remain in their declared dock order
- **AND** the transcript viewport SHALL surrender the required rows without moving either transient into transcript history

#### Scenario: Detach while the run continues
- **WHEN** the reader detaches from the end while queued or working rows are present
- **THEN** those rows SHALL remain dock content according to their lifecycle
- **AND** transcript scrolling SHALL not scroll them away or count them as selectable transcript rows
