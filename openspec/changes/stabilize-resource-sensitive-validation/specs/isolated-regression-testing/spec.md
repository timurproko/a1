## ADDED Requirements

### Requirement: Resource-sensitive regressions avoid shared runner contention
Automated tests that repeatedly create repositories, launch subprocesses, mutate temporary storage, or coordinate release processes SHALL be eligible for a declared resource-sensitive execution class. Tests in that class SHALL run one file at a time under a finite workload-specific timeout rather than sharing the parallel fast-test worker pool. Classification SHALL be reviewed configuration, SHALL be applied consistently across supported platforms, and SHALL not suppress output, remove assertions, or authorize retries of semantic failures. Tests not assigned to the class SHALL retain the ordinary fast scheduler unless another declared isolation contract applies.

#### Scenario: A repeated contention timeout is confirmed
- **WHEN** evidence shows a process- or filesystem-intensive fast test passes independently but intermittently times out while sharing the parallel runner
- **THEN** the test MAY be assigned to the resource-sensitive class with its evidence recorded
- **AND** its assertions and fail-closed outcome SHALL remain unchanged

#### Scenario: Resource-sensitive tests execute
- **WHEN** multiple tests in the resource-sensitive class are selected
- **THEN** their files SHALL execute without file parallelism under the declared finite timeout
- **AND** no selected file SHALL execute more than once

#### Scenario: An ordinary test is not resource-sensitive
- **WHEN** a fast test has no declared resource-sensitive ownership and no other isolation requirement
- **THEN** it SHALL remain in the ordinary parallel remainder
