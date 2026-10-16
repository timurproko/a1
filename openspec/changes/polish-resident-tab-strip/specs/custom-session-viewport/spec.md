# custom-session-viewport Delta

## MODIFIED Requirements

### Requirement: Submitted prompts carry their source timestamp
A submitted user prompt SHALL render its source timestamp as local time in the active owned `timeFormat`: zero-padded 24-hour `HH:mm` for `20:00`, or 12-hour `h:mm AM`/`h:mm PM` with uppercase suffix for `8:00 PM`. It SHALL be right-aligned on the prompt's first row when the row has enough width for the prompt prefix, useful prompt content, a separating margin, and the timestamp. Continuation rows SHALL align beneath the prompt text rather than beneath the prompt prefix. The timestamp is transcript metadata; the live input surface SHALL NOT gain a clock or timestamp from this milestone.

Whenever it is rendered, the timestamp SHALL use the grey metadata foreground at normal intensity. Its foreground and intensity SHALL remain unchanged when the source prompt is normal, hovered, quiet/dimmed, text-selected, or otherwise repainted; selection MAY still change the timestamp background together with the selected range. Prompt-body styling SHALL remain independent of this timestamp rule.

#### Scenario: Render a submitted prompt
- **WHEN** a user transcript block has a valid source timestamp and sufficient width
- **THEN** its first row SHALL show that timestamp right-aligned in the active owned time format
- **AND** the timestamp SHALL use the grey metadata foreground at normal intensity
- **AND** the prompt text SHALL remain complete across its wrapped rows

#### Scenario: Change the format while the prompt is visible
- **WHEN** the user changes `Time format` while a submitted prompt timestamp is visible
- **THEN** the prompt timestamp SHALL repaint in the accepted format without restarting the session
- **AND** its source instant, metadata style, alignment, and prompt content SHALL remain unchanged

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
