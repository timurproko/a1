## ADDED Requirements

### Requirement: Release retention and cleanup receive exact-state regression coverage
Release validation SHALL exercise bounded retention migration, live superseded cohorts, rollback protection, active update transactions, external holds, interrupted cleanup, malformed paths, stale candidates, worker continuation and observability, fair retry scheduling, legacy Windows path casing, and production-shaped historical backlogs in isolated data and runtime roots.

#### Scenario: Large legacy retention set is migrated
- **WHEN** an isolated exact-package fixture contains at least forty valid historical releases and a production-representative payload backlog under append-only retention with one active release, one rollback release, and one older live cohort
- **THEN** one update SHALL preserve exactly the protected releases, detach every other known release, return without waiting for full deletion, and cause release count and disk usage to converge without a second user command

#### Scenario: One batch cannot drain the backlog
- **WHEN** item or duration limits stop a cleanup batch while ordinary eligible work remains
- **THEN** the packaged worker SHALL continue or schedule another bounded batch until that work is complete

#### Scenario: Preparation exceeds a batch duration
- **WHEN** injected discovery, ownership, or durable-state preparation time exceeds the configured batch duration before any item is attempted
- **THEN** the worker SHALL still attempt at least one eligible item and later batches SHALL converge

#### Scenario: Cleanup is interrupted at each durable boundary
- **WHEN** fault injection stops cleanup before state detachment, after detachment, after trash movement, during recursive deletion, or at worker startup and continuation boundaries
- **THEN** automatic resumption SHALL converge without a dangling selector, deletion outside the managed store, or loss of a protected release

#### Scenario: Worker execution fails before an item attempt
- **WHEN** the packaged cleanup entry cannot import or its worker fails at top level
- **THEN** durable evidence SHALL identify the incomplete run and every planned item SHALL remain safely retryable

#### Scenario: Update and launch race with cleanup
- **WHEN** isolated update, launch, cohort-retirement, and duplicate maintenance scheduling operations overlap
- **THEN** every verified live or selected release SHALL remain executable, one physical cleanup owner SHALL operate per data root, and every obsolete release SHALL remain safely retryable

#### Scenario: One item remains persistently blocked
- **WHEN** one obsolete item repeatedly fails while other release and artifact classes remain eligible
- **THEN** bounded retries SHALL preserve diagnostics for the blocked item while the other eligible work continues to completion

#### Scenario: Windows holds an obsolete file temporarily
- **WHEN** exact-package cleanup encounters a temporary Windows sharing or antivirus lock
- **THEN** the operation SHALL remain bounded, preserve retry state and diagnostics, allow unrelated work to progress, and succeed after the lock is released

#### Scenario: Legacy managed paths differ only by Windows casing
- **WHEN** a migrated release record or certification path uses legacy casing for the same managed Windows directory
- **THEN** cleanup SHALL accept the canonical managed identity, delete only the obsolete contained artifact, and preserve unrelated paths
