## ADDED Requirements

### Requirement: Update progress uses the scrollbar-aligned accent
When A1 shows self-update progress in a color-capable terminal, the completed segment SHALL use the fixed teal accent `#8abeb7` that matches the requested scrollbar presentation. The remaining segment SHALL retain its muted track color, and the percentage text SHALL retain its existing neutral treatment.

The color change SHALL NOT alter the progress bar's glyphs, width, percentage calculation, monotonic movement, or cleanup behavior.

#### Scenario: An update is in progress
- **WHEN** A1 renders a partially completed self-update progress bar
- **THEN** the completed segment SHALL render in `#8abeb7`
- **AND** the remaining segment SHALL render in its muted track color
- **AND** the visible bar geometry and percentage SHALL remain unchanged

#### Scenario: Progress reaches either boundary
- **WHEN** A1 renders zero or complete self-update progress
- **THEN** it SHALL preserve the same accent and muted-track color contract for every segment that is present
- **AND** it SHALL reset terminal foreground styling after the percentage text
