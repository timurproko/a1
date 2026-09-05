## MODIFIED Requirements

### Requirement: A detached viewport exposes a scroll-to-bottom control
When overflowing transcript content is detached from its end, the viewport SHALL draw one scroll-to-bottom control floating over the final visible transcript row. The control SHALL NOT consume a row or move transcript text outside the viewport. It SHALL have normal and pointed-at presentation states, SHALL activate only from its own hit region, and SHALL disappear as soon as end following resumes or content ceases to overflow.

The visible control SHALL use its pointed-at presentation exactly when the latest known terminal pointer position is inside its current hit region. The first frame that reveals the control or changes its hit region SHALL reflect that position without requiring a new mouse-motion report. Coordinate-bearing mouse reports delivered to viewport pointer handling, including wheel, press, release, and motion reports, SHALL update the known pointer position without changing existing event ownership or activation rules. Hiding the control SHALL NOT discard that position; the existing pointer-state reset and session teardown lifecycle SHALL clear it. With no known pointer position, the control SHALL use its normal presentation.

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
