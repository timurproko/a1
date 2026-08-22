## ADDED Requirements

### Requirement: Rendering parity is checked per merge, not per release
Rendering parity SHALL run on every merge into `develop` and again when a release is published, so a
regression is attributed to the one change that introduced it rather than found somewhere in a range of
them. It SHALL NOT be required on a pull request, where it would charge every change for a risk only
some changes carry, but SHALL be available on demand for a change that warrants it. It SHALL run on
Linux; other platforms SHALL be added only if a platform-specific rendering fault is actually observed.

#### Scenario: A change merges into develop
- **WHEN** a change lands on `develop`
- **THEN** rendering parity SHALL run against pinned Pi

#### Scenario: A pull request is opened
- **WHEN** a pull request is opened
- **THEN** rendering parity SHALL NOT be part of its required check
- **AND** it SHALL be possible to request a parity run for that pull request

#### Scenario: A release is published
- **WHEN** a release is published
- **THEN** rendering parity SHALL run again as the final gate

### Requirement: A parity failure publishes what it saw
A failing parity run SHALL publish the evidence for its failure: the differing checkpoints rendered side
by side in the run's own output, and both sides' checkpoint snapshots retained as artifacts. A failure
SHALL name the checkpoints that differ. Reporting a parity failure without that evidence SHALL NOT be
treated as reporting it.

#### Scenario: Parity fails
- **WHEN** a parity run finds a difference
- **THEN** it SHALL name the checkpoints that differ and render them side by side
- **AND** both sides' snapshots SHALL be retained so the difference can be examined afterwards

#### Scenario: The engine is upgraded
- **WHEN** the pinned engine version changes
- **THEN** the parity run SHALL show which checkpoints its rendering moved, so the change can be
  attributed to the upgrade rather than to A1
