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
Bare A1 SHALL render the session transcript, pending steering presentation, and live working-status surface inside the terminal rows above a bottom dock. The dock SHALL contain non-working status messages, above-editor widgets, the active input surface, below-editor widgets, and the footer in their existing relative order. Pending `Steering:` rows and their edit hint SHALL belong to non-persistent, non-selectable scrollable viewport content rather than the dock. The live working-status surface SHALL belong to that viewport content rather than the dock and SHALL be bottom-aligned immediately above the dock while all content fits. This declared bare-A1 layout difference SHALL change placement only, preserving the content, style, lifecycle, and extension contribution rules of these surfaces.

The complete frame SHALL remain within the current terminal width and height. A changing editor, dock widget, footer, or terminal size SHALL cause the transcript viewport to be reallocated rather than allowing the dock to scroll away. A pending-steering or working-status height change SHALL change transient viewport extent, not dock allocation. While content fits, the working status SHALL consume otherwise unused viewport space rather than displacing visible transcript or moving the editor/footer group.

#### Scenario: Launch with built-in startup help and resources
- **WHEN** bare A1 first renders the custom viewport
- **THEN** it SHALL omit Pi's version/help introduction, documentation suggestion, and loaded-resource inventory
- **AND** pinned comparison profiles SHALL retain their existing startup presentation

#### Scenario: Transcript exceeds the terminal
- **WHEN** transcript content and its transient steering and working surfaces are taller than the rows available above the dock
- **THEN** only the transcript viewport, including those transient surfaces, SHALL scroll
- **AND** the active input surface and footer SHALL remain at the bottom in their existing order

#### Scenario: Dock height changes
- **WHEN** the editor wraps, a widget appears, a selector replaces the editor, or the footer changes height
- **THEN** the transcript viewport SHALL give or reclaim rows for the dock
- **AND** no dock row SHALL be appended to transcript history

#### Scenario: Queue steering while the agent works
- **WHEN** the reader submits steering messages during an active run
- **THEN** Pi's accepted current steering message SHALL appear through its normal user-message event
- **AND** later pending messages SHALL render as `Steering:` rows followed by `↳ Alt+Up to edit all queued messages`
- **AND** those pending rows SHALL appear after semantic transcript content as non-persistent, non-selectable viewport rows while the queue is nonempty
- **AND** scrolling toward older content SHALL be able to move both pending steering and working-status rows out of view
- **AND** the editor, widgets, and footer SHALL remain pinned

#### Scenario: Status rendering is unchanged
- **WHEN** the working status is rendered in the viewport or the footer is rendered inside the dock
- **THEN** its text, color, spacing, animation, extension statuses, and lifecycle SHALL be the same as before this customization

#### Scenario: Resize the terminal
- **WHEN** the terminal width or height changes
- **THEN** the frame SHALL be recomputed within the new dimensions
- **AND** the dock SHALL remain pinned while transcript, steering, and working-status wrapping, viewport height, scrollbar geometry, and hit regions update to the new size

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

The control SHALL display `Jump to bottom (Ctrl+End) ↓` when there are no newly counted messages, `1 new message (Ctrl+End) ↓` for one, and `N new messages (Ctrl+End) ↓` for multiple, with `N` replaced by the existing message count. The trailing arrow SHALL be the text glyph `↓` (U+2193), separated from the shortcut hint by one space. Existing surrounding padding, block styling, placement, message-count semantics, and click behavior SHALL remain unchanged. The complete visible label, including the arrow, SHALL belong to the same hover and click target. When a counted label does not fit, the existing generic-label fallback SHALL use the new shortcut hint and arrow; if that complete padded generic label also does not fit, the control SHALL remain omitted without leaving an invisible hit region or overflowing the terminal.

The visible control SHALL use its pointed-at presentation exactly when the latest known terminal pointer position is inside its current hit region. The first frame that reveals the control or changes its hit region SHALL reflect that position without requiring a new mouse-motion report. Coordinate-bearing mouse reports delivered to viewport pointer handling, including wheel, press, release, and motion reports, SHALL update the known pointer position without changing existing event ownership or activation rules. Hiding the control SHALL NOT discard that position; the existing pointer-state reset and session teardown lifecycle SHALL clear it. With no known pointer position, the control SHALL use its normal presentation.

A pointer report that changes the visible control's pointed-at state SHALL make that feedback eligible through the existing input presentation path without waiting for the streamed-content presentation deadline. The first presentation composed after the report SHALL use the latest applied pointer position and current control geometry, including when editor input, wheel navigation, status animation, or streamed output has already scheduled a presentation. Superseded intermediate pointer positions need not be painted, but a later cached or streaming frame SHALL NOT restore an older hover, visibility, or hit region. Pointer reports received after a composition begins SHALL remain eligible for the next input presentation rather than being acknowledged by an older frame.

#### Scenario: Detach from overflowing content
- **WHEN** the transcript overflows and the reader scrolls away from its end
- **THEN** one scroll-to-bottom control SHALL appear at the bottom of the transcript viewport when its complete label fits

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
- **THEN** that first visible frame SHALL use its pointed-at presentation
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

#### Scenario: Enter or leave while an editor frame is pending
- **WHEN** same-height editor input has scheduled a presentation and a subsequent pointer report enters or leaves the visible control before composition
- **THEN** the first resulting terminal presentation SHALL contain both the newest editor state and the correct pointed-at or normal control appearance
- **AND** no additional mouse movement, spinner tick, stream update, or corrective render SHALL be required to repair that frame

#### Scenario: Scroll and hover during streaming without editing
- **WHEN** assistant or tool output continues, the reader detaches using the wheel, and terminal reports move the pointer into and out of the visible control without any editor input
- **THEN** each next input presentation SHALL show the latest hover state against the current control bounds
- **AND** ordinary streamed growth SHALL preserve a still-valid detached reading position and SHALL NOT overwrite the hover feedback

#### Scenario: Several reports precede one presentation
- **WHEN** wheel and pointer reports update control visibility and hover more than once before composition
- **THEN** the next presentation SHALL reflect the last applied state, not an earlier position or visibility
- **AND** every wheel action SHALL retain its ordered scrolling effect without activating the control

#### Scenario: Complete output while hover is pending
- **WHEN** output completion changes the new-message label or removes transient working rows after a pointer update but before presentation
- **THEN** the first presentation SHALL use the completed content, current control geometry, and latest pointer position together
- **AND** a previously pending stream frame SHALL NOT restore an obsolete label, hover, or visibility

#### Scenario: Render the generic and counted labels
- **WHEN** the detached control is rendered with zero, one, or multiple newly counted messages and the applicable label fits
- **THEN** its text SHALL be `Jump to bottom (Ctrl+End) ↓`, `1 new message (Ctrl+End) ↓`, or `N new messages (Ctrl+End) ↓` respectively
- **AND** both normal and pointed-at states SHALL retain the same shortcut hint and trailing arrow

#### Scenario: Hover and click the arrow
- **WHEN** the pointer is over the trailing `↓` of the visible control
- **THEN** the block SHALL use its pointed-at presentation
- **AND** clicking the arrow SHALL activate the same jump-to-bottom action as clicking the label text

#### Scenario: Fit a narrow terminal
- **WHEN** the full counted label exceeds the available width
- **THEN** the control SHALL use `Jump to bottom (Ctrl+End) ↓` if its complete padded label fits
- **AND** otherwise neither the control nor its hit region SHALL be present
- **AND** no label or arrow SHALL wrap, exceed terminal width, or reserve an extra row

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

### Requirement: Viewport pointer handling preserves unrelated input
The viewport SHALL claim wheel events addressed to exposed transcript content and pointer events addressed to its exposed scrollbar, scroll-to-bottom control, pinned prompt, or transcript selection, whether the ordinary editor or any modal surface has focus. It SHALL leave unrelated keyboard and pointer input to the focused surface. Modal ownership SHALL be resolved from visible surface geometry and an active gesture's owner rather than from the presence of a modal alone. A selector, dialog, overlay, or replacement input SHALL retain events beginning within its own visible bounds; covered transcript cells SHALL NOT accept new background interactions. Engine events SHALL be delivered cooperatively so terminal input receives an event-loop turn between transcript updates.

#### Scenario: Scroll the transcript with the wheel
- **WHEN** a wheel event is addressed to exposed transcript content while the ordinary editor or a modal owns focus
- **THEN** the transcript SHALL scroll and the wheel sequence SHALL NOT be inserted into or navigate the focused input surface

#### Scenario: Select ordinary transcript text
- **WHEN** a pointer drag starts on exposed transcript text outside every viewport control hit region
- **THEN** the viewport SHALL NOT treat it as a scrollbar or navigation action
- **AND** A1's custom transcript selection behavior SHALL remain available even while a modal has focus

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
- **WHEN** a left-button sequence begins on the transient working-status tail, an ordinary input prompt row, a widget, or the footer outside a viewport control hit region and outside a modal-owned region
- **THEN** the complete sequence SHALL be consumed without creating transcript or fullscreen selection
- **AND** neither the working-status tail nor dock chrome SHALL receive transcript selection painting

#### Scenario: A modal surface owns input
- **WHEN** a new pointer interaction begins inside a selector, dialog, overlay, or replacement input, or unrelated keyboard input is addressed to that surface
- **THEN** the viewport SHALL leave the event to that active surface
- **AND** the mere presence of that surface SHALL NOT transfer ownership of exposed transcript content to it

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
After a custom-viewport frame is established, a keyboard action whose semantic and geometric effects are confined to the active dock SHALL reuse the unchanged transcript and transient viewport result. Its A1-owned transcript and viewport composition work SHALL be proportional to the changed dock or input rows rather than to settled transcript size, and its terminal paint SHALL NOT clear or rewrite unchanged viewport rows.

A keyboard action that changes dock height, transcript or transient-tail content, transcript position, selection, overlay ownership, terminal geometry, or any input needed to prove viewport reuse safe SHALL recompute the affected geometry and rows conservatively. Reuse SHALL preserve the accepted transcript text, transient steering and working placement, ANSI styling, links, selection, scrollbar, sticky prompt, hit regions, focus, cursor, dock ordering, auto-scroll, and terminal-restoration behavior.

Eligibility established when keyboard input arrives SHALL NOT authorize reuse after an intervening viewport-affecting event. At presentation composition, reused viewport output SHALL still represent the current interaction, document, transient content, geometry, and input ownership. A frame that reuses older output SHALL NOT claim that newer state was presented. Rejecting stale reuse SHALL preserve valid settled-block caches, and ordinary typing with no viewport-affecting change SHALL retain the bounded dock-only behavior.

#### Scenario: Type without changing editor height
- **WHEN** ordinary typing, deletion, or cursor movement changes the editor but leaves dock and transient viewport geometry unchanged
- **THEN** the established visible viewport rows and geometry SHALL be reused
- **AND** no settled transcript block SHALL be rendered again
- **AND** terminal paint SHALL remain confined to changed dock or cursor rows

#### Scenario: Navigate a fixed-height menu
- **WHEN** repeated keyboard navigation changes only the selected row of a fixed-height selector, menu, dialog, or replacement input surface
- **THEN** stable viewport rows SHALL remain reused and unpainted
- **AND** A1-owned transcript composition and changed-row terminal paint SHALL be bounded by the active surface rather than by transcript length
- **AND** conservative replacement-surface safety SHALL continue to prohibit uncertain scroll or damage transformations

#### Scenario: Change dock geometry
- **WHEN** an editor wraps, autocomplete opens or closes, a menu changes height, a widget changes, or another keyboard action changes dock allocation
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

#### Scenario: A viewport event invalidates pending dock-only work
- **WHEN** editor input is followed before composition by a pointer transition, scrolling, selection change, or pointer-state reset that affects the viewport
- **THEN** the first resulting frame SHALL recompute the affected viewport output from current state rather than reuse the pre-event control or hit regions
- **AND** a subsequent same-height editor update SHALL NOT perpetuate stale output by treating it as already current

#### Scenario: Content changes between editor input and composition
- **WHEN** transcript or transient content changes after a same-height editor input and before its presentation, even if terminal and dock dimensions remain unchanged
- **THEN** the next frame SHALL contain the newest visible content and control geometry together with the newest input state
- **AND** reuse SHALL NOT label older transcript rows as representing that newer content

#### Scenario: Only bottom hover changes
- **WHEN** the pointer enters or leaves the bottom control with otherwise unchanged document, geometry, selection, and hyperlink state
- **THEN** the changed control cells SHALL be painted without an unconditional full-screen clear or a forced redraw of every transcript row
- **AND** hover reconciliation SHALL NOT create a timer or repeated corrective presentations

#### Scenario: Change pending steering presentation
- **WHEN** a queued input appears, changes, is edited, or is removed
- **THEN** the viewport SHALL recompute the affected transient rows and scroll geometry without reallocating the pinned dock
- **AND** unchanged semantic transcript rows, input rows, widgets, and footer rows SHALL remain reusable when their geometry and presentation are unchanged

### Requirement: Transcript drag selection is boundary-precise
Bare A1's custom transcript viewport SHALL interpret an accepted ordinary pointer drag as an inclusive span of the source graphemes intersected by its anchor and moving pointer cells, represented by normalized display-column boundaries. Movement into an immediately adjacent distinct grapheme SHALL select both the pressed and adjacent graphemes. After accepted distinct motion, returning to the starting cell SHALL retain exactly the starting grapheme; further movement to either side SHALL extend from that grapheme without an intervening empty selection. A press and release with no distinct reported drag movement SHALL remain an ordinary click and SHALL NOT create a transcript selection.

The same endpoint cells SHALL highlight and copy identically whether selected forward or in reverse. Selection SHALL keep wide characters and combining sequences atomic, SHALL preserve source row boundaries in multiline copied text, and SHALL exclude viewport padding, scrollbar glyphs, pinned copies, controls, and dock rows. Existing double-click word selection, triple-click line selection, active-selection continuation, ANSI source styling, and copy clearing SHALL remain available.

#### Scenario: Drag the smallest distance forward
- **WHEN** a transcript drag begins on `c` in `abcde` and its first distinct motion report enters `d`
- **THEN** `cd` SHALL be highlighted
- **AND** copying SHALL emit exactly `cd`

#### Scenario: Drag the smallest distance backward
- **WHEN** a transcript drag begins on `c` in `abcde` and its first distinct motion report enters `b`
- **THEN** `bc` SHALL be highlighted
- **AND** copying SHALL emit exactly `bc`, identical to a drag beginning on `b` and ending on `c`

#### Scenario: Click without dragging
- **WHEN** the pointer is pressed and released on the same transcript cell without a distinct drag-motion report
- **THEN** no transcript range SHALL remain selected
- **AND** `Ctrl+C` SHALL remain available to the focused surface rather than copying a synthetic empty or one-cell range

#### Scenario: Cross rows in either direction
- **WHEN** a drag spans `b` in source row `abcd` and `g` in the following source row `efgh`, in either direction
- **THEN** both directions SHALL highlight `bcd` and `efg`, including both boundary characters
- **AND** both directions SHALL copy exactly `bcd\nefg` with a source newline and without visual padding

#### Scenario: Cross a wide or combining grapheme
- **WHEN** a drag endpoint reaches a wide character or combining sequence
- **THEN** selection SHALL expand to the complete grapheme boundary
- **AND** highlighting and copied text SHALL NOT split its code points or terminal cells

#### Scenario: Use word or line selection
- **WHEN** the reader double-clicks a word or triple-clicks a transcript line
- **THEN** the existing semantic word or full-row range SHALL remain selected
- **AND** the ordinary drag model SHALL NOT shrink that range to pointer-motion semantics

#### Scenario: Select one character and extend to either side
- **WHEN** a transcript drag starts on `c` in `abcde`, moves to a neighboring cell, and returns to `c`
- **THEN** exactly `c` SHALL remain highlighted and copyable, including if released there
- **AND** before release, moving next to `b` SHALL select `bc`, returning to `c` SHALL select `c`, and moving next to `d` SHALL select `cd`
- **AND** reversing this sequence SHALL retain the same anchor without an empty intermediate selection

#### Scenario: Include the first and last source characters of a block
- **WHEN** a multiline drag spans the first source character of its first row and the last source character of its last row, in either direction
- **THEN** every source character in that block SHALL be highlighted and copied
- **AND** stopping directly on either boundary character SHALL NOT require moving one extra cell beyond it

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
Bare A1 SHALL place its live working-status surface, including status-owned blank spacing and retry, compaction, or extension working replacements, in a non-persistent, non-selectable transient viewport tail after semantic transcript and pending steering rows. While all semantic and transient content fits above the dock, otherwise unused viewport rows SHALL precede the pending-steering and working-status group so that pending steering appears immediately above the status and the status remains immediately above the dock without moving already visible semantic transcript rows. When content overflows, that flexible alignment space SHALL be zero and the same steering and working surfaces SHALL participate in normal viewport scrolling. The surfaces SHALL NOT be duplicated in the dock, converted into persisted conversation content, counted as completed assistant messages, or treated as submitted prompts.

Pending steering and working rows SHALL contribute to overflow, scrollbar geometry, and end-following navigation while present. While detached, new transcript output, queue updates, and status animation, replacement, or removal SHALL preserve the current transcript position unless the new extent requires clamping to a valid scroll position. Removing transient rows SHALL remove their owned spacing and leave no stale copy. Failure messages SHALL retain their existing placement; idle informational messages are governed by the transient dock notice requirement. The pinned `a1 pi` route SHALL retain its existing presentation and behavior.

#### Scenario: Scroll the active indicator out of view
- **WHEN** the viewport overflows with pending steering or live working rows present and the reader scrolls toward older content
- **THEN** the viewport SHALL detach and those transient rows SHALL move with the scrollable content
- **AND** each row SHALL disappear once its actual position leaves the viewport
- **AND** no pinned copy or reserved dock row for either surface SHALL remain
- **AND** the editor and footer SHALL stay pinned

#### Scenario: Return to active work
- **WHEN** the reader scrolls to the end, presses `Ctrl+End` in the ordinary prompt context, or activates jump-to-bottom while transient rows remain present
- **THEN** the viewport SHALL follow the complete current tail, including pending steering and working status
- **AND** those rows SHALL be visible to the extent allowed by the viewport height
- **AND** the jump-to-bottom control SHALL disappear as following resumes

#### Scenario: Cross the fit boundary
- **WHEN** growing content exhausts the flexible space and then exceeds the rows available above the dock
- **THEN** the one working-status surface SHALL remain the final transient viewport surface without duplication or omission
- **AND** end following SHALL advance the overflowing viewport while keeping the pending-steering and working-status group visible immediately above the dock
- **AND** the editor/footer position SHALL NOT change solely because of that boundary crossing

#### Scenario: Update status while detached
- **WHEN** pending steering changes, working animation ticks, or the status is replaced by retry, compaction, or extension working content while the reader is detached
- **THEN** the reader's transcript position SHALL remain unchanged whenever it is still valid
- **AND** the newest transient content SHALL appear at the tail if the reader returns while it remains active
- **AND** an off-screen update SHALL NOT paint either surface over the visible transcript or dock

#### Scenario: Finish work while detached
- **WHEN** the lifecycle removes the working status while the reader is away from the tail
- **THEN** the status and its owned alignment spacing SHALL disappear from viewport extent without leaving historical or pinned remnants
- **AND** the viewport SHALL preserve the current transcript position when valid, otherwise clamp to the new end and resume following there
- **AND** returning to the end SHALL NOT resurrect the finished indicator

#### Scenario: Copy near the live tail
- **WHEN** a transcript selection extends toward pending steering, working-status, or status-owned alignment rows and is copied
- **THEN** copied and highlighted content SHALL stop at the semantic transcript boundary
- **AND** steering text, its edit hint, status text, spinner, and alignment spacing SHALL be excluded

#### Scenario: Keep queue and editor behavior independent
- **WHEN** pending steering rows are visible or scrolled out of view while widgets, a replacement input, or a footer update is present
- **THEN** their existing queue lifecycle and `Alt+Up` edit action SHALL remain available
- **AND** changing their placement SHALL NOT convert them into persisted transcript messages
- **AND** widgets, the input surface, and the footer SHALL retain their established lifecycle, focus, and input handling

#### Scenario: Reset or replace the session
- **WHEN** a session is reset, replaced, or disposed while transient steering or working rows are visible or off-screen
- **THEN** no such rows, alignment spacing, scroll extent, pointer suppression, or stale painting from that session SHALL survive into the next session

#### Scenario: Keep a fitting status above the input
- **WHEN** live work begins or updates while semantic transcript, pending steering, and working rows all fit above the dock
- **THEN** pending steering rows and their edit hint SHALL appear immediately above the working-status surface
- **AND** the working-status surface SHALL appear immediately above the dock
- **AND** unused rows SHALL remain between semantic transcript content and the steering/status group
- **AND** existing semantic transcript rows and the editor/footer group SHALL remain at their current terminal rows

#### Scenario: Grow content while it still fits
- **WHEN** streamed content consumes one or more previously unused rows while the complete viewport content still fits
- **THEN** the flexible space before the pending-steering and working-status group SHALL shrink by the consumed rows
- **AND** the steering/status group and pinned dock SHALL remain at their current terminal rows
- **AND** no follow scroll SHALL occur solely to keep the fitting group visible

#### Scenario: Suppress pointer sequences begun on transient rows
- **WHEN** a pointer sequence begins on pending steering, working-status, or status-owned alignment rows outside a viewport control
- **THEN** the complete pointer sequence SHALL be consumed without creating transcript or fullscreen selection
- **AND** wheel input over those rows SHALL retain ordinary viewport scrolling

### Requirement: Right-edge selection remains truthful across scrollbar presentation
Bare A1 SHALL allow a transcript selection begun outside viewport controls to extend through the final rendered source grapheme, including source text occupying the scrollbar overlay column. Whole-row selections and completed interior rows of a multiline selection SHALL include their final source graphemes in highlighting and copied text. A partial endpoint that excludes the final source grapheme SHALL leave that grapheme unselected.

With document content, geometry, viewport position, and selection endpoints unchanged, scrollbar hover, reveal, style changes, and hide SHALL NOT change selection membership or copied text. The scrollbar overlay cell SHALL retain the selected background exactly when that cell is covered by the normalized visual selection range, including the existing whole-row and trailing-whitespace padding rules; otherwise it SHALL retain the underlying unselected background. The scrollbar glyph SHALL remain visible above that background and SHALL NOT enter copied text. Hiding the overlay SHALL restore the underlying source grapheme with its correct selection state.

#### Scenario: Complete several lines through the right edge
- **WHEN** a transcript drag selects complete lines including rows with source text in the final terminal column and ends through the last source grapheme of its endpoint row
- **THEN** every included final grapheme SHALL be selected and copied without needing a scrollbar hover
- **AND** equivalent forward and reverse ranges SHALL highlight and copy the same source text
- **AND** neither a reserved control width nor overlay visibility SHALL truncate the selected source range

#### Scenario: Hover with the last character selected
- **WHEN** a released selection includes the final source grapheme and the pointer enters and leaves the scrollbar without pressing or scrolling
- **THEN** the selected background SHALL remain under the rail while it is visible
- **AND** the last source grapheme SHALL reappear selected when the rail hides
- **AND** selection endpoints and copied text SHALL remain unchanged throughout

#### Scenario: Hover with the last character deliberately excluded
- **WHEN** a released partial selection ends immediately before the final source grapheme and the pointer enters and leaves the scrollbar without pressing or scrolling
- **THEN** the final cell SHALL NOT gain selection background from its selected neighbor
- **AND** the last source grapheme SHALL reappear unselected when the rail hides
- **AND** copied text SHALL exclude that grapheme before, during, and after hover

#### Scenario: Change rail presentation without changing the selection
- **WHEN** the rail reveals from activity, changes between normal and hovered presentation, or hides after activity expires while the source range remains fixed
- **THEN** the first frame of each transition SHALL paint the final cell according to the same selection range, without stale or transient false highlighting
- **AND** this behavior SHALL hold for thin and thick rails in auto and always modes, and selection in hidden mode SHALL reach the same source text

#### Scenario: Preserve styled and wide right-edge content
- **WHEN** selected or unselected right-edge content contains a wide grapheme, a combining sequence, source background styling, or a hyperlink
- **THEN** selection and copy SHALL preserve whole source graphemes and existing source-selection styling rules
- **AND** the rail SHALL use the correct underlying cell background without inheriting source hyperlink or emphasis decoration
- **AND** no overlay glyph, visual padding, or partial grapheme SHALL be added to copied text

#### Scenario: Continue selection into the rail without stealing a new rail gesture
- **WHEN** a selection drag begun on ordinary transcript content reaches the final terminal column
- **THEN** the active selection SHALL extend through the source grapheme at that column rather than starting scrollbar navigation
- **AND** a separate press beginning on the existing scrollbar hit region SHALL retain its established scrollbar ownership

### Requirement: Viewport presentation keeps current agent content stable
Each eligible viewport presentation SHALL contain the newest eligible content of every displayable surface within the current visible range, under existing visibility, expansion, scrolling, and session policies. Streaming, completion, renderer refresh, and input preemption SHALL NOT expose an artificial blank frame, temporarily remove retained content, or restore superseded rows. Legitimate source changes, Markdown reflow, navigation, modal coverage, and authoritative session replacement SHALL remain supported and distinguishable from content loss.

Content repairs SHALL retain bounded work and paint, stable unaffected-row reuse, and existing conservative handling of unsafe terminal content. They SHALL NOT introduce ordinary-streaming full-screen clears, separately exposed erase frames, or delayed live output as a workaround for omissions or flashing. Existing link colors, labels, native activation, semantic copy, and movement safeguards SHALL remain unchanged; repairing pre-existing wrapped-target and host-hover defects is separate work.

#### Scenario: Continue output after arguments complete
- **WHEN** a visible tool progresses from completed arguments to running output and its final result while older conversation content remains in view
- **THEN** the viewport SHALL present its current eligible state without an artificial blank or argument-only replacement of a later result
- **AND** other retained visible surfaces SHALL NOT disappear at message, run, or settlement boundaries

#### Scenario: Refresh renderer height with a frame pending
- **WHEN** a renderer changes its content or height while a stream or dock presentation is pending
- **THEN** the next eligible frame SHALL combine current renderer content with current viewport, selection, control, and dock geometry
- **AND** an older pending frame SHALL NOT restore stale rows or offsets after that presentation

#### Scenario: Interact during streaming
- **WHEN** the reader types, scrolls, selects and copies, or opens and closes a modal while agent content updates
- **THEN** the existing interaction and visibility policies SHALL remain intact with responsive input
- **AND** exposed transcript surfaces SHALL show their current eligible content without resize or reopen being needed to recover a missed update

#### Scenario: Update one surface beside stable history
- **WHEN** one visible surface changes while other surfaces and dock geometry remain stable
- **THEN** content rendering SHALL retain the existing bounded work and paint behavior for unaffected history
- **AND** it SHALL NOT repeatedly clear the full screen or blank stable content to conceal an invalidation defect

#### Scenario: Replay without synchronized-presentation support
- **WHEN** ordinary content updates are replayed with synchronization honored and with synchronization ignored
- **THEN** the checked cells, styles, cursor, and current composed content SHALL remain correct in both modes
- **AND** content remediation SHALL NOT rely on a separately exposed blank or stale frame being hidden by synchronization

### Requirement: Content acceptance is independent of deferred native-link repairs
Content-rendering acceptance SHALL include production-ordered semantic and presentation evidence, independent pinned-renderer parity, bounded-work and terminal-protocol validation, and user-controlled review of the exact built candidate in Windows Terminal. The evidence SHALL identify candidate and baseline builds, terminal version, geometry, relevant capabilities/settings, workload and content categories, visibility settings, and documented A1 differences. It SHALL distinguish content omission, stale rendering, terminal cell errors, and unnecessary A1-induced flashing from host-only hover decoration using bounded, appropriately sanitized observations.

Disappearing content, resize/reopen-dependent refresh, or unexplained A1-induced block flashing SHALL prevent content acceptance even if final snapshots and CI pass. A lower frame or clear count SHALL NOT substitute for stable content. The explicit `a1 pi` oracle and installed Pi packages SHALL remain untouched.

The user-approved scope split tracks pre-existing native-link ghosts and wrapped-target defects in [issue #353](https://github.com/timurproko/a1/issues/353). Those known defects SHALL remain explicitly unresolved until their separate acceptance passes; they SHALL NOT block this content change's acceptance solely because they remain open. This separation SHALL NOT waive other changes' link contracts, permit a newly introduced link regression or altered link semantics, or claim that passing content evidence repairs native host decoration.

#### Scenario: Review content across a complete run
- **WHEN** the exact candidate generates commentary, thinking, fenced code, multiple tools, structured edit output, attachments, and asynchronous renderer updates in a conversation with prior history
- **THEN** displayable content SHALL remain available and stably presented under existing visibility and expansion settings during execution and after settlement
- **AND** no block SHALL require resize or reopen to recover a missed presentation

#### Scenario: Compare the independent pinned reference
- **WHEN** equivalent supported workloads are exercised through A1 and the independent actual pinned renderers or explicit pinned comparison route
- **THEN** shared content and tool-rendering behavior SHALL match outside documented A1 differences
- **AND** the comparison route SHALL not acquire A1-specific viewport composition, link decoration, or damage optimization

#### Scenario: Physical block flashing persists despite correct final cells
- **WHEN** the candidate still unnecessarily flashes or drops content during ordinary scheduled streaming but later produces the correct final cells
- **THEN** content acceptance SHALL remain incomplete
- **AND** the discrepancy SHALL be investigated against intermediate states and the pinned reference rather than hidden by full-screen clears or forced per-event painting

#### Scenario: Known native ghosts remain after content acceptance passes
- **WHEN** content correctness, stability, required CI, and exact-candidate user review pass but a pre-existing native-link defect remains reproducible
- **THEN** the content change SHALL be eligible for user-authorized acceptance independently of that defect
- **AND** the handoff SHALL identify issue #353 as unresolved without claiming a native-link fix or closing its separate acceptance gate

#### Scenario: A content repair introduces a new link regression
- **WHEN** the candidate changes previously working link colors, labels, activation, semantic copy, or movement safety
- **THEN** this change's acceptance SHALL remain incomplete
- **AND** the new regression SHALL NOT be excused by the existence of the separately tracked link issue

### Requirement: Streamed code and link-bearing content keeps bounded viewport painting
While bare A1 follows the transcript end, content that merely looks like a link SHALL NOT change how the viewport is painted. Text a terminal host might underline on hover, including dotted identifiers, file names, and relative or drive-qualified paths, SHALL NOT by itself disqualify a transcript transition that the owned semantic frame has already proved safe, and SHALL NOT cause the complete screen to be cleared.

An ordinary streamed frame SHALL NOT clear the complete screen. A full-screen clear SHALL remain limited to initial entry, structural reset, resize, and image-protocol cases. A frame that must overwrite stale terminal link decoration SHALL repaint the rows carrying that decoration rather than erasing and republishing every row.

A live transcript block that legitimately re-renders its own rows, such as a fenced code block, a table, or a rewrapped paragraph, SHALL continue to use bounded transcript movement plus the rows it genuinely damaged. Settled rows outside that block SHALL NOT be cleared or rewritten because the live block changed.

A row carrying an explicit terminal hyperlink, an unclosed escape, or other content that cannot be replayed safely SHALL keep its existing conservative treatment and SHALL fail closed to the pinned renderer's own output.

#### Scenario: Stream a fenced code block while following
- **WHEN** an assistant message streams a fenced code block containing file paths and dotted identifiers into an overflowing followed transcript
- **THEN** each followed transition SHALL use bounded transcript movement plus the rows the code block genuinely changed
- **AND** no frame between the first chunk and the settled message SHALL clear the complete screen
- **AND** settled transcript rows above the streaming block SHALL NOT be cleared or rewritten

#### Scenario: Stream prose containing a file path
- **WHEN** streamed prose adds a row containing a file name or relative path to a followed overflowing transcript
- **THEN** the viewport SHALL advance by bounded movement rather than a full positional rewrite
- **AND** the presence of the path-like text alone SHALL NOT be treated as a reason to reject the movement

#### Scenario: Stream a live block taller than the stable slack
- **WHEN** the live tail occupies more visible rows than a settled frame's ordinary damage slack and every one of its rows changes in a streamed update
- **THEN** the frame SHALL repaint the live tail and the rows exposed by the movement
- **AND** the frame SHALL NOT fall back to rewriting stable transcript rows

#### Scenario: Move a real hyperlink under a stationary pointer
- **WHEN** a followed frame moves a row carrying an explicit terminal hyperlink away from a stationary pointer
- **THEN** the existing hover-cleanup behavior SHALL still repair stale host link decoration
- **AND** that repair SHALL remain bounded to the rows whose decoration must be overwritten

### Requirement: Hyperlink decoration follows current visible link regions
Bare A1's custom fullscreen viewport SHALL keep file and URL hyperlink hover decoration confined to the display cells occupied by the corresponding link in the current presented frame. Moving, shortening, replacing, clipping, or removing a link SHALL leave neither its old hover underline nor its old explicit hyperlink target on unrelated text, blank padding, viewport controls, or dock chrome. Link-region changes SHALL be reconciled without requiring an additional pointer-motion report.

#### Scenario: Scroll a hovered link away from a stationary pointer
- **WHEN** wheel scrolling, keyboard navigation, scrollbar interaction, or followed output moves a link away from a stationary pointer
- **THEN** its former screen cells SHALL lose the old hyperlink decoration and explicit target
- **AND** hovering those cells SHALL reflect only their currently visible content

#### Scenario: Remove the last visible link
- **WHEN** scrolling or content replacement changes a frame containing links into a frame with no links
- **THEN** former link cells, including cells now painted as empty rows, SHALL have no stale link-hover underline or explicit target
- **AND** cleanup SHALL NOT depend on a link being present in the replacement frame

#### Scenario: Change a link's bounds without changing its target or row
- **WHEN** a link moves horizontally or changes displayed length on the same row while retaining its target and still containing the pointer
- **THEN** decoration SHALL match its new display-column bounds
- **AND** cells outside those bounds SHALL NOT retain the old link decoration or target

#### Scenario: Render multiple occurrences and wrapped links
- **WHEN** the same target occurs more than once or a link wraps across rows beside wide or combining graphemes
- **THEN** each visible occurrence and wrapped segment SHALL retain its own exact display-cell extent
- **AND** decoration SHALL NOT bridge intervening non-link text or split a grapheme's cells

#### Scenario: Change visible geometry without a hover report
- **WHEN** streaming reflow, resize, dock reallocation, sticky-row replacement, or overlay opening or closing changes visible link regions without a preceding hover-motion report
- **THEN** obsolete link regions SHALL still be cleared
- **AND** clipped or covered content SHALL NOT leave link decoration on the new foreground surface

### Requirement: Hyperlink cleanup survives presentation optimization
Terminal output for a hyperlink-cleanup transition SHALL preserve the clearing and repaint operations needed to remove obsolete decoration, including when the new frame has no explicit links. Scroll and damage optimizations SHALL account for both the previously presented link state and the desired frame. A cleanup transition SHALL publish complete current content without an observable blank intermediate frame or stale later repaint.

#### Scenario: Optimize a forced cleanup to a link-free frame
- **WHEN** a forced cleanup frame replaces previously linked content with plain content
- **THEN** rendering optimization SHALL NOT discard the required cleanup as a redundant clear
- **AND** the terminal SHALL receive the complete replacement content with its normal cursor and styling restoration

#### Scenario: Attempt regional scrolling with prior linked content
- **WHEN** a regional scroll optimization would move or erase rows that previously carried links, even if the incoming row changes contain no link sequences
- **THEN** the optimization SHALL be rejected unless preservation of link cleanup is proven for the complete affected region
- **AND** conservative fallback SHALL preserve complete current content

#### Scenario: Coalesce cleanup with streaming output
- **WHEN** a link cleanup and newer transcript or pointer state arrive before presentation
- **THEN** the resulting frame SHALL preserve cleanup and present the newest state
- **AND** a later queued frame SHALL NOT restore obsolete link decoration

#### Scenario: Render unchanged links and unrelated dock input
- **WHEN** pointer motion stays inside an unchanged link or ordinary dock input leaves transcript geometry and links unchanged
- **THEN** hyperlink handling SHALL NOT cause unconditional full-screen clearing or repaint of the stable transcript
- **AND** hyperlink tracking work SHALL remain bounded by visible changed content rather than total transcript length

### Requirement: Hyperlink cleanup preserves interaction and has physical-terminal acceptance
The fix SHALL preserve the existing file and URL link targets, activation policy, idle colors, semantic transcript text, selection and copy results, and non-link source styling. It SHALL NOT require disabling hyperlinks or changing user terminal settings. Its behavior changes SHALL remain scoped to bare A1's owned fullscreen viewport, leaving `a1 pi`, untouched Pi, and installed Pi packages unchanged.

Acceptance SHALL include deterministic link-region and terminal-output evidence plus user-controlled review of the exact built candidate in Windows Terminal. Physical evidence SHALL distinguish explicit OSC 8 links from terminal auto-detected URL and file-like text and record terminal version, geometry, relevant settings, candidate identity, and results.

#### Scenario: Select and release linked content
- **WHEN** the reader selects linked transcript content, scrolls during selection, releases the pointer, and copies
- **THEN** the accepted selection and copy semantics SHALL remain unchanged
- **AND** restoring ordinary link presentation SHALL NOT leave stale solid underlines outside current link regions

#### Scenario: Review the original symptom physically
- **WHEN** the exact candidate is exercised with long file and URL links, tool-output paths, stationary-pointer scrolling, and blank rows replacing linked content
- **THEN** unrelated text and empty rows SHALL remain free of ghost link-hover underlines
- **AND** real links SHALL retain their accepted appearance and activation behavior

#### Scenario: Physical results contradict automated checks
- **WHEN** deterministic tests pass but Windows Terminal still shows stale link-hover underlines on the candidate
- **THEN** acceptance SHALL remain incomplete
- **AND** the evidence SHALL identify whether the remaining case involves explicit hyperlinks or terminal auto-detection rather than claiming the visual bug is fixed

#### Scenario: Use a pinned comparison profile
- **WHEN** the user launches `a1 pi` or untouched Pi
- **THEN** this change SHALL NOT alter its rendering, hyperlink handling, or selection behavior

### Requirement: Prompt line navigation and content-boundary navigation use distinct shortcuts
In bare A1's ordinary prompt context, unmodified `Home` and `End` SHALL move the cursor to the start and end of the current logical prompt line respectively, without navigating the transcript or changing its follow state. A soft-wrapped line SHALL retain the editor's logical-line boundary behavior. `Ctrl+Home` SHALL navigate the content area to its beginning, and `Ctrl+End` SHALL navigate to the complete current tail and restore end following. Content navigation SHALL preserve the prompt text and cursor and SHALL NOT insert terminal key sequences into the prompt, even when the content fits or the requested boundary is already visible.

These bindings SHALL respect existing selector, dialog, overlay, and replacement-input ownership. Other keyboard shortcuts and the pinned `a1 pi` comparison profile SHALL retain their existing behavior. Supported terminal encodings for each of these keys SHALL produce the same ownership and action, without treating additional modifiers as an unmodified or Ctrl-only key. Bare A1's active shortcut help SHALL describe Home/End as prompt line navigation and Ctrl+Home/Ctrl+End as content-boundary navigation rather than advertising the previous ownership.

#### Scenario: Navigate a single-line prompt
- **WHEN** the ordinary prompt contains text and the reader presses `Home` or `End`
- **THEN** the cursor SHALL move to the beginning or end of that prompt line respectively
- **AND** the draft text, transcript position, and follow state SHALL remain unchanged

#### Scenario: Navigate a multiline or soft-wrapped prompt
- **WHEN** the cursor is on a logical line within a multiline or soft-wrapped prompt and the reader presses `Home` or `End`
- **THEN** the cursor SHALL move to the beginning or end of that logical line respectively rather than to a different logical line or content boundary
- **AND** the transcript SHALL NOT navigate in response to that key

#### Scenario: Jump to the content beginning
- **WHEN** the ordinary prompt owns input, content overflows, and the reader presses `Ctrl+Home`
- **THEN** the content area SHALL show its document beginning and detach from end following
- **AND** subsequent appended output SHALL preserve that position while it remains valid
- **AND** the prompt text and cursor SHALL remain unchanged

#### Scenario: Jump to the complete current tail
- **WHEN** the ordinary prompt owns input, the viewport is detached, and the reader presses `Ctrl+End`
- **THEN** the content area SHALL move to its complete current tail, including any live working status, and resume following new output
- **AND** the jump-to-bottom control SHALL disappear
- **AND** the prompt text and cursor SHALL remain unchanged

#### Scenario: Navigate at a boundary or with fitting content
- **WHEN** the reader presses `Ctrl+Home` or `Ctrl+End` with empty or fitting content, or repeatedly requests an already reached boundary
- **THEN** the content area SHALL remain at a valid clamped position without wrapping
- **AND** `Ctrl+End` SHALL leave end following enabled
- **AND** neither key SHALL fall through to prompt cursor movement or text insertion

#### Scenario: A different input surface owns the keys
- **WHEN** a selector, dialog, overlay, or replacement input owns `Home`, `End`, `Ctrl+Home`, or `Ctrl+End`
- **THEN** that surface SHALL retain the event according to its existing behavior
- **AND** the viewport SHALL NOT steal the event to navigate its content

#### Scenario: Decode equivalent terminal reports
- **WHEN** a supported terminal delivers a legacy or extended encoding of one of the four shortcuts
- **THEN** the action and input owner SHALL match the shortcut's declared behavior
- **AND** additional Shift or Alt modifiers SHALL NOT accidentally trigger these four bindings

#### Scenario: Read shortcut help
- **WHEN** the reader opens bare A1's shortcut help
- **THEN** it SHALL identify `Home` and `End` as prompt line start/end and `Ctrl+Home` and `Ctrl+End` as content beginning/end
- **AND** it SHALL NOT describe Ctrl+Home/Ctrl+End as prompt line navigation or Home/End as content navigation

#### Scenario: Keep comparison behavior isolated
- **WHEN** the reader launches `a1 pi`
- **THEN** the comparison profile's existing keybindings and shortcut help SHALL remain unchanged
- **AND** no A1 jump-to-bottom block SHALL be added

### Requirement: Bare A1 retains selection ownership when content is not selectable
On the default bare-A1 screen, a pointer sequence that cannot begin an A1 transcript or editor selection SHALL NOT fall through to the underlying fullscreen runtime's selection or copy behavior. A sequence begun on an empty or otherwise non-selectable region SHALL remain suppressed through motion and release, including when selectable content arrives during the drag. Suppression SHALL prevent fallback selection painting, clipboard writes, and fallback copy notifications without suppressing unrelated keyboard input. Active modal and replacement surfaces SHALL retain their existing pointer ownership; the pinned comparison profile SHALL retain its existing selection behavior.

#### Scenario: Drag in an empty session
- **WHEN** the user presses, drags, and releases the left mouse button in an empty bare-A1 transcript
- **THEN** no white fullscreen selection SHALL appear
- **AND** no clipboard write or fallback `Copied!` notification SHALL occur
- **AND** the editor SHALL remain focused and usable

#### Scenario: Content arrives during a suppressed drag
- **WHEN** a drag begins without selectable content and a transcript update arrives before release
- **THEN** the whole drag SHALL remain suppressed rather than turning into A1 or fallback selection
- **AND** a subsequent fresh drag on selectable content SHALL use A1 selection normally

#### Scenario: Reports arrive in mixed input chunks
- **WHEN** pointer reports from a suppressed sequence share an input chunk with keyboard bytes
- **THEN** only the owned pointer reports SHALL be consumed
- **AND** keyboard input SHALL be delivered exactly once and in order

#### Scenario: Session is cleared during pointer interaction
- **WHEN** a session is reset, replaced, or emptied during pointer interaction
- **THEN** stale pointer-selection state SHALL be cleared
- **AND** subsequent empty-surface reports SHALL not activate fallback selection or copy

#### Scenario: Select actual transcript or editor content
- **WHEN** a fresh pointer sequence targets selectable transcript or editor text
- **THEN** existing A1 selection endpoints, dark-blue transcript highlighting, copy shortcuts, and editor behavior SHALL remain unchanged
- **AND** scrollbar, wheel, navigation, and link interactions SHALL retain their declared behavior

#### Scenario: Modal or replacement surface owns the pointer
- **WHEN** an overlay, dialog, settings surface, or replacement editor owns input
- **THEN** empty-transcript suppression SHALL not intercept that surface's valid pointer actions

#### Scenario: Use the comparison profile
- **WHEN** the user launches `a1 pi` and uses fullscreen selection
- **THEN** the comparison profile SHALL retain its pinned selection and copy behavior without the bare-A1 suppression policy

### Requirement: Bottom-control hover is validated through terminal paint
Bottom-control hover acceptance SHALL include deterministic current-state composition and terminal-cell evidence from the owned input-to-paint path. It SHALL verify the first eligible presentation and subsequent presentations, retaining background styling rather than checking only text presence, click success, or a manually requested corrective render. The evidence SHALL separately exercise editor-then-pointer interleaving and streaming wheel-and-hover input with no editing.

Diagnostic capture SHALL be bounded and test-only or explicitly opt-in. It SHALL correlate delivered pointer coordinates, event ordering, viewport state used by the frame, reuse or recomposition, and emitted control-cell styling without recording ordinary editor text, credentials, or unrelated conversation content. An absent input report, a stale composed frame, and correct composed rows with incorrect terminal paint SHALL be distinguishable findings; missing diagnostic coverage SHALL NOT be reported as a successful hover verdict.

Physical acceptance SHALL record the exact candidate, terminal/version, geometry, theme and color mode, relevant viewport settings, reproduction sequence, and separate outcomes for the confirmed race and reported scroll-only symptom. Passing the cache-race regression SHALL NOT by itself establish that the scroll-only report is resolved. Continued user-observed failure SHALL block complete acceptance even if automated checks pass.

#### Scenario: Verify the first painted hover transition
- **WHEN** a deterministic workload delivers a pointer transition after editor input and before the scheduled frame runs
- **THEN** terminal-cell evidence SHALL show the correct normal or pointed-at background in that first presentation and the newest editor state
- **AND** a stale first frame followed by a corrected frame SHALL fail the check

#### Scenario: Verify a scroll-only streaming workload
- **WHEN** deterministic assistant or tool updates interleave with wheel and hover reports without editor input
- **THEN** the evidence SHALL verify hover entry, exit, and stationary hide-and-reveal at input-presentation checkpoints while streaming continues
- **AND** a later stream or completion presentation that restores obsolete control styling or geometry SHALL fail the check

#### Scenario: Keep interpretation of evidence bounded
- **WHEN** a physical symptom is investigated and no corresponding pointer report is present in a complete diagnostic capture
- **THEN** the result SHALL identify an input-reporting observation rather than infer a stale-frame cause or invent an operating-system pointer location
- **AND** when the capture is incomplete or no failure was reproduced, the result SHALL remain inconclusive rather than claim resolution

#### Scenario: Preserve unrelated behavior and paint cost
- **WHEN** hover regression evidence exercises settled typing, control clicks, outside presses, selection, modal ownership, resize, reset, and teardown
- **THEN** existing interaction and terminal-restoration behavior SHALL remain intact
- **AND** unchanged settled typing SHALL retain dock-only reuse while isolated hover changes SHALL not introduce full-screen paint damage
- **AND** the pinned comparison path and installed Pi packages SHALL remain unchanged

#### Scenario: Physical testing still fails
- **WHEN** the exact candidate still fails to highlight the control during the user's streaming scroll-and-hover sequence
- **THEN** the scroll-only symptom SHALL remain unresolved and complete acceptance SHALL be withheld
- **AND** the confirmed cache-race result SHALL be reported separately rather than used to dismiss or close the remaining symptom

### Requirement: Every modal preserves interaction with exposed transcript content
In bare A1, all built-in and extension-provided modal surfaces SHALL leave exposed transcript content under A1 viewport ownership. This SHALL apply uniformly to selectors, dialogs, confirmations, permission and authentication flows, nested surfaces, floating overlays, and replacement inputs or editors without a per-command opt-in. The existing scrollbar appearance, style, speed, follow/detach behavior, and exposed navigation controls SHALL remain functional. A modal SHALL NOT suppress an otherwise-visible scrollbar; `auto`, `always`, and `hidden` SHALL retain their existing meanings.

#### Scenario: Open Model Configuration above an overflowing transcript
- **WHEN** Model Configuration is open with transcript content visible above it
- **THEN** wheel scrolling over that content, exposed scrollbar hover, thumb drag, track paging, and the exposed jump-to-bottom control SHALL work as they do without the modal
- **AND** these interactions SHALL NOT change the model selection, close the dialog, or move keyboard focus

#### Scenario: Apply the same behavior to every modal family
- **WHEN** any built-in or extension modal, nested modal, overlay, selector, or replacement input leaves transcript cells exposed
- **THEN** those cells and exposed viewport controls SHALL retain the same A1 scrolling and selection behavior without requiring that modal to opt in
- **AND** modal-local wheel actions, buttons, editing, completion, save, and cancel SHALL retain their existing behavior

#### Scenario: Copy transcript text with a modal open
- **WHEN** the reader selects exposed transcript text using a drag, double-click, or triple-click and presses `Ctrl+C` while a modal remains open
- **THEN** A1 SHALL copy the semantic selected transcript text exactly once, clear the selection using its existing copy behavior, and preserve source foreground styling beneath its custom selection background
- **AND** copied text SHALL exclude modal text, dock rows, viewport controls, and visual padding
- **AND** neither vanilla fullscreen selection nor its copy notification SHALL be invoked
- **AND** the copy chord SHALL NOT also cancel or edit the modal

#### Scenario: Type or cancel without a transcript selection
- **WHEN** no transcript range is selected and the reader types or invokes a navigation, paste, save, or cancel shortcut while a modal has keyboard focus
- **THEN** the modal SHALL retain its established keyboard behavior, including its existing handling of `Ctrl+C`
- **AND** hidden ordinary-editor state SHALL NOT intercept that input

#### Scenario: Cross a surface boundary during a drag
- **WHEN** a drag begun on exposed transcript text or scrollbar crosses into modal bounds, or a modal-owned drag crosses into the transcript
- **THEN** the initiating surface SHALL retain the gesture through release without activating the crossed surface
- **AND** transcript selection SHALL remain confined to semantic transcript content and paint beneath the modal, with no selection highlight over modal cells
- **AND** a transcript drag held beyond the viewport edge SHALL retain the existing edge auto-scroll behavior

#### Scenario: Resize or transition modal surfaces
- **WHEN** a modal opens, nests, changes size, closes, or is cancelled, or the terminal resizes while a modal is active
- **THEN** visible transcript bounds, scrollbar geometry, occlusion, and hit targets SHALL agree with the current frame
- **AND** valid detached transcript position SHALL be preserved, clamped only as needed for the new extent, while end-following remains end-following
- **AND** a geometry or ownership transition SHALL end any in-flight gesture and its auto-scroll timer without leaking its remaining reports into another surface
- **AND** no stale selection paint or obsolete hit target SHALL remain

#### Scenario: A modal covers all transcript content
- **WHEN** a full-cover modal leaves no transcript cells or controls exposed
- **THEN** no new background scroll, selection, or control interaction SHALL begin through that modal
- **AND** closing it SHALL restore the A1 viewport without changing its valid navigation state solely because a modal was present

#### Scenario: Stream while reading behind a modal
- **WHEN** new output arrives while the reader is detached and scrolling or selecting exposed transcript content behind a modal
- **THEN** the valid transcript position SHALL remain stable and pointer feedback SHALL remain responsive
- **AND** modal contents, focus, and controls SHALL remain usable

#### Scenario: Preserve comparison behavior
- **WHEN** the same modal workflow runs in `a1 pi`
- **THEN** its pinned selection, copy, input routing, and presentation SHALL remain unchanged

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

### Requirement: Default-editor autocomplete grows above a stable prompt
Bare A1 SHALL render the default editor's autocomplete list immediately above the editor's upper border, after any above-editor widgets, rather than below the editor. At unchanged terminal dimensions, editor text layout, and other dock content, opening, closing, filtering, paging, or asynchronously updating autocomplete SHALL NOT change the terminal rows occupied by the editor borders, prompt text, caret, below-editor widgets, or footer. The menu SHALL consume space upward from the transcript viewport, not from below the prompt, and SHALL NOT reserve empty menu rows after it closes.

While the menu has rendered rows, bare A1 SHALL render exactly one horizontal line immediately above it, after above-editor widgets and without a blank spacer. The line SHALL match the input prompt border's horizontal glyph, full rendered width, and current color, including theme or editor-mode color changes. It SHALL contain no copied history or editor-scroll labels. When the existing completion list emits its trailing counter, bare A1 SHALL instead show that counter in the top line as `1/24`, without parentheses, at the history border label's four-cell inset and in its dim color. The original counter row SHALL be removed without a blank replacement. Counter values, updates, and visibility conditions SHALL remain those of the existing list; fitting lists without a counter retain a plain top line. If a complete counter cannot be obtained or fitted at a narrow width, its label SHALL be omitted rather than misrepresented. The existing prompt upper border SHALL remain between the menu and input. The top line SHALL be included in the upward allocation and body offset so its appearance or disappearance does not move the input or footer. The menu SHALL retain its original background and padding; no panel shading SHALL be added.

The list and its top line SHALL remain transient, non-transcript presentation. It SHALL NOT enter scrollback history, transcript selection, copied prompt text, or submitted text. Changes unrelated to autocomplete, including prompt wrapping, terminal resizing, and widget or footer height changes, SHALL retain their existing reflow behavior.

#### Scenario: Open the slash-command list
- **WHEN** the user types `/` in a single-line bare-A1 prompt
- **THEN** the completion list SHALL appear above the prompt's upper border
- **AND** the prompt and footer SHALL occupy the same terminal rows as the equivalent frame without the list
- **AND** no completion rows SHALL appear between the prompt's lower border and footer

#### Scenario: Match the menu top line to the prompt
- **WHEN** the default editor displays autocomplete, including after a theme, editor-mode color, or terminal-width change
- **THEN** exactly one horizontal line SHALL appear directly above the suggestions with the prompt border's current color, glyph, and width
- **AND** the original prompt upper border SHALL remain below the suggestions
- **AND** the top line SHALL NOT replace any candidate row
- **AND** candidate rows SHALL retain their original background and padding without menu-panel shading

#### Scenario: Relocate the existing completion counter
- **WHEN** the existing list would display a trailing counter such as `(1/24)`
- **THEN** the same value SHALL appear as `1/24` in the top line at the history label inset and in the same dim color
- **AND** the trailing counter row SHALL be absent, not duplicated or left blank
- **AND** navigation, filtering, and asynchronous results SHALL update the top counter using the existing list semantics without moving the prompt

#### Scenario: Filter and dismiss suggestions
- **WHEN** filtering reduces or grows the visible list without changing prompt wrapping, or Escape or a no-match result closes it
- **THEN** the menu SHALL grow or shrink upward without moving the prompt or footer
- **AND** closing the menu SHALL remove its top line in the same frame
- **AND** vacated menu and top-line rows SHALL be repainted with the current underlying viewport content without stale suggestions, lines, or reserved blank menu space

#### Scenario: Receive asynchronous results
- **WHEN** a current asynchronous completion result opens or resizes the list
- **THEN** the same stable-prompt placement SHALL apply to its first visible frame
- **AND** a canceled or superseded result SHALL NOT reopen or repaint an obsolete menu

#### Scenario: Navigate suggestions without changing height
- **WHEN** keyboard navigation changes the active item or page while the menu fits within the terminal and its visible height remains unchanged
- **THEN** the prompt SHALL remain stationary and the active item SHALL be visible
- **AND** established transcript rows SHALL retain the existing bounded dock-only rendering behavior

#### Scenario: Complete within a multiline prompt
- **WHEN** autocomplete opens or changes height within an unchanged wrapped or multiline draft
- **THEN** the complete visible editor body and caret SHALL retain their terminal rows
- **AND** any existing editor scroll indicator or history border presentation SHALL remain attached to its editor border rather than to the menu

#### Scenario: Use autocomplete beside a detached or streaming transcript
- **WHEN** autocomplete opens, closes, or resizes while the transcript is detached or receiving output
- **THEN** the viewport SHALL reallocate available rows using its existing follow, detach, and valid-position clamping rules
- **AND** the menu SHALL neither become transcript content nor force an otherwise valid detached position to follow the end
- **AND** the prompt and footer SHALL remain stable when their own geometry is unchanged

### Requirement: History uses a compact numeric border label
While bare A1 is recalling saved prompt history, the existing history border label SHALL show its position/total without the literal `History` title, for example `1/100`. Its four-cell inset, dim color, count calculation, visibility, optional editor-scroll suffix, clipping, and border width SHALL remain unchanged. This wording change SHALL NOT alter history navigation, draft restoration, storage, or input geometry.

#### Scenario: Recall and leave saved history
- **WHEN** the user navigates saved prompt history
- **THEN** the border SHALL show the existing position/total without `History`, in the same position and color
- **AND** leaving recall SHALL remove the indicator and restore the draft as before

### Requirement: Above-prompt autocomplete preserves existing sizing and input geometry
Moving autocomplete above the input SHALL preserve the existing menu size limits, selection window, pagination, and `autocompleteMaxVisible` setting behavior. The existing terminal clipping and resize policy SHALL remain in force. This placement change SHALL NOT introduce a terminal-space-derived item limit, a one-row menu mode, special zero-capacity completion state, or a different pagination policy.

Rendering, cursor placement, prompt selection, and pointer hit regions SHALL agree on the editor body's actual position. Menu rows and the top line SHALL NOT be interpreted as prompt text or exposed transcript rows. The decorative line SHALL absorb the existing counter row when present, or add one dock row when absent, without modifying completion-item limits or selection-window behavior. Resizing or changing the visible list height SHALL update affected geometry in the same frame.

#### Scenario: Resize with autocomplete visible
- **WHEN** the terminal is resized while autocomplete is open
- **THEN** the existing menu and terminal sizing/clipping rules SHALL apply to the new geometry with the menu positioned above the input
- **AND** the placement change SHALL NOT modify the completion selection, configured item limit, or pagination behavior

#### Scenario: Use the visible-item setting
- **WHEN** autocomplete renders with a configured `autocompleteMaxVisible` value
- **THEN** its existing visible-item and setting-application behavior SHALL be preserved
- **AND** moving the list above the input SHALL NOT write or override that setting

#### Scenario: Select and copy prompt text with a menu visible
- **WHEN** the user clicks or drags across visible prompt text while autocomplete is open
- **THEN** caret placement, selection highlighting, and copied text SHALL correspond to the actual prompt cells
- **AND** a pointer sequence beginning on a menu row or its top line SHALL NOT select prompt or transcript text

#### Scenario: Render narrow or Unicode content
- **WHEN** the draft or menu contains wide or combining characters, or the terminal is narrow
- **THEN** wrapping, clipping, selection, and cursor geometry SHALL remain cell-correct within the available width
- **AND** menu height changes alone SHALL NOT move the prompt

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

### Requirement: The first keyboard paste does not require priming
When the ordinary bare-A1 prompt owns input and a supported clipboard contains readable nonempty content, the first `Ctrl+V` received after a cold session start SHALL admit one paste and insert that content exactly once. The keyboard route SHALL NOT require an earlier right-click paste, clipboard operation, focus change, repeated shortcut, or helper warm-up. Right-click and keyboard paste SHALL use equivalent admission, acquisition, preparation, deadline, and insertion behavior once their respective input gestures reach A1.

A received `Ctrl+V` SHALL be consumed only after the ordinary prompt has synchronously admitted its paste reservation. Cold keybinding activation, helper startup, an inconclusive first native read, and a safe platform fallback SHALL remain inside that one bounded transaction. Safe recovery SHALL use the original request identity and deadlines and SHALL NOT create another reservation, duplicate acquisition after content is known, or insert a late result after cancellation. If readable content still cannot be acquired, the request SHALL settle through the existing bounded failure policy rather than silently becoming dependent on a later mouse paste.

Helper startup SHALL normally be off the gesture's critical path: after the shell's first frame, A1 SHALL keep one spare paste helper and one spare copy helper forked and idle, take the spare for the next gesture, and fork the replacement only after that gesture's helper has exited. A gesture that finds no spare SHALL fork cold inside its own transaction as before. Spares SHALL keep the isolation and termination guarantees of a working helper, SHALL NOT keep a session's process alive, SHALL be stopped after a bounded idle period and when the shell is disposed, and a spare that exits on its own SHALL be replaced rather than reused.

Terminal-owned nonempty bracketed paste SHALL remain a distinct exactly-once route and SHALL NOT trigger a native clipboard read. Modal and replacement surfaces SHALL retain paste ownership, and the pinned comparison profile SHALL remain unchanged.

#### Scenario: Paste external text on the first shortcut
- **WHEN** a cold bare-A1 session has its ordinary prompt focused, the supported clipboard contains readable external text, and the reader presses `Ctrl+V` for the first clipboard action of the session
- **THEN** A1 SHALL insert that text exactly once at the reserved prompt position
- **AND** no right-click, repeated shortcut, focus change, or previous A1 copy SHALL be required

#### Scenario: Preserve input around a cold first paste
- **WHEN** the reader presses the first `Ctrl+V` and continues typing while cold acquisition or preparation is pending
- **THEN** the paste SHALL resolve at its original reservation exactly once and the later typing SHALL remain in order
- **AND** prompt submission, viewport follow state, and unrelated input SHALL remain unchanged by paste admission

#### Scenario: Recover an inconclusive first native read
- **WHEN** the first native clipboard text read is empty or transiently unavailable but the supported platform fallback can read the nonempty clipboard within the request's acquisition deadline
- **THEN** the same paste transaction SHALL use that fallback and insert the content exactly once
- **AND** recovery SHALL NOT restart the acquisition or end-to-end deadline

#### Scenario: Settle a genuine first-paste failure
- **WHEN** neither the native reader nor its supported fallback can acquire readable content before the first paste transaction expires
- **THEN** the reservation SHALL be removed and the request SHALL settle through the existing non-modal failure behavior
- **AND** a later keyboard paste SHALL start independently without requiring a successful right-click paste to prime it

#### Scenario: Keep right-click from priming keyboard behavior
- **WHEN** the reader uses right-click paste before or after a keyboard paste attempt
- **THEN** that mouse action SHALL neither enable nor disable subsequent `Ctrl+V` recognition or acquisition
- **AND** each admitted gesture SHALL remain one distinct paste transaction

#### Scenario: Receive terminal-owned first paste
- **WHEN** the terminal consumes the first `Ctrl+V` and sends one nonempty bracketed paste payload
- **THEN** A1 SHALL prepare and insert that supplied payload exactly once without a native clipboard read
- **AND** input after the closing bracketed-paste delimiter SHALL remain in order

#### Scenario: Preserve other input owners
- **WHEN** a modal, replacement input, or pinned comparison profile owns input
- **THEN** the ordinary bare-A1 prompt SHALL NOT intercept its paste shortcut
- **AND** the owning surface's established paste behavior SHALL remain unchanged

#### Scenario: A spare helper is ready before the first paste and after each paste
- **WHEN** a bare-A1 session has shown its first frame and the reader pastes, then pastes again after the first has settled
- **THEN** each paste SHALL take the spare helper forked before it rather than forking on its own critical path, and the replacement SHALL be forked only after the previous helper exited
- **AND** disposing the shell SHALL stop the idle spares, and an idle spare SHALL be stopped after the bounded idle period without a gesture

### Requirement: Bare A1 quit plays a bounded outro and reveals a clean parent terminal
When an interactive bare-A1 session quits through `/quit`, the second `Ctrl+C` of the clear/exit chord, `Ctrl+D`, or an extension shutdown request while `quitAnimation` is `true`, A1 SHALL capture the last frame presented on its fullscreen surface, play the `fall` effect over that frame on the alternate screen for 800 ms, and only then leave the alternate screen exactly once. The effect and duration SHALL be fixed by the shell rather than read from settings. Playback SHALL be bounded by the player's 300–2000 ms clamp and SHALL paint each tick inside one synchronized-output block. The parent terminal SHALL receive no A1 frame rows, no conversation transcript, and no alternate-screen residue after restoration; only the existing dim resume hint MAY follow. When `quitAnimation` is `false`, A1 SHALL neither capture a frame nor play an effect and SHALL leave the alternate screen immediately. A playback failure, a non-TTY terminal, the pinned regular mode, or an all-blank capture SHALL likewise skip the outro without changing restoration, exit output, or process completion. The pinned `a1 pi` comparison profile SHALL remain unchanged.

#### Scenario: Quit with the slash command
- **WHEN** the user submits `/quit` from a bare-A1 session showing a conversation
- **THEN** the presented frame SHALL animate with the `fall` effect on the alternate screen for 800 ms
- **AND** the alternate screen SHALL be left exactly once after playback completes
- **AND** the parent terminal SHALL contain only its prior scrollback and the dim resume hint

#### Scenario: Quit with the clear/exit chord
- **WHEN** the user presses `Ctrl+C` twice within the existing clear/exit interval
- **THEN** the second press SHALL play the same outro and produce the same clean restoration as `/quit`

#### Scenario: Exit animation is switched off
- **WHEN** `quitAnimation` is `false` and the user quits through any interactive route
- **THEN** A1 SHALL leave the alternate screen without capturing a frame or writing any outro paint
- **AND** no frame the renderer still has queued SHALL reach the terminal between the quit request and the leave
- **AND** restoration, the resume hint, and successful process completion SHALL be unchanged

#### Scenario: Effect is off or playback cannot run
- **WHEN** `quitAnimation` is `false`, stdout is not a TTY, the runtime is not fullscreen, the captured frame has no visible cells, or the player fails
- **THEN** A1 SHALL leave the alternate screen without animating
- **AND** restoration, the resume hint, and successful process completion SHALL be unchanged

#### Scenario: Playback stays bounded
- **WHEN** the player is asked for a duration below 300 ms or above 2000 ms, or the terminal writes slowly
- **THEN** playback SHALL clamp to the 300–2000 ms range and SHALL NOT delay the alternate-screen leave beyond that clamp and one bounded guard
- **AND** no outro paint SHALL be written after the alternate-screen leave

#### Scenario: Effects are deterministic
- **WHEN** the same effect, row widths, and seed are planned twice
- **THEN** both plans SHALL contain identical sparkle and clear cells in identical order
- **AND** every sparkle and clear cell SHALL lie inside the captured frame's row and column bounds
- **AND** every visible cell of the captured frame SHALL be cleared by the end of the plan

### Requirement: Informational messages are a transient dock notice
Bare A1 SHALL present informational workflow status messages, including model and thinking-level confirmations, reload and compaction confirmations, generic completed command results, `status`-kind workflow messages, and extension `info` notifications, as one transient notice at the top of the dock rather than as transcript content. The notice SHALL consist of one blank row followed by the message in the existing dim status style with Pi's one-cell status padding regardless of the output pad setting, SHALL be placed after any non-live dock status rows and before above-editor widgets and the editor, and SHALL therefore sit directly below the live working status when that status is visible and directly above the editor group otherwise. The notice SHALL wrap at the dock width and SHALL NOT scroll with transcript content.

A newer simple workflow notice of any informational, warning, or error severity SHALL replace the current notice in place. The notice SHALL be removed when a submitted prompt or shell command block is mounted, when a structured workflow presentation or celebratory component is appended to the transcript, and when workflow presentation is reset for a new, resumed, forked, or replaced session. Assistant, thinking, tool, custom, and compaction blocks that start or update while the agent works SHALL NOT remove it, the agent finishing SHALL NOT remove it, and no timer SHALL remove it. The notice SHALL NOT enter transcript order, the selectable document, copied text, prompt navigation, persisted session content, or the pinned `a1 pi` route, whose transcript placement of status text SHALL remain unchanged.

#### Scenario: Confirm a model switch in a fresh session
- **WHEN** model selection from `/models` completes in a bare-A1 session with no transcript content
- **THEN** the confirmation SHALL appear directly above the editor group with one blank row on each side
- **AND** no transcript row SHALL be added for it
- **AND** the top of the viewport SHALL remain empty

#### Scenario: Switch models while the agent is working
- **WHEN** an informational message arrives while the live working status is visible
- **THEN** the working status SHALL remain immediately above the dock and the notice SHALL render directly below it
- **AND** streamed updates, further assistant blocks, and tool blocks in that run SHALL NOT remove the notice
- **AND** the notice SHALL remain after the run finishes until the next submitted prompt

#### Scenario: Replace and dismiss
- **WHEN** another simple informational, warning, or error message arrives before any new reader submission
- **THEN** it SHALL replace the first notice without adding a row
- **AND** a subsequently submitted prompt, appended structured presentation, or session reset SHALL remove the notice and its blank row

#### Scenario: Keep the notice out of content semantics
- **WHEN** a selection is dragged toward the dock, the transcript is copied, prompt navigation is used, or the session is persisted and resumed
- **THEN** the notice text SHALL be excluded from selection, copy, navigation targets, and persisted content
- **AND** returning to the session SHALL NOT resurrect a dismissed notice

#### Scenario: Keep the pinned route unchanged
- **WHEN** the same informational message is produced in the `a1 pi` route
- **THEN** it SHALL be appended to the transcript exactly as before, including back-to-back replacement of the previous status row

### Requirement: The reload box stays visible for a minimum window
When `/reload` runs in bare A1, the shell SHALL show the reload box in place of the editor and SHALL keep it visible for at least 400 ms measured from the moment it was first shown, regardless of how quickly the reload workflow completes. A reload that takes longer than the window SHALL remove the box as soon as the workflow finishes. A reload that finishes sooner SHALL wait only for the remainder of the window before restoring the editor and presenting the completion notice; the reload workflow itself SHALL NOT be delayed by the hold. The window, the clock, and the wait SHALL be injectable through the session shell options so tests are deterministic, and production SHALL use the defaults. Disposing the shell during the hold SHALL release the hold without restoring the editor. The share surface and the `a1 pi` route SHALL be unchanged.

#### Scenario: Reload finishes instantly
- **WHEN** `/reload` completes 50 ms after the reload box was shown
- **THEN** the box SHALL remain visible for a further 350 ms
- **AND** the editor SHALL return and the completion notice SHALL appear only after that remainder elapses

#### Scenario: Reload already used the window
- **WHEN** `/reload` completes 400 ms or more after the reload box was shown
- **THEN** the box SHALL be removed immediately with no additional wait

#### Scenario: Dispose during the hold
- **WHEN** the shell is disposed while the reload box is being held
- **THEN** the hold SHALL end without waiting and the editor SHALL NOT be restored

### Requirement: A copy helper's late exit does not alter its delivered text
Once an isolated copy helper has reported a complete prepared result, A1 SHALL deliver
exactly that prepared text to the clipboard writer or fail explicitly. Terminating the
helper because it lingers past the cleanup grace after its result SHALL NOT replace the
delivered text with an empty payload or otherwise write content the user did not select.
An explicit cancellation, a protocol violation, or an incomplete byte count SHALL still
discard the prepared text and SHALL NOT be reported as delivered.

#### Scenario: Helper lingers after a complete result
- **WHEN** a copy helper reports a complete prepared result and has not exited when the cleanup grace elapses
- **THEN** A1 SHALL terminate the helper
- **AND** the clipboard writer SHALL receive exactly the prepared text once

#### Scenario: Helper is canceled after a complete result
- **WHEN** the owner cancels a copy request after its helper reported a result but before delivery
- **THEN** the request SHALL settle as canceled and the clipboard writer SHALL NOT be called

### Requirement: Touchpad transcript scrolling remains directionally stable
Bare A1 SHALL move the transcript only for vertical wheel input and in the direction reported by that input. Horizontal wheel reports interleaved by a touchpad SHALL NOT move the transcript, change follow state, or activate viewport controls.

#### Scenario: Scroll downward with diagonal touchpad noise
- **WHEN** downward vertical wheel reports are interleaved with horizontal wheel reports over exposed transcript content
- **THEN** the transcript SHALL move only downward by the configured distance for each vertical report
- **AND** the horizontal reports SHALL NOT move the transcript in either direction

#### Scenario: Scroll upward with diagonal touchpad noise
- **WHEN** upward vertical wheel reports are interleaved with horizontal wheel reports over exposed transcript content
- **THEN** the transcript SHALL move only upward by the configured distance for each vertical report
- **AND** the horizontal reports SHALL NOT change end-following or viewport-control state

### Requirement: Command failures and warnings are a transient dock notice
Bare A1 SHALL present simple workflow failures and warnings, including built-in command failures, explicit `error`- or `warning`-kind workflow messages, and extension error/warning notifications, through the same single transient dock-notice region used by informational messages rather than as transcript content. The notice SHALL preserve the existing contextual wording, `Error:` or `Warning:` prefix, severity theme role, output-padding rule, leading blank row, and width-aware wrapping supplied by the command-message presenter. It SHALL sit directly above the editor group, or directly below live working status when that status is visible, and SHALL NOT scroll with transcript content.

The latest simple workflow notice SHALL replace any earlier informational, warning, or error notice in place. A submitted prompt or shell command, a structured transcript-bound workflow presentation, or workflow/session reset SHALL dismiss it under the common notice lifecycle. Structured command output SHALL remain transcript content. The pinned `a1 pi` route SHALL retain its chronological transcript placement of command failures and warnings.

#### Scenario: Fail to export an empty session
- **WHEN** `/export` fails in a fresh bare-A1 session because there is nothing to export
- **THEN** `Error: Failed to export session: Nothing to export yet - start a conversation first` SHALL appear immediately above the prompt group in the existing error color
- **AND** the message SHALL NOT appear at the top-left of the transcript or leave a large empty gap below it
- **AND** the selectable document range SHALL remain empty

#### Scenario: Show a warning near the prompt
- **WHEN** a workflow emits a simple warning in bare A1
- **THEN** the warning SHALL appear in the same dock region with its `Warning:` prefix, warning color, existing padding, and wrapping
- **AND** it SHALL NOT become transcript, selection, copy, prompt-navigation, or persisted-session content

#### Scenario: Replace notices across severity
- **WHEN** an error or warning follows an informational notice, or an informational notice follows an error or warning
- **THEN** the newer message SHALL replace the older notice in the same dock position
- **AND** no stale notice row or transcript component SHALL remain

#### Scenario: Show an extension failure
- **WHEN** an extension emits an error or warning notification in bare A1
- **THEN** it SHALL use the same prompt-adjacent severity presentation and lifecycle as a built-in simple workflow message
- **AND** no extension-specific duplicate SHALL be appended to the transcript

#### Scenario: Keep structured output in the transcript
- **WHEN** a route presents session information, hotkeys, changelog, new/name/debug output, or another structured component
- **THEN** that component SHALL retain its existing transcript placement
- **AND** it SHALL dismiss any stale simple dock notice

#### Scenario: Keep pinned command-message placement
- **WHEN** the same command failure or warning is produced through `a1 pi`
- **THEN** it SHALL remain chronological transcript content with its pinned spacing, prefix, style, and wording
- **AND** no custom-viewport dock notice SHALL be introduced

### Requirement: Bare A1 omits generated resize guidance from submitted prompts
Bare A1 SHALL omit Pi's canonical successful image resize/dimension guidance from visible submitted user-prompt text while retaining the complete original message and guidance in stored and model-facing content. Filtering SHALL require image attachment provenance, exact canonical syntax, a trailing image-processing hint position, and no more recognized dimension lines than attached images.

Existing pasted-image chips and generated screenshot labels SHALL remain visible and unchanged. Bare A1 SHALL NOT introduce an `Image attached` dock notice or move resize guidance into the dock. Canonical conversion notes, image omission/failure messages, unrelated authored text, attachment delivery, transcript image presentation, and prompt editing/history behavior SHALL remain unchanged. The `a1 pi` comparison route SHALL retain its original inline resize guidance.

#### Scenario: Submit a resized pasted image
- **WHEN** an image-bearing user message ends with canonical original/displayed-dimension guidance
- **THEN** bare A1 SHALL omit that guidance from the visible submitted prompt
- **AND** the submitted prompt SHALL retain its existing screenshot chip label
- **AND** the stored message and agent context SHALL retain the complete guidance and attachment
- **AND** no synthetic attachment or processing notice SHALL be added to the dock

#### Scenario: Preserve existing image-chip behavior
- **WHEN** a pasted image is ready in the prompt editor
- **THEN** its existing image chip and screenshot label SHALL remain visible and editable
- **AND** the change SHALL NOT replace it with an `Image attached` message

#### Scenario: Preserve failures and other image hints
- **WHEN** trailing image-processing hints contain conversion or omission/failure text alongside resize guidance
- **THEN** bare A1 SHALL omit only the canonical resize/dimension lines
- **AND** it SHALL retain conversion and omission/failure text visibly

#### Scenario: Preserve ordinary text
- **WHEN** resize-looking text has no matching image attachment provenance, is not in the trailing processing-hint suffix, or exceeds the attached-image count
- **THEN** bare A1 SHALL render it unchanged

#### Scenario: Keep pinned Pi unchanged
- **WHEN** the same image-bearing message is rendered through `a1 pi`
- **THEN** the screenshot chip and inline resize guidance SHALL retain their pinned presentation

### Requirement: Copying a selected response does not suspend the UI
When bare A1 owns a nonempty agent-response selection and receives `Ctrl+C`, it SHALL consume that key as a copy action, capture the selected semantic text at that input boundary, and clear the selection through the existing selection-clearing behavior. Clipboard completion SHALL NOT gate subsequent input handling, scrolling, rendering, animation, or agent-event processing. Copy SHALL NOT pause the agent, change follow/detach state, or require Esc, another recovery key, a focus change, or restart to resume normal use.

Copy preparation SHALL have bounded uninterrupted work and SHALL NOT traverse or duplicate unrelated off-screen transcript content. Large supported selections SHALL yield during expensive preparation rather than monopolize the UI event loop. Clipboard unavailability SHALL be a recoverable copy failure, not a UI freeze.

#### Scenario: Copy an ordinary response while idle
- **WHEN** the reader selects agent-response text and presses `Ctrl+C`
- **THEN** A1 SHALL initiate copying that text and clear the selection without waiting for clipboard delivery
- **AND** immediately following typing and scrolling SHALL be handled normally without a recovery action

#### Scenario: Copy during active output
- **WHEN** the reader copies selected response text while the agent streams and a working indicator is visible
- **THEN** input, visible animation, and eligible streamed frames SHALL continue progressing while copy delivery is pending
- **AND** the copy action SHALL NOT cancel the agent or detach a followed viewport

#### Scenario: Copy a small range from a long session
- **WHEN** the same small visible response range is copied in short and long settled sessions
- **THEN** copy preparation SHALL inspect only the selected content and the bounded metadata needed to identify it
- **AND** unrelated transcript length SHALL NOT introduce additional copy preparation or unchanged-content formatting

#### Scenario: Prepare a large supported selection
- **WHEN** a selected response requires preparation beyond one bounded interaction slice
- **THEN** later input and animation SHALL receive processing opportunities before preparation completes
- **AND** the eventual copy SHALL use the original selected-text snapshot rather than newer streaming or reflowed content

### Requirement: Response-copy delivery is bounded and recovers automatically
Every response-copy request SHALL have a finite declared deadline and a bounded payload/resource policy. Busy, missing, denied, failed, or non-settling clipboard transports SHALL NOT retain an unbounded queue or permanently prevent later copy attempts. A1 SHALL automatically settle failed requests and release or quarantine stalled delivery resources without user intervention. A known delivery failure or rejected payload SHALL produce concise non-modal feedback without revealing copied text or claiming success.

Where copying uses a terminal protocol without delivery acknowledgment, submission SHALL NOT be represented as verified clipboard success. Copy SHALL preserve the intended clipboard destination: a remote session SHALL NOT silently substitute the remote machine's clipboard for the user's terminal clipboard. Unsupported payloads SHALL be rejected explicitly rather than silently truncated, partially copied, or sent as an unbounded terminal control sequence.

#### Scenario: Clipboard transport does not settle
- **WHEN** a copy transport remains pending past the declared deadline
- **THEN** the request SHALL expire automatically with non-modal failure feedback
- **AND** the UI SHALL remain usable throughout the wait and after expiration
- **AND** later requests SHALL use a recovered safe transport or fail promptly rather than wait behind that expired request

#### Scenario: Repeated copies overlap
- **WHEN** several distinct response selections are copied before an earlier delivery completes
- **THEN** pending requests and retained payload bytes SHALL stay within declared bounds
- **AND** the newest accepted request SHALL supersede any older request that has not started delivery
- **AND** an older request SHALL NOT be submitted after a newer request or overwrite a newer completed copy through a late A1-controlled delivery

#### Scenario: Recover a failed transport
- **WHEN** a copy fails and a supported transport becomes usable again
- **THEN** a subsequent copy SHALL be able to succeed without restarting the UI
- **AND** stale completion or timeout callbacks SHALL NOT alter the newer request's outcome

#### Scenario: No supported destination or payload size
- **WHEN** no usable transport can reach the intended clipboard or the selected payload exceeds its supported limit
- **THEN** A1 SHALL report that copying could not be completed without opening a modal dialog
- **AND** it SHALL NOT silently copy a prefix, write to a different host's clipboard, or suspend normal interaction

#### Scenario: Submit through an unacknowledged terminal protocol
- **WHEN** the supported delivery path can acknowledge only terminal submission rather than actual clipboard contents
- **THEN** any feedback SHALL distinguish submission from verified delivery
- **AND** A1 SHALL NOT wait indefinitely for an acknowledgment the protocol does not provide

### Requirement: Responsive response copying preserves text and input ownership
Response copying SHALL preserve the accepted selected-text semantics: complete graphemes, forward/reverse equivalence, source newline boundaries, and exclusion of ANSI controls, viewport padding, rail/control glyphs, sticky duplicates, dock rows, and transient working-status content. Clearing or reflowing the display after the copy action SHALL NOT change its captured content.

The change SHALL preserve prompt-selection precedence, copy/cut/paste semantics, `/copy`, and Ctrl+C behavior when no copyable transcript selection exists. Modal and replacement surfaces SHALL retain their input ownership. The `a1 pi` comparison path and installed Pi packages SHALL remain unchanged.

#### Scenario: Copy a styled multiline response
- **WHEN** a response selection includes styled text, wide or combining graphemes, and multiple source rows
- **THEN** the clipboard payload SHALL equal the accepted semantic selection in either drag direction
- **AND** no terminal styling, viewport chrome, or transient working content SHALL enter the payload

#### Scenario: Input immediately follows copy
- **WHEN** `Ctrl+C` for a selected response is immediately followed by typing, scrolling, or a paste action
- **THEN** the copy key SHALL NOT leak into agent cancellation or the prompt
- **AND** following actions SHALL preserve receipt order and their existing semantics
- **AND** a paste admitted while that copy is pending SHALL wait only within the copy's remaining deadline and its own paste deadline, and SHALL fail that dependent paste rather than silently insert the previous clipboard value if the copy fails
- **AND** a later independent paste SHALL be able to acquire the current clipboard normally instead of inheriting the completed copy failure indefinitely

#### Scenario: Another surface owns Ctrl+C
- **WHEN** the prompt has selection precedence, a modal or replacement surface owns input, or there is no copyable transcript selection
- **THEN** the transcript-copy path SHALL NOT steal `Ctrl+C` from its existing handler
- **AND** prompt editing, cancellation, and comparison-profile behavior SHALL remain unchanged

#### Scenario: Session ends with a copy pending
- **WHEN** the session is replaced or disposed while copy preparation or delivery is pending
- **THEN** A1 SHALL cancel pending work, bound resource cleanup, and restore terminal state
- **AND** old-session callbacks SHALL NOT issue new clipboard or terminal writes, mutate the new session, or keep the process alive indefinitely
- **AND** cancellation SHALL NOT claim to undo a clipboard write already completed by the operating system

### Requirement: Standalone prompt pasting does not suspend the UI
When the ordinary bare-A1 prompt owns `Ctrl+V`, A1 SHALL keep subsequent input, scrolling, rendering, visible animation, and agent-event processing responsive throughout paste acquisition, preparation, and insertion. This guarantee SHALL apply independently of any preceding A1 copy, including clipboard content supplied by another application. Paste SHALL NOT pause the agent, unexpectedly change follow/detach state, or require Esc, a focus change, another recovery key, or restart.

Supported native clipboard reads and terminal-provided bracketed paste SHALL preserve their existing routing distinction. A nonempty payload supplied by the terminal SHALL be processed as that payload without a duplicate native clipboard read. Blocking format detection, path inspection, image conversion, text classification, or insertion/presentation work SHALL NOT monopolize the UI event loop merely because acquisition was asynchronous. Existing text normalization, chip behavior subject to the oversized-path-list presentation exception below, image validation, and attachment limits SHALL remain authoritative.

#### Scenario: Paste text copied outside A1
- **WHEN** the reader copies ordinary text in another application and presses Ctrl+V in the A1 prompt without an earlier A1 copy
- **THEN** the text SHALL be inserted once through the accepted paste policy
- **AND** later input and eligible UI frames SHALL progress before any slow clipboard acquisition or preparation completes

#### Scenario: Paste while the agent works
- **WHEN** the reader pastes into the ordinary prompt during streamed output
- **THEN** editor input, viewport scrolling, visible working animation, and streamed content SHALL continue progressing
- **AND** the paste SHALL NOT submit the prompt, cancel the agent, or detach a followed viewport by itself

#### Scenario: Receive terminal-owned paste
- **WHEN** the terminal consumes Ctrl+V and supplies a nonempty bracketed paste, including valid split framing across input chunks
- **THEN** A1 SHALL insert or classify that supplied content exactly once without rereading the native clipboard
- **AND** delimiter-like payload bytes SHALL remain opaque text under the existing framing policy rather than become commands or pointer input
- **AND** expensive handling after receipt SHALL remain bounded and responsive

#### Scenario: Prepare large text, paths, or an image
- **WHEN** supported pasted content needs expensive text classification, path inspection, or image preparation
- **THEN** input and visible animation SHALL receive processing opportunities while that work runs
- **AND** completion SHALL retain the accepted text/URL/path/image representation, exact expanded text, and existing image safety limits
- **AND** plain-text acquisition SHALL NOT display a misleading screenshot chip merely because its content is still unknown

### Requirement: Oversized path lists use bounded compact paste presentation
Bare A1 SHALL budget individual path-chip presentation at 4,096 UTF-16 code units per successfully classified path-list paste, counting each occurrence, existing label/icon/framing, and a conservative 20-unit collision-suffix allowance per occurrence. Classification and adoption SHALL use the same base-tag formatting. When this estimate exceeds the budget, the isolated preparer SHALL produce one existing text-paste chip representation before transfer/adoption rather than construct a giant editor string or thousands of provisional UI chips.

The compact chip SHALL retain the exact concatenation of classified full paths in occurrence order, including duplicates, without extra separators, content truncation, or further text normalization. It SHALL use existing text-paste chip identity, atomic editing, copying, history/submission expansion, reservation, cancellation, and undo/redo behavior. Individual member-chip editing is replaced by one atomic chip only for over-budget lists. In-budget file/folder/image-file chips SHALL remain unchanged. This policy SHALL apply equally to native and terminal-provided owned paste, SHALL NOT reread terminal-supplied content, and SHALL NOT change the pinned comparison path, existing draft/history chips, clipboard byte/image limits, or failed-probe original-text fallback.

#### Scenario: A successfully classified path list exceeds its display budget
- **WHEN** a supported native or terminal-provided path-list paste would exceed 4,096 budgeted UTF-16 units of individual-chip presentation
- **THEN** A1 SHALL insert one compact text-paste chip once and preserve every full expanded path in order
- **AND** the UI SHALL NOT adopt individual chips for that list before compacting it
- **AND** following input and eligible frames SHALL continue progressing without waiting for unbounded editor layout

#### Scenario: A path list fits the budget
- **WHEN** the complete per-paste estimate, including framing and suffix allowances, is at most 4,096 UTF-16 units
- **THEN** the existing individual file/folder/image-file chips and their editing semantics SHALL remain unchanged
- **AND** repeated occurrences and surrogate-pair labels SHALL count toward the same per-paste budget

#### Scenario: Copy, recall, submit, or undo a compact path-list paste
- **WHEN** a compact path-list chip is copied, persisted for history, submitted, selected, deleted, or restored by undo/redo
- **THEN** it SHALL behave as the existing atomic text-paste chip and expand to all of its classified full paths without loss or reordering
- **AND** cancellation or session replacement before insertion SHALL NOT restore obsolete content or overwrite later typing

#### Scenario: Path classification cannot finish safely
- **WHEN** filesystem classification fails or times out for a large candidate list
- **THEN** A1 SHALL preserve the established safe original-text fallback and its existing compact-text policy
- **AND** it SHALL NOT compact a partially classified prefix as though it represented the complete list

### Requirement: URL-chip presentation bounds explicit hyperlink metadata without losing content
Bare A1 SHALL limit added OSC 8 metadata to 65,536 UTF-8 bytes per editor decoration pass, including opening/closing pairs and row cleanup closes across visible rows and repeated occurrences. A1 SHALL reject over-budget decoration before constructing its control string; a target whose UTF-16 length already exceeds the remaining byte allowance SHALL NOT require whole-target scanning, encoding, or hashing to make that decision. Each render pass SHALL receive a fresh budget.

When a complete link does not fit, A1 SHALL omit that explicit hyperlink rather than emit a partial or truncated target. It SHALL preserve the full supported pasted URL, URL-chip identity and atomic editing, and exact copy/history/submission expansion. In-budget links SHALL retain their existing presentation and input semantics. This display-only fallback SHALL NOT change native-versus-terminal paste routing, image limits, the general transcript hyperlink policy, or the pinned comparison path. Terminal-owned automatic URL recognition remains separate from A1's explicit metadata.

#### Scenario: Paste a URL near the supported text limit
- **WHEN** native or terminal-provided paste contains a supported URL whose full target exceeds the metadata budget
- **THEN** A1 SHALL insert its normal URL chip once and retain the full URL for copying and submission
- **AND** resulting presentation SHALL omit its oversized OSC 8 target without building or emitting a prefix of that target
- **AND** following input and eligible UI frames SHALL continue normally

#### Scenario: Several visible URL chips exhaust the aggregate budget
- **WHEN** otherwise supported hyperlink occurrences across editor rows would exceed the per-pass metadata allowance
- **THEN** the total emitted OSC 8 metadata SHALL remain within that allowance, including framing and cleanup
- **AND** omitted occurrences SHALL retain their exact backing values and chip semantics
- **AND** a later smaller occurrence MAY receive its complete link if it fits the remaining allowance

#### Scenario: Render in-budget links repeatedly
- **WHEN** the same editor content is rendered again, including after selection or resize
- **THEN** the metadata budget SHALL reset and the same in-budget links SHALL retain their exact targets and normal geometry
- **AND** accounting SHALL use UTF-8 bytes and complete control framing rather than character counts alone

### Requirement: Paste acquisition and preparation recover within bounded lifetimes
Every A1-owned paste request SHALL have a finite declared end-to-end deadline covering any prerequisite write wait, acquisition, preparation, and insertion. Concurrent requests, retained payload bytes, helpers, and pending insertions SHALL stay within declared bounds. Busy, denied, missing, non-settling, or failed readers/preparers SHALL settle automatically with concise non-modal feedback for actionable failures. Empty clipboard content SHALL remain a no-op rather than a modal error.

A timed-out or canceled operation SHALL NOT retain a permanent read/write barrier, block a safe later clipboard action, or mutate the editor through late completion. Stalled executors whose termination is unconfirmed SHALL be quarantined within the resource budget, not silently replaced with unlimited new executors. Unsupported or oversized content SHALL be rejected explicitly rather than partially inserted or silently truncated. Failure cleanup SHALL preserve unrelated draft text and later edits.

#### Scenario: Standalone clipboard read stalls
- **WHEN** Ctrl+V starts a clipboard read that does not settle
- **THEN** the UI SHALL remain usable while the read is pending and the request SHALL expire automatically at its deadline
- **AND** its pending insertion SHALL be removed or settled through the accepted failure presentation without losing the reader's draft
- **AND** no recovery key SHALL be needed

#### Scenario: A later paste succeeds after failure
- **WHEN** an earlier copy or paste has failed and the reader independently pastes available content again
- **THEN** the new request SHALL perform a fresh supported acquisition without restarting A1 or requiring a successful intermediate copy
- **AND** failure state from the older request SHALL NOT be reused as a permanent rejection of the new request

#### Scenario: Preparation stalls after a successful read
- **WHEN** clipboard acquisition finishes but path inspection, conversion, or another preparation step stops progressing
- **THEN** the same end-to-end deadline SHALL still bound the paste operation
- **AND** the editor and agent UI SHALL remain responsive instead of waiting synchronously for preparation or teardown

#### Scenario: Clipboard is empty or unusable
- **WHEN** the clipboard is empty, access is denied, or no supported acquisition route is available
- **THEN** A1 SHALL leave unrelated prompt content unchanged and settle the paste without a modal dialog
- **AND** empty content SHALL be a no-op while an actionable access or transport failure SHALL receive concise feedback
- **AND** A1 SHALL NOT substitute a different host's clipboard for the intended source

### Requirement: Pending pastes preserve distinct edits and input ownership
Each admitted paste SHALL preserve its invocation order and reserved insertion or replacement position while acquisition/preparation is pending. Distinct accepted pastes SHALL NOT use response copy's newest-pending supersession policy. Capacity rejection SHALL be explicit; accepted actions SHALL NOT be silently dropped, duplicated, or reordered by differing completion speeds. Typing, selection changes, undo/redo, and later clipboard actions SHALL continue to use their existing editing semantics.

Modal and replacement surfaces SHALL retain ownership of their paste input rather than being intercepted by the ordinary-prompt paste path. Session replacement, disposal, removal of a pending insertion, or another accepted cancellation action SHALL invalidate that request so late results cannot restore canceled content, overwrite subsequent edits, or act on a new session. The pinned `a1 pi` behavior SHALL remain unchanged.

#### Scenario: Two pastes complete out of order
- **WHEN** two distinct pastes are admitted with intervening typing and their preparations finish in reverse order
- **THEN** each result SHALL replace only its own reserved insertion, preserving invocation order and the intervening text
- **AND** neither paste SHALL be discarded merely because a newer paste was requested

#### Scenario: Edit or undo while a paste is pending
- **WHEN** the reader edits around a pending paste or removes/undoes its reserved insertion before completion
- **THEN** unrelated edits SHALL remain intact
- **AND** a canceled insertion SHALL NOT reappear or replace the current selection when its old result arrives

#### Scenario: Exceed concurrent paste capacity
- **WHEN** a new paste would exceed the declared request or payload budget
- **THEN** A1 SHALL reject that new request non-modally without silently removing an already accepted paste
- **AND** releasing completed or canceled resources SHALL permit later safe requests without restart

#### Scenario: Replace or close the session while pasting
- **WHEN** a session is replaced or disposed during clipboard reading or preparation
- **THEN** A1 SHALL invalidate pending insertions and bound resource cleanup while restoring terminal state
- **AND** late callbacks SHALL NOT write to the terminal, insert text/images into the new session, or keep shutdown waiting indefinitely

### Requirement: Clipboard freeze acceptance includes stalled delivery and physical evidence
Copy and paste acceptance SHALL combine deterministic fault-injection evidence with user-controlled physical-terminal testing of the exact candidate. Automated evidence SHALL distinguish input receipt/framing, selected-text preparation, selection-clearing presentation, clipboard write/read submission and completion, prerequisite waits, paste classification/conversion, editor insertion/presentation, timer progress, and terminal output; it SHALL NOT treat an unresolved asynchronous clipboard promise alone as proof of a whole-UI freeze. Diagnostic records SHALL be bounded and omit selected/pasted text, clipboard contents, paths, images, and encoded payloads. Copy-only, paste-only, and combined flows SHALL receive separate evidence; passing one SHALL NOT establish that the others are fixed.

#### Scenario: Exercise the deterministic freeze matrix
- **WHEN** clipboard regression evidence runs
- **THEN** it SHALL cover cold/warm copy-only, standalone paste-only, and combined operations; repeated distinct requests; long text/selections/sessions; URL/path and existing image cases; native and terminal-provided paste; streaming overlap; write/read/preparation contention, failure and non-settlement; delayed terminal submission; subsequent input; and disposal
- **AND** assertions SHALL fail event-loop monopolization, blocked subsequent input, unbounded pending work, stale deliveries, incorrect text, and incomplete terminal restoration
- **AND** deadline/ordering gates SHALL use controlled scheduling rather than shared-CI wall-clock latency alone

#### Scenario: Accept the exact candidate physically
- **WHEN** the candidate is tested in the user's terminal with repeated selected-response Ctrl+C, independent Ctrl+V using content copied outside A1, and combined copy/paste while idle and while the agent works
- **THEN** copied text SHALL be checked in a separate application, pasted content SHALL be checked in the A1 prompt, and the UI SHALL remain immediately usable throughout both shortcuts without Esc or another recovery action
- **AND** the exact build, terminal/version, local or remote topology, geometry, transport route, workload, and acceptance result SHALL be recorded

#### Scenario: Physical copying or pasting still freezes
- **WHEN** the user observes another copy- or paste-triggered freeze despite passing automated checks
- **THEN** acceptance SHALL fail and the implementation SHALL remain unaccepted
- **AND** suggesting a recovery shortcut SHALL NOT count as fixing or accepting the behavior
