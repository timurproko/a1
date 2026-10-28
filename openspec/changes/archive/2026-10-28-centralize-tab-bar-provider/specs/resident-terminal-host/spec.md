## ADDED Requirements

### Requirement: Active outer resize repaints the complete frame directly

When an attach client's outer terminal reports changed geometry, A1 SHALL immediately update the host's geometry and generation, forward the new size to the viewed child, and repaint the retained complete strip and child frame at the current dimensions in one synchronized presentation. A1 SHALL NOT show a resize-only curtain, centered status, dimmed reveal, or fade, whether the resize is a quick snap, a prolonged drag, or a background terminal-tab geometry change. Subsequent current-geometry child surfaces SHALL replace the retained rows normally. A resize notification matching already established dimensions SHALL remain a no-op. Focus gain SHALL request a complete current-size repaint without replaying stale resize feedback. Startup first-draw and tab-switch coherence rules SHALL remain unchanged.

#### Scenario: Initial unchanged resize notification stays invisible

- **WHEN** attach startup receives a resize notification matching its established terminal columns and rows
- **THEN** A1 SHALL preserve the ordinary startup presentation path without repainting or showing a resize message

#### Scenario: Continuous window resize keeps the current frame

- **WHEN** the user drags the outer terminal boundary and multiple resize events arrive
- **THEN** each accepted geometry SHALL be forwarded and the complete retained frame SHALL repaint at the new size
- **AND** no centered resize status, blank-only frame, or resize fade SHALL appear

#### Scenario: A fresh surface completes resize

- **WHEN** the active holder publishes a surface for the final geometry
- **THEN** A1 SHALL paint the latest child content at full intensity without waiting for a settle or recovery timer

#### Scenario: Inactive terminal tab returns after resize

- **WHEN** another terminal tab was active while the A1 terminal changed dimensions and the user returns
- **THEN** A1 SHALL repaint the current complete frame without replaying a resize-only curtain or fading the child cursor

## REMOVED Requirements

### Requirement: Active outer resize uses a stable dimension curtain
**Reason**: The resize-only curtain and faint reveal flash during quick snaps and terminal-tab switches, while direct full-frame repainting already keeps the interface usable.

**Migration**: Use "Active outer resize repaints the complete frame directly".
