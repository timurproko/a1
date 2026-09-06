## MODIFIED Requirements

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

### Requirement: Keyboard-driven dock frames preserve stable viewport work
After a custom-viewport frame is established, a keyboard action whose semantic and geometric effects are confined to the active dock SHALL reuse the unchanged transcript and transient viewport result. Its A1-owned transcript and viewport composition work SHALL be proportional to the changed dock or input rows rather than to settled transcript size, and its terminal paint SHALL NOT clear or rewrite unchanged viewport rows.

A keyboard action that changes dock height, transcript or transient-tail content, transcript position, selection, overlay ownership, terminal geometry, or any input needed to prove viewport reuse safe SHALL recompute the affected geometry and rows conservatively. Reuse SHALL preserve the accepted transcript text, transient steering and working placement, ANSI styling, links, selection, scrollbar, sticky prompt, hit regions, focus, cursor, dock ordering, auto-scroll, and terminal-restoration behavior.

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

#### Scenario: Change pending steering presentation
- **WHEN** a queued input appears, changes, is edited, or is removed
- **THEN** the viewport SHALL recompute the affected transient rows and scroll geometry without reallocating the pinned dock
- **AND** unchanged semantic transcript rows, input rows, widgets, and footer rows SHALL remain reusable when their geometry and presentation are unchanged

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

### Requirement: Working status is a transient scrollable tail
Bare A1 SHALL place its live working-status surface, including status-owned blank spacing and retry, compaction, or extension working replacements, in a non-persistent, non-selectable transient viewport tail after semantic transcript and pending steering rows. While all semantic and transient content fits above the dock, otherwise unused viewport rows SHALL precede the working-status surface so that it remains immediately above the dock without moving already visible transcript or steering rows. When content overflows, that flexible alignment space SHALL be zero and the same working surface SHALL participate in normal viewport scrolling. The surface SHALL NOT be duplicated in the dock, converted into persisted conversation content, counted as a completed assistant message, or treated as a submitted prompt.

Pending steering and working rows SHALL contribute to overflow, scrollbar geometry, and end-following navigation while present. While detached, new transcript output, queue updates, and status animation, replacement, or removal SHALL preserve the current transcript position unless the new extent requires clamping to a valid scroll position. Removing transient rows SHALL remove their owned spacing and leave no stale copy. Idle informational and failure messages SHALL retain their existing placement. The pinned `a1 pi` route SHALL retain its existing presentation and behavior.

#### Scenario: Keep a fitting status above the input
- **WHEN** live work begins or updates while semantic transcript, pending steering, and working rows all fit above the dock
- **THEN** the working-status surface SHALL appear immediately above the dock
- **AND** unused rows SHALL remain between earlier viewport content and the working status
- **AND** existing transcript and steering rows and the editor/footer group SHALL remain at their current terminal rows

#### Scenario: Grow content while it still fits
- **WHEN** streamed content consumes one or more previously unused rows while the complete viewport content still fits
- **THEN** the flexible space before the working status SHALL shrink by the consumed rows
- **AND** the working status and pinned dock SHALL remain at their current terminal rows
- **AND** no follow scroll SHALL occur solely to keep the fitting status visible

#### Scenario: Cross the fit boundary
- **WHEN** growing content exhausts the flexible space and then exceeds the rows available above the dock
- **THEN** the one working-status surface SHALL remain the final transient viewport surface without duplication or omission
- **AND** end following SHALL advance the overflowing viewport while keeping the working status visible immediately above the dock
- **AND** the editor/footer position SHALL NOT change solely because of that boundary crossing

#### Scenario: Scroll the active indicator out of view
- **WHEN** the viewport overflows with pending steering or live working rows present and the reader scrolls toward older content
- **THEN** the viewport SHALL detach and those transient rows SHALL move with the scrollable content
- **AND** each row SHALL disappear once its actual position leaves the viewport
- **AND** no pinned copy or reserved dock row for either surface SHALL remain
- **AND** the editor and footer SHALL stay pinned

#### Scenario: Return to active work
- **WHEN** the reader scrolls to the end, presses End, or activates jump-to-bottom while transient rows remain present
- **THEN** the viewport SHALL follow the complete current tail, including pending steering and working status
- **AND** those rows SHALL be visible to the extent allowed by the viewport height
- **AND** the jump-to-bottom control SHALL disappear as following resumes

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

#### Scenario: Suppress pointer sequences begun on transient rows
- **WHEN** a pointer sequence begins on pending steering, working-status, or status-owned alignment rows outside a viewport control
- **THEN** the complete pointer sequence SHALL be consumed without creating transcript or fullscreen selection
- **AND** wheel input over those rows SHALL retain ordinary viewport scrolling

#### Scenario: Keep queue and editor behavior independent
- **WHEN** pending steering rows are visible or scrolled out of view while widgets, a replacement input, or a footer update is present
- **THEN** their existing queue lifecycle and `Alt+Up` edit action SHALL remain available
- **AND** changing their placement SHALL NOT convert them into persisted transcript messages
- **AND** widgets, the input surface, and the footer SHALL retain their established lifecycle, focus, and input handling

#### Scenario: Reset or replace the session
- **WHEN** a session is reset, replaced, or disposed while transient steering or working rows are visible or off-screen
- **THEN** no such rows, alignment spacing, scroll extent, pointer suppression, or stale painting from that session SHALL survive into the next session
