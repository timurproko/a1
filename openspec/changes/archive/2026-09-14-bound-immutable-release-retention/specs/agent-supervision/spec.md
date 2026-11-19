## ADDED Requirements

### Requirement: Immutable release retention is bounded by current ownership needs
A1 SHALL compute the retained immutable release set from the active release, the verified rollback release, any pending update transaction releases, every release used by a verified live cohort, and explicit external holds. Historical activation alone SHALL NOT retain a release after it leaves that protected set.

#### Scenario: Successful updates accumulate historical releases
- **WHEN** a successful update activates a new release and older releases have no live cohort, rollback, pending transaction, or external hold
- **THEN** A1 SHALL retain only the current protected set and make the remaining historical releases collectible

#### Scenario: Superseded release still has a live session
- **WHEN** an update activates a new release while a verified older cohort still owns one or more launch instances
- **THEN** A1 SHALL retain the older release until its final instance and cohort exit

#### Scenario: Rollback remains available
- **WHEN** a new release becomes active successfully
- **THEN** A1 SHALL retain one verified prior release as the rollback target even when no cohort currently runs from it

#### Scenario: Explicit external hold exists
- **WHEN** an agent, migration, or other declared authority holds a known release identity
- **THEN** reconciliation SHALL retain that release until the authority removes the hold

### Requirement: Release collection is reference-safe and restart-safe
Before physical deletion, A1 SHALL prove that a release is outside every protected set, canonically contained directly beneath the managed release store, and not represented by a verified live endpoint. A1 SHALL detach obsolete selectors and records atomically before deleting content, and interruption SHALL leave only recoverable unselected content or managed trash.

#### Scenario: Collection is interrupted after state detachment
- **WHEN** the collector stops after removing an obsolete release from durable state but before deleting all of its files
- **THEN** the next cleanup reconciliation SHALL recognize and finish deleting the unselected managed content without making it selectable

#### Scenario: Recorded path escapes the release store
- **WHEN** an obsolete record or filesystem entry resolves outside the canonical managed release store or through an unapproved link
- **THEN** A1 SHALL refuse deletion, preserve the external path, and record a bounded diagnostic

#### Scenario: Release becomes protected during reconciliation
- **WHEN** concurrent ownership or transaction reconciliation shows that a candidate release is protected before detachment commits
- **THEN** collection SHALL leave its state and content intact

#### Scenario: Obsolete content is deleted
- **WHEN** a release is proven unreferenced and contained
- **THEN** A1 SHALL NOT perform a complete payload hash pass solely as a prerequisite to deleting that release
