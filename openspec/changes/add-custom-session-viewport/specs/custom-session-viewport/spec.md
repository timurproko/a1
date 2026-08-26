## Purpose

Defines bare A1's bounded single-agent transcript viewport, stable bottom dock, follow-tail navigation, scroll-to-bottom control, and timestamped sticky submitted prompts.

## ADDED Requirements

### Requirement: Bare A1 uses a fixed fullscreen terminal surface
Bare A1 SHALL run the custom session viewport in fullscreen mode regardless of Pi's stored `tuiMode`. The owned settings screen SHALL omit `tuiMode` because it is not variable on this surface. The pinned `a1 pi` comparison profile SHALL continue to honor its existing mode policy.

#### Scenario: Start bare A1 with regular mode stored
- **WHEN** Pi's stored TUI mode is `regular` and bare A1 starts
- **THEN** the custom session viewport SHALL still use fullscreen mode
- **AND** the settings screen SHALL not offer a TUI mode row

### Requirement: The transcript occupies a bounded viewport above a pinned dock
Bare A1 SHALL render the session transcript inside the terminal rows above a bottom dock. The dock SHALL contain the existing queued-input surface, working status, above-editor widgets, active input surface, below-editor widgets, and footer in their existing relative order. Docking SHALL change placement only: this milestone SHALL NOT change the content, style, lifecycle, or extension contribution rules of those surfaces.

The complete frame SHALL remain within the current terminal width and height. A changing editor, widget, status, footer, or terminal size SHALL cause the transcript viewport to be reallocated rather than allowing the dock to scroll away.

#### Scenario: Launch with built-in startup help and resources
- **WHEN** bare A1 first renders the custom viewport
- **THEN** it SHALL omit Pi's version/help introduction, documentation suggestion, and loaded-resource inventory
- **AND** pinned comparison profiles SHALL retain their existing startup presentation

#### Scenario: Transcript exceeds the terminal
- **WHEN** transcript content is taller than the rows available above the dock
- **THEN** only the transcript viewport SHALL scroll
- **AND** the active input surface, working status where present, and footer SHALL remain at the bottom in their existing order

#### Scenario: Dock height changes
- **WHEN** the editor wraps, a queued-input row or widget appears, a selector replaces the editor, or the footer changes height
- **THEN** the transcript viewport SHALL give or reclaim rows for the dock
- **AND** no dock row SHALL be appended to transcript history

#### Scenario: Queue steering while the agent works
- **WHEN** the reader submits steering messages during an active run
- **THEN** Pi's accepted current steering message SHALL appear through its normal user-message event
- **AND** later pending messages SHALL render as `Steering:` rows followed by `↳ Alt+Up to edit all queued messages`
- **AND** the pending rows SHALL remain immediately before `Working` in Pi's existing order while the queue is nonempty

#### Scenario: Status rendering is unchanged
- **WHEN** the working status or footer is rendered inside the dock
- **THEN** its text, color, spacing, animation, extension statuses, and lifecycle SHALL be the same as before this customization

#### Scenario: Resize the terminal
- **WHEN** the terminal width or height changes
- **THEN** the frame SHALL be recomputed within the new dimensions
- **AND** the dock SHALL remain pinned while transcript wrapping, viewport height, scrollbar geometry, and hit regions update to the new size

### Requirement: Transcript scrolling has explicit follow and detached states
The viewport SHALL begin by following the end of the transcript. A scroll away from the end SHALL detach the viewport and preserve the visible transcript position while new content is appended. Reaching the end, submitting a prompt, or activating the scroll-to-bottom control SHALL restore end following. Scrolling SHALL clamp at the first and last transcript rows without wrapping.

#### Scenario: Stream while following
- **WHEN** transcript rows are appended while the viewport follows the end
- **THEN** the viewport SHALL advance so the newest row remains visible above the dock

#### Scenario: Scroll away from the end
- **WHEN** the reader scrolls upward from the followed end
- **THEN** the viewport SHALL enter the detached state
- **AND** subsequently appended assistant, thinking, or tool rows SHALL NOT move the visible transcript position

#### Scenario: Return to the end by scrolling
- **WHEN** a detached viewport is scrolled to its maximum position
- **THEN** it SHALL resume following subsequent transcript output

#### Scenario: Submit from a detached view
- **WHEN** the reader submits a prompt while the viewport is detached
- **THEN** the submitted prompt SHALL be accepted through the existing input workflow
- **AND** the viewport SHALL return to the transcript end

#### Scenario: Scroll beyond an edge
- **WHEN** scrolling requests a position before the first row or after the last row
- **THEN** the viewport SHALL stop at that edge and SHALL NOT wrap or corrupt its follow state

### Requirement: A detached viewport exposes a scroll-to-bottom control
When overflowing transcript content is detached from its end, the viewport SHALL draw one scroll-to-bottom control floating over the final visible transcript row. The control SHALL NOT consume a row or move transcript text outside the viewport. It SHALL have normal and pointed-at presentation states, SHALL activate only from its own hit region, and SHALL disappear as soon as end following resumes or content ceases to overflow.

#### Scenario: Detach from overflowing content
- **WHEN** the transcript overflows and the reader scrolls away from its end
- **THEN** one scroll-to-bottom control SHALL appear at the bottom of the transcript viewport

#### Scenario: Activate the control
- **WHEN** the pointer activates the scroll-to-bottom control
- **THEN** the viewport SHALL move to the end and resume following
- **AND** the control SHALL disappear

#### Scenario: Point outside the control
- **WHEN** a pointer press lands on transcript content outside the control's hit region
- **THEN** the control SHALL NOT activate
- **AND** ordinary transcript pointer handling SHALL remain available

#### Scenario: Content fits
- **WHEN** all transcript content fits above the dock
- **THEN** no scroll-to-bottom control SHALL be drawn

### Requirement: Submitted prompts carry their source timestamp
A submitted user prompt SHALL render its source timestamp as local 24-hour `HH:mm` time, right-aligned on the prompt's first row when the row has enough width for the prompt prefix, useful prompt content, a separating margin, and the timestamp. Continuation rows SHALL align beneath the prompt text rather than beneath the prompt prefix. The timestamp is transcript metadata; the live input surface SHALL NOT gain a clock or timestamp from this milestone.

#### Scenario: Render a submitted prompt
- **WHEN** a user transcript block has a valid source timestamp and sufficient width
- **THEN** its first row SHALL show that timestamp right-aligned as `HH:mm`
- **AND** the prompt text SHALL remain complete across its wrapped rows

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
When the first row of the most recent submitted user prompt at or before the viewport start has scrolled above the viewport, a copy of that first row SHALL occupy the viewport's first row without adding to the document's row count. The copy SHALL preserve the prompt prefix, content, background, and timestamp from the source row. It SHALL remain prominent while any continuation row of that prompt is visible and SHALL use the quiet theme role after the complete prompt is above the viewport. Activating it SHALL return the viewport to the source prompt.

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
- **THEN** the viewport SHALL jump to the source of its governing pinned prompt
- **AND** each repeated press SHALL jump to the preceding semantic submitted prompt
- **AND** reaching the earliest prompt SHALL scroll to the document beginning so its one opening breathing row is visible above it
- **AND** further presses SHALL keep that document-opening position

#### Scenario: Prompt first row is naturally visible
- **WHEN** the governing prompt's source first row is already the viewport's first row
- **THEN** no duplicate sticky row SHALL be added

### Requirement: Viewport pointer handling preserves unrelated input
The viewport SHALL claim wheel events used to scroll its transcript and pointer events addressed to its scrollbar, scroll-to-bottom control, pinned prompt, or active transcript selection. It SHALL leave unrelated keyboard and pointer input to the focused surface. An active selector, dialog, overlay, or replacement input that owns an event SHALL retain that ownership. Engine events SHALL be delivered cooperatively so terminal input receives an event-loop turn between transcript updates.

#### Scenario: Scroll the transcript with the wheel
- **WHEN** a wheel event is addressed to the transcript viewport while the ordinary editor owns focus
- **THEN** the transcript SHALL scroll and the wheel sequence SHALL NOT be inserted into the editor

#### Scenario: Select ordinary transcript text
- **WHEN** a pointer drag starts outside every viewport control hit region
- **THEN** the viewport SHALL NOT treat it as a scrollbar or navigation action
- **AND** the existing transcript selection behavior SHALL remain available

#### Scenario: Select while the agent is active
- **WHEN** agent operations produce a sustained burst of transcript or lifecycle events during a pointer selection
- **THEN** event delivery SHALL yield between updates so pointer reports, editor input, and animation timers continue to run
- **AND** selection drags, content-area wheel scrolling, scrollbar interaction, and the jump-to-bottom control SHALL remain responsive
- **AND** an active selection SHALL continue through intermediate no-button motion reports until release

#### Scenario: Paint selected transcript text
- **WHEN** transcript text is selected
- **THEN** selection SHALL add the declared dark-blue background only
- **AND** every source foreground color, link, bold, italic, and underline attribute SHALL remain unchanged
- **AND** whole and interior selected rows SHALL paint through the final terminal column while any visible scrollbar glyph remains above the selection background

#### Scenario: Hold an active selection beyond a viewport edge
- **WHEN** the pointer remains above or below the transcript viewport during an active selection
- **THEN** at `normal` scrollbar speed the transcript SHALL auto-scroll exactly one row every 30 milliseconds without requiring new motion reports
- **AND** at `fast` scrollbar speed it SHALL auto-scroll exactly two rows every 30 milliseconds
- **AND** at `high` scrollbar speed it SHALL auto-scroll exactly three rows every 30 milliseconds
- **AND** additional edge-motion reports SHALL update the pointer endpoint without adding unscheduled scroll rows
- **AND** the selection endpoint SHALL extend with each scrolled row
- **AND** auto-scroll SHALL stop on release, re-entry, reset, or the document boundary

#### Scenario: Begin a drag on dock chrome
- **WHEN** a left-button sequence begins on working status, an input prompt row, a widget, or the footer
- **THEN** the complete sequence SHALL be consumed without creating transcript or fullscreen selection
- **AND** none of those dock rows SHALL receive selection painting

#### Scenario: A modal surface owns input
- **WHEN** a selector, dialog, overlay, or replacement input owns an event that is not addressed to a visible viewport control
- **THEN** the viewport SHALL leave the event to that active surface

#### Scenario: Viewport closes during a drag
- **WHEN** the session is replaced, stopped, or disposed while a viewport control is hovered or dragged
- **THEN** its transient pointer state SHALL be cleared and the terminal SHALL be restored

### Requirement: The custom viewport is scoped to bare A1
The custom session viewport SHALL be a declared A1 layout customization enabled for bare `a1`. The `a1 pi` profiles SHALL continue to present the pinned comparison layout without the A1 scrollbar settings, scroll-to-bottom control, timestamped A1 prompt bar, or sticky A1 prompt row.

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
