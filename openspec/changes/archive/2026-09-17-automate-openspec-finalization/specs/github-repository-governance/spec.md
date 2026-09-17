## ADDED Requirements

### Requirement: Trusted automation finalizes the ready single-PR candidate
A trusted default-branch workflow SHALL finalize every open, non-draft, same-repository, implementation-bound version-3 PR targeting `develop` on its synchronize, ready-for-review, reopen, and body-edit events. It SHALL run only reviewed default-branch policy and pinned tooling; PR-head content SHALL enter the operation as OpenSpec data only, and no PR-head script, dependency manifest, or Git hook SHALL execute. It SHALL commit the finalization to the PR's own branch with the explicitly provisioned publication identity whose pushes trigger the ordinary required validation, SHALL push only a commit that descends from the head it read, using a lease on that head, and SHALL confine the pushed diff to the change's active path, its dated archive path, and its declared canonical specs. When the head is behind `develop`, it MAY add a restore commit and a merge of `develop` before the finalization commit; a merge conflict SHALL stop the run without pushing. After the push it MAY update only the body's implementation fence and only when the body is unchanged since it was read. Events for one PR SHALL be processed one at a time. Missing credentials, a draft or forked PR, incomplete finalization inputs, or any finalization failure SHALL fail the run with the reason and SHALL push nothing.

#### Scenario: Ready candidate receives its finalization commit
- **WHEN** an implementation-bound version-3 PR becomes ready or its head changes while the head holds the active change
- **THEN** the workflow SHALL push a finalization commit to the PR branch with the publication identity
- **AND** ordinary required validation SHALL run for that new head

#### Scenario: Head already finalized and current
- **WHEN** the workflow observes a head whose finalized record verifies against the current `develop` tip
- **THEN** it SHALL push nothing and report the head as already finalized

#### Scenario: Developer push races the workflow
- **WHEN** the PR head changes between the workflow's read and its push
- **THEN** the leased push SHALL fail and the workflow SHALL push nothing else
- **AND** the event for the newer head SHALL perform the reconciliation

#### Scenario: Pushed diff leaves the change's paths
- **WHEN** a finalization result would change a path outside the active, archive, or declared canonical-spec paths
- **THEN** the publication route SHALL refuse the push and report the offending path

#### Scenario: Publication identity is unavailable
- **WHEN** the App credential is not configured for the finalization workflow
- **THEN** the run SHALL report the setup blocker
- **AND** SHALL NOT fall back to a workflow-token push that suppresses required validation

## MODIFIED Requirements

### Requirement: Single-PR finalization receives ordinary exact-head validation
A version-3 candidate SHALL run the ordinary required PR validation applicable to its complete implementation and final diff. Trusted validation SHALL verify from authoritative base policy that the current head contains exactly one coherent finalized delivery: the linked active change is removed, the declared dated archive is complete, canonical specs equal conservative delta application against the reviewed target baseline, conditional acceptance data is well formed, substantive tasks and evidence are complete, and every changed path is expected for the implementation.

No specialized documentation or acceptance-only route SHALL skip product, impact-selected, OpenSpec, or governance checks required by the implementation. Missing or stale base/head data, conflicts, unexpected paths, failed checks, undispositioned gaps, malformed manifests, or ambiguous synchronization SHALL leave the required check unsatisfied. Any new commit SHALL require fresh validation. An unfinalized non-draft version-3 head SHALL leave the required check unsatisfied and SHALL report that trusted finalization automation is the pending action, naming its latest run for the PR when one exists.

#### Scenario: Finalized implementation head is complete
- **WHEN** ordinary CI validates the exact implementation, synchronized specs, archive, and conditional manifest for the current head
- **THEN** the stable required check SHALL report the candidate ready for manual review
- **AND** SHALL NOT claim human acceptance or merge it

#### Scenario: Ready head awaits automated finalization
- **WHEN** ordinary CI validates a non-draft version-3 head that still holds the active change
- **THEN** the finalized-delivery check SHALL fail and identify automated finalization as pending
- **AND** the head that the automation pushes SHALL receive its own complete validation

#### Scenario: Documentation routing sees the archived final shape
- **WHEN** impact routing observes that the active plan moved into `openspec/changes/archive/**`
- **THEN** authoritative implementation association and full-diff classification SHALL preserve all implementation-required validation
- **AND** archive-shaped paths SHALL NOT downgrade the PR to a documentation-only check

#### Scenario: Target baseline advances
- **WHEN** `develop` changes after finalization so synchronization or candidate identity is stale
- **THEN** required validation SHALL fail or remain pending until the branch is reconciled and re-finalized
- **AND** an older successful run SHALL NOT authorize merge
