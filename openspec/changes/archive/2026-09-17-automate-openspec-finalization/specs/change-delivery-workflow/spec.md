## MODIFIED Requirements

### Requirement: Finalization is conservative and reversible before merge
Version-3 finalization SHALL operate only in the implementation branch and SHALL stage the complete intended `develop` result: canonical spec synchronization, a dated archive containing all change artifacts and evidence, removal of the active change, completed substantive task bookkeeping, and a conditional acceptance manifest. Finalization SHALL use a fresh target baseline, apply every declared delta, preserve unrelated requirements, and fail closed on conflicts, ambiguous transformations, incomplete artifacts/tasks/evidence, undispositioned gaps, occupied archive targets, or validation failure.

Trusted repository automation SHALL perform finalization on a ready implementation-bound version-3 PR whenever its head or body changes, committing the result to the implementation branch and updating the body's implementation fence; a draft PR SHALL NOT be finalized. A developer MAY run the same finalization locally, and automation SHALL verify and leave alone a head that is already finalized against the current target.

The finalization operation SHALL be deterministic and idempotent for the same inputs, and SHALL be repeatable from the archived form: when a finalized candidate's archived artifacts, deltas, acceptance list, gap dispositions, or target baseline change before merge, finalization SHALL restore the active form, resynchronize against the current target, and produce a new manifest under the same dated archive path instead of requiring a revert. No canonical state changes on `develop` until the PR merges.

#### Scenario: Finalization succeeds
- **WHEN** every required artifact, substantive task, evidence item, gap disposition, and delta is complete and unambiguous against the current target baseline
- **THEN** the branch SHALL contain the verified synchronized specs and complete dated archive as one candidate
- **AND** the active change SHALL no longer appear in that candidate

#### Scenario: Ready candidate is finalized by automation
- **WHEN** an implementation-bound version-3 PR is ready for review and its head contains the active change
- **THEN** trusted automation SHALL commit the finalization to the implementation branch with an identity whose push triggers ordinary exact-head validation
- **AND** SHALL update the body's implementation fence with the emitted archive and manifest paths only after that commit is on the branch

#### Scenario: Finalized candidate is corrected before merge
- **WHEN** a commit after finalization edits the archived tasks, evidence, design, or deltas, or the acceptance list changes
- **THEN** finalization SHALL rerun from the archived form and replace the manifest under the same archive path
- **AND** no revert of the earlier finalization SHALL be required

#### Scenario: Target specs changed concurrently
- **WHEN** current `develop` no longer matches the baseline used to prepare synchronization
- **THEN** candidate validation SHALL block readiness or merge until the branch is reconciled and finalization reruns
- **AND** automation reconciling the branch SHALL restore the active form before merging the target so synchronized specs take the target's bytes and the delta is reapplied against the fresh baseline
- **AND** stale successful validation SHALL NOT authorize integration

#### Scenario: Finalization finds incomplete work
- **WHEN** an implementation, validation, evidence, or required manual-observation task remains incomplete without explicit disposition
- **THEN** finalization SHALL preserve the active working state and identify the blocker
- **AND** SHALL NOT manufacture task completion or an accepted archive
- **AND** automation SHALL push nothing and SHALL report the finalization code

#### Scenario: Pull request closes without merge
- **WHEN** a finalized version-3 PR is closed unmerged
- **THEN** its staged archive and synchronized specs SHALL remain absent from `develop`
- **AND** closure SHALL NOT be recorded as completed acceptance or archival
