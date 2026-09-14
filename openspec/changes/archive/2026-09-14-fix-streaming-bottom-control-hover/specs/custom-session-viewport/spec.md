## MODIFIED Requirements

### Requirement: A detached viewport exposes a scroll-to-bottom control
When overflowing transcript content is detached from its end, the viewport SHALL draw one scroll-to-bottom control floating over the final visible transcript row. The control SHALL NOT consume a row or move transcript text outside the viewport. It SHALL have normal and pointed-at presentation states, SHALL activate only from its own hit region, and SHALL disappear as soon as end following resumes or content ceases to overflow.

The visible control SHALL use its pointed-at presentation exactly when the latest known terminal pointer position is inside its current hit region. The first frame that reveals the control or changes its hit region SHALL reflect that position without requiring a new mouse-motion report. Coordinate-bearing mouse reports delivered to viewport pointer handling, including wheel, press, release, and motion reports, SHALL update the known pointer position without changing existing event ownership or activation rules. Hiding the control SHALL NOT discard that position; the existing pointer-state reset and session teardown lifecycle SHALL clear it. With no known pointer position, the control SHALL use its normal presentation.

A pointer report that changes the visible control's pointed-at state SHALL make that feedback eligible through the existing input presentation path without waiting for the streamed-content presentation deadline. The first presentation composed after the report SHALL use the latest applied pointer position and current control geometry, including when editor input, wheel navigation, status animation, or streamed output has already scheduled a presentation. Superseded intermediate pointer positions need not be painted, but a later cached or streaming frame SHALL NOT restore an older hover, visibility, or hit region. Pointer reports received after a composition begins SHALL remain eligible for the next input presentation rather than being acknowledged by an older frame.

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

### Requirement: Keyboard-driven dock frames preserve stable viewport work
After a custom-viewport frame is established, a keyboard action whose semantic and geometric effects are confined to the active dock SHALL reuse the unchanged transcript document and visible viewport result. Its A1-owned transcript and viewport composition work SHALL be proportional to the changed dock or input rows rather than to settled transcript size, and its terminal paint SHALL NOT clear or rewrite unchanged transcript rows.

A keyboard action that changes dock height, transcript position, selection, overlay ownership, terminal geometry, or any input needed to prove viewport reuse safe SHALL recompute the affected geometry and rows conservatively. Reuse SHALL preserve the accepted transcript text, ANSI styling, links, selection, scrollbar, sticky prompt, hit regions, focus, cursor, dock ordering, auto-scroll, and terminal-restoration behavior.

Eligibility established when keyboard input arrives SHALL NOT authorize reuse after an intervening viewport-affecting event. At presentation composition, reused viewport output SHALL still represent the current interaction, document, transient content, geometry, and input ownership. A frame that reuses older output SHALL NOT claim that newer state was presented. Rejecting stale reuse SHALL preserve valid settled-block caches, and ordinary typing with no viewport-affecting change SHALL retain the bounded dock-only behavior.

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

## ADDED Requirements

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
