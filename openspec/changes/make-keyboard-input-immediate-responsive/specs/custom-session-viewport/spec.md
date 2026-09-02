## ADDED Requirements

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
