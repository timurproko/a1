## ADDED Requirements

### Requirement: Owned indeterminate progress uses the selected stable spinner style
Bare A1 SHALL apply its resolved Spinner style to shared built-in working, retry, compaction, measured-compaction status, extension-provided working text, and A1-owned indeterminate operation loaders. One owned presentation policy SHALL define the available frames and their display geometry. `current` SHALL preserve the existing dot frames and cadence. `circle` SHALL cycle `◐`, `◓`, `◑`, `◒`; `diamond` SHALL cycle `◇`, `◈`, `◆`, `◈`; `square` SHALL cycle `◧`, `◩`, `◨`, `◪`.

Every animated frame SHALL occupy one fixed terminal-cell slot with a consistent adjacent separator so a running animation does not move its label horizontally or change row geometry. `none` SHALL omit the spinner glyph and its separator while retaining the complete status label and existing text treatment. This setting is a declared bare-A1 glyph-selection exception to earlier spinner-preservation requirements; it SHALL NOT otherwise alter status wording, semantic colors, text highlighting, measured percentages, work-state transitions, cancellation, extension lifecycle, placement, timer cleanup, or disposal.

Measured install/update bars, custom extension-authored renderers, vanilla Pi, installed Pi packages, and the explicit comparison profile SHALL remain unchanged.

#### Scenario: Run each selected animation
- **WHEN** an owned progress surface renders any complete frame cycle of `current`, `circle`, `diamond`, or `square`
- **THEN** its spinner slot and label starting column SHALL remain constant throughout that cycle
- **AND** the glyph SHALL retain the surface's existing semantic color role

#### Scenario: Hide only the spinner
- **WHEN** the effective style is `none`
- **THEN** eligible surfaces SHALL retain their semantic progress text without a spinner glyph or an empty spinner separator
- **AND** their work, cancellation, and completion lifecycles SHALL remain intact

#### Scenario: Change style during active work
- **WHEN** an accepted live setting change selects a new style while work is active
- **THEN** eligible progress surfaces SHALL use the new presentation without restarting the work or multiplying animation timers
- **AND** old presentation resources SHALL be disposed safely

#### Scenario: Preserve determinate and comparison presentation
- **WHEN** installation/update percentage bars, extension-authored custom components, or comparison-profile progress are rendered
- **THEN** the owned Spinner style setting SHALL NOT change those surfaces
