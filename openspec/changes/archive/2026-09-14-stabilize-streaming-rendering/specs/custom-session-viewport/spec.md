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
Pending steering rows and their edit hint, live working rows, and extension-working rows SHALL retain one non-persistent, non-selectable viewport ownership after semantic transcript content while a run crosses from fitting content to overflowing content or back. Non-working status, widgets, active input, and footer SHALL retain one dock ownership and relative order. While all viewport content fits, unused viewport rows SHALL precede a present live status so it remains immediately above the dock without moving earlier transcript or steering rows. At overflow that alignment gap SHALL be zero. The fit/overflow boundary SHALL NOT move a transient row between viewport and dock, duplicate or omit it for an intermediate frame, or move the stable editor/footer group.

#### Scenario: Cross from fitting to overflowing while working
- **WHEN** streamed rows consume the unused alignment space and then cause semantic transcript, pending steering, and live working rows to exceed the rows above the dock
- **THEN** the one working status SHALL remain in its transient viewport region and order
- **AND** the fitting alignment gap SHALL shrink to zero before ordinary end-following movement begins
- **AND** pending steering SHALL remain before the status in transient viewport content while the editor/footer group remains in the dock
- **AND** no frame SHALL show the status twice, omit its visible portion, or move it before actual overflow

#### Scenario: Queue input at the fit boundary
- **WHEN** a queued-input row appears while streamed content is at the fit/overflow boundary
- **THEN** the queued row SHALL appear after semantic transcript content and before any working status without entering the dock
- **AND** it SHALL contribute to transient viewport extent without becoming semantic transcript history
- **AND** unchanged input, widget, and footer rows SHALL remain at their existing dock coordinates

#### Scenario: Detach while the run continues
- **WHEN** the reader detaches from the end while pending steering or working rows are present
- **THEN** both surfaces SHALL remain transient viewport content according to their lifecycles
- **AND** transcript scrolling SHALL be able to scroll both surfaces out of view according to their actual positions
- **AND** neither surface nor fitting alignment rows SHALL count as selectable transcript content
