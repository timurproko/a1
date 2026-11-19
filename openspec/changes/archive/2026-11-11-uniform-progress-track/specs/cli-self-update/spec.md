## ADDED Requirements

### Requirement: Install and update progress use a uniform centered stroke
Interactive self-update and fresh-install progress SHALL render every completed and remaining bar cell with the continuous centered heavy horizontal `━` glyph. The completed segment SHALL retain its selected semantic accent, the remaining segment SHALL retain its muted gray track color, and the percentage SHALL retain its neutral text treatment. This stroke change SHALL preserve the existing 38-cell width, proportional fill and percentage calculations, single space before the percentage, terminal style reset, animation, and cleanup behavior.

#### Scenario: A partially completed frame is displayed
- **WHEN** self-update or the installer displays partial progress
- **THEN** the completed and remaining segments SHALL use the same `━` glyph and differ by their existing accent and track colors
- **AND** neither segment SHALL use separated rectangle glyphs or bottom-aligned block glyphs

#### Scenario: Progress is empty or complete
- **WHEN** a renderer displays zero or full progress
- **THEN** the bar SHALL still contain exactly 38 heavy horizontal cells followed by one space and the numeric percentage
- **AND** its existing neutral percentage styling and final foreground reset SHALL be preserved

#### Scenario: Installer and self-update display the same progress
- **WHEN** both renderers receive the same percentage and accent
- **THEN** their rendered frames SHALL remain byte-equivalent
