## ADDED Requirements

### Requirement: Development publication shows per-job workflow-step progress

The development-publication observer SHALL append a compact `(current/total)` workflow-step counter to each visible non-skipped job when GitHub supplies a usable nonempty step list. Total SHALL count the returned steps, including setup and teardown, rather than using potentially noncontiguous step numbers. Current SHALL identify the last returned step position reported in progress or completed, including skipped steps, or zero before any step starts; a successful job SHALL show total/total. Counters SHALL NOT represent passed tests or elapsed-time estimates. Missing, empty, or malformed step metadata and wholly skipped jobs SHALL retain status-only presentation without invented counts.

A change to a displayed counter SHALL refresh that job even while its state remains running, and unchanged state/counter snapshots SHALL remain silent. Capable interactive terminals SHALL retain one row per job and preserve the counter when enough width is available by shortening long job names. Narrow-terminal safety, dot-only color, aligned labels, readable append-only fallback, failure reporting, and publication gates SHALL remain intact.

#### Scenario: Concurrent lanes advance independently

- **WHEN** macOS advances from its first to its second workflow step while Windows stays on its second step
- **THEN** only the macOS row SHALL refresh its counter and neither row SHALL duplicate in a capable interactive terminal
- **AND** an unchanged subsequent snapshot SHALL emit no progress

#### Scenario: Metadata is incomplete or step numbers have gaps

- **WHEN** a job has no usable step list or its returned step numbers are noncontiguous
- **THEN** unavailable metadata SHALL omit the counter and a usable list SHALL count returned positions rather than step numbers

#### Scenario: Jobs complete with distinct outcomes

- **WHEN** jobs finish successfully, fail, or are wholly skipped
- **THEN** successful jobs with step metadata SHALL show total/total, failed jobs SHALL keep their failed label beside their observed counter, and wholly skipped jobs SHALL omit counters

#### Scenario: Long names share a row with counters

- **WHEN** an interactive job name and counter exceed the terminal width
- **THEN** the name SHALL shorten to retain the counter where space permits without wrapping into unrelated output
