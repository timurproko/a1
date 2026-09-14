# github-repository-governance Specification

## Purpose
Define the reviewed GitHub repository policy, trusted workflow authority, safe merged-branch lifecycle, drift detection, and live acceptance requirements.

## Requirements

### Requirement: Governed GitHub state is declarative and drift-detectable
A1 SHALL keep one reviewed repository definition for governed repository settings,
Actions policy, environments, complete ruleset fields, protected refs, and workflow
inventory. A read-only check SHALL compare that definition with live GitHub state and
report field-level drift without mutating the repository. Applying policy SHALL require
a separate explicit maintainer confirmation and SHALL verify live state afterwards.

#### Scenario: Live policy matches
- **WHEN** the read-only governance check compares the reviewed definition with GitHub
- **THEN** it SHALL report every governed field as matching and perform no mutation

#### Scenario: An unnormalized live field drifts
- **WHEN** GitHub differs in a governed field that the former ruleset normalizer ignored
- **THEN** the check SHALL fail and identify the ruleset and field

#### Scenario: Ordinary CI evaluates repository policy
- **WHEN** a pull request runs repository governance validation
- **THEN** it SHALL use read-only authority and SHALL NOT apply settings or rulesets

#### Scenario: Maintainer applies reviewed policy
- **WHEN** the maintainer invokes the policy application command with its exact confirmation
- **THEN** only declared differences SHALL be mutated and a post-apply read SHALL match the definition

### Requirement: Protected refs retain distinct responsibilities
`develop` SHALL reject deletion and non-fast-forward updates, require a pull request,
require resolved review threads, and require `Development validation required` with
no bypass actor. `master` SHALL reject deletion and non-fast-forward updates while
remaining writable by a successful stable release fast-forward. `v*` tags SHALL
reject deletion and movement. Any change to approvals, strict-base policy, merge
methods, or bypass authority SHALL require an explicit specification decision.

#### Scenario: Pull request validation is incomplete
- **WHEN** a pull request targeting `develop` lacks a successful required check
- **THEN** GitHub SHALL prevent integration

#### Scenario: Stable release records itself
- **WHEN** npm serves the verified stable package
- **THEN** release automation MAY fast-forward `master` and create the matching immutable `v*` tag

#### Scenario: Protected history is rewritten
- **WHEN** an actor attempts to delete or non-fast-forward a protected branch or move a release tag
- **THEN** GitHub SHALL reject the operation without a bypass

### Requirement: Workflow authority is explicit and least-privileged
The repository SHALL inventory each workflow's trusted source, triggers, permissions,
concurrency, validation or publication authority, and artifact retention. A workflow
with write permission SHALL execute only default-branch trusted code and SHALL NOT
check out or execute pull-request code with that token. Third-party actions SHALL be
pinned to reviewed immutable commits; whether GitHub enforces the allowlist and SHA
policy SHALL be visible in drift reporting.

#### Scenario: Pull-request code is untrusted
- **WHEN** a write-authority workflow processes pull-request metadata
- **THEN** it SHALL check out trusted default-branch policy and SHALL NOT execute the pull-request head

#### Scenario: Workflow permissions drift
- **WHEN** a workflow or repository default gains undeclared write authority
- **THEN** repository governance SHALL fail with the workflow or setting identified

#### Scenario: Action reference is mutable
- **WHEN** a workflow references a third-party action without an approved immutable commit
- **THEN** repository governance SHALL reject the workflow

### Requirement: Documentation auto-merge remains exact and current-head-bound
Only a non-draft same-repository pull request into `develop` whose complete diff is under `openspec/**`, under `docs/**`, and/or exactly root `README.md`, and which is not implementation-bound, SHALL be automatically squash-integrated. Both sides of renames SHALL be classified. Required validation SHALL gate the merge, and any direct reconciliation SHALL require successful validation for the current head and enforce that expected SHA through normal branch-protected integration. Eligible validated heads reported as `clean`, or as `unstable` with positive mergeability, SHALL be reconciled without requiring auto-merge to have been armed first.

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
- **WHEN** a PR body edit introduces an implementation association
- **THEN** repository automation SHALL reconcile the existing head's eligibility and disable any armed auto-merge

#### Scenario: Classification data is ambiguous
- **WHEN** lifecycle metadata or required base/head or changed-file data cannot be safely classified
- **THEN** repository automation SHALL leave auto-merge disabled and report the blocker

#### Scenario: Archive-only follow-up passes
- **WHEN** an eligible archive PR moves a completed change out of the active directory and updates its declared main specs
- **THEN** repository automation SHALL allow automatic integration behind current-head required validation
- **AND** SHALL NOT hold it merely because the archive contains planning artifacts

### Requirement: Merged same-repository topic branches are reconciled safely
After a pull request into `develop` is merged, trusted repository automation SHALL
ensure that its same-repository remote topic branch no longer exists. Cleanup SHALL
be independent of whether integration was automatic or manual. A deletion SHALL
occur only when the live ref still equals the pull request's merged head SHA and the
ref is not protected, default, release-owned, or otherwise reserved. Cleanup SHALL
never operate on fork refs, local branches, or worktrees.

#### Scenario: Platform deletion already succeeded
- **WHEN** the merged pull request's remote head ref is absent
- **THEN** cleanup SHALL succeed idempotently without a deletion request

#### Scenario: Merged topic ref still matches
- **WHEN** a merged same-repository pull request targeted `develop` and its unprotected topic ref still equals `pull_request.head.sha`
- **THEN** trusted cleanup SHALL delete that exact remote ref and verify it is absent

#### Scenario: Workflow token authors documentation integration
- **WHEN** trusted documentation automation merges with `GITHUB_TOKEN` and GitHub suppresses a recursive close-event workflow
- **THEN** that same trusted automation SHALL invoke the shared exact-head reconciliation synchronously

#### Scenario: Topic branch advanced after merge
- **WHEN** the live topic ref no longer equals the pull request's merged head SHA
- **THEN** cleanup SHALL refuse deletion and report both identities

#### Scenario: Pull request was closed without merge
- **WHEN** a pull request closes without a merge
- **THEN** cleanup SHALL leave its branch unchanged

#### Scenario: Head belongs to a fork
- **WHEN** the merged pull request's head repository is not the governed repository
- **THEN** cleanup SHALL perform no ref mutation

#### Scenario: Reserved ref is presented
- **WHEN** an event presents `develop`, `master`, a protected ref, a release ref, or malformed ref metadata as the head
- **THEN** cleanup SHALL fail closed without deletion

#### Scenario: GitHub refuses deletion
- **WHEN** an authorized matching deletion request fails
- **THEN** the workflow SHALL fail and preserve the API outcome as bounded evidence

### Requirement: Documentation cannot stale generated governance evidence
A documentation-only pull request SHALL remain exempt from product builds and product
test suites, but it SHALL run every lightweight governance consistency check whose
input surface includes its changed paths. OpenSpec changes SHALL additionally pass
strict OpenSpec validation. Automation SHALL NOT broaden the documentation auto-merge
allowlist to include generated baselines.

#### Scenario: OpenSpec archive changes a governed inventory
- **WHEN** archiving an OpenSpec change removes or shifts an inventoried occurrence
- **THEN** that pull request's required validation SHALL detect the stale inventory

#### Scenario: Generated baseline must change
- **WHEN** a documentation change legitimately requires a generated configuration update outside the auto-merge allowlist
- **THEN** delivery SHALL use the manual mixed/code path

#### Scenario: Documentation does not affect generated governance
- **WHEN** the changed documentation leaves all governed inventories current
- **THEN** validation SHALL avoid product builds and tests while allowing the documentation path to complete

### Requirement: Live acceptance proves repository lifecycle outcomes
Repository-governance implementation SHALL NOT be accepted from unit tests or API
success responses alone. Acceptance SHALL record exact pull request, workflow run,
merge actor/method, validated head, resulting `develop` commit, and post-merge remote
ref state for automatic and manual paths.

#### Scenario: Automatic documentation lifecycle is accepted
- **WHEN** an OpenSpec-only or root-README-only acceptance pull request passes
- **THEN** evidence SHALL show automatic squash integration and absence of its unchanged remote head ref

#### Scenario: Manual code lifecycle is accepted
- **WHEN** a code pull request passes CI and the maintainer manually accepts and merges it
- **THEN** evidence SHALL show it remained manual before merge and its unchanged remote head ref was cleaned afterwards

#### Scenario: Safety refusal is accepted
- **WHEN** an isolated fixture advances a merged topic ref before reconciliation
- **THEN** evidence SHALL show refusal and preservation of the advanced ref

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

### Requirement: Documentation merge-state recovery is bounded and fail-closed
Documentation integration SHALL distinguish GitHub's merge-state transitions from genuine operational failures. The specific unstable-status rejection of an auto-merge enable request SHALL trigger bounded re-evaluation or explicit deferral without making the workflow fail solely because of that rejection. Recovery SHALL refresh the PR identity, open/merged state, draft status, base, head repository, head SHA, complete changed-file classification, and mergeability before deciding whether another mutation is safe. A new head SHALL NOT inherit the previous head's classification or successful validation. Already-armed and unarmed eligible PRs SHALL have the same current-head and protection guarantees.

Direct unstable-state integration SHALL require positive mergeability and successful current-head validation, use an expected-SHA protected squash merge, and preserve the existing synchronous exact-head remote-branch cleanup only after merge is confirmed. Unknown mergeability, conflicts, failed or stale validation, and ineligible paths SHALL NOT authorize direct integration. A GitHub merge refusal SHALL NOT trigger a bypass or cleanup; if a fresh read proves that another actor already merged the same expected head, automation SHALL reconcile that confirmed outcome idempotently. Unknown errors SHALL remain failures. Summaries SHALL distinguish merged, already merged, waiting for validation, waiting for mergeability, ineligible, and failed outcomes.

#### Scenario: Recover an unarmed unstable documentation PR
- **WHEN** an unarmed eligible PR has successful validation for its current head and is positively mergeable but unstable
- **THEN** automation SHALL attempt protected squash integration with that exact head SHA
- **AND** confirmed integration SHALL run the existing safe branch cleanup

#### Scenario: Recover an already-armed unstable documentation PR
- **WHEN** an already-armed eligible current head passes validation and remains positively mergeable but unstable
- **THEN** automation SHALL reconcile it with the same protected expected-head merge behavior as an unarmed PR
- **AND** it SHALL NOT wait indefinitely solely because auto-merge was previously armed

#### Scenario: Arming races with merge-state calculation
- **WHEN** an eligible PR appears suitable for arming but GitHub returns the specific unstable-status rejection
- **THEN** automation SHALL refresh and re-evaluate current state within a bounded recovery attempt
- **AND** it SHALL either perform an independently authorized action or report deferral without a failing check caused solely by that rejection

#### Scenario: Validation has not succeeded for the head
- **WHEN** state recovery observes missing, pending, failed, or stale successful validation
- **THEN** it SHALL NOT directly merge the current head
- **AND** a deferred result SHALL NOT claim validation success or completed integration

#### Scenario: Recovery observes changed eligibility
- **WHEN** a recovery refresh finds a different head, a changed base, a draft, a fork head, or changed paths outside the documentation allowlist
- **THEN** automation SHALL NOT reuse the earlier eligibility or validation to merge
- **AND** an ineligible PR SHALL retain the existing auto-merge-disable safeguards

#### Scenario: Mergeability cannot be established
- **WHEN** a PR has conflicts or mergeability remains unknown after bounded re-evaluation
- **THEN** automation SHALL leave it unmerged and report the reason without treating unstable status as proof of mergeability

#### Scenario: Concurrent integration completes first
- **WHEN** another actor merges the same expected PR head before the reconciler completes its merge request
- **THEN** a fresh read confirming that merge SHALL allow idempotent cleanup
- **AND** a close without merge or a different head SHALL NOT authorize branch cleanup under the original decision

#### Scenario: GitHub refuses integration
- **WHEN** GitHub refuses the expected-SHA protected merge and a fresh read does not confirm that same head already merged
- **THEN** automation SHALL expose the refusal and leave the branch intact
- **AND** it SHALL NOT relax required checks, alter repository protections, or invoke an administrative bypass

#### Scenario: An unrelated arming error occurs
- **WHEN** the enable request returns an authentication, permission, transport, malformed-response, or non-unstable GraphQL error
- **THEN** the workflow SHALL remain failed with bounded diagnostic evidence
- **AND** it SHALL NOT label that error as a harmless state transition
