## ADDED Requirements

### Requirement: Published-pair lanes expose their native identity
Every post-publication native installation job SHALL display the selected platform and Node runtime from fields provided by the authoritative release matrix. A missing or invented matrix field SHALL NOT reduce the job name to an ambiguous empty label. Display identity SHALL NOT change runner selection, matrix breadth, artifact identity, or aggregate requirements.

#### Scenario: A native published-pair lane is inspected
- **WHEN** the release matrix expands a post-publication installation job
- **THEN** its Actions job name SHALL identify the selected platform and Node runtime
- **AND** a failure SHALL be attributable to its native lane without inspecting runner metadata through the API
