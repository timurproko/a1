## ADDED Requirements

### Requirement: Resource-sensitive fast validation is partitioned deterministically
The fast validation tier SHALL declare tests whose subprocess, temporary-repository, storage, or release-cohort workloads require protection from shared runner contention. Every declared resource-sensitive test SHALL be excluded from the parallel remainder, SHALL execute exactly once in a non-file-parallel partition under the existing fast-tier test timeout, and SHALL retain all of its semantic assertions. Pull-request validation and exact-package validation SHALL derive the same partition from the same authoritative suite configuration on every platform. The ordinary remainder and resource-sensitive partition SHALL report separate planned commands, elapsed time, outcomes, and available subprocess or fixture timing. A failed assertion, process error, missing or duplicate test owner, or timeout SHALL fail the tier without automatically retrying the test. Resource isolation SHALL NOT increase a test, suite, platform, or workflow timeout; a test that remains too slow after isolation SHALL have its fixture or subprocess workload optimized before it can pass.

#### Scenario: Fast tier is planned
- **WHEN** validation expands the fast tier
- **THEN** every resource-sensitive test SHALL be absent from the parallel remainder and present exactly once in the non-file-parallel partition under the unchanged fast-tier timeout
- **AND** every other retained fast test SHALL remain owned by the ordinary remainder or another explicit scope

#### Scenario: Pull request and package use the fast tier
- **WHEN** pull-request validation and exact-package validation select the fast tier
- **THEN** both SHALL use the same authoritative resource-sensitive partition and existing fast-tier timeout

#### Scenario: Resource-sensitive assertion fails
- **WHEN** a resource-sensitive test reports an assertion failure, process error, or exceeds the existing fast-tier timeout
- **THEN** validation SHALL fail without automatically rerunning that test, converting the result to success, or increasing a timeout

#### Scenario: Isolated test remains slow
- **WHEN** repeated isolated evidence shows a resource-sensitive test still approaches or exceeds the existing fast-tier timeout
- **THEN** its fixture or subprocess workload SHALL be diagnosed and optimized
- **AND** validation policy SHALL NOT grant it a larger timeout as part of this change

#### Scenario: Validation evidence is inspected
- **WHEN** a maintainer reads the validation plan or outcomes
- **THEN** the ordinary remainder and resource-sensitive partition SHALL have distinct identifiers, commands, durations, and results
- **AND** available subprocess or fixture timing SHALL identify whether resource setup, child execution, or assertions consumed the elapsed time
