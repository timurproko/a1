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

### Requirement: Only OpenSpec and root README changes merge on their own
A pull request SHALL be armed for auto-merge only when every changed path is under
`openspec/**` or is exactly the root `README.md`. A pull request containing any
other path SHALL remain open for local maintainer validation and manual merge,
including behavior-preserving refactors and mixed specification-plus-code changes.
CI success SHALL NOT substitute for local maintainer acceptance of code.

#### Scenario: Complete diff is auto-merge eligible
- **WHEN** every changed path is under `openspec/**` or is the root `README.md`
- **THEN** the pull request MAY be armed to merge when its required check passes

#### Scenario: Behavior-preserving code changed
- **WHEN** a pull request contains any path outside the auto-merge allowlist
- **THEN** it SHALL NOT be armed to merge automatically even if behavior is intended to remain unchanged
- **AND** it SHALL wait for local maintainer acceptance and manual merge

#### Scenario: Specification and code are mixed
- **WHEN** a pull request contains both OpenSpec paths and a path outside the allowlist
- **THEN** the entire pull request SHALL follow the manual code path
