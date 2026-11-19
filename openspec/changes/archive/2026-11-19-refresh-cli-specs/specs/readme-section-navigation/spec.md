## REMOVED Requirements

### Requirement: The README exposes direct navigation to every stable task area
**Reason**: The README has `## Session colors` and `## Uninstall` sections that the navigator does not link, so the navigator does not reach every section, and its targets are second-level `##` headings rather than top-level headings.
**Migration**: Replaced by "The README navigator links its primary task sections".

## ADDED Requirements

### Requirement: The README navigator links its primary task sections

The root README SHALL present a centered text navigator below its badges with fragment links for Install, Launch, Update, Extensions, Develop, and Publish, in that order. Each link SHALL target a `##` heading of the same name, and those headings SHALL appear in the document in navigator order. The README MAY hold further `##` sections between them that the navigator does not link; `## Session colors` and `## Uninstall` are such sections.

#### Scenario: Reader selects a primary task

- **WHEN** a reader selects any navigator label
- **THEN** the document SHALL navigate to the `##` section of that name

#### Scenario: Reader scans the task hierarchy

- **WHEN** a reader scans the README's `##` headings
- **THEN** Install, Launch, Update, Extensions, Develop, and Publish SHALL appear in navigator order
- **AND** Session colors and Uninstall SHALL appear as `##` sections without navigator links
