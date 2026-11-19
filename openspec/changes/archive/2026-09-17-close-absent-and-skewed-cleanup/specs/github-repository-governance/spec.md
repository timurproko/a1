## MODIFIED Requirements

### Requirement: Post-merge version-3 handling is read-only except safe branch cleanup
After a version-3 merge, trusted default-branch policy SHALL verify the exact source PR/head, required checks, manual authorized actor, merge method/time, target ancestry, synchronized specs, archive bytes, and conditional manifest. It SHALL report accepted-and-archived only when all evidence agrees. It SHALL NOT push to `develop`, create or update an acceptance/archive branch or PR, rewrite tasks/specs/evidence, or use an App publication credential for that delivery.

Merge-time verification SHALL bind the pull request's single `merged` timeline event to the recorded merge by the same human actor, the absence of an App, and the same merge commit; the event time SHALL agree with the pull request's `merged_at` within a small fixed tolerance of a few seconds so that clock skew between GitHub services does not invalidate a genuine manual merge. An event outside that tolerance, an unparsable time, a second merge event, a different actor or commit, or an App-performed merge SHALL remain contradictory provenance.

Existing exact-head remote-topic-branch cleanup MAY run after verified merge under its current protected/ref/ownership checks. Optional local cleanup SHALL remain separately ownership-controlled and SHALL require verified integration and remote-ref absence. Missing or contradictory post-merge evidence SHALL report a blocker requiring explicit reconciliation; it SHALL NOT be silently repaired with a privileged direct push.

#### Scenario: Integrated delivery verifies
- **WHEN** the merged candidate and remote provenance satisfy every version-3 invariant
- **THEN** status SHALL report the change accepted, synchronized, and archived
- **AND** safe exact-head remote branch cleanup MAY proceed

#### Scenario: Merge event time is skewed by a second
- **WHEN** the single `merged` timeline event by the authorized actor with the recorded merge commit carries a `created_at` one second away from the pull request's `merged_at`
- **THEN** verification SHALL treat it as the same merge and SHALL NOT report contradictory provenance

#### Scenario: Merge event time is far from the recorded merge
- **WHEN** the `merged` event time differs from `merged_at` by more than the fixed tolerance or cannot be parsed
- **THEN** verification SHALL report contradictory merge provenance and local cleanup SHALL remain blocked

#### Scenario: Post-merge verification disagrees
- **WHEN** merge actor, method, checks, archive, specs, manifest, or ancestry is missing or contradictory
- **THEN** automation SHALL report the exact blocker without mutating `develop` or publishing a follow-up PR
- **AND** local cleanup SHALL remain blocked

#### Scenario: App credentials are absent
- **WHEN** version-3 verification runs without archive publication credentials
- **THEN** read-only verification SHALL remain available because version-3 completion requires no publication identity
