## MODIFIED Requirements

### Requirement: Copy output matches selected visible text

When automatic fullscreen copy is enabled, completing a nonempty frame drag SHALL capture and submit the selected visible text for clipboard delivery without requiring a second keypress. When automatic fullscreen copy is disabled, release SHALL retain the nonempty selection without submitting it, and the existing explicit selection-copy action SHALL remain available. Copy output SHALL include selected visible glyphs from every participating surface, including prompt prefixes and timestamps, steering and working text, notices, widgets, autocomplete text, and footer/status values. It SHALL preserve visual row boundaries as newlines while excluding ANSI and OSC controls, unselected right padding, cursor markers, scrollbar glyphs, and content covered by modal or overlay presentation.

The selected background SHALL remain visible after release. Successful automatic or explicit frame-selection delivery of payload containing non-whitespace text SHALL produce exactly one transient acknowledgement reading `copied N chars to clipboard`, where `N` is the character count of the exact copied plain-text payload. The acknowledgement SHALL be right-aligned in the active theme's accent role immediately above the editor, without reverse-video or panel background styling. It SHALL be painted over the existing frame without allocating a row, changing dock or viewport height, moving transcript content, changing the visible document range, moving the editor or footer, or changing pointer hit regions. A newer acknowledgement SHALL replace the prior acknowledgement and restart its transient lifetime rather than stacking or allocating another row. Successful delivery of a payload containing only whitespace SHALL show no acknowledgement. Failed or timed-out delivery SHALL use the existing recoverable copy-failure presentation. Clipboard preparation and delivery SHALL remain bounded and asynchronous and SHALL NOT block input, streaming, scrolling, animation, rendering, or shutdown. `Ctrl+C` with a retained frame selection SHALL remain available as explicit re-copy-and-clear behavior.

#### Scenario: Release a cross-frame selection
- **WHEN** automatic fullscreen copy is enabled and the reader releases a nonempty selection spanning transcript text, blank rows, a prompt, and footer/status content
- **THEN** clipboard submission SHALL begin from one immutable snapshot at that input boundary
- **AND** the payload SHALL contain the selected visible text in frame order with source newlines and selected blank-line boundaries
- **AND** the highlight SHALL remain visible while delivery proceeds

#### Scenario: Release a selection with automatic copy disabled
- **WHEN** automatic fullscreen copy is disabled and the reader releases a nonempty frame selection
- **THEN** A1 SHALL retain the selected highlight without submitting clipboard work or showing a copied acknowledgement
- **AND** the reader SHALL remain able to invoke the established explicit selection-copy action

#### Scenario: Copy styled and linked text
- **WHEN** selected frame content contains ANSI styling, an OSC 8 link, a wide grapheme, or a combining sequence
- **THEN** the clipboard payload SHALL contain only complete plain-text graphemes in the selected range
- **AND** selection painting SHALL preserve the original visible foreground and attributes beneath its background

#### Scenario: Acknowledge copied text beside the editor
- **WHEN** a frame-selection payload containing non-whitespace text is delivered
- **THEN** one right-aligned accent message immediately above the editor SHALL read `copied N chars to clipboard` using the exact payload's character count
- **AND** no reverse-video box, panel background, top-right flash, added row, transcript jump, dock movement, editor movement, or hit-region movement SHALL occur

#### Scenario: Replace rapid copy acknowledgements
- **WHEN** another frame-selection copy succeeds before the current acknowledgement expires
- **THEN** the newest count SHALL replace the existing acknowledgement in the same frame location and restart its transient lifetime
- **AND** copy acknowledgements SHALL NOT accumulate into multiple rows or alter frame allocation

#### Scenario: Expire copied acknowledgement
- **WHEN** the active copied acknowledgement reaches the end of its transient lifetime
- **THEN** its cells SHALL be removed without changing viewport position, dock allocation, editor/footer position, or the selected source
- **AND** the underlying current frame SHALL be restored without stale acknowledgement text

#### Scenario: Copy only whitespace
- **WHEN** the delivered frame-selection payload contains only spaces, tabs, newlines, or other whitespace
- **THEN** the exact whitespace payload SHALL still be delivered to the clipboard
- **AND** no success acknowledgement SHALL be shown

#### Scenario: Continue using the shell while copy is pending
- **WHEN** clipboard preparation or delivery is slow while agent output, editor input, or timers continue
- **THEN** those activities SHALL continue without waiting for copy completion
- **AND** later frame changes SHALL NOT alter the captured payload

#### Scenario: Re-copy with Ctrl+C
- **WHEN** a released frame selection is still visible and the reader presses `Ctrl+C`
- **THEN** A1 SHALL submit the same currently selected visible text through the bounded clipboard path regardless of the automatic-copy setting
- **AND** clear the retained frame selection through the established copy-clearing behavior

#### Scenario: Preserve semantic copy routes
- **WHEN** the reader invokes `/copy` or copies/cuts a keyboard-selected prompt range
- **THEN** those routes SHALL retain their existing semantic last-message or exact-editor-text behavior
- **AND** complete-frame visual copy rules SHALL NOT add footer, notice, or other screen chrome to those payloads

### Requirement: Frame selection presents current state with bounded work

Selection motion SHALL use the immediate input presentation path and retain at most the newest unpublished endpoint. With unchanged frame content and geometry, composition SHALL recompute only visible rows whose normalized selected range changed and SHALL reuse every other row. Selection lookup and per-motion work SHALL be bounded by visible frame height rather than complete transcript length.

Each selection endpoint SHALL remain attached to the surface row from which it originated. An endpoint over scrollable agent-stream content SHALL move on screen by the same row delta as that source content when followed output or navigation changes the visible document range. An endpoint over pinned status, footer, prompt, widget, notice, or other non-scrolling frame content SHALL remain attached to that pinned content and SHALL NOT inherit transcript scroll movement. A selection crossing the viewport/dock boundary SHALL project each endpoint independently while remaining one ordered range. Off-screen selected document content SHALL be clipped from paint rather than transferred to unrelated visible cells.

Creating or retaining a selection SHALL NOT by itself detach a viewport that was following the transcript end. Explicit reader navigation SHALL retain its existing follow/detached behavior. A content, viewport-position, dock-allocation, terminal-size, theme, hyperlink, control, input-surface, modal/overlay-geometry, or session-lifecycle change SHALL reproject valid endpoint anchors and invalidate affected reuse. If the selected source can no longer be identified safely after reflow, replacement, or removal, A1 SHALL clear the uncertain selection rather than paint or copy unrelated text. Reset, session replacement, focus loss, surface handoff, and disposal SHALL clear pending pointer ownership and frame selection without stale paint or later copy.

#### Scenario: Move across frame regions
- **WHEN** successive motion reports extend a selection from viewport rows through dock rows with unchanged geometry
- **THEN** each presentation SHALL recompute only rows whose selected range changed
- **AND** stable selected and unselected rows SHALL be reused

#### Scenario: Burst pointer reports while streaming
- **WHEN** several selection motions and transcript updates arrive before another frame can be presented
- **THEN** the next presentation SHALL combine the latest endpoint with the newest frame content
- **AND** no later frame SHALL restore an obsolete endpoint or overwrite newer selection feedback

#### Scenario: Follow selected agent output
- **WHEN** the viewport is following the end, a retained selection points to agent-stream document rows, and appended output advances those rows upward
- **THEN** the selection SHALL advance upward by the same terminal-row distance as its selected source
- **AND** the highlight SHALL NOT remain on unrelated text that takes over the former terminal cells

#### Scenario: Keep selected pinned text stationary
- **WHEN** a retained selection points to status, footer, prompt, widget, notice, or other pinned text while transcript output advances
- **THEN** the selection SHALL stay with that pinned source rather than moving by the transcript row delta
- **AND** the transcript SHALL retain its existing follow behavior

#### Scenario: Preserve a mixed viewport-to-dock selection
- **WHEN** one retained selection endpoint belongs to scrolling agent output and the other belongs to pinned frame content
- **THEN** each endpoint SHALL follow its own surface while the result remains one ordered selection
- **AND** clipping one endpoint at a frame edge SHALL NOT remap either endpoint onto another surface

#### Scenario: Preserve explicit detached navigation
- **WHEN** the reader explicitly scrolls away from the end before or after selecting content
- **THEN** subsequent output SHALL retain the established detached reading position
- **AND** valid selected document and pinned rows SHALL remain attached to their respective surfaces within that frame

#### Scenario: Select in a long session
- **WHEN** visible geometry and pointer movement are equivalent in short and very long transcripts
- **THEN** frame-selection lookup and per-motion composition work SHALL remain equivalent
- **AND** off-screen transcript rows SHALL NOT be scanned to select dock or visible viewport content

#### Scenario: Resize with a retained selection
- **WHEN** terminal size or dock allocation changes while a selection is active or retained
- **THEN** A1 SHALL recompute the affected visible-frame mapping before painting or copying
- **AND** no stale highlight, hidden row, control glyph, or out-of-bounds cell SHALL remain selected

#### Scenario: Selected source becomes ambiguous
- **WHEN** reflow, replacement, or removal prevents A1 from proving that a selection endpoint still refers to its original source row
- **THEN** A1 SHALL clear the uncertain selection instead of transferring it to text at the old terminal coordinate
- **AND** no stale selection SHALL be copied later

#### Scenario: Replace or close the session during a gesture
- **WHEN** the session resets, is replaced, loses focus, or is disposed during a pending or active selection
- **THEN** pointer ownership, selection timers, retained rows, and pending auto-copy capture SHALL be cleared
- **AND** no state from the prior frame SHALL appear or copy later
