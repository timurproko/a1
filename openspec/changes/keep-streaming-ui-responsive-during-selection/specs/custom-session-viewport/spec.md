## ADDED Requirements

### Requirement: Selection and status feedback do not repeat unchanged transcript work
Bare A1 SHALL keep transcript selection, editor feedback, and visible working animation responsive while built-in tool arguments or results are being generated. An interaction or status-only presentation SHALL reuse unchanged prepared transcript content and SHALL NOT scan, copy, reformat, or re-highlight the complete off-screen history. Selection work for unchanged document geometry SHALL remain bounded by visible selection damage, including when another content revision is pending.

A content presentation SHALL combine its newest eligible content with the latest applied interaction state. An interaction-only presentation over previously prepared content SHALL preserve truthful content and interaction revision correspondence and SHALL NOT consume a pending newer content update. Resize, reflow, theme, links/images, and surface changes SHALL invalidate the affected reuse without changing selection, copy, or input ownership semantics.

#### Scenario: Select while a collapsed write call grows
- **WHEN** a built-in write call grows beyond its collapsed preview while the reader drags across transcript text
- **THEN** selection feedback SHALL remain eligible for immediate input presentation without waiting for stream preparation or the stream cadence
- **AND** unchanged transcript content SHALL NOT be re-highlighted because of the drag
- **AND** the next content presentation SHALL retain the newest applied selection rather than restore an older endpoint

#### Scenario: Animate beside a retained selection
- **WHEN** a selection remains visible and only the working indicator changes
- **THEN** the frame SHALL reuse unchanged transcript content and selection paint
- **AND** the indicator SHALL continue to update without clearing or reformatting settled tool blocks

#### Scenario: Repeat the same interaction in a long session
- **WHEN** the same visible content and selection movement are exercised with a short and a long off-screen history
- **THEN** interaction-only transcript preparation and copying work SHALL remain equivalent
- **AND** the extra off-screen history SHALL NOT delay pointer feedback

#### Scenario: Content geometry changes during selection
- **WHEN** a pending content revision changes wrapping or viewport allocation during a selection
- **THEN** the content frame SHALL recompute the affected geometry and apply the current selection against its corresponding source rows
- **AND** stale prepared frames SHALL NOT overwrite newer selection or hit regions

### Requirement: No-op pointer reports do not create redundant presentation
A pointer report whose applied semantics leave selection, viewport position, hover, activity-dependent appearance, and other visible state unchanged SHALL NOT independently request a new composition or terminal paint. The latest pointer coordinates and sequence ownership SHALL still be recorded. Presentation coalescing SHALL preserve the effects of all preceding pointer actions, not reinterpret a drag as only its final coordinate.

#### Scenario: Repeat a drag endpoint
- **WHEN** repeated motion reports resolve to the same selected boundary with unchanged geometry and visible state
- **THEN** those reports SHALL add no new frame or terminal write solely for themselves
- **AND** independently pending content, status, or edge-auto-scroll work SHALL remain scheduled

#### Scenario: Leave and return to the anchor before paint
- **WHEN** an active pointer sequence moves away from its anchor and returns before presentation
- **THEN** its final selected range and dragged state SHALL match sequential handling of every report
- **AND** it SHALL NOT be reduced to an ordinary click by presentation coalescing

#### Scenario: Preserve edge scrolling without motion
- **WHEN** a selection is held beyond a viewport edge and duplicate motion reports arrive
- **THEN** auto-scroll SHALL retain its configured distance and existing fixed timer cadence
- **AND** those reports SHALL neither add unscheduled scroll rows nor postpone the next tick

#### Scenario: Reveal a control after an unpainted report
- **WHEN** a pointer report updates coordinates without changing visible state and a later frame reveals a control beneath those coordinates
- **THEN** the control SHALL use its correct current hover state in that first visible frame

### Requirement: Wheel scrolling remains current during active generation
Bare A1 SHALL keep mouse-wheel scrolling responsive during sustained assistant, thinking, built-in tool, and lifecycle updates, including when no selection exists. Every owned wheel report SHALL apply its configured distance, direction, edge clamping, coordinate-dependent state, and follow/detach effect in receipt order. Presentation SHALL retain at most one newest pending viewport position and SHALL NOT paint a backlog of superseded positions after scrolling stops.

A wheel burst's final position and follow state SHALL equal sequential handling of its reports and interleaved content, keyboard, resize, and ownership actions. Ordinary wheel input SHALL NOT cause an unconditional full-screen clear or reset of differential presentation. Scrolling SHALL reuse overlapping prepared rows and SHALL NOT reformat unrelated off-screen history. Necessary paint SHALL remain confined to actual viewport damage and independently changed dock rows, with conservative handling for unsafe content or geometry.

#### Scenario: Scroll without selecting while a tool is active
- **WHEN** the reader repeatedly scrolls upward and downward while a large collapsed write call is being generated or completed
- **THEN** each newest viewport position SHALL become eligible for immediate input presentation without waiting for the stream cadence
- **AND** unchanged tool content SHALL NOT be re-highlighted merely because of wheel input
- **AND** scrolling SHALL not wait for generation to stop or continue catching up through old positions after the wheel stops

#### Scenario: Reverse direction at a boundary
- **WHEN** a burst includes outward wheel movement at the first or last row followed by movement in the opposite direction
- **THEN** the resulting position SHALL match per-report clamping in order
- **AND** summing opposite deltas before clamping or keeping only the last report SHALL NOT change the result

#### Scenario: Preserve configured wheel speeds
- **WHEN** the same wheel sequence runs at each supported scrollbar speed
- **THEN** its final distance SHALL match that speed's existing sequential behavior
- **AND** presentation coalescing SHALL neither discard wheel distance nor introduce acceleration or smoothing

#### Scenario: Read detached content during output
- **WHEN** wheel scrolling detaches the reader while new output and status updates continue
- **THEN** the chosen reading position SHALL remain stable while valid
- **AND** off-screen working status SHALL not be painted as a pinned indicator over the transcript or dock
- **AND** semantic agent progress SHALL continue without waiting for the reader to return

#### Scenario: Return to the live tail
- **WHEN** wheel scrolling reaches the current final legal position while work is active
- **THEN** end following SHALL resume with the newest eligible transcript and working tail
- **AND** no stale detached frame SHALL subsequently restore an older position

#### Scenario: Wheel at an unchanged edge
- **WHEN** a wheel report is clamped at an edge and changes no visible activity, hover, control, or content state
- **THEN** it SHALL add no composition or terminal write solely for itself
- **AND** its coordinates and ownership SHALL still be handled

#### Scenario: Route mixed input and modal scrolling
- **WHEN** keyboard bytes and mouse reports share a delivery or an overlay or replacement surface owns scrolling
- **THEN** each action SHALL retain its established order and surface ownership
- **AND** viewport optimization SHALL NOT steal modal wheel input or insert mouse bytes into the editor

### Requirement: Proven scroll movement remains bounded with selection
Bare A1 SHALL use bounded transcript-region movement for overlapping source-row shifts whose geometry, source correspondence, selection styling, and terminal safety are proven, including held or released selections and wheel-driven shifts in either direction. Paint SHALL cover exposed rows and genuinely changed content, selection, controls, and dock rows rather than rewrite unchanged overlapping rows. A selection's existence alone SHALL NOT disqualify an otherwise proven safe movement.

The proof SHALL preserve highlighted and copied source ranges, wide and combining graphemes, sticky prompts, scrollbar overlay, current pointer hit regions, and terminal restoration. Unsafe reflow, stale evidence, explicit terminal links, images, unknown terminal operations, unsupported capabilities, and uncertain ownership SHALL retain the conservative fallback. Optimization SHALL NOT clear selection, freeze the agent, change follow/detach policy, or broaden unrelated hyperlink safety rules. Non-overlapping scroll jumps SHALL repaint the necessary viewport without forcing unrelated dock repaint.

#### Scenario: Append beneath a retained selection
- **WHEN** an overflowing followed transcript advances by a proven safe source-row shift while a released selection remains
- **THEN** the existing cells SHALL move with bounded transcript-region painting
- **AND** the selected source text and copied result SHALL remain unchanged

#### Scenario: Scroll selected content in both directions
- **WHEN** wheel scrolling moves selected prepared content through an overlapping viewport range with proven safe styling and geometry
- **THEN** movement SHALL reuse unchanged overlapping cells and repaint exposed or changed rows
- **AND** it SHALL NOT move selection highlighting onto unrelated source text

#### Scenario: Encounter unsafe movement
- **WHEN** a selected or wheel-driven transition lacks a complete safety proof
- **THEN** the viewport SHALL use the conservative rendering path with a recorded reason
- **AND** final cells, selection/copy, navigation, and restoration SHALL remain correct
