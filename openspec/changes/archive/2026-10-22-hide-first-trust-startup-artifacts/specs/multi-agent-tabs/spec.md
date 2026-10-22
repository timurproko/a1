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

### Requirement: Tab chips pad before the icon and separate it from the name
A1 SHALL paint one leading padding cell in each tab chip and one separating space between an applicable lifecycle icon and its name. Icon-less chips SHALL retain the leading padding cell. Width calculations and hit regions SHALL match the painted cells.

#### Scenario: Paint a chip with an icon
- **WHEN** a tab chip displays a lifecycle icon and a name
- **THEN** its first cell SHALL be a space, followed by the icon, one separating space, and the name

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

#### Scenario: Preserve solo content through the full resident pipeline
- **WHEN** solo and resident children receive identical terminal output at identical content geometry, including erased colored blanks, regional scrolling, links, wide glyphs, and moved overlays
- **THEN** retained capture, wire transport, and differential resident replay SHALL preserve the same semantic cells, styles, links, and child cursor position after each complete frame
- **AND** splitting a synchronized frame across transport reads SHALL NOT change its final content

#### Scenario: Preserve child geometry below the strip
- **WHEN** the outer terminal has one tab-strip row and the remaining rows belong to the child
- **THEN** the child SHALL receive the reduced height and use child-local cursor and scrolling coordinates
- **AND** presentation SHALL apply exactly one row offset without shifting, duplicating, or retaining content at the bottom edge

#### Scenario: Match solo fullscreen wrapping behavior
- **WHEN** the outer resident presenter paints complete retained rows as positioned cells
- **THEN** automatic line wrapping SHALL remain disabled for the outer fullscreen session so writing the final column cannot move content into another row
- **AND** leaving the outer session SHALL restore normal wrapping without changing the child terminal's own wrapping semantics

#### Scenario: Keep differential presentation coherent
- **WHEN** unchanged rows are reused while one or more rows are cleared, restyled, or replaced
- **THEN** A1 SHALL repaint the changed rows in one coherent presentation and acknowledge the new baseline only after the complete outer write succeeds
- **AND** unchanged popup, cursor, hyperlink, selection, and strip behavior SHALL remain intact
