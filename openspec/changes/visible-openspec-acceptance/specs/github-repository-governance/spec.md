## MODIFIED Requirements

### Requirement: Documentation auto-merge remains exact and current-head-bound
Only a non-draft same-repository pull request into `develop` whose complete diff is under `openspec/**`, under `docs/**`, and/or exactly root `README.md`, and which is neither implementation-bound nor acceptance-bound, SHALL be automatically squash-integrated. Both sides of renames SHALL be classified. Required validation SHALL gate the merge, and any direct reconciliation SHALL require successful validation for the current head and enforce that expected SHA through normal branch-protected integration. Eligible validated heads reported as `clean`, or as `unstable` with positive mergeability, SHALL be reconciled without requiring auto-merge to have been armed first.

An implementation association, introduction of a new active OpenSpec change, or dedicated acceptance-record association SHALL exclude a PR from documentation auto-merge, independently of its draft status or currently documentation-only diff. Complete diff and authoritative base/head state SHALL identify newly introduced active changes and reserved acceptance records even when their association is removed. Archived change directories SHALL NOT be mistaken for newly introduced active plans, and verified archive copies of acceptance evidence SHALL NOT be mistaken for new acceptance requests. Missing, malformed, or ambiguous classification inputs SHALL fail closed. Lifecycle association edits SHALL trigger reconciliation, and an excluded PR SHALL have any armed auto-merge disabled. Ordinary standalone documentation, existing-change planning revisions without a manual lifecycle association, and eligible archive follow-ups SHALL retain their automatic path.

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
- **THEN** auto-merge SHALL remain disabled and the pull request SHALL await manual acceptance

#### Scenario: Successful validation is stale
- **WHEN** successful validation names a head other than the current pull-request head
- **THEN** automation SHALL NOT directly integrate the current head

#### Scenario: New plan is accidentally made ready
- **WHEN** a new active OpenSpec change's planning PR becomes ready while its diff remains OpenSpec-only
- **THEN** repository automation SHALL hold the PR and disable any armed auto-merge
- **AND** removing the PR's implementation association SHALL NOT bypass the hold

#### Scenario: PR association changes without a new commit
- **WHEN** a PR body edit introduces an implementation or acceptance association
- **THEN** repository automation SHALL reconcile the existing head's eligibility and disable any armed auto-merge

#### Scenario: Classification data is ambiguous
- **WHEN** lifecycle metadata or required base/head or changed-file data cannot be safely classified
- **THEN** repository automation SHALL leave auto-merge disabled and report the blocker

#### Scenario: Archive-only follow-up passes
- **WHEN** an eligible archive PR moves a completed change out of the active directory and updates its declared main specs
- **THEN** repository automation SHALL allow automatic integration behind current-head required validation
- **AND** SHALL NOT hold it merely because the archive contains planning artifacts or copies of verified acceptance evidence

#### Scenario: Acceptance record is documentation-only
- **WHEN** a dedicated acceptance PR passes current-head validation with only documentation paths
- **THEN** neither direct reconciliation nor auto-merge arming SHALL integrate it
- **AND** its reserved records and authoritative association SHALL preserve the manual hold if labels or body markers are removed

## ADDED Requirements

### Requirement: Acceptance publication and verification use trusted policy
Acceptance request publication, candidate validation, and post-merge receipt verification SHALL run trusted repository policy with bounded reads and least-privilege publication. Untrusted PR code SHALL NOT receive publication credentials. Generated acceptance PRs SHALL trigger real current-head validation. The validator SHALL verify complete diff scope, record schema, source identities, evidence bindings, and unresolved blockers without using PR-provided executable instructions. A human manual merge and its resulting record bytes SHALL be verified separately from candidate CI success.

#### Scenario: Request is generated
- **WHEN** trusted reconciliation creates an acceptance PR using its existing publication identity
- **THEN** ordinary PR checks SHALL run and validate that exact candidate without granting the candidate publication authority

#### Scenario: Candidate is stale or has extra changes
- **WHEN** acceptance CI detects changed source bindings, unknown fields, unrelated file changes, or missing evidence
- **THEN** it SHALL fail with an actionable blocker and SHALL NOT claim the request ready for acceptance

#### Scenario: Acceptance PR merges
- **WHEN** the trusted merge handler sees an acceptance PR merge
- **THEN** it SHALL verify authorized human manual-merge provenance, exact record bytes, and required current-head checks before resuming the linked implementation's archive
- **AND** unavailable, automated, or contradictory merge provenance SHALL block receipt acceptance
