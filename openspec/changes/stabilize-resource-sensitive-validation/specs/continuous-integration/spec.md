## ADDED Requirements

### Requirement: Resource-sensitive fast validation is partitioned deterministically
The fast validation tier SHALL declare tests whose subprocess, temporary-repository, storage, or release-cohort workloads require protection from shared runner contention. Every declared resource-sensitive test SHALL be excluded from the parallel remainder, SHALL execute exactly once in a non-file-parallel partition with an explicit bounded timeout, and SHALL retain all of its semantic assertions. Pull-request validation and exact-package validation SHALL derive the same partition from the same authoritative suite configuration on every platform. The ordinary remainder and resource-sensitive partition SHALL report separate planned commands, elapsed time, and outcomes. A failed assertion, process error, missing or duplicate test owner, or bounded timeout SHALL fail the tier without automatically retrying the test.

#### Scenario: Fast tier is planned
- **WHEN** validation expands the fast tier
- **THEN** every resource-sensitive test SHALL be absent from the parallel remainder and present exactly once in the bounded non-file-parallel partition
- **AND** every other retained fast test SHALL remain owned by the ordinary remainder or another explicit scope

#### Scenario: Pull request and package use the fast tier
- **WHEN** pull-request validation and exact-package validation select the fast tier
- **THEN** both SHALL use the same authoritative resource-sensitive partition and timeout budget

#### Scenario: Resource-sensitive assertion fails
- **WHEN** a resource-sensitive test reports an assertion failure, process error, or exceeds its bounded timeout
- **THEN** validation SHALL fail without automatically rerunning that test or converting the result to success

#### Scenario: Validation evidence is inspected
- **WHEN** a maintainer reads the validation plan or outcomes
- **THEN** the ordinary remainder and resource-sensitive partition SHALL have distinct identifiers, commands, durations, and results
