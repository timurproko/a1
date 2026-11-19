## MODIFIED Requirements

### Requirement: The governing submitted prompt remains pinned while scrolling
When the first row of the most recent submitted user prompt at or before the viewport start has scrolled above the viewport, a copy of that first row SHALL occupy the viewport's first row without adding to the document's row count. The copy SHALL preserve the prompt prefix, content, background, and timestamp from the source row. It SHALL remain prominent while any continuation row of that prompt is visible and SHALL use the quiet theme role after the complete prompt is above the viewport. Activating it SHALL return the viewport to the source prompt.

In the prominent, non-hovered state, the pinned timestamp SHALL retain the source timestamp's metadata foreground, grey in the default dark theme, rather than adopting the prompt body foreground. This color rule SHALL also apply to completed compaction blocks using submitted-prompt pinning. Existing quiet-row dimming and explicit hover highlighting SHALL remain unchanged. Timestamp value, alignment, width-dependent omission, and body styling SHALL remain unchanged.

#### Scenario: Scroll within a multiline prompt
- **WHEN** the prompt's first row is above the viewport but one of its continuation rows remains visible
- **THEN** the prompt's first row SHALL be pinned at the top with its timestamp
- **AND** it SHALL retain its prominent presentation
- **AND** without hover its timestamp SHALL have the same grey metadata foreground as the naturally visible source timestamp

#### Scenario: Scroll beyond the complete prompt
- **WHEN** the prompt and all its continuation rows are above the viewport while later rows are visible
- **THEN** the same prompt row SHALL remain pinned using the quiet presentation

#### Scenario: Activate the pinned prompt
- **WHEN** the reader activates the pinned prompt row
- **THEN** the viewport SHALL scroll so the source prompt begins at the top
- **AND** follow-end SHALL remain disabled unless that target is also the transcript end

#### Scenario: Jump through previous prompts by keyboard
- **WHEN** the reader presses `Alt+Home` while the custom transcript owns input
- **THEN** the viewport SHALL jump to the source of its governing pinned prompt
- **AND** each repeated press SHALL jump to the preceding semantic submitted prompt
- **AND** reaching the earliest prompt SHALL scroll to the document beginning so its one opening breathing row is visible above it
- **AND** further presses SHALL keep that document-opening position

#### Scenario: Prompt first row is naturally visible
- **WHEN** the governing prompt's source first row is already the viewport's first row
- **THEN** no duplicate sticky row SHALL be added

#### Scenario: Pin a completed compaction while its summary remains visible
- **WHEN** a completed compaction header scrolls above the viewport while summary continuation rows remain visible and its pinned row is not hovered
- **THEN** its pinned timestamp SHALL retain the source timestamp's metadata foreground just as an ordinary prompt does

#### Scenario: Hover and leave the prominent pinned row
- **WHEN** the pointer enters and then leaves a prominent pinned prompt or compaction row
- **THEN** existing explicit hover highlighting SHALL remain available
- **AND** leaving the row SHALL restore the source-matching grey timestamp without waiting for another scroll

#### Scenario: Revisit the prominent state
- **WHEN** reverse scrolling, resize, or scrollbar appearance leaves a non-hovered pinned row prominent with a fitting timestamp
- **THEN** its timestamp SHALL retain the current source metadata foreground without stale white styling or color leakage into adjacent text
