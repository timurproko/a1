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
