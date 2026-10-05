## ADDED Requirements

### Requirement: Floating bottom-control styling remains bounded

The detached transcript's scroll-to-bottom control SHALL remain floating chrome whose normal or pointed-at background is painted only within its visible label and hit region. Its inline foreground, background, and decoration SHALL NOT redefine the underlying transcript row surface or the reserved scrollbar gutter outside that region.

The final-column gutter SHALL retain the background established independently by the underlying ordinary row or boundary-reaching selection. An idle gutter SHALL show that surface as a blank cell, and a visible scrollbar track or thumb SHALL overlay that same surface. The control SHALL remain above transcript selection within its own bounds without becoming selected, copied, or extended into the gutter.

#### Scenario: Render the control beside an idle scrollbar gutter
- **WHEN** overflowing content is detached and the scroll-to-bottom control is drawn while the automatic scrollbar rail is idle
- **THEN** the control's background SHALL end at the control's visible label boundary
- **AND** the blank final-column gutter SHALL retain the underlying transcript row background
- **AND** no isolated control-colored cell SHALL appear at the terminal edge

#### Scenario: Render the control beside a visible scrollbar glyph
- **WHEN** the scrollbar track or thumb is visible on the same row as the scroll-to-bottom control
- **THEN** the glyph SHALL be painted only in the final-column gutter over the underlying row or selection background
- **AND** the glyph cell SHALL NOT inherit the control's normal or pointed-at background
- **AND** the control's label, placement, and hit region SHALL remain unchanged

#### Scenario: Point at the control
- **WHEN** the latest pointer position enters or leaves the control and changes its presentation
- **THEN** only cells within the current control bounds SHALL change between normal and pointed-at backgrounds
- **AND** the gutter background and scrollbar presentation SHALL remain independent on the first resulting frame and on repeated cached frames

#### Scenario: Select through the control row
- **WHEN** transcript selection reaches the content boundary on the row where the control floats
- **THEN** the control SHALL remain visibly above selection within its own bounds
- **AND** the independently composed selection background SHALL continue through the gutter according to the existing right-edge selection rule
- **AND** the control text, padding, and scrollbar glyph SHALL remain absent from copied text
