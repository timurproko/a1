## ADDED Requirements

### Requirement: Recorded governance baseline paths exist
Every repository source path recorded in a committed governance baseline under `config/baselines/` SHALL exist in the current tree. The architecture gate SHALL walk each baseline file, collect every recorded `src/`, `test/`, `scripts/`, or `bin/` source path regardless of the field that holds it, and fail with the baseline file and the missing path for each entry that no longer resolves. A baseline that records a historical snapshot rather than a current rule SHALL be removed from the tree rather than retained with stale entries; its history remains available through version control.

#### Scenario: A recorded path is deleted or moved
- **WHEN** a change deletes or moves a source file that a governance baseline records
- **THEN** the architecture gate SHALL fail naming the baseline file and the stale path
- **AND** the change SHALL update or remove the entry before the gate passes

#### Scenario: All recorded paths resolve
- **WHEN** every recorded path in every baseline exists
- **THEN** the gate SHALL pass without listing the baselines it inspected

#### Scenario: A snapshot baseline approves nothing
- **WHEN** a baseline's approvals are keyed on paths that no longer exist so that the check it feeds would produce the same result without it
- **THEN** the baseline, its generator, and its reproduction test SHALL be deleted rather than regenerated
