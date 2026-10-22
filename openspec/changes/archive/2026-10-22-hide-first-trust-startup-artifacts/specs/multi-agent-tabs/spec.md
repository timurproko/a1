## ADDED Requirements

### Requirement: First-run project-trust handoff stays visually quiet
When a viewed resident Agent confirms its startup project-trust decision, A1 SHALL treat the blank child surface between the cleared trust dialog and the first drawn owned-shell frame as a presentation handoff rather than visible activity. During that handoff, the tab chip SHALL retain its name without a starting lifecycle glyph and the body SHALL expose no child cursor. This exception SHALL NOT alter the tab's structured lifecycle state or suppress working, input-needed, settlement, crash, restart, or failure indicators outside the handoff.

#### Scenario: Confirm trust before the shell draws
- **WHEN** the user confirms a project-trust choice and the starting resident child publishes a blank surface before its owned shell is drawn
- **THEN** the viewed chip SHALL show no starting lifecycle glyph and the blank body SHALL show no cursor

#### Scenario: Complete the startup handoff
- **WHEN** the owned shell publishes its first drawn frame after the blank trust handoff
- **THEN** A1 SHALL present that frame with its normal cursor and status behavior without retaining the handoff suppression

#### Scenario: Preserve meaningful tab indicators
- **WHEN** the same or another tab works, needs input, settles, crashes, restarts, restores outside the blank trust handoff, or fails
- **THEN** its applicable status indicator SHALL remain visible according to the ordinary resident-tab status contract

### Requirement: Resident structured replay converges to the newest child frame
When a viewed resident child publishes a complete structured frame, A1 SHALL present the newest value of every child cell and SHALL remove content that occupied a cell only in the prior frame. Explicit backgrounds on trailing blank cells SHALL remain part of the child frame through retained capture and outer presentation. Differential repainting, overlays, and row reuse SHALL NOT retain an obsolete scroll control, live-status row, glyph, background, or text after the authoritative child frame replaces or clears it.

#### Scenario: Clear a formerly painted bottom row
- **WHEN** a complete child frame clears or replaces a row that previously contained a scroll-to-bottom control or live status
- **THEN** the resident presentation SHALL replace every former cell with the newest row
- **AND** no second control, status line, or stale background SHALL remain near the dock

#### Scenario: Preserve styled trailing blanks
- **WHEN** a child row contains an explicit component background through trailing blank cells at its content boundary
- **THEN** retained capture and outer presentation SHALL preserve that background through the final intended cell
- **AND** a separately painted scrollbar rail SHALL NOT cause an intervening default-background gap

#### Scenario: Keep differential presentation coherent
- **WHEN** unchanged rows are reused while one or more rows are cleared, restyled, or replaced
- **THEN** A1 SHALL repaint the changed rows in one coherent presentation and acknowledge the new baseline only after the complete outer write succeeds
- **AND** unchanged popup, cursor, hyperlink, selection, and strip behavior SHALL remain intact
