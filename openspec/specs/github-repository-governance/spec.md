# github-repository-governance Specification

## Purpose
Define reviewed GitHub policy, trusted workflow authority, atomic manual delivery, standalone documentation automation, safe branch cleanup, drift detection, and live acceptance.

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
A documentation-only pull request SHALL remain exempt from product builds and product test suites, but it SHALL run every lightweight governance consistency check whose input surface includes its changed paths. OpenSpec changes SHALL additionally pass strict OpenSpec validation.

An exact acceptance-record pull request MAY bypass generic impact selection, documentation governance, and strict all-OpenSpec validation only when trusted base-controlled routing observes exactly one newly added canonical `openspec/acceptance/<change>/<source-head>.json` path from the complete pull-request diff. The unchanged required-check context SHALL pass on that route only after trusted acceptance policy validates the current head's exact diff, canonical record, source and merge identities, source CI provenance, active-change binding, title, body, checklist membership, branch ownership, and conflict state. Routing SHALL NOT itself grant acceptance authority. Missing or ambiguous diff data, a renamed or additional path, malformed record data, failed or stale acceptance validation, or any disagreement between routing and trusted validation SHALL fail closed without satisfying the required check.

Automation SHALL NOT broaden the documentation auto-merge allowlist to include generated baselines. Normal implementation, archive, documentation, mixed, and other pull requests SHALL retain their existing impact-selected validation.

#### Scenario: OpenSpec archive changes a governed inventory
- **WHEN** archiving an OpenSpec change removes or shifts an inventoried occurrence
- **THEN** that pull request's required validation SHALL detect the stale inventory

#### Scenario: Generated baseline must change
- **WHEN** a documentation change legitimately requires a generated configuration update outside the auto-merge allowlist
- **THEN** delivery SHALL use the manual mixed/code path

#### Scenario: Documentation does not affect generated governance
- **WHEN** the changed documentation leaves all governed inventories current
- **THEN** validation SHALL avoid product builds and tests while allowing the documentation path to complete

#### Scenario: Exact acceptance record uses specialized validation
- **WHEN** a current-head pull request adds exactly one canonical acceptance record and trusted acceptance policy validates every required source, scope, provenance, body, and conflict invariant
- **THEN** the required check SHALL be allowed to complete without generic impact selection, documentation governance, or strict all-OpenSpec validation
- **AND** the acceptance PR SHALL remain manual-merge-only

#### Scenario: Acceptance-shaped pull request contains another change
- **WHEN** an acceptance-record pull request adds, modifies, renames, or removes any additional path, or its complete diff cannot be established
- **THEN** the specialized route SHALL NOT satisfy the required check
- **AND** generic routing SHALL NOT override a failed trusted acceptance verdict

#### Scenario: Acceptance evidence is stale or malformed
- **WHEN** the candidate record, source identity, implementation CI, active-change binding, title, body, checklist, branch, conflict state, or validation head fails trusted acceptance policy
- **THEN** skipped generic validation SHALL NOT allow the required check to pass
- **AND** the pull request SHALL remain unmerged

#### Scenario: Pull request is not an exact acceptance record
- **WHEN** an implementation, archive, ordinary documentation, mixed, or other pull request targets `develop`
- **THEN** it SHALL retain the existing applicable impact-selected and governance validation rather than using the acceptance-only route

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

After successful required validation for the current archive head, trusted reconciliation SHALL evaluate that completion event without requiring a scheduled retry, maintainer merge action, or a natively armed auto-merge request. It SHALL automatically squash-integrate only after revalidating the complete archive authority, acceptance receipt, source identity, exact target base, mergeability, and expected head. Independent read-only evidence checks MAY be deduplicated or evaluated concurrently, but every required invariant SHALL complete successfully and the target base SHALL be read freshly immediately before integration. Queue or API delay SHALL be reported as pending or deferred rather than as a manual merge requirement.

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

#### Scenario: Current archive head becomes green
- **WHEN** the required validation workflow succeeds for the generated archive's exact current head and its target base and authority remain current
- **THEN** trusted reconciliation SHALL automatically issue the protected expected-head squash merge without maintainer action
- **AND** successful integration SHALL trigger exact-head branch cleanup

#### Scenario: Native auto-merge is not armed
- **WHEN** a generated archive is awaiting current-head validation or trusted post-validation reconciliation
- **THEN** the absence of a native auto-merge request SHALL NOT convert it to a manual merge path
- **AND** automation SHALL report the pending automatic state

#### Scenario: Archive target advances before integration
- **WHEN** `develop` no longer equals the archive marker's reviewed target immediately before merge
- **THEN** automation SHALL refuse integration and require regeneration against the new target
- **AND** prior successful validation SHALL NOT authorize the stale archive

#### Scenario: Archive authority cannot be fully revalidated
- **WHEN** any required source, acceptance, CI, diff, mergeability, or provenance read is missing, stale, contradictory, or fails
- **THEN** concurrent or cached verification SHALL fail closed and leave the archive unmerged
- **AND** automation SHALL report the blocking or deferred state

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

### Requirement: Trusted policy verifies exact implementation-specific checklist acceptance
Trusted policy SHALL extract one to three implementation-specific acceptance checks from the merged implementation PR's reviewed handoff. It SHALL reject missing checks, duplicate checks, generic review/CI/gap/approval/archive boilerplate, oversized checks, and exact checklist reuse by an unrelated implementation. The acceptance PR SHALL render the implementation link as plain reference text followed only by those unchecked scenarios.

Trusted post-merge policy SHALL verify that the final acceptance pull-request body contains exactly the generated scenarios with every item checked, that no item text was removed, renamed, reordered, duplicated, supplemented, or replaced, and that the pull request was manually merged by an authorized human. The checked body and merge provenance SHALL be the human acceptance authority; any generated machine record SHALL serve source binding only and SHALL NOT require maintainer editing or override a valid all-checked manual merge with stale pending task state.

The receipt SHALL bind the final checklist-body digest, acceptance pull request head and merge, implementation pull request/head/merge, required source and acceptance validation, authorized actor, and merge time. Existing valid comment-backed receipts SHALL remain readable. Historical per-head acceptance records for the same change SHALL coexist; readers SHALL select only the record bound to the implementation head being evaluated instead of treating a different historical head as a conflict.

#### Scenario: Distinct implementation checks are generated
- **WHEN** an implementation PR supplies one to three concise behavior-and-result acceptance checks not reused by another implementation
- **THEN** trusted publication SHALL reproduce only those checks in the acceptance PR
- **AND** SHALL keep the implementation link outside the checklist

#### Scenario: Boilerplate or repetitive checklist is supplied
- **WHEN** checks repeat generic review, CI, no-gap, approval, or archive wording, duplicate one another, or exactly reuse an unrelated implementation's checklist
- **THEN** trusted policy SHALL block acceptance publication and identify the invalid checklist

#### Scenario: Exact checklist is checked and manually merged
- **WHEN** the final body exactly matches the generated implementation scenarios with every item checked and an authorized human manually merges the acceptance pull request
- **THEN** trusted policy SHALL produce a verified acceptance receipt and automatically resume archival
- **AND** stale pending values in the internal source-binding record SHALL NOT block that receipt

#### Scenario: Checklist text or membership changes
- **WHEN** an item is removed, renamed, reordered, duplicated, supplemented, replaced, or remains unchecked
- **THEN** trusted policy SHALL reject the acceptance receipt and identify checklist mismatch or incompleteness

#### Scenario: Merge is automated or unauthorized
- **WHEN** an all-checked acceptance pull request is merged by automation, a bot, merge queue, or an actor without required repository authority
- **THEN** trusted policy SHALL reject it despite the visible checkmarks

#### Scenario: Objective source validation failed
- **WHEN** required implementation CI, exact source binding, or acceptance candidate validation is missing, failed, stale, or contradictory
- **THEN** checked human scenarios SHALL NOT override that machine-verifiable blocker

#### Scenario: Historical record belongs to another implementation head
- **WHEN** a change has retained acceptance records for multiple implementation heads
- **THEN** evaluation SHALL select the exact record and acceptance pull request for the requested implementation head
- **AND** SHALL preserve other historical records without treating them as current acceptance or an automatic conflict

### Requirement: Acceptance publication and verification use trusted policy
Acceptance request publication, candidate validation, and post-merge receipt verification SHALL run trusted repository policy with bounded reads and least-privilege publication. Untrusted PR code SHALL NOT receive publication credentials. Generated acceptance PRs SHALL trigger real current-head validation. The candidate validator SHALL verify complete diff scope, record schema, source identities, and evidence bindings without using PR-provided executable instructions; it SHALL report unresolved human verification items without failing an otherwise valid record. Post-merge receipt verification SHALL separately require complete evidence before treating a manual merge and its resulting record bytes as archive authority.

#### Scenario: Request is generated
- **WHEN** trusted reconciliation creates an acceptance PR using its existing publication identity
- **THEN** ordinary PR checks SHALL run and validate that exact candidate without granting the candidate publication authority

#### Scenario: Candidate is stale or has extra changes
- **WHEN** acceptance CI detects changed source bindings, unknown fields, unrelated file changes, or invalid evidence references
- **THEN** it SHALL fail with an actionable integrity blocker and SHALL NOT claim the request valid

#### Scenario: Candidate has unresolved review items
- **WHEN** an acceptance record is structurally valid and source-bound but still lists pending CI, tasks, or known gaps
- **THEN** candidate CI SHALL succeed and report those items for human verification
- **AND** receipt consumption SHALL NOT treat the merged record as complete archive authority until they are reconciled

#### Scenario: Acceptance PR merges
- **WHEN** the trusted merge handler sees an acceptance PR merge
- **THEN** it SHALL verify authorized human manual-merge provenance, exact record bytes, and required current-head checks before resuming the linked implementation's archive
- **AND** unavailable, automated, or contradictory merge provenance SHALL block receipt acceptance

### Requirement: Versioned delivery publication boundaries are explicit
Repository governance SHALL classify a supported version-3 OpenSpec association as one implementation-bound development PR from planning through finalized archive. It SHALL never publish, arm, or merge a dedicated acceptance or archive follow-up for that delivery. Newly authored version-3 bodies SHALL use the canonical phase-free section layout, while read-only verification SHALL remain compatible with immutable merged version-3 bodies created under the earlier quoted-phase format. Existing requirements governing generated acceptance and archive PRs SHALL remain applicable only to version-1 and version-2 deliveries and already-published legacy work. Ordinary standalone documentation SHALL retain its existing exact-path automatic integration route.

#### Scenario: Draft delivery is opened
- **WHEN** an agent creates a new implementation-bound draft PR
- **THEN** the body SHALL start with `## Proposal` containing one or two intent sentences, followed by a concrete `## Implementation` section
- **AND** the body SHALL NOT add a quoted `Phase: Proposal` or `Phase: Implementation` line
- **AND** machine linkage SHALL remain last under `Automation` in an explained collapsed disclosure without routine validation-command boilerplate

#### Scenario: Finalized delivery is still under test
- **WHEN** a finalized version-3 body is ready for exact-head validation
- **THEN** its proposal, implementation, acceptance, automation, archive, and manifest structure SHALL remain mechanically valid without a phase banner
- **AND** candidate validation SHALL allow the stable protected aggregate to succeed only after ordinary exact-head validation passes
- **AND** no later phase promotion SHALL be required before authorized manual merge

#### Scenario: Final delivery body is validated
- **WHEN** version-3 candidate validation evaluates a completed implementation PR
- **THEN** its first nonblank line SHALL be exactly `## Proposal`
- **AND** one each of `Proposal`, `Implementation`, `Acceptance`, and `Automation` SHALL appear in that order
- **AND** no quoted proposal or implementation phase line SHALL be present
- **AND** `Proposal` SHALL contain only one or two sentences of visible intent

#### Scenario: Earlier version-3 delivery is verified after merge
- **WHEN** trusted read-only reconciliation inspects an immutable merged version-3 PR created under the earlier quoted-phase body contract
- **THEN** it SHALL continue to recognize the supported historical phase line and validate the committed delivery record
- **AND** this compatibility SHALL NOT permit a newly finalized open candidate to use the superseded phase-prefixed layout

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
