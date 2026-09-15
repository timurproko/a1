## ADDED Requirements

### Requirement: Versioned delivery publication boundaries are explicit
Repository governance SHALL classify a supported version-3 OpenSpec association as one implementation-bound development PR from planning through finalized archive. It SHALL never publish, arm, or merge a dedicated acceptance or archive follow-up for that delivery. Existing requirements governing generated acceptance and archive PRs SHALL remain applicable only to version-1 and version-2 deliveries and already-published legacy work. Ordinary standalone documentation SHALL retain its existing exact-path automatic integration route.

#### Scenario: Draft delivery is opened
- **WHEN** an agent creates a new implementation-bound draft PR
- **THEN** the body SHALL start with `> Phase: Planning`, followed by `Proposal` containing one or two intent sentences and a concrete `Implementation` section
- **AND** machine linkage SHALL remain last under `Automation` in an explained collapsed disclosure without routine validation-command boilerplate

#### Scenario: Final delivery body is validated
- **WHEN** version-3 candidate validation evaluates a completed implementation PR
- **THEN** its first nonblank line SHALL be exactly `> Phase: Acceptance`
- **AND** one each of `Proposal`, `Implementation`, `Acceptance`, and `Automation` SHALL appear in that order
- **AND** `Proposal` SHALL contain only one or two sentences of visible intent

#### Scenario: Finalized version-3 diff is documentation-shaped
- **WHEN** a version-3 implementation PR's final diff contains synchronized specs and a dated archive but its authoritative lifecycle association remains implementation-bound
- **THEN** documentation automation SHALL keep auto-merge disabled
- **AND** SHALL require authorized human manual merge

#### Scenario: Version-3 implementation merges
- **WHEN** a supported version-3 development PR merges
- **THEN** archive reconciliation SHALL verify the integrated archive without creating acceptance-only or archive-only pull requests

#### Scenario: Standalone documentation passes
- **WHEN** an unrelated non-draft documentation PR satisfies the existing exact allowlist and has no implementation-bound association
- **THEN** its existing CI-gated automatic integration route SHALL remain available

#### Scenario: Legacy archive remains pending
- **WHEN** a version-1 or version-2 delivery has a valid pending acceptance or archive PR
- **THEN** trusted legacy reconciliation SHALL continue under its existing rules
- **AND** SHALL NOT migrate it implicitly to the version-3 route

### Requirement: Single-PR finalization receives ordinary exact-head validation
A version-3 candidate SHALL run the ordinary required PR validation applicable to its complete implementation and final diff. Trusted validation SHALL verify from authoritative base policy that the current head contains exactly one coherent finalized delivery: the linked active change is removed, the declared dated archive is complete, canonical specs equal conservative delta application against the reviewed target baseline, conditional acceptance data is well formed, substantive tasks and evidence are complete, and every changed path is expected for the implementation.

No specialized documentation or acceptance-only route SHALL skip product, impact-selected, OpenSpec, or governance checks required by the implementation. Missing or stale base/head data, conflicts, unexpected paths, failed checks, undispositioned gaps, malformed manifests, or ambiguous synchronization SHALL leave the required check unsatisfied. Any new commit SHALL require fresh validation.

#### Scenario: Finalized implementation head is complete
- **WHEN** ordinary CI validates the exact implementation, synchronized specs, archive, and conditional manifest for the current head
- **THEN** the stable required check SHALL report the candidate ready for manual review
- **AND** SHALL NOT claim human acceptance or merge it

#### Scenario: Documentation routing sees the archived final shape
- **WHEN** impact routing observes that the active plan moved into `openspec/changes/archive/**`
- **THEN** authoritative implementation association and full-diff classification SHALL preserve all implementation-required validation
- **AND** archive-shaped paths SHALL NOT downgrade the PR to a documentation-only check

#### Scenario: Target baseline advances
- **WHEN** `develop` changes after finalization so synchronization or candidate identity is stale
- **THEN** required validation SHALL fail or remain pending until the branch is reconciled and re-finalized
- **AND** an older successful run SHALL NOT authorize merge

### Requirement: Manual development merge is the sole version-3 acceptance action
Every version-3 development PR SHALL remain ineligible for native auto-merge, trusted direct merge reconciliation, merge queue integration, and documentation auto-merge. An authorized human maintainer SHALL manually merge the exact current head after required validation. The merge SHALL mean that maintainer accepts the one to three plain implementation scenarios bound to the committed conditional manifest. Repository automation SHALL NOT edit acceptance state, check boxes, infer human acceptance from CI, or merge on the maintainer's behalf.

#### Scenario: Candidate is green
- **WHEN** all exact-head required checks succeed for a version-3 PR
- **THEN** repository automation SHALL leave it open with auto-merge disabled
- **AND** status SHALL identify manual maintainer merge as the remaining acceptance action

#### Scenario: PR body changes
- **WHEN** the acceptance list or lifecycle metadata changes without a new commit
- **THEN** trusted policy SHALL re-evaluate body-to-manifest membership for the current head
- **AND** an invalid edit SHALL block merge rather than being treated as acceptance

#### Scenario: Maintainer manually merges
- **WHEN** an authorized human uses a permitted manual merge method on the exact validated head
- **THEN** implementation, canonical specs, conditional acceptance record, and archive SHALL integrate in one protected operation
- **AND** no later repository mutation SHALL be needed to establish acceptance

### Requirement: Post-merge version-3 handling is read-only except safe branch cleanup
After a version-3 merge, trusted default-branch policy SHALL verify the exact source PR/head, required checks, manual authorized actor, merge method/time, target ancestry, synchronized specs, archive bytes, and conditional manifest. It SHALL report accepted-and-archived only when all evidence agrees. It SHALL NOT push to `develop`, create or update an acceptance/archive branch or PR, rewrite tasks/specs/evidence, or use an App publication credential for that delivery.

Existing exact-head remote-topic-branch cleanup MAY run after verified merge under its current protected/ref/ownership checks. Optional local cleanup SHALL remain separately ownership-controlled and SHALL require verified integration and remote-ref absence. Missing or contradictory post-merge evidence SHALL report a blocker requiring explicit reconciliation; it SHALL NOT be silently repaired with a privileged direct push.

#### Scenario: Integrated delivery verifies
- **WHEN** the merged candidate and remote provenance satisfy every version-3 invariant
- **THEN** status SHALL report the change accepted, synchronized, and archived
- **AND** safe exact-head remote branch cleanup MAY proceed

#### Scenario: Post-merge verification disagrees
- **WHEN** merge actor, method, checks, archive, specs, manifest, or ancestry is missing or contradictory
- **THEN** automation SHALL report the exact blocker without mutating `develop` or publishing a follow-up PR
- **AND** local cleanup SHALL remain blocked

#### Scenario: App credentials are absent
- **WHEN** version-3 verification runs without archive publication credentials
- **THEN** read-only verification SHALL remain available because version-3 completion requires no publication identity

### Requirement: Live acceptance proves the atomic delivery lifecycle
Acceptance of version-3 governance SHALL include live evidence that a new plan stayed draft and unmerged, explicit plan approval led to implementation in that same normally named PR, finalization staged conservative synchronization and archival, ordinary exact-head CI covered the complete candidate, and an authorized maintainer's manual merge integrated implementation, acceptance, specs, and archive atomically. Evidence SHALL identify the change, source PR/head, validation runs, acceptance scenarios, merger and method, target commit, archive path, canonical-spec result, absence of generated acceptance/archive PRs, and remote-branch cleanup outcome.

Fixtures SHALL additionally verify unimplemented-plan holds, rejected drafts, stale-head/body/baseline refusal, malformed or incomplete finalization, legacy compatibility, standalone-documentation auto-merge control, dry-run non-mutation, and protected cleanup. Unit tests or API responses alone SHALL NOT establish live lifecycle acceptance. Bootstrap of this policy MAY complete under the preceding version-2 lifecycle, but the first version-3 canary SHALL supply the required live evidence before version 3 is considered fully operational.

#### Scenario: Version-3 lifecycle succeeds
- **WHEN** an isolated new change exercises the deployed policy
- **THEN** evidence SHALL trace draft planning through same-PR implementation, finalization, exact-head CI, authorized manual merge, integrated archive verification, and cleanup
- **AND** SHALL show that no acceptance or archive follow-up PR was created

#### Scenario: Plan is rejected
- **WHEN** an isolated draft is closed without merge before or after implementation
- **THEN** evidence SHALL show no plan, code, synchronization, accepted archive, or cleanup was integrated on `develop`

#### Scenario: Automatic merge is attempted
- **WHEN** native auto-merge, documentation reconciliation, merge queue, App, or bot authority attempts to integrate a version-3 candidate
- **THEN** evidence SHALL show safe refusal and preservation of the manual human merge requirement

#### Scenario: Standalone docs control succeeds
- **WHEN** an eligible unrelated documentation-only control passes required validation
- **THEN** evidence SHALL show its existing automatic route remains functional and separate from version-3 delivery
