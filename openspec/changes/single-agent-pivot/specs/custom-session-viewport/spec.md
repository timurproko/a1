## ADDED Requirements

### Requirement: The governing submitted prompt remains pinned while scrolling without a timestamp
When the first row of the governing submitted prompt or completed compaction has scrolled above the viewport, a copy of that first row SHALL occupy the viewport's first row, preserving the prompt-style prefix, content, and background and carrying no timestamp. It SHALL remain prominent while any continuation row of that block is visible and SHALL use the quiet theme role once the complete block is above the viewport. Activating it SHALL return the viewport to the source block. Completed compactions are navigation anchors, not user messages.

#### Scenario: Pinned row adds no document row
- **WHEN** a pinned copy of the governing first row is shown
- **THEN** the document's row count SHALL be unchanged and the copy SHALL render no timestamp

#### Scenario: Scroll within a multiline prompt
- **WHEN** the prompt's first row is above the viewport but one of its continuation rows remains visible
- **THEN** the prompt's first row SHALL be pinned at the top
- **AND** it SHALL retain its prominent presentation

#### Scenario: Scroll beyond the complete prompt
- **WHEN** the prompt and all of its continuation rows are above the viewport while later rows are visible
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

#### Scenario: Hover and leave the prominent pinned row
- **WHEN** the pointer enters and then leaves a prominent pinned prompt or compaction row
- **THEN** existing explicit hover highlighting SHALL remain available
- **AND** leaving the row SHALL restore the non-hovered body presentation without waiting for another scroll

#### Scenario: Pin and activate a compaction
- **WHEN** the reader scrolls past the first row of a completed compaction
- **THEN** its pinned row SHALL show `Compacted from 281,483 tokens` for a token count of 281483, using the same layout and prominent/quiet rules as ordinary pinned prompts
- **AND** activating the row SHALL return to the compaction's full inline source block without opening a modal or toggling expansion
- **AND** follow-end SHALL remain disabled unless that target is also the transcript end
- **AND** a naturally visible source header SHALL NOT also produce a duplicate sticky row

#### Scenario: A later prompt or compaction becomes governing
- **WHEN** another submitted prompt or completed compaction becomes the most recent anchor at or before the viewport start
- **THEN** it SHALL replace the previous pinned context rather than stack another pinned row

## MODIFIED Requirements

### Requirement: The custom viewport is scoped to bare A1
The custom session viewport SHALL be a declared A1 layout customization enabled for bare `a1`. The `a1 pi` profiles SHALL continue to present the pinned comparison layout without the A1 scrollbar settings, scroll-to-bottom control, A1 prompt bar, or sticky A1 prompt row. Neither profile SHALL render a timestamp on submitted prompts.

#### Scenario: Launch bare A1
- **WHEN** the user starts bare `a1`
- **THEN** the session SHALL use the custom bounded viewport and bottom dock

#### Scenario: Launch a comparison profile
- **WHEN** the user starts `a1 pi`
- **THEN** the session SHALL use the pinned comparison presentation
- **AND** no A1 viewport control or prompt decoration SHALL be inserted

#### Scenario: Use an existing workflow in bare A1
- **WHEN** the reader invokes a command, opens or closes a selector or dialog, replaces the editor, queues input, receives extension UI, streams tools, or shuts down
- **THEN** the workflow outcome and surface lifecycle SHALL remain the accepted owned-shell behavior, with only its placement inside the custom viewport changed

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
- **THEN** its header SHALL keep ordinary prompt formatting without a timestamp
- **AND** its rows SHALL stay within the viewport width, preserving access to the summary

### Requirement: Submitted prompt chips wrap as atomic units

Bare A1 SHALL treat each canonical text-paste, image, file, folder, and URL chip label in submitted user-prompt text as one visual wrapping unit whenever the complete label fits within the prompt's full content width, whether authored whitespace separates the chip or it directly touches other text. When the remaining columns on a row cannot contain a fitting chip, the complete chip SHALL begin on the next continuation row rather than split internally.

If one chip is wider than the complete available content width, bare A1 SHALL truncate its visual label with `…` on one width-bounded row rather than split it. Atomic wrapping SHALL be presentation-only: source text, Markdown styling outside chips, hyperlinks, sticky-prompt behavior, stored/model-facing content, attachment behavior, and live editor semantics SHALL remain unchanged. Ordinary bracketed text that is not canonical chip syntax SHALL retain normal Markdown wrapping, and the `a1 pi` comparison route SHALL retain pinned rendering.

#### Scenario: Move a fitting screenshot chip to the next row

- **WHEN** prose, including an uninterrupted run directly touching a canonical screenshot chip, leaves too few columns for the complete chip but the chip fits within a full prompt content row
- **THEN** the current row SHALL end before the chip
- **AND** the next continuation row SHALL contain the complete chip without an internal split

#### Scenario: Wrap every canonical chip family consistently

- **WHEN** submitted prompt text contains canonical text-paste, image, file, folder, or URL chip labels near a row boundary
- **THEN** every fitting chip SHALL wrap as one unit using the same canonical syntax recognized by prompt-chip behavior
- **AND** chips touching prose, adjacent chips, and repeated chips SHALL remain complete individual units without gaining visible separators

#### Scenario: Render a chip wider than the prompt

- **WHEN** one canonical chip is wider than the complete prompt content width
- **THEN** its visual label SHALL be truncated with `…` on exactly one width-bounded row
- **AND** the stored and model-facing source SHALL retain the complete chip without splitting a grapheme cluster

#### Scenario: Preserve submitted-prompt presentation and content

- **WHEN** a submitted prompt contains chips together with Markdown, a URL hyperlink, sticky-row presentation, transcript selection, or directly touching prose
- **THEN** every fitting chip and its surrounding source SHALL retain exact visible characters and authored spacing, while only an oversized chip label MAY use the declared ellipsis
- **AND** styling, hyperlinks, sticky behavior, stored content, and model-facing content SHALL remain unchanged

#### Scenario: Preserve ordinary bracketed text and comparison rendering

- **WHEN** submitted text contains a non-chip bracketed span or the same prompt is rendered through `a1 pi`
- **THEN** ordinary Markdown wrapping or pinned comparison rendering SHALL remain unchanged

## REMOVED Requirements

### Requirement: Submitted prompts carry their source timestamp
**Reason**: Submitted-prompt timestamps and the `Time format` setting are removed; the transcript shows no clock or timestamp.

**Migration**: None. Source timestamps remain in the Pi session file.

### Requirement: The governing submitted prompt remains pinned while scrolling
**Reason**: Replaced by "The governing submitted prompt remains pinned while scrolling without a timestamp", which drops every timestamp clause.

**Migration**: None.
