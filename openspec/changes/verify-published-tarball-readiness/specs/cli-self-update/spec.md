## ADDED Requirements

### Requirement: Update bookkeeping cannot abandon launcher recovery

Update journal and recovery sidecar or launcher replacement SHALL use bounded retries for transient Windows EPERM, EACCES, and EBUSY rename failures, SHALL NOT pre-delete the prior destination, and SHALL preserve prior contents if replacement permanently fails. A journal callback failure after a detached replacement guardian starts SHALL NOT cause the parent to abandon that still-mutating guardian or roll back concurrently with npm. Failure settlement SHALL wait for the guardian's callable-launcher result, report bookkeeping failures, and retain recovery authority when journal settlement is unavailable.

#### Scenario: Windows temporarily holds the update journal

- **WHEN** an atomic update-journal rename is transiently refused
- **THEN** the updater SHALL retry within a finite allowance without removing the existing journal
- **AND** a permanent refusal SHALL preserve the existing journal and fail without starting an unprotected replacement

#### Scenario: Journal notification fails while npm changes launchers

- **WHEN** a recovery-state callback fails after the detached guardian starts
- **THEN** the parent SHALL continue awaiting the guardian before settling the update
- **AND** it SHALL retain the guardian's established launcher and recovery authority rather than strand an incomplete launcher set

#### Scenario: Activation fails after npm succeeds

- **WHEN** npm replacement succeeds but candidate activation fails before committing the active reference
- **THEN** the updater SHALL restore capsule-backed prior-release launchers before settling rollback
- **AND** a partially written or failed target SHALL not become the recovery launch authority

#### Scenario: A committed activation cannot persist its journal phase

- **WHEN** the activator reports that the active reference is committed but persisting that journal phase fails
- **THEN** the updater SHALL report committed success with a bounded bookkeeping warning rather than roll back
- **AND** recovery authority SHALL remain until journal settlement succeeds

#### Scenario: Recovery launcher replacement is refused

- **WHEN** a recovery launcher's atomic rename fails permanently
- **THEN** the prior destination SHALL remain intact and recovery evidence SHALL remain available
