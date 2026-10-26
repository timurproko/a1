## MODIFIED Requirements

### Requirement: Update progress uses the shared semantic accent
When A1 shows self-update progress in a color-capable terminal, the completed segment SHALL use the active global A1 profile's selected semantic Accent color, or the blue default if no valid choice can be read. Self-update and fresh installation SHALL consume byte-equivalent release-owned forms of the same named A1 palette contract, and palette synchronization SHALL regenerate and validate them when the named A1 palette changes. The remaining segment SHALL retain its muted track color, and the percentage text SHALL retain its existing neutral treatment. Resolving the color SHALL NOT require starting an interactive agent, supervisor, or project resource pipeline.

The color source change SHALL NOT alter the progress bar's glyphs, width, percentage calculation, monotonic movement, or cleanup behavior.

#### Scenario: An update is in progress
- **WHEN** A1 renders a partially completed self-update progress bar for a profile with a saved accent
- **THEN** the completed segment SHALL render with that profile's selected semantic accent
- **AND** the remaining segment SHALL render in its muted track color
- **AND** the visible bar geometry and percentage SHALL remain unchanged

#### Scenario: Progress reaches either boundary
- **WHEN** A1 renders zero or complete self-update progress
- **THEN** it SHALL preserve the same selected-accent and muted-track contract for every segment that is present
- **AND** it SHALL reset terminal foreground styling after the percentage text

#### Scenario: No valid preference is available
- **WHEN** a self-update runs without a readable valid accent in the effective global profile
- **THEN** the completed segment SHALL use the shared blue default without failing the update

#### Scenario: The pinned Pi accent changes
- **WHEN** a Pi pin upgrade changes the named A1 palette projection or a named A1 palette entry changes
- **THEN** synchronization SHALL regenerate the shared progress palette from that owned presentation
- **AND** conformance SHALL fail if either progress renderer or either committed generated palette form remains on an older color
