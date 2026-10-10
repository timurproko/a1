## RENAMED Requirements

- FROM: `### Requirement: Update progress uses the scrollbar-aligned accent`
- TO: `### Requirement: Update progress uses the shared semantic accent`

## MODIFIED Requirements

### Requirement: Update progress uses the shared semantic accent
When A1 shows self-update progress in a color-capable terminal, the completed segment SHALL use the release-owned shared progress accent derived from the pinned Pi theme's semantic `accent` role. Self-update and fresh installation SHALL consume byte-equivalent generated forms of the same shared palette contract, and Pi-upgrade synchronization SHALL regenerate and validate them so a changed pinned accent cannot leave progress on an older color. The remaining segment SHALL retain its muted track color, and the percentage text SHALL retain its existing neutral treatment.

The color source change SHALL NOT alter the progress bar's glyphs, width, percentage calculation, monotonic movement, or cleanup behavior.

#### Scenario: An update is in progress
- **WHEN** A1 renders a partially completed self-update progress bar
- **THEN** the completed segment SHALL render with the release's shared semantic accent
- **AND** the remaining segment SHALL render in its muted track color
- **AND** the visible bar geometry and percentage SHALL remain unchanged

#### Scenario: Progress reaches either boundary
- **WHEN** A1 renders zero or complete self-update progress
- **THEN** it SHALL preserve the same shared-accent and muted-track contract for every segment that is present
- **AND** it SHALL reset terminal foreground styling after the percentage text

#### Scenario: The pinned Pi accent changes
- **WHEN** a Pi pin upgrade resolves a different default semantic `accent` presentation
- **THEN** synchronization SHALL regenerate the shared progress palette from that pinned presentation
- **AND** conformance SHALL fail if either progress renderer or either committed generated palette form remains on an older color
