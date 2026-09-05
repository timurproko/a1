## MODIFIED Requirements

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
- **THEN** its text, color, spacing, animation, extension statuses, and lifecycle SHALL be the same as before this placement change

#### Scenario: Resize the terminal
- **WHEN** the terminal width or height changes
- **THEN** the frame SHALL be recomputed within the new dimensions
- **AND** the dock SHALL remain pinned while transcript and working-status wrapping, viewport height, scrollbar geometry, and hit regions update to the new size

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

## ADDED Requirements

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
