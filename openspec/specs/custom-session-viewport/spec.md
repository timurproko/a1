# custom-session-viewport Specification

## Purpose
Defines bare A1's bounded single-agent transcript viewport, stable bottom dock, follow-tail navigation, scroll-to-bottom control, and timestamped sticky submitted prompts.

## Requirements

### Requirement: Bare A1 uses a fixed fullscreen terminal surface
Bare A1 SHALL run the custom session viewport in fullscreen mode regardless of Pi's stored `tuiMode`. The owned settings screen SHALL omit `tuiMode` because it is not variable on this surface. The pinned `a1 pi` comparison profile SHALL continue to honor its existing mode policy.

#### Scenario: Start bare A1 with regular mode stored
- **WHEN** Pi's stored TUI mode is `regular` and bare A1 starts
- **THEN** the custom session viewport SHALL still use fullscreen mode
- **AND** the settings screen SHALL not offer a TUI mode row

### Requirement: The transcript occupies a bounded viewport above a pinned dock
Bare A1 SHALL render the session transcript and its transient working-status tail inside the terminal rows above a bottom dock. The dock SHALL contain the existing queued-input surface, non-working status messages, above-editor widgets, active input surface, below-editor widgets, and footer in their existing relative order. The live working-status surface SHALL belong to the scrollable tail rather than the dock. This declared bare-A1 layout difference SHALL change placement only, preserving the content, style, lifecycle, and extension contribution rules of these surfaces.

The complete frame SHALL remain within the current terminal width and height. A changing editor, dock widget, queued-input surface, footer, or terminal size SHALL cause the transcript viewport to be reallocated rather than allowing the dock to scroll away. A working-status height change SHALL change scrollable tail extent, not dock allocation.

#### Scenario: Launch with built-in startup help and resources
- **WHEN** bare A1 first renders the custom viewport
- **THEN** it SHALL omit Pi's version/help introduction, documentation suggestion, and loaded-resource inventory
- **AND** pinned comparison profiles SHALL retain their existing startup presentation

#### Scenario: Transcript exceeds the terminal
- **WHEN** transcript content and its live working-status tail are taller than the rows available above the dock
- **THEN** only the transcript viewport, including the working-status tail, SHALL scroll
- **AND** the active input surface and footer SHALL remain at the bottom in their existing order

#### Scenario: Dock height changes
- **WHEN** the editor wraps, a queued-input row or widget appears, a selector replaces the editor, or the footer changes height
- **THEN** the transcript viewport SHALL give or reclaim rows for the dock
- **AND** no dock row SHALL be appended to transcript history

#### Scenario: Queue steering while the agent works
- **WHEN** the reader submits steering messages during an active run
- **THEN** Pi's accepted current steering message SHALL appear through its normal user-message event
- **AND** later pending messages SHALL render as `Steering:` rows followed by `↳ Alt+Up to edit all queued messages`
- **AND** those pending rows SHALL remain in the pinned dock ahead of the above-editor widgets and input surface while the queue is nonempty
- **AND** the working-status tail SHALL scroll independently of those pending rows

#### Scenario: Status rendering is unchanged
- **WHEN** the working status is rendered in the scrollable tail or the footer is rendered inside the dock
- **THEN** its text, color, spacing, animation, extension statuses, and lifecycle SHALL be the same as before this customization

#### Scenario: Resize the terminal
- **WHEN** the terminal width or height changes
- **THEN** the frame SHALL be recomputed within the new dimensions
- **AND** the dock SHALL remain pinned while transcript and working-status wrapping, viewport height, scrollbar geometry, and hit regions update to the new size

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

The visible control SHALL use its pointed-at presentation exactly when the latest known terminal pointer position is inside its current hit region. The first frame that reveals the control or changes its hit region SHALL reflect that position without requiring a new mouse-motion report. Coordinate-bearing mouse reports delivered to viewport pointer handling, including wheel, press, release, and motion reports, SHALL update the known pointer position without changing existing event ownership or activation rules. Hiding the control SHALL NOT discard that position; the existing pointer-state reset and session teardown lifecycle SHALL clear it. With no known pointer position, the control SHALL use its normal presentation.

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

#### Scenario: Reveal beneath a stationary cursor
- **WHEN** the reader scrolls to the end so the control disappears and then scrolls away without moving the cursor from a position inside the control's reappearing hit region
- **THEN** the first frame showing the control SHALL use its pointed-at presentation
- **AND** repeated hide-and-reveal cycles SHALL behave identically without an intervening mouse-motion report

#### Scenario: Wheel coordinates establish the cursor position
- **WHEN** no mouse-motion report has established a position and a wheel report detaches the viewport with coordinates inside the newly visible control
- **THEN** that first visible frame SHALL use the pointed-at presentation
- **AND** the wheel report SHALL only scroll rather than activate the control

#### Scenario: Update position while the control is hidden
- **WHEN** the control is hidden, a coordinate-bearing mouse report updates the cursor to a position outside its next hit region, and scrolling or keyboard navigation subsequently reveals it
- **THEN** the control SHALL use its normal presentation rather than retaining an earlier hover state

#### Scenario: Reveal through keyboard navigation
- **WHEN** keyboard navigation reveals the control and the latest known cursor position lies inside its current hit region
- **THEN** the first visible frame SHALL use its pointed-at presentation without an additional mouse report

#### Scenario: Recompute hover when the hit region changes
- **WHEN** terminal size, dock allocation, or the new-message label changes the visible control's hit region without mouse movement
- **THEN** the same frame SHALL use pointed-at presentation if the latest known cursor position is inside the new region and normal presentation otherwise
- **AND** a stale hit region SHALL NOT determine hover or subsequent activation

#### Scenario: No known cursor position after reset
- **WHEN** the viewport has received no pointer position or its pointer state has been reset and the control is shown before another coordinate-bearing mouse report
- **THEN** the control SHALL use its normal presentation
- **AND** pointer coordinates from a previous session SHALL NOT restore hover

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

#### Scenario: Render ordinary content through the rail overlay column
- **WHEN** an ordinary transcript row reaches the right edge in `always` or `auto` scrollbar mode
- **THEN** its wrapping width SHALL include the final terminal column
- **AND** a visible scrollbar SHALL overlay that column rather than permanently removing one content cell
- **AND** submitted prompt rows SHALL retain their intentional blank rail cell after a fitting timestamp

#### Scenario: Double-click at the final reserved cell
- **WHEN** a double-click selects trailing whitespace that reaches the transcript content edge
- **THEN** the selection background SHALL continue through the final terminal column, including the reserved scrollbar cell
- **AND** copied text SHALL remain the semantic selected content without appended padding
- **AND** any visible scrollbar glyph SHALL remain painted above that background

#### Scenario: Double-click a full-width content run
- **WHEN** a double-click selects a word or other non-whitespace run that ends beside the final empty cell
- **THEN** the selection background SHALL end with the content and SHALL NOT include that empty cell
- **AND** if the selection subsequently continues onto another row, every completed interior row SHALL paint through the final terminal column

#### Scenario: Hold an active selection beyond a viewport edge
- **WHEN** the pointer remains above or below the transcript viewport during an active selection
- **THEN** at `normal` scrollbar speed the transcript SHALL auto-scroll exactly one row every 30 milliseconds without requiring new motion reports
- **AND** at `fast` scrollbar speed it SHALL auto-scroll exactly two rows every 30 milliseconds
- **AND** at `high` scrollbar speed it SHALL auto-scroll exactly three rows every 30 milliseconds
- **AND** additional edge-motion reports SHALL update the pointer endpoint without adding unscheduled scroll rows
- **AND** the selection endpoint SHALL extend with each scrolled row
- **AND** auto-scroll SHALL stop on release, re-entry, reset, or the document boundary

#### Scenario: Begin a drag on dock chrome
- **WHEN** a left-button sequence begins on the transient working-status tail, an input prompt row, a widget, or the footer outside a viewport control hit region
- **THEN** the complete sequence SHALL be consumed without creating transcript or fullscreen selection
- **AND** neither the working-status tail nor dock chrome SHALL receive transcript selection painting

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

### Requirement: Keyboard-driven dock frames preserve stable viewport work
After a custom-viewport frame is established, a keyboard action whose semantic and geometric effects are confined to the active dock SHALL reuse the unchanged transcript document and visible viewport result. Its A1-owned transcript and viewport composition work SHALL be proportional to the changed dock or input rows rather than to settled transcript size, and its terminal paint SHALL NOT clear or rewrite unchanged transcript rows.

A keyboard action that changes dock height, transcript position, selection, overlay ownership, terminal geometry, or any input needed to prove viewport reuse safe SHALL recompute the affected geometry and rows conservatively. Reuse SHALL preserve the accepted transcript text, ANSI styling, links, selection, scrollbar, sticky prompt, hit regions, focus, cursor, dock ordering, auto-scroll, and terminal-restoration behavior.

#### Scenario: Type without changing editor height
- **WHEN** ordinary typing, deletion, or cursor movement changes the editor but leaves dock geometry unchanged
- **THEN** the established visible transcript rows and viewport geometry SHALL be reused
- **AND** no settled transcript block SHALL be rendered again
- **AND** terminal paint SHALL remain confined to changed dock or cursor rows

#### Scenario: Navigate a fixed-height menu
- **WHEN** repeated keyboard navigation changes only the selected row of a fixed-height selector, menu, dialog, or replacement input surface
- **THEN** stable transcript rows SHALL remain reused and unpainted
- **AND** A1-owned transcript composition and changed-row terminal paint SHALL be bounded by the active surface rather than by transcript length
- **AND** conservative replacement-surface safety SHALL continue to prohibit uncertain scroll or damage transformations

#### Scenario: Change dock geometry
- **WHEN** an editor wraps, autocomplete opens or closes, a menu changes height, queued input appears, a widget changes, or another keyboard action changes dock allocation
- **THEN** the viewport SHALL recompute the transcript and dock geometry needed for the new frame
- **AND** the frame SHALL remain within terminal bounds with the dock pinned and focus and cursor preserved
- **AND** reuse SHALL resume only after the new geometry is established

#### Scenario: Clear an active transcript interaction with keyboard input
- **WHEN** keyboard input clears or changes transcript selection, detached navigation, a sticky control, hover-dependent presentation, or another viewport-owned state
- **THEN** the affected viewport rows and metadata SHALL be recomputed and painted
- **AND** unaffected transcript blocks and rows SHALL retain their cached results

#### Scenario: Encounter uncertain frame safety
- **WHEN** resize, overlay, image content, stale metadata, unsupported terminal capability, unknown rendered grammar, or another uncertain condition prevents safe bounded presentation
- **THEN** the custom viewport SHALL discard the unsafe reuse decision and use its existing conservative rendering path
- **AND** input ordering, current-state presentation, terminal contents, and restoration SHALL remain correct

#### Scenario: Type into a long settled session
- **WHEN** the reader edits the dock input while the visible viewport represents a long settled transcript
- **THEN** each keyboard-driven frame SHALL perform the same bounded viewport and transcript work as the equivalent frame over an empty settled transcript
- **AND** increasing settled transcript length SHALL NOT increase per-key rendering or paint work

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

### Requirement: Working status is a transient scrollable tail
Bare A1 SHALL place its live working-status surface, including status-owned blank spacing and retry, compaction, or extension working replacements, after the current transcript content inside the scrollable viewport. It SHALL have this ownership whether content fits or overflows. It SHALL NOT be pinned, duplicated in the dock, converted into persisted conversation content, counted as a completed assistant message, or treated as a submitted prompt. Only viewport-visible status rows SHALL be painted; scrolling away SHALL NOT terminate the underlying work or stop its lifecycle updates.

The tail SHALL contribute to scroll extent, scrollbar geometry, and end-following navigation while present. While detached, new transcript output and status animation or replacement SHALL preserve the current transcript position unless the new extent requires clamping to a valid scroll position. Removing the tail SHALL remove its status-owned spacing and leave no stale copy. Idle informational and failure messages SHALL retain their existing placement; only live working-state presentation SHALL move to this tail. The pinned `a1 pi` route SHALL retain its existing presentation and behavior.

#### Scenario: Scroll the active indicator out of view
- **WHEN** a long transcript is following its tail with `Working...` visible and the reader scrolls toward older content
- **THEN** the indicator SHALL move with the scrollable content and disappear once its rows leave the viewport
- **AND** no pinned copy or reserved dock space for the working status SHALL remain
- **AND** the editor and footer SHALL stay pinned

#### Scenario: Return to active work
- **WHEN** the reader scrolls to the end, presses End, or activates jump-to-bottom while work remains active
- **THEN** the viewport SHALL follow the complete current tail, including the working status
- **AND** the status SHALL be visible to the extent allowed by the viewport height
- **AND** the jump-to-bottom control SHALL disappear as following resumes

#### Scenario: Cross the fit boundary
- **WHEN** growing or shrinking transcript content causes the transcript plus working-status tail to cross the fit/overflow boundary
- **THEN** the status SHALL remain in the scrollable tail without moving between dock and transcript regions
- **AND** every frame SHALL paint exactly the visible portion of that one status surface, without a duplicate or a dropped visible status
- **AND** the editor/footer position SHALL NOT change solely because of that boundary crossing

#### Scenario: Update status while detached
- **WHEN** working animation ticks, the status is replaced by retry, compaction, or extension working content, or the status changes height while the reader is detached
- **THEN** the reader's transcript position SHALL remain unchanged whenever it is still a valid scroll position
- **AND** the newest status SHALL appear at the tail if the reader returns while it remains active
- **AND** an off-screen status update SHALL NOT paint a pinned indicator over the visible transcript or dock

#### Scenario: Finish work while detached
- **WHEN** the lifecycle removes the working status while the reader is away from the tail
- **THEN** the status and its owned spacing SHALL disappear from scroll extent without leaving historical or pinned remnants
- **AND** the viewport SHALL preserve the current transcript position when valid, otherwise clamp to the new end and resume following there
- **AND** returning to the end SHALL NOT resurrect the finished indicator

#### Scenario: Copy near the live tail
- **WHEN** a transcript selection is extended into or across visible working-status rows and copied
- **THEN** copied content SHALL include only selected transcript content, excluding the status text, spinner, and status-owned blank spacing
- **AND** no transcript highlight SHALL be applied to the status rows

#### Scenario: Keep queue and editor behavior independent
- **WHEN** pending input, widgets, a replacement input, or a footer update is present while the working status scrolls out of view
- **THEN** those dock surfaces SHALL retain their established lifecycle, focus, and input handling
- **AND** queued input SHALL remain docked rather than following the working status into the scrollable tail

#### Scenario: Reset or replace the session
- **WHEN** a session is reset, replaced, or disposed while a working-status tail is visible or off-screen
- **THEN** no status rows, status-owned scroll extent, pointer suppression, or stale status painting from that session SHALL survive into the next session
