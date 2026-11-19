## MODIFIED Requirements

### Requirement: Documentation auto-merge remains exact and current-head-bound
Only a non-draft same-repository pull request into `develop` whose complete diff is under `openspec/**`, under `docs/**`, and/or exactly root `README.md`, and which is not implementation-bound, SHALL be automatically squash-integrated. Both sides of renames SHALL be classified. Required validation SHALL gate the merge, and any direct clean-state reconciliation SHALL require successful validation for the current head and enforce that expected SHA.

An implementation association or introduction of a new active OpenSpec change SHALL exclude a PR from documentation auto-merge, independently of its draft status or currently documentation-only diff. Complete diff and authoritative base/head state SHALL identify newly introduced active changes even when their association is removed. Archived change directories SHALL NOT be mistaken for newly introduced active plans. Missing, malformed, or ambiguous classification inputs SHALL fail closed. Lifecycle association edits SHALL trigger reconciliation, and an excluded PR SHALL have any armed auto-merge disabled. Ordinary standalone documentation, existing-change planning revisions without an implementation association, and eligible archive follow-ups SHALL retain their automatic path.

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
- **WHEN** a current head changes only paths under `openspec/**`, paths under `docs/**`, and/or root `README.md`, without a draft or implementation-bound exclusion
- **THEN** repository automation SHALL preserve its documentation-only eligibility

#### Scenario: New plan is accidentally made ready
- **WHEN** a new active OpenSpec change's planning PR becomes ready while its diff remains OpenSpec-only
- **THEN** repository automation SHALL hold the PR and disable any armed auto-merge
- **AND** removing the PR's implementation association SHALL NOT bypass the hold

#### Scenario: PR association changes without a new commit
- **WHEN** a PR body edit introduces an implementation association
- **THEN** repository automation SHALL reconcile the existing head's eligibility and disable any armed auto-merge

#### Scenario: Classification data is ambiguous
- **WHEN** lifecycle metadata or required base/head or changed-file data cannot be safely classified
- **THEN** repository automation SHALL leave auto-merge disabled and report the blocker

#### Scenario: Archive-only follow-up passes
- **WHEN** an eligible archive PR moves a completed change out of the active directory and updates its declared main specs
- **THEN** repository automation SHALL allow automatic integration behind current-head required validation
- **AND** SHALL NOT hold it merely because the archive contains planning artifacts

#### Scenario: Mixed pull request passes CI
- **WHEN** any changed or renamed-from path is outside the exact allowlist
- **THEN** auto-merge SHALL remain disabled and the pull request SHALL await manual acceptance

#### Scenario: Successful validation is stale
- **WHEN** successful validation names a head other than the current pull-request head
- **THEN** automation SHALL NOT directly integrate the current head

## ADDED Requirements

### Requirement: Post-merge archival executes only trusted repository policy
The post-merge archive workflow SHALL execute reviewed default-branch policy with explicitly inventoried triggers, permissions, concurrency, and resource limits. It SHALL process only eligible same-repository implementation merges into `develop`. PR metadata and repository documents SHALL be treated as data, not executable commands or authority to alter workflow permissions.

Write credentials SHALL NOT be exposed to PR-head code, repository lifecycle hooks from candidate data, fork code, or arbitrary artifact content. Change identifiers, repository identity, commit identities, paths, file types, and complete diff scope SHALL be validated before mutation. Archive automation SHALL NOT change repository rulesets, bypass required checks, or delete local worktrees.

#### Scenario: Forged or forked event
- **WHEN** an event names a fork, wrong base, unmerged PR, invalid change path, or unverifiable commit
- **THEN** automation SHALL refuse archive mutation and provide a bounded reason

#### Scenario: Candidate text contains executable instructions
- **WHEN** a PR body, delta, or artifact contains shell syntax, executable configuration, or a path escaping its declared roots
- **THEN** the content SHALL NOT be executed with write authority
- **AND** unsafe candidate inputs SHALL be rejected

#### Scenario: Workflow inventory changes
- **WHEN** archive triggers, credentials, action pins, or permissions are introduced or changed
- **THEN** the reviewed governance inventory and its validation SHALL describe and verify the actual authority

### Requirement: Generated archive PRs receive real current-head validation
A generated archive PR SHALL trigger the repository's ordinary required PR validation on every published head, including automated updates. Publication SHALL use an explicitly provisioned identity whose events trigger those workflows. Missing credentials or missing validation runs SHALL be reported as blocked or deferred, not as successful integration. Automation SHALL NOT use suppressed workflow-token events as an unnoticed substitute, synthesize a successful required check, or bypass branch protection.

Every generated changed and renamed-from path SHALL be under the selected change's active/archive paths or its declared main-spec paths within `openspec/**`. Existing documentation auto-merge SHALL remain the sole merge-policy owner, with its exact allowlist, current-head validation, expected-head enforcement, and protected squash integration intact. Any required update outside the permitted archive scope SHALL block this automatic path.

#### Scenario: App-authored archive PR opens
- **WHEN** automation publishes an eligible archive branch and PR
- **THEN** ordinary required validation SHALL run for that head
- **AND** the existing documentation policy SHALL arrange squash integration only behind those checks

#### Scenario: Publication credential is unavailable
- **WHEN** the event-triggering publication identity is not configured
- **THEN** automation SHALL report the setup blocker and SHALL NOT fall back to a PR creation route that suppresses CI

#### Scenario: Archive validation fails
- **WHEN** strict OpenSpec validation or applicable documentation governance fails for the generated head
- **THEN** the archive PR SHALL remain unmerged
- **AND** automation SHALL NOT modify a non-OpenSpec generated baseline to force the PR through

#### Scenario: Published head changes
- **WHEN** automation updates an archive PR after regeneration
- **THEN** its prior validation SHALL NOT authorize merging the new head
- **AND** fresh required validation SHALL be triggered

### Requirement: Archive publication is idempotent and ownership-safe
Automation SHALL maintain at most one automatic archive PR per change and implementation identity. Duplicate merge events, catch-up, and retry SHALL converge on that PR or on a verified integrated archive. Concurrent archives affecting the same specifications SHALL not overwrite each other. Publication SHALL recheck source evidence and affected target state, and updates SHALL preserve any ref or PR containing unrecognized human edits.

A closed, unmerged archive PR SHALL be treated as an explicit stop requiring maintainer retry authorization, not automatically recreated. PR creation or arming auto-merge SHALL NOT count as archive integration. Integration SHALL be reported only after a confirmed merge, and existing exact-head remote-branch cleanup SHALL own branch deletion.

#### Scenario: Event and catch-up select the same change
- **WHEN** both runs select the same accepted implementation
- **THEN** they SHALL reuse one owned archive branch and PR instead of publishing duplicates

#### Scenario: Human advances the generated branch
- **WHEN** an archive branch differs from the last verifiable automation-owned head
- **THEN** automation SHALL preserve it and report manual intervention rather than force-push over it

#### Scenario: Maintainer closes the archive PR
- **WHEN** a generated PR is closed without merging
- **THEN** scheduled reconciliation SHALL not reopen or replace it without explicit maintainer authorization

#### Scenario: Another archive updates a shared spec
- **WHEN** a preceding archive changes a spec needed by a queued archive
- **THEN** the queued archive SHALL regenerate against the new target and rerun synchronization checks before publication

#### Scenario: Archive PR merges
- **WHEN** GitHub confirms integration of the expected archive PR
- **THEN** reporting SHALL identify its merge commit and source implementation
- **AND** remote cleanup SHALL use the existing exact-head safety rules without touching local worktrees

### Requirement: Archive automation acceptance proves the live end-to-end lifecycle
Acceptance of the revised delivery and archive automation SHALL include live evidence that a new plan stayed unmerged in a draft PR, explicit approval led to implementation in that same PR, and its maintainer-accepted manual merge caused a separate OpenSpec-only archive PR. Archive publication SHALL trigger ordinary current-head required validation, and existing automation SHALL squash-integrate it without another archive command or manual archive-PR merge. Evidence SHALL identify the linked change, source acceptance/head/merge, archive PR/head, validation run, resulting target commit, and remote-branch cleanup outcome.

Fixtures SHALL additionally verify eligibility refusals, dry-run non-mutation, retry convergence, and protection of human edits. Unit-test success or API creation responses alone SHALL NOT establish live acceptance. Bootstrap validation of the automation itself SHALL not require it to archive its own still-unaccepted implementation.

#### Scenario: Single-PR lifecycle succeeds
- **WHEN** an isolated new change exercises the deployed trusted workflow
- **THEN** acceptance evidence SHALL trace draft planning, explicit implementation approval, same-PR refinement and implementation, final-head acceptance, and manual merge through archive PR validation, automatic squash integration, and cleanup

#### Scenario: Planning and rejection holds are exercised
- **WHEN** an isolated planning PR is marked ready before implementation and is subsequently rejected and closed unmerged
- **THEN** evidence SHALL show no automatic planning merge, no completed-change archive, and no integration of its artifacts into `develop`

#### Scenario: Bot PR exists but CI never starts
- **WHEN** PR creation succeeds without ordinary required validation being triggered
- **THEN** acceptance SHALL remain incomplete and identify the missing workflow lifecycle

#### Scenario: Negative fixture is exercised
- **WHEN** a fixture presents stale acceptance, incomplete tasks, conflicting deltas, duplicate events, or a human-advanced ref
- **THEN** evidence SHALL demonstrate the corresponding safe refusal or idempotent outcome without a false completion claim
