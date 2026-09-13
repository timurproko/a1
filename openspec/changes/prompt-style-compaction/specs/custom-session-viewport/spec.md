## MODIFIED Requirements

### Requirement: The governing submitted prompt remains pinned while scrolling
When the first row of the most recent submitted user prompt or completed compaction summary at or before the viewport start has scrolled above the viewport, a copy of that first row SHALL occupy the viewport's first row without adding to the document's row count. The copy SHALL preserve the prompt-style prefix, content, background, and timestamp from the source row. It SHALL remain prominent while any continuation row of that block is visible and SHALL use the quiet theme role after the complete block is above the viewport. Activating it SHALL return the viewport to the source block. Completed compactions SHALL participate as navigation/context anchors, not as submitted user messages.

#### Scenario: Scroll within a multiline prompt
- **WHEN** the prompt's first row is above the viewport but one of its continuation rows remains visible
- **THEN** the prompt's first row SHALL be pinned at the top with its timestamp
- **AND** it SHALL retain its prominent presentation

#### Scenario: Scroll beyond the complete prompt
- **WHEN** the prompt and all its continuation rows are above the viewport while later rows are visible
- **THEN** the same prompt row SHALL remain pinned using the quiet presentation

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

#### Scenario: Pin and activate a compaction
- **WHEN** the reader scrolls past the first row of a completed compaction
- **THEN** its pinned row SHALL show `Compacted from 281,483 tokens` for a token count of 281483 with its original timestamp, using the same layout and prominent/quiet rules as ordinary pinned prompts
- **AND** activating the row SHALL return to the compaction's full inline source block without opening a modal or toggling expansion
- **AND** follow-end SHALL remain disabled unless that target is also the transcript end
- **AND** a naturally visible source header SHALL NOT also produce a duplicate sticky row

#### Scenario: A later prompt or compaction becomes governing
- **WHEN** another submitted prompt or completed compaction becomes the most recent anchor at or before the viewport start
- **THEN** it SHALL replace the previous pinned context rather than stack another pinned row

## ADDED Requirements

### Requirement: Completed compactions use full prompt-style transcript presentation
Bare A1 SHALL render each completed compaction summary with ordinary submitted-prompt styling and a header `Compacted from <count> tokens`, using the actual pre-compaction token count with comma thousands separators. The full inline header SHALL use normal font weight, not bold. The full summary SHALL remain available inline beneath the header with its Markdown semantics preserved; visibility SHALL depend on normal viewport scrolling, not an expansion toggle. The presentation SHALL omit the separate `[compaction]` banner and Ctrl+O expansion hint. Ctrl+O SHALL NOT collapse or expand this compaction, while retaining its existing behavior for other expandable content.

#### Scenario: Read a completed compaction without expansion
- **WHEN** a completed compaction with 281483 pre-compaction tokens is displayed in bare A1, either live or from resumed history
- **THEN** its source header SHALL read `Compacted from 281,483 tokens` without bold styling
- **AND** the full summary SHALL be readable by normal scrolling without pressing Ctrl+O
- **AND** no separate `[compaction]` banner or expansion hint SHALL be shown

#### Scenario: Toggle other expandable content
- **WHEN** the reader presses Ctrl+O in a transcript containing a compaction and ordinary expandable tool content
- **THEN** the compaction's heading and full summary SHALL remain unchanged
- **AND** the ordinary expandable content SHALL retain its existing toggle behavior

#### Scenario: Resize or reload a compaction
- **WHEN** the terminal is resized or the same completed compaction is reloaded
- **THEN** its timestamp SHALL retain the original event time and use ordinary prompt formatting and insufficient-width omission rules
- **AND** its rows SHALL stay within the viewport width, preserving access to the summary

### Requirement: Completed compactions participate in ordinary prompt navigation
While the custom transcript owns prompt-navigation input, Shift+Up and Shift+Down SHALL navigate one shared chronological sequence of submitted prompts and completed compactions. Existing previous/next source targeting, document-opening behavior, and movement past the newest anchor to the live bottom SHALL remain in effect. Navigation SHALL NOT submit, recall into the editor, or rewrite a compaction as a user prompt.

#### Scenario: Navigate a mixed transcript in both directions
- **WHEN** the reader uses Shift+Up and Shift+Down through a transcript containing user prompts, assistant/tool output, and multiple completed compactions
- **THEN** the navigation SHALL visit prompts and compactions in document order without skipping compactions or stopping on assistant/tool output
- **AND** each compaction target SHALL expose its full source block just like an ordinary prompt target
- **AND** the editor draft SHALL remain unchanged

#### Scenario: Navigate sequence boundaries
- **WHEN** the reader navigates backward beyond the earliest anchor or forward beyond the newest anchor
- **THEN** backward navigation SHALL retain the document-opening position and forward navigation SHALL return to the live bottom using the existing prompt boundary behavior

#### Scenario: Preserve focused input ownership
- **WHEN** a selector, modal, overlay, or replacement editor owns an input event
- **THEN** compaction navigation SHALL NOT steal that event

### Requirement: Compaction presentation preserves transcript semantics and route isolation
Prompt-style compactions SHALL preserve the displayable summary, semantic selection/copy, native link activation and existing link colors, stable block identity, bounded delivery/rendering, and ordinary prompt behavior. Sticky copies SHALL remain excluded from copied source text. The change SHALL NOT alter compaction generation, persisted message roles, saved prompt recall, branch-summary presentation, live compaction working-status placement, or the pinned `a1 pi` comparison route.

#### Scenario: Select and copy a long summary while output continues
- **WHEN** the reader scrolls and selects a long compaction summary while later output streams
- **THEN** the source summary SHALL remain accessible and selection/copy SHALL retain its ordinary semantic behavior without duplicating the pinned row
- **AND** later output SHALL NOT force a detached reader to the bottom or change the editor draft
- **AND** rendering SHALL retain the existing bounded delivery and painting behavior

#### Scenario: Keep unrelated summary and comparison surfaces unchanged
- **WHEN** a branch summary or live compaction status is displayed, or the user runs `a1 pi`
- **THEN** that surface SHALL retain its existing presentation and behavior rather than acquiring bare-A1 compaction anchors
