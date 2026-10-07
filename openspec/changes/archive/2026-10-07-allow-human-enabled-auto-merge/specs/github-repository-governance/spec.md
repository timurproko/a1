## MODIFIED Requirements

### Requirement: Documentation auto-merge remains exact and current-head-bound
Only a non-draft same-repository pull request into `develop` whose complete diff is under `openspec/**`, under `docs/**`, and/or exactly root `README.md`, and which is neither implementation-bound nor acceptance-bound, SHALL be automatically squash-integrated by documentation automation. Both sides of renames SHALL be classified. Required validation SHALL gate the merge, and any direct reconciliation SHALL require successful validation for the current head and enforce that expected SHA through normal branch-protected integration. Eligible validated heads reported as `clean`, or as `unstable` with positive mergeability, SHALL be reconciled without requiring auto-merge to have been armed first.

An implementation association, introduction of a new active OpenSpec change, or dedicated acceptance-record association SHALL exclude a PR from documentation auto-merge, independently of its draft status or currently documentation-only diff. Complete diff and authoritative base/head state SHALL identify newly introduced active changes and reserved acceptance records even when their association is removed. Archived change directories SHALL NOT be mistaken for newly introduced active plans, and verified archive copies of acceptance evidence SHALL NOT be mistaken for new acceptance requests. Missing, malformed, or ambiguous classification inputs SHALL fail closed. Lifecycle association edits SHALL trigger reconciliation. An excluded PR SHALL have any automation-armed auto-merge disabled; a finalized version-3 PR's exact-head auto-merge explicitly armed by an authorized human SHALL instead be preserved for that human-owned acceptance route. Ordinary standalone documentation, existing-change planning revisions without a manual lifecycle association, and eligible archive follow-ups SHALL retain their automatic path.

#### Scenario: OpenSpec-only pull request passes
- **WHEN** an eligible OpenSpec-only standalone revision's current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Maintained documentation-only pull request passes
- **WHEN** an eligible `docs/**`-only current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Root README-only pull request passes
- **WHEN** an eligible root-README-only current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Allowed documentation surfaces are mixed
- **WHEN** a current head changes only paths under `openspec/**`, paths under `docs/**`, and/or root `README.md`, without a draft, implementation-bound, or acceptance-bound exclusion
- **THEN** repository automation SHALL preserve its documentation-only eligibility

#### Scenario: Mixed pull request passes CI
- **WHEN** any changed or renamed-from path is outside the exact allowlist
- **THEN** documentation automation SHALL NOT arm or directly merge the pull request
- **AND** a valid human arm MAY remain only for a finalized version-3 candidate

#### Scenario: Successful validation is stale
- **WHEN** successful validation names a head other than the current pull-request head
- **THEN** automation SHALL NOT directly integrate the current head

#### Scenario: New plan is accidentally made ready
- **WHEN** a new active OpenSpec change's planning PR becomes ready while its diff remains OpenSpec-only
- **THEN** repository automation SHALL hold the PR and disable any armed auto-merge
- **AND** removing the PR's implementation association SHALL NOT bypass the hold

#### Scenario: PR association changes without a new commit
- **WHEN** a PR body edit introduces an implementation or acceptance association
- **THEN** repository automation SHALL reconcile the existing head's eligibility
- **AND** SHALL disable an inherited arm unless trusted evidence proves an authorized human armed the finalized version-3 candidate after that change

#### Scenario: Human arms a finalized implementation
- **WHEN** an authorized human enables native auto-merge on the exact finalized version-3 head
- **THEN** documentation automation SHALL leave that human arm intact without treating the PR as documentation-auto-merge eligible
- **AND** SHALL NOT invoke an implementation merge or enable mutation itself

#### Scenario: Classification data is ambiguous
- **WHEN** lifecycle metadata or required base/head, arming-actor, timeline, permission, or changed-file data cannot be safely classified
- **THEN** automation SHALL leave auto-merge disabled and report the blocker

#### Scenario: Archive-only follow-up passes
- **WHEN** an eligible archive PR moves a completed change out of the active directory and updates its declared main specs
- **THEN** repository automation SHALL allow automatic integration behind current-head required validation
- **AND** SHALL NOT hold it merely because the archive contains planning artifacts or copies of verified acceptance evidence

#### Scenario: Acceptance record is documentation-only
- **WHEN** a dedicated acceptance PR passes current-head validation with only documentation paths
- **THEN** neither direct reconciliation nor auto-merge arming SHALL integrate it
- **AND** its reserved records and authoritative association SHALL preserve the manual hold if labels or body markers are removed

### Requirement: Manual development merge is the sole version-3 acceptance action
Every version-3 development PR SHALL remain ineligible for trusted direct merge reconciliation, merge queue integration, documentation auto-merge, and automation-armed native auto-merge. An authorized human maintainer SHALL select the exact finalized head after reviewing its acceptance list, either by manually merging it after required validation or by personally arming native auto-merge for that unchanged head. The resulting protected integration SHALL mean that maintainer accepts the one to three plain implementation scenarios bound to the committed conditional manifest. Repository automation SHALL NOT edit acceptance state, check boxes, infer human acceptance from CI, arm implementation auto-merge, or merge on the maintainer's behalf.

A human arm SHALL remain valid only while the PR head and acceptance list remain unchanged. A new commit, finalization update, acceptance-list edit, draft conversion, or ambiguous provenance SHALL disable or invalidate the arm and require a new maintainer action.

#### Scenario: Candidate is green
- **WHEN** all exact-head required checks succeed for a version-3 PR without an authorized human arm
- **THEN** repository automation SHALL leave it open
- **AND** status SHALL identify maintainer merge or human-enabled auto-merge as the remaining acceptance action

#### Scenario: Maintainer manually merges
- **WHEN** an authorized human uses a permitted manual merge method on the exact validated head
- **THEN** implementation, canonical specs, conditional acceptance record, and archive SHALL integrate in one protected operation
- **AND** no later repository mutation SHALL be needed to establish acceptance

#### Scenario: Maintainer enables native auto-merge
- **WHEN** an authorized human enables native auto-merge after the finalized head and acceptance list are current
- **THEN** GitHub MAY integrate that exact head only after required validation succeeds
- **AND** the human arming action SHALL supply acceptance authority without repository automation arming or merging the PR

#### Scenario: Candidate changes after arming
- **WHEN** the head, acceptance list, lifecycle metadata, or finalized body changes after human auto-merge authorization
- **THEN** the prior arm SHALL be disabled or treated as stale
- **AND** the maintainer SHALL choose again for the new candidate

#### Scenario: PR body changes
- **WHEN** the acceptance list or lifecycle metadata changes without a new commit
- **THEN** trusted policy SHALL re-evaluate body-to-manifest membership for the current head
- **AND** an invalid edit or stale human arm SHALL block merge rather than being treated as acceptance

### Requirement: Post-merge version-3 handling is read-only except safe branch cleanup
After a version-3 merge, trusted default-branch policy SHALL verify the exact source PR/head, required checks, authorized human actor and integration choice, merge method/time, target ancestry, synchronized specs, archive bytes, and conditional manifest. It SHALL report accepted-and-archived only when all evidence agrees. It SHALL NOT push to `develop`, create or update an acceptance/archive branch or PR, rewrite tasks/specs/evidence, or use an App publication credential for that delivery.

Merge-time verification SHALL bind the pull request's single `merged` timeline event to the recorded merge by the same human actor, the absence of an App, and the same merge commit; the event time SHALL agree with the pull request's `merged_at` within a small fixed tolerance of a few seconds. Direct manual integration SHALL have no active automatic authority. Human-enabled auto-merge SHALL additionally bind `auto_merge.enabled_by`, the authorized actor's matching enable event, the final committed head, absence of a later candidate commit or disable event, and absence of merge-queue provenance. An enable event followed by a disable event before a valid manual merge SHALL be treated as an abandoned attempt, not contradictory provenance. Missing, malformed, stale, duplicate, differently authored, App/Bot-authored, queue-backed, or commit-mismatched provenance SHALL remain invalid.

Existing exact-head remote-topic-branch cleanup MAY run after verified merge under its current protected/ref/ownership checks. Optional local cleanup SHALL remain separately ownership-controlled and SHALL require verified integration and remote-ref absence. Missing or contradictory post-merge evidence SHALL report a blocker requiring explicit reconciliation; it SHALL NOT be silently repaired with a privileged direct push.

#### Scenario: Integrated delivery verifies
- **WHEN** the merged candidate and remote provenance satisfy every version-3 invariant through either accepted maintainer route
- **THEN** status SHALL report the change accepted, synchronized, and archived
- **AND** safe exact-head remote branch cleanup MAY proceed

#### Scenario: Human-enabled auto-merge verifies
- **WHEN** the authorized merged actor personally armed native auto-merge after the final head became current and exact-head checks then passed
- **THEN** verification SHALL accept that immutable arming and merge provenance
- **AND** SHALL NOT classify GitHub's protected integration as bot or App acceptance

#### Scenario: Disabled attempt precedes manual merge
- **WHEN** a human auto-merge enable event is followed by a disable event before the same authorized human manually merges the exact validated head
- **THEN** verification SHALL use the manual route and SHALL NOT reject the abandoned enable attempt

#### Scenario: Merge event time is skewed by a second
- **WHEN** the single `merged` timeline event by the authorized actor with the recorded merge commit carries a `created_at` one second away from the pull request's `merged_at`
- **THEN** verification SHALL treat it as the same merge and SHALL NOT report contradictory provenance

#### Scenario: Merge event time is far from the recorded merge
- **WHEN** the `merged` event time differs from `merged_at` by more than the fixed tolerance or cannot be parsed
- **THEN** verification SHALL report contradictory merge provenance and local cleanup SHALL remain blocked

#### Scenario: Post-merge verification disagrees
- **WHEN** merge actor, integration route, arming actor, event order, method, checks, archive, specs, manifest, or ancestry is missing or contradictory
- **THEN** automation SHALL report the exact blocker without mutating `develop` or publishing a follow-up PR
- **AND** local cleanup SHALL remain blocked

#### Scenario: App credentials are absent
- **WHEN** version-3 verification runs without archive publication credentials
- **THEN** read-only verification SHALL remain available because version-3 completion requires no publication identity
