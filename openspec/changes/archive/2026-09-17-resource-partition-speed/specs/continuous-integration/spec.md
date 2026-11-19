## MODIFIED Requirements

### Requirement: Resource-sensitive fast validation is partitioned deterministically
The fast validation tier SHALL declare tests whose subprocess, temporary-repository, storage, or release-cohort workloads require protection from shared runner contention. Every declared resource-sensitive test SHALL be excluded from the parallel remainder, SHALL execute exactly once in one non-file-parallel partition process on an isolated runner under the partition's explicit hang bound, and SHALL retain all of its semantic assertions. The hang bound SHALL be the same explicit thirty-second bound the other explicit fast-tier invocations declare; it SHALL be recorded in the plan evidence as explicit, and it SHALL NOT serve as a performance assertion. Pull-request validation and exact-package validation SHALL derive the same partition from the same authoritative suite configuration on every platform. The ordinary remainder and resource-sensitive partition SHALL report separate planned commands, elapsed time, outcomes, and available subprocess or fixture timing. A failed assertion, process error, missing or duplicate test owner, or hang-bound expiry SHALL fail the tier without automatically retrying the test. Per-test durations SHALL remain available as evidence, and the focused timing report SHALL name every test body above five seconds so a slowdown is visible without failing the pull request on shared-runner variance.

#### Scenario: Fast tier is planned
- **WHEN** validation expands the fast tier
- **THEN** every resource-sensitive test SHALL be absent from the parallel remainder and present exactly once in the single non-file-parallel partition invocation under the explicit hang bound
- **AND** every other retained fast test SHALL remain owned by the ordinary remainder or another explicit scope

#### Scenario: Pull request and package use the fast tier
- **WHEN** pull-request validation and exact-package validation select the fast tier
- **THEN** both SHALL use the same authoritative resource-sensitive partition and the same explicit hang bound

#### Scenario: Resource-sensitive assertion fails
- **WHEN** a resource-sensitive test reports an assertion failure, process error, or exceeds the explicit hang bound
- **THEN** validation SHALL fail without automatically rerunning that test or converting the result to success

#### Scenario: Isolated test remains slow
- **WHEN** repeated focused evidence lists a resource-sensitive test body above five seconds
- **THEN** its fixture or subprocess workload SHALL be diagnosed and optimized
- **AND** the hang bound SHALL NOT be raised to hide it

#### Scenario: Validation evidence is inspected
- **WHEN** a maintainer reads the validation plan or outcomes
- **THEN** the ordinary remainder and resource-sensitive partition SHALL have distinct identifiers, commands, durations, and results
- **AND** available subprocess or fixture timing SHALL identify whether resource setup, child execution, or assertions consumed the elapsed time

### Requirement: Independent development partitions do not serialize feedback
Development validation SHALL schedule the mandatory PR core and each selected integration partition independently after its actual prerequisites. Resource-sensitive files selected by ownership SHALL remain non-file-parallel on an isolated runner, with the same authoritative membership and the same explicit hang bound used by complete validation. No selected test SHALL be duplicated between partitions on the same platform/runtime merely because job boundaries changed. Cross-platform and cross-runtime executions SHALL remain distinct evidence where selected.

The single protected-branch aggregate SHALL require the PR core and every scope selected for the current head and selection identity. It SHALL reject missing, failed, cancelled, stale, malformed, or unexpectedly skipped selected results. A skipped integration scope SHALL be acceptable only when the current trustworthy selection explicitly excludes it. Independent jobs SHALL not share mutable application state or owned process trees. The modular job matrix SHALL be derived from the trusted selection by one reviewed repository script that declares every Development modular job; an entry the selection leaves inactive SHALL NOT be scheduled, each scheduled job SHALL still resolve its own owners from the uploaded selection, and the aggregate SHALL still require successful evidence for every selected owner.

#### Scenario: Fast work and resume checks are selected
- **WHEN** a code PR requires the PR core, a resource-sensitive owner, and package resume integration
- **THEN** the resource-sensitive and resume jobs SHALL not depend on completion of unrelated core tests solely for sequencing
- **AND** all selected results SHALL be required before the aggregate succeeds

#### Scenario: Serialization would be replaced by contention
- **WHEN** a resource-sensitive partition is selected alongside ordinary validation
- **THEN** it SHALL execute on an isolated runner rather than concurrently on the ordinary runner
- **AND** it SHALL retain one-file-at-a-time execution and all existing assertions under the partition's explicit hang bound

#### Scenario: A selected partition is skipped
- **WHEN** the current selection requires a core or integration partition but that partition is missing, cancelled, or skipped
- **THEN** the aggregate SHALL fail even if every completed partition passed

#### Scenario: Evidence belongs to another selection
- **WHEN** a result belongs to another head, workflow run, or selection identity
- **THEN** it SHALL NOT satisfy the current aggregate

#### Scenario: Finalized Implementation candidate completes validation
- **WHEN** a finalized implementation-bound pull request in the Implementation phase runs ordinary exact-head validation
- **THEN** selected product validation and finalized-delivery validation SHALL both execute for that candidate
- **AND** the stable protected aggregate SHALL succeed in the same workflow run only after every selected result and the finalized delivery record succeed
- **AND** no Acceptance phase edit or second workflow run SHALL be required before manual review and merge

#### Scenario: Manual review rejects the implementation
- **WHEN** manual review finds a defect after the protected aggregate succeeds
- **THEN** the pull request SHALL remain open in Implementation while fixes are pushed
- **AND** the changed exact head SHALL run normal validation again before merge

#### Scenario: Complete validation is requested
- **WHEN** conservative PR classification, Full regression, nightly, preview, or stable validation requests complete retained coverage
- **THEN** every retained fast and applicable integration owner SHALL execute under its declared isolation and platform/runtime contract

#### Scenario: Inactive matrix entries are not scheduled
- **WHEN** the trusted selection activates only some declared modular jobs
- **THEN** the workflow SHALL schedule only the active entries and record the unscheduled ones in the run summary
- **AND** the aggregate SHALL fail when an active entry produced no successful evidence
