## MODIFIED Requirements

### Requirement: Submitted prompts carry their source timestamp
A submitted user prompt SHALL render its source timestamp as local 24-hour `HH:mm` time, right-aligned on the prompt's first row when the row has enough width for the prompt prefix, useful prompt content, a separating margin, and the timestamp. Continuation rows SHALL align beneath the prompt text rather than beneath the prompt prefix. The timestamp is transcript metadata; the live input surface SHALL NOT gain a clock or timestamp from this milestone.

Whenever it is rendered, the timestamp SHALL use the grey metadata foreground at normal intensity. Its foreground and intensity SHALL remain unchanged when the source prompt is normal, hovered, quiet/dimmed, text-selected, or otherwise repainted; selection MAY still change the timestamp background together with the selected range. Prompt-body styling SHALL remain independent of this timestamp rule.

#### Scenario: Render a submitted prompt
- **WHEN** a user transcript block has a valid source timestamp and sufficient width
- **THEN** its first row SHALL show that timestamp right-aligned as `HH:mm`
- **AND** the timestamp SHALL use the grey metadata foreground at normal intensity
- **AND** the prompt text SHALL remain complete across its wrapped rows

#### Scenario: Select a submitted-prompt timestamp
- **WHEN** transcript text selection includes some or all timestamp cells
- **THEN** those timestamp glyphs SHALL retain the same foreground and intensity used before selection
- **AND** the selection background SHALL remain visible on the selected cells

#### Scenario: Render the first prompt at the document beginning
- **WHEN** the first submitted prompt is naturally visible at the transcript beginning
- **THEN** one blank breathing row SHALL appear immediately above it
- **AND** that breathing row SHALL scroll away rather than becoming part of the sticky prompt

#### Scenario: Render a multiline prompt
- **WHEN** a submitted prompt wraps or contains multiple lines
- **THEN** every continuation row SHALL align under the first row's prompt text
- **AND** the timestamp SHALL appear only on the first row

#### Scenario: Render at an insufficient width
- **WHEN** showing the timestamp would leave no useful width for prompt content
- **THEN** the timestamp SHALL be omitted for that frame
- **AND** the prompt content SHALL remain available and no row SHALL exceed the viewport width

#### Scenario: Render the live editor
- **WHEN** the reader is typing but has not submitted the prompt
- **THEN** the active input surface SHALL retain its existing presentation without a timestamp

### Requirement: The governing submitted prompt remains pinned while scrolling
When the first row of the most recent submitted user prompt or completed compaction summary at or before the viewport start has scrolled above the viewport, a copy of that first row SHALL occupy the viewport's first row without adding to the document's row count. The copy SHALL preserve the prompt-style prefix, content, background, and timestamp from the source row. It SHALL remain prominent while any continuation row of that block is visible and SHALL use the quiet theme role after the complete block is above the viewport. Activating it SHALL return the viewport to the source block. Completed compactions SHALL participate as navigation/context anchors, not as submitted user messages.

The pinned timestamp SHALL use the same normal-intensity grey metadata foreground as the naturally visible timestamp in every prominent, hovered, and quiet/dimmed presentation. Hover highlighting and quiet dimming SHALL continue to affect the rest of the row, but SHALL NOT change the timestamp's foreground or intensity. This rule SHALL also apply to completed compaction blocks using submitted-prompt pinning. Timestamp value, alignment, width-dependent omission, backgrounds, and body styling SHALL remain unchanged.

#### Scenario: Scroll within a multiline prompt
- **WHEN** the prompt's first row is above the viewport but one of its continuation rows remains visible
- **THEN** the prompt's first row SHALL be pinned at the top with its timestamp
- **AND** it SHALL retain its prominent presentation
- **AND** without hover its timestamp SHALL use the same grey metadata foreground and normal intensity as the naturally visible source timestamp

#### Scenario: Scroll beyond the complete prompt
- **WHEN** the prompt and all of its continuation rows are above the viewport while later rows are visible
- **THEN** the same prompt row SHALL remain pinned using the quiet presentation
- **AND** quiet dimming SHALL leave the timestamp foreground and intensity unchanged

#### Scenario: Activate the pinned prompt
- **WHEN** the reader activates the pinned prompt row
- **THEN** the viewport SHALL scroll so the source prompt begins at the top
- **AND** follow-end SHALL remain disabled unless that target is also the transcript end

#### Scenario: Jump through previous prompts by keyboard
- **WHEN** the reader presses `Alt+Home` while the custom transcript owns input
- **THEN** the viewport SHALL jump to the source of its governing pinned prompt or completed compaction
- **AND** each repeated press SHALL jump to the preceding semantic submitted prompt or completed compaction in transcript order
- **AND** reaching the earliest anchor SHALL scroll to the document beginning so its one opening breathing row is visible above it
- **AND** further presses SHALL keep that document-opening position

#### Scenario: Prompt first row is naturally visible
- **WHEN** the governing prompt's source first row is already the viewport's first row
- **THEN** no duplicate sticky row SHALL be added

#### Scenario: Pin a completed compaction while its summary remains visible
- **WHEN** a completed compaction header scrolls above the viewport while summary continuation rows remain visible and its pinned row is not hovered
- **THEN** its pinned timestamp SHALL use the same grey metadata foreground and normal intensity as an ordinary prompt timestamp

#### Scenario: Hover and leave the prominent pinned row
- **WHEN** the pointer enters and then leaves a prominent pinned prompt or compaction row
- **THEN** existing explicit hover highlighting SHALL remain available
- **AND** the timestamp foreground and intensity SHALL remain identical before, during, and after hover
- **AND** leaving the row SHALL restore the non-hovered body presentation without waiting for another scroll

#### Scenario: Revisit the prominent state
- **WHEN** reverse scrolling, resize, or scrollbar appearance leaves a non-hovered pinned row prominent with a fitting timestamp
- **THEN** its timestamp SHALL retain the grey metadata foreground at normal intensity without color leakage into adjacent text

#### Scenario: Pin and activate a compaction
- **WHEN** the reader scrolls past the first row of a completed compaction
- **THEN** its pinned row SHALL show `Compacted from 281,483 tokens` for a token count of 281483 with its original timestamp, using the same layout and prominent/quiet rules as ordinary pinned prompts
- **AND** activating the row SHALL return to the compaction's full inline source block without opening a modal or toggling expansion
- **AND** follow-end SHALL remain disabled unless that target is also the transcript end
- **AND** a naturally visible source header SHALL NOT also produce a duplicate sticky row

#### Scenario: A later prompt or compaction becomes governing
- **WHEN** another submitted prompt or completed compaction becomes the most recent anchor at or before the viewport start
- **THEN** it SHALL replace the previous pinned context rather than stack another pinned row
