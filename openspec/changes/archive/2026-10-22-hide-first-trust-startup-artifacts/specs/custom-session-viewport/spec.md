## ADDED Requirements

### Requirement: Viewport background and transient overlays form one current frame
The custom session viewport SHALL complete each transcript row's component background through the content boundary before composing the reserved scrollbar rail. When the rail is visible, its track or thumb SHALL be painted only in the reserved rail cell over the continued row surface; when hidden, no phantom gutter SHALL remain.

A scroll-to-bottom control and each bottom-aligned live-status row SHALL have exactly one representation in the current frame. When control text, hover, visibility, or row changes, or when dock/transient geometry changes, cells occupied only by the former representation SHALL be restored from the current transcript source or cleared in the same resulting frame. Differential presentation SHALL NOT leave stale copies near the dock.

#### Scenario: Paint a component background beneath the reserved rail
- **WHEN** a transcript component with an explicit full-row background is visible while the viewport reserves a scrollbar rail
- **THEN** its background SHALL remain continuous through the content boundary and beneath the reserved rail surface
- **AND** the track or thumb SHALL occupy only the rail cell without a default-background gap or background-only rail stripe

#### Scenario: Hide the scrollbar
- **WHEN** scrollbar presentation does not reserve a rail cell
- **THEN** transcript rows SHALL use the full viewport width
- **AND** no blank or styled phantom gutter SHALL remain from a prior visible rail

#### Scenario: Move or relabel the scroll-to-bottom control
- **WHEN** dock height, terminal geometry, message count, or pointer state changes the visible control's row, label, bounds, or style
- **THEN** the resulting frame SHALL contain exactly one control with the current geometry and text
- **AND** every cell occupied only by the former control SHALL show the current underlying row

#### Scenario: Remove the scroll-to-bottom control
- **WHEN** following resumes or content stops overflowing
- **THEN** the control SHALL disappear in that frame
- **AND** no stale generic or counted label or background SHALL remain above the dock

#### Scenario: Replace bottom-aligned live status
- **WHEN** live status appears, changes height or text, settles, or disappears while transcript or dock geometry also changes
- **THEN** the resulting frame SHALL contain only the current bottom-aligned status rows
- **AND** an earlier `Working` row SHALL NOT survive as a duplicate or stale painted line
