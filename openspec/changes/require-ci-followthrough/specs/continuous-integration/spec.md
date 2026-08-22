## ADDED Requirements

### Requirement: A failing pull request is the next piece of work
The result of a pull request's validation SHALL be read before any further work
begins, and a pull request whose validation is failing SHALL be repaired before new
work starts. Work SHALL NOT be stacked on a change whose validation is failing,
because the repair then costs a merge with the base branch and a second full run.
A failure that this change did not cause SHALL be reported with its evidence and
still addressed, since it fails every pull request behind it. Validation SHALL be
reported as what it said rather than as what it was expected to say.

#### Scenario: Validation fails
- **WHEN** a pull request's required check reports a failure
- **THEN** repairing it SHALL be the next task
- **AND** no further change SHALL be started on top of it until it passes

#### Scenario: The failure came from elsewhere
- **WHEN** a failure is not caused by the change under review
- **THEN** it SHALL be reported with the evidence for that
- **AND** it SHALL still be addressed before other work continues

#### Scenario: The result has not been read
- **WHEN** validation has been triggered and its result has not been read
- **THEN** the change SHALL NOT be described as passing

### Requirement: A change with nothing to accept by hand merges on its own
A pull request that changes nothing a reader would see — a specification, its
documentation, or a refactor whose tests show the behaviour is unchanged — SHALL be
armed to merge as soon as its required check passes, and that arming SHALL be
stated. A pull request that changes what a reader sees SHALL wait for the manual
acceptance that change requires, so a change is accepted before it lands rather
than explained after it.

#### Scenario: Nothing visible changed
- **WHEN** a pull request carries only specification, documentation, or a refactor
  whose tests show no visible change
- **THEN** it SHALL be armed to merge when its required check passes

#### Scenario: A reader would see the difference
- **WHEN** a pull request changes what a reader sees
- **THEN** it SHALL NOT be armed to merge automatically
- **AND** it SHALL wait for manual acceptance
