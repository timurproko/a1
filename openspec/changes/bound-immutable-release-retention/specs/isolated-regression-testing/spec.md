## ADDED Requirements

### Requirement: Release retention and cleanup receive exact-state regression coverage
Release validation SHALL exercise bounded retention migration, live superseded cohorts, rollback protection, active update transactions, external holds, interrupted cleanup, malformed paths, stale candidates, and large historical backlogs in isolated data and runtime roots.

#### Scenario: Large legacy retention set is migrated
- **WHEN** an isolated fixture contains at least forty valid historical releases under append-only retention with one active release, one rollback release, and one older live cohort
- **THEN** reconciliation SHALL preserve exactly the protected releases, detach every other known release, and initiate bounded physical cleanup

#### Scenario: Cleanup is interrupted at each durable boundary
- **WHEN** fault injection stops cleanup before state detachment, after detachment, after trash movement, or during recursive deletion
- **THEN** rerunning cleanup SHALL converge without a dangling selector, deletion outside the managed store, or loss of a protected release

#### Scenario: Update and launch race with cleanup
- **WHEN** isolated update, launch, and cohort-retirement operations overlap
- **THEN** every verified live or selected release SHALL remain executable and every obsolete release SHALL remain safely retryable

#### Scenario: Windows holds an obsolete file temporarily
- **WHEN** exact-package cleanup encounters a temporary Windows sharing or antivirus lock
- **THEN** the operation SHALL remain bounded, preserve retry state and diagnostics, and succeed after the lock is released
