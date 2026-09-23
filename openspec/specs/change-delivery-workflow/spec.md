# change-delivery-workflow Specification

## Purpose
Define explicit planning approval, same-PR implementation and finalization, manual-merge acceptance, atomic specification/archive integration, documentation holds, and verified cleanup.

## Requirements

### Requirement: Specification approval precedes implementation
A new implementation-bound OpenSpec change SHALL begin as planning artifacts in one normally named draft pull request. Every newly authored version-3 OpenSpec delivery PR SHALL use one human-readable structure: `## Proposal` as its first nonblank content with one or two sentences explaining intent, `## Implementation` with concrete delivery details, final `## Acceptance` outcomes when complete, and last `## Automation` with required machine linkage in a clearly explained collapsed disclosure. The body SHALL NOT add a quoted `Phase: Proposal` or `Phase: Implementation` line. GitHub draft/ready state, the visible sections, and explicit maintainer authorization SHALL communicate delivery posture without a redundant phase banner. After merge, verification SHALL derive `Archived` without editing the accepted PR body. The body SHALL omit routine validation command listings. A request to prepare, write, design, or update a specification SHALL authorize only planning, not implementation. Implementation SHALL begin only after the maintainer approves the plan and explicitly requests implementation; the planning PR SHALL NOT need to merge first. Approved implementation SHALL continue in the same worktree, branch, commit history, and pull request, including its related documentation.

After implementation and required task/evidence preparation are complete, the same branch SHALL be finalized by conservatively synchronizing its deltas, staging its dated archive and conditional delivery record, and removing its active-change copy. The PR SHALL remain draft until that final candidate is ready for exact-head CI and review. One ordinary exact-head workflow SHALL validate both the finalized record and all applicable product/governance scopes and SHALL expose the stable protected check when they succeed. Applicable scopes SHALL be selected by the same impact classification as any other pull request; the implementation association SHALL disable only the documentation-only and version-only shortcuts and SHALL NOT force complete conservative coverage. The finalized PR SHALL integrate only after required validation and an authorized maintainer manually merges it; that manual merge SHALL be the final implementation acceptance and merge authorization. No manual body-phase promotion or second phase-only workflow run SHALL be required.

Approved refinements SHALL update the affected planning artifacts coherently before corresponding implementation edits in that same PR. New unimplemented deltas SHALL NOT be synchronized into canonical specs on `develop` during planning. Standalone revisions to existing merged planning artifacts SHALL remain OpenSpec-only unless specification and implementation refinement together is explicitly authorized in an existing implementation PR.

#### Scenario: User requests a specification
- **WHEN** the user asks an agent to plan a new implementation-bound change
- **THEN** the agent SHALL create OpenSpec artifacts in a normally named draft PR whose first nonblank body content is `## Proposal`
- **AND** the body SHALL NOT contain a quoted proposal or implementation phase line
- **AND** `Proposal` SHALL explain the intent in one or two sentences
- **AND** the following `Implementation` bullets SHALL summarize what the implementation is meant to accomplish
- **AND** SHALL keep machine linkage last under `Automation` in an explained collapsed disclosure rather than presenting JSON or validation commands as the main description
- **AND** SHALL NOT implement, finalize, or merge the behavior merely because planning validation passes

#### Scenario: Specification is still open
- **WHEN** the planning PR remains open without explicit authorization to implement
- **THEN** the agent SHALL remain in planning and SHALL NOT begin implementation

#### Scenario: User requests implementation after specification merge
- **WHEN** a legacy specification PR has already merged and the user explicitly requests implementation
- **THEN** the agent SHALL retain its existing implementation PR if one exists, or fetch current `origin/develop` and create an isolated implementation stream citing that accepted change if none exists
- **AND** SHALL NOT require a replacement draft planning PR or rewrite the merged specification history

#### Scenario: Specification and implementation were combined accidentally
- **WHEN** source changes were added before explicit implementation authorization
- **THEN** the agent SHALL stop implementation and disclose the approval-boundary violation
- **AND** combining plan and code SHALL NOT itself authorize further work or integration

#### Scenario: User approves implementation in the draft PR
- **WHEN** the maintainer approves the plan and explicitly requests implementation
- **THEN** the agent SHALL continue in the same worktree, branch, history, and PR without a planning merge
- **AND** SHALL NOT add or replace a body phase line merely to record the transition
- **AND** plan approval SHALL NOT count as final implementation acceptance or merge authorization

#### Scenario: Implementation changes the agreed approach
- **WHEN** the maintainer approves a refinement during implementation
- **THEN** the agent SHALL reconcile proposal, design, delta specs, and tasks in the same PR before implementing the refinement
- **AND** the superseded unmerged plan SHALL require no reconciliation on `develop`

#### Scenario: Completed implementation is finalized
- **WHEN** implementation and its required evidence are complete
- **THEN** the same branch SHALL stage conservative spec synchronization, the dated archive, and its conditional delivery record before the PR becomes ready
- **AND** the finalized body SHALL present `Proposal`, `Implementation`, `Acceptance`, then collapsed `Automation` sections without a quoted phase line through validation, review, and manual merge
- **AND** no acceptance-only, spec-only, archive-only, or phase-promotion follow-up SHALL be required for that delivery

#### Scenario: Required tests pass
- **WHEN** every required exact-head product, governance, and finalized-delivery check passes for the implementation candidate
- **THEN** the stable protected check SHALL succeed without a body lifecycle edit or second workflow run
- **AND** the agent SHALL hand off the unchanged candidate for maintainer review and authorized manual merge

#### Scenario: Integrated delivery is verified
- **WHEN** authorized manual merge integrates the accepted candidate and trusted verification confirms its archive and synchronized specs on current `develop`
- **THEN** the derived delivery state SHALL be `Archived`
- **AND** the accepted merged PR body SHALL remain unchanged

#### Scenario: Entire unmerged change is rejected
- **WHEN** the maintainer rejects and closes the change PR without merging
- **THEN** neither its plan nor its implementation SHALL be integrated or archived as completed on `develop`
- **AND** local worktree or unmerged branch cleanup SHALL retain its separate authorization and cleanliness requirements

#### Scenario: Standalone revision or legacy merged plan
- **WHEN** an existing merged plan needs a standalone revision or already has a separate implementation PR
- **THEN** the revision SHALL remain planning-only unless combined refinement is explicitly authorized
- **AND** the existing implementation identity SHALL be retained without rewriting merged planning history
- **AND** rejecting that already-merged plan SHALL require explicit reconciliation rather than completed-change archival

#### Scenario: Implementation-bound validation is impact-selected
- **WHEN** an implementation-bound candidate runs ordinary exact-head validation
- **THEN** its product and governance scopes SHALL be those the impact classifier selects from its complete change
- **AND** the finalized delivery record SHALL be validated in the same run

### Requirement: Auto-merge eligibility uses an exact documentation allowlist
A pull request SHALL be eligible for automatic squash integration only when it is non-draft, not implementation-bound, and every changed and renamed-from path is under `openspec/**`, under `docs/**`, or is exactly the root `README.md`. Any pull request containing another path SHALL be classified as code/operational, regardless of whether it claims to preserve behavior. Classification SHALL examine the complete pull-request diff and lifecycle association and SHALL fail closed.

An explicit implementation association or introduction of a new active OpenSpec change SHALL hold the PR for implementation and manual integration even when its current diff is documentation-only. Removing the association SHALL NOT make a newly introduced active change eligible. Malformed or ambiguous lifecycle metadata SHALL block automation. Existing-change standalone planning revisions, ordinary docs, and generated archive follow-ups without an implementation-bound hold SHALL retain documentation auto-merge eligibility.

For an eligible pull request, automation MAY arm auto-merge while required validation is pending because protected `develop` remains the merge gate. Automation SHALL reconcile an eligible current head reported as `clean`, or as `unstable` with positive mergeability, only after successful validation for that same head and through a normal protected squash-merge request enforcing its expected head SHA. An unstable-status rejection when arming SHALL cause bounded state re-evaluation or explicit deferral rather than an unhandled failure or protection bypass. Failed or stale validation, conflicting or unconfirmed mergeability, and GitHub refusal SHALL NOT authorize integration. Any armed auto-merge SHALL be disabled when a draft, implementation-bound, or code/operational exclusion is detected.

#### Scenario: OpenSpec-only pull request
- **WHEN** every changed path is under `openspec/**` and the non-draft PR is a standalone revision without an implementation-bound hold
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Maintained documentation-only pull request
- **WHEN** every changed path is under `docs/**` and the PR is non-draft and not implementation-bound
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Root README-only pull request
- **WHEN** every changed path is exactly `README.md` and the PR is non-draft and not implementation-bound
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Documentation surfaces are combined
- **WHEN** every changed and renamed-from path is under `openspec/**`, under `docs/**`, or exactly root `README.md`, and no lifecycle exclusion applies
- **THEN** automation SHALL classify the pull request as documentation-only and arrange squash integration behind its required validation

#### Scenario: Validation and reconciliation race
- **WHEN** an eligible current head becomes clean before auto-merge is armed
- **THEN** automation MAY squash-merge only after matching successful validation and with the expected head SHA

#### Scenario: Stale successful validation
- **WHEN** successful validation belongs to an older pull-request head
- **THEN** automation SHALL NOT directly merge the current head

#### Scenario: Behavior-preserving refactor
- **WHEN** a pull request changes source or any other path outside the allowlist
- **THEN** it SHALL NOT be eligible for auto-merge
- **AND** a claim that behavior is unchanged SHALL NOT alter that classification

#### Scenario: Documentation and code are mixed
- **WHEN** a pull request changes an allowed documentation path and any path outside the allowlist
- **THEN** the entire pull request SHALL be classified as code/operational
- **AND** it SHALL NOT be armed for auto-merge

#### Scenario: Specification and code are mixed
- **WHEN** a pull request changes an OpenSpec path and any path outside the allowlist
- **THEN** the entire pull request SHALL be classified as code/operational
- **AND** it SHALL NOT be armed for auto-merge

#### Scenario: Operational file is renamed into documentation
- **WHEN** a renamed file's previous path is outside the allowlist even though its new path is allowed
- **THEN** the pull request SHALL NOT be eligible for auto-merge

#### Scenario: Changed paths cannot be classified
- **WHEN** the complete pull-request diff or lifecycle association cannot be obtained or classified
- **THEN** auto-merge SHALL remain disabled

#### Scenario: Eligible validated head is unstable
- **WHEN** an eligible current head has successful validation and GitHub reports it as unstable with positive mergeability
- **THEN** automation SHALL attempt normal protected squash integration for that exact head rather than requiring auto-merge to be armed first
- **AND** GitHub SHALL remain responsible for enforcing all branch protections

#### Scenario: Draft plan passes CI
- **WHEN** a draft planning PR passes required checks with only OpenSpec changes
- **THEN** automation SHALL leave it unmerged and SHALL NOT arm auto-merge

#### Scenario: Unimplemented plan is marked ready
- **WHEN** a PR introducing a new active change or carrying an implementation association becomes non-draft before implementation
- **THEN** automation SHALL keep it unmerged and disable any armed auto-merge
- **AND** removing its association SHALL NOT bypass detection of the introduced active change

#### Scenario: Implementation association is added to an eligible docs PR
- **WHEN** a PR body edit associates a previously eligible docs PR with implementation
- **THEN** automation SHALL re-evaluate eligibility and disable its armed auto-merge

#### Scenario: Archive follow-up is ready
- **WHEN** a verified non-draft archive PR only removes the completed active change, adds its archive, and updates declared main specs
- **THEN** the archived planning artifacts SHALL NOT themselves establish an implementation-bound hold
- **AND** documentation integration SHALL proceed behind required validation

### Requirement: Code integration requires local maintainer acceptance
Every code/operational pull request SHALL remain open after automated validation so an authorized maintainer can validate it. The agent SHALL provide exact applicable local run or inspection instructions and SHALL NOT invoke or arm auto-merge. CI success SHALL NOT count as human acceptance.

For a finalized single-PR OpenSpec delivery, the pull request SHALL present one to three implementation-specific acceptance scenarios as plain bullets. The maintainer SHALL NOT need to check boxes or perform a separate acceptance edit: manually merging the exact current head after review SHALL mean the maintainer accepts the listed scenarios and explicitly authorizes integration. Any new commit SHALL require current-head CI and a new manual merge decision.

#### Scenario: Code pull request passes CI
- **WHEN** all required automated checks pass for a code/operational pull request
- **THEN** the pull request SHALL remain open
- **AND** the agent SHALL report that maintainer validation and manual merge are still required

#### Scenario: Maintainer has not accepted locally
- **WHEN** the maintainer has not manually merged the exact candidate
- **THEN** neither the agent nor repository automation SHALL merge it or record human acceptance

#### Scenario: Maintainer accepts and authorizes merge
- **WHEN** an authorized maintainer reviews a finalized current-head candidate with its plain acceptance list and manually merges it
- **THEN** that merge SHALL constitute acceptance of the listed scenarios and explicit merge authorization
- **AND** implementation, synchronized specs, acceptance record, and archive SHALL integrate atomically

#### Scenario: Candidate changes after review
- **WHEN** a new commit changes the pull-request head
- **THEN** prior CI SHALL NOT authorize the new head
- **AND** the maintainer SHALL make a new manual merge decision after current-head validation

### Requirement: Automatic archival uses explicit implementation and acceptance evidence
Automatic completed-change archival SHALL require an explicit machine-readable association between an OpenSpec change and its implementation pull request, a confirmed merge into `develop`, successful required validation attributable to the final implementation head, and an authorized maintainer's explicit acceptance of that same head. Acceptance SHALL attest that required manual review is complete, the change is fully implemented, and its delta synchronization has been reviewed. The visible acceptance route SHALL prepare a dedicated acceptance-record PR after implementation integration; its verified manual merge SHALL provide the durable acceptance receipt. Existing valid authorized comment-backed acceptance SHALL remain supported without a redundant request.

A planning PR, an ordinary archive PR, a descriptive title, passing CI alone, an unmerged acceptance request, or an ordinary implementation merge alone SHALL NOT establish implementation acceptance. Missing, malformed, stale, conflicting, revoked, or known-gap acceptance SHALL block the automatic completed-change path. Only a verified authorized human manual merge of the exact validated acceptance record SHALL establish PR-backed acceptance. Existing code-PR local review and manual merge authorization requirements SHALL remain unchanged; the acceptance PR records archival authorization rather than authorizing premature code integration.

#### Scenario: Accepted single-PR implementation merges
- **WHEN** the PR containing the reviewed plan and completed implementation merges into `develop` with an explicit change link, final-head acceptance, and successful required validation
- **THEN** automation SHALL evaluate its linked change for archival without requiring a separately merged specification PR, a redundant acceptance PR, or another archive command
- **AND** SHALL preserve the implementation PR, accepted head, merge commit, validation run, acceptance author, and acceptance source in the archive evidence

#### Scenario: Legacy split implementation merges
- **WHEN** an explicitly linked legacy implementation PR merges with valid final-head acceptance, required validation, and its historical merged specification association
- **THEN** automation SHALL evaluate it under the same completion and synchronization gates without requiring a replacement planning PR

#### Scenario: Rejected draft closes
- **WHEN** the single change PR closes without merging
- **THEN** automation SHALL NOT synchronize or archive its change as completed

#### Scenario: Only a specification merges
- **WHEN** a planning-only PR merges, even if its description names an OpenSpec change
- **THEN** automation SHALL NOT archive that change as implemented

#### Scenario: Acceptance belongs to an older build
- **WHEN** the implementation head differs from the accepted head
- **THEN** automation SHALL report stale acceptance and SHALL NOT create a completed-change archive

#### Scenario: Acceptance is withdrawn or records gaps
- **WHEN** authoritative acceptance is revoked, contradictory, or accepts archival with unresolved work rather than full completion
- **THEN** automation SHALL preserve the active change and report the blocker
- **AND** any exceptional archive SHALL require the separate explicit manual disposition

#### Scenario: Merged implementation needs a visible acceptance record
- **WHEN** a supported implementation is merged without valid acceptance
- **THEN** automation SHALL create or reuse a clearly named visible acceptance request linking the original PR and listing only the maintainer's verification items
- **AND** candidate-integrity CI SHALL not fail merely because those human verification items remain unchecked
- **AND** a verified complete manual acceptance merge SHALL resume archive evaluation without requiring a special comment or another archive request

### Requirement: Archive automation preserves honest task and artifact completion
Before preparing a completed-change archive, automation SHALL verify that every required artifact is done or deliberately skipped and every implementation, validation, and manual-acceptance task is complete. It SHALL NOT infer task completion from ordinary merge status or rewrite unfinished work as complete. A verified acceptance receipt SHALL be permitted to carry explicit evidence-backed reconciliation of stale task bookkeeping, bound to original task identities and descriptions, and SHALL preserve the reviewed reconciliation in archived evidence.

Only explicitly designated, purely mechanical archive-preparation tasks SHALL be eligible for automatic completion, and only after their corresponding evidence-recording or staged sync/archive operation succeeds. An unknown designation or a task combining manual review with administrative work SHALL block automatic completion. A dedicated acceptance merge SHALL itself satisfy only explicitly identified pure acceptance-signoff bookkeeping, not unperformed implementation, testing, or physical-review work. No task SHALL claim archive-PR integration before that PR actually merges.

#### Scenario: Implementation task remains unchecked
- **WHEN** an unchecked task requires implementation, tests, or physical review without reviewed completion evidence
- **THEN** automation SHALL report that task as blocking and SHALL NOT tick it

#### Scenario: Only mechanical preparation remains
- **WHEN** all prerequisite work is complete and the only unchecked tasks are recognized evidence-recording and staged archive-preparation tasks
- **THEN** automation SHALL complete those tasks only after performing and verifying their operations
- **AND** the generated PR SHALL distinguish prepared archival from integrated archival

#### Scenario: Legacy task mixes acceptance and archival
- **WHEN** an unchecked task combines physical acceptance, merge authorization, and archival
- **THEN** automation SHALL require an explicit evidence-backed task reconciliation rather than classify the whole task as administrative

#### Scenario: Acceptance request reconciles completed work
- **WHEN** a manually merged acceptance record explicitly supplies completion evidence for unchanged source task identities
- **THEN** archive preparation SHALL apply only those reviewed reconciliations and preserve the original state and receipt
- **AND** unknown, pending, failed, and known-gap tasks SHALL continue to block completed-change archival

### Requirement: Automatic specification synchronization is conservative and verified
Automation SHALL prepare synchronization and archival against a fresh `develop` snapshot in isolation. It SHALL validate the source change strictly, resolve the declared delta paths, obtain applicable specification instructions, and verify every affected main specification before publishing any archive. Synchronization SHALL preserve unrelated requirements and scenarios and SHALL refuse ambiguous, conflicting, or unsupported transformations. If synchronization is not needed, automation SHALL verify that every declared delta is already applied, or that the workflow legitimately has no delta.

The automatic completed-change path SHALL NOT silently skip synchronization or disable validation. Failure for any affected capability SHALL leave the active change and canonical specifications unmodified on `develop`. Reviewed baseline identity and affected-input changes SHALL be checked to prevent a stale archive from overwriting intervening specification work. An occupied archive target SHALL be treated as already archived only when recorded change and implementation identities match.

#### Scenario: Reviewed deltas apply without conflict
- **WHEN** every delta applies unambiguously to the reviewed canonical baseline and passes post-sync verification
- **THEN** automation SHALL stage all affected main-spec updates and move the change, including its metadata and acceptance evidence, into the dated archive

#### Scenario: Other specification work intervenes
- **WHEN** the same requirement changed since the accepted synchronization baseline and is not already equal to the intended result
- **THEN** automation SHALL report a synchronization conflict instead of overwriting that requirement

#### Scenario: One of several capabilities fails
- **WHEN** verification fails for any capability in the change
- **THEN** automation SHALL publish no partial archive and SHALL identify the blocking capability

#### Scenario: Delta is already synchronized
- **WHEN** every intended delta is already reflected in the main specs
- **THEN** automation SHALL prepare an archive without redundant main-spec edits

#### Scenario: Target directory is occupied
- **WHEN** the expected archive directory already exists with a different or unverifiable implementation identity
- **THEN** automation SHALL refuse overwrite and report the collision

### Requirement: Forgotten archival is discoverable without repeated maintainer requests
The same eligibility and preparation policy SHALL support merge-event handling, scheduled catch-up, targeted manual retry, and a read-only dry run. Catch-up SHALL discover missed eligible implementation merges within a documented bounded scan window; older PRs SHALL remain explicitly targetable. Missing acceptance for a supported merged implementation SHALL produce or reuse a visible acceptance request, not presume acceptance. Bounded work SHALL report its coverage, deferred candidates, and continuation state rather than claim the entire backlog was examined. Retries SHALL reuse prior results and SHALL NOT spam duplicate PRs or blocker comments.

Dry-run output SHALL distinguish awaiting evidence, awaiting manual acceptance merge, accepted but archive-blocked, pending archive PR, already archived, closed, conflicting, and deferred candidates, with actionable evidence references. It SHALL NOT mutate refs, PRs, acceptance, tasks, or specifications. Existing backlog candidates SHALL NOT be presumed accepted because the automation is newly enabled.

#### Scenario: Merge event was missed
- **WHEN** a scheduled scan finds an eligible merged implementation that was not previously processed
- **THEN** it SHALL prepare the same archive follow-up that the merge event would have prepared

#### Scenario: Old change lacks acceptance
- **WHEN** catch-up finds a supported merged implementation without valid acceptance evidence
- **THEN** it SHALL create or reuse a visible acceptance request without manufacturing a positive verdict

#### Scenario: Scan reaches its budget
- **WHEN** the scan reaches its declared time, page, or candidate limit
- **THEN** it SHALL report incomplete coverage and preserve a resumable position
- **AND** later catch-up SHALL resume deferred work rather than repeatedly process only the newest PRs

#### Scenario: Maintainer requests an audit
- **WHEN** dry-run mode evaluates the backlog or an explicitly named PR outside the scheduled window
- **THEN** it SHALL report eligibility, proposed acceptance requests, and blockers without creating or updating repository objects

### Requirement: Checked implementation scenarios are the complete human evidence
Before implementation integration, the implementation pull request SHALL contain a curated `Acceptance checks` section with one to three concise checks that name behavior specific to that implementation and the expected observable result. The checks SHALL NOT include generic review, CI, no-gap, approval, or archival boilerplate and SHALL NOT copy the implementation task ledger or automated test inventory. The implementation PR link SHALL appear in the later acceptance PR only as a plain reference, not as a checkbox.

An authorized maintainer checking every exact implementation-specific item and manually merging the acceptance pull request SHALL be the human evidence that those scenarios passed. Manual merge itself SHALL be the approval action; no redundant approval checkbox or JSON edit SHALL be required. A verified all-checked manual merge SHALL reconcile remaining non-mechanical source-task bookkeeping for the archived copy and SHALL automatically resume conservative synchronization and archive publication. Mechanical archive-preparation tasks SHALL retain their operation-bound completion rules.

#### Scenario: Scrollbar implementation is reviewed
- **WHEN** an implementation adds scrollbar behavior
- **THEN** its acceptance checklist SHALL contain only one to three observable scrollbar scenarios, such as appearance on overflow and correct viewport movement
- **AND** SHALL NOT repeat generic repository review or automated-test checkboxes

#### Scenario: Implementation reference is displayed
- **WHEN** an acceptance request is generated
- **THEN** it SHALL show the linked implementation PR as plain reference text
- **AND** reviewing that link SHALL NOT be represented as a mandatory checkbox

#### Scenario: Maintainer accepts implementation-specific checks
- **WHEN** an authorized maintainer checks every exact generated scenario and manually merges the acceptance pull request
- **THEN** the checked scenarios and manual merge SHALL constitute the human acceptance evidence
- **AND** automation SHALL proceed to archive preparation without JSON edits, another approval checkbox, another acceptance action, or another archive command

#### Scenario: Checklist is not fully checked
- **WHEN** any generated scenario remains unchecked when the acceptance pull request merges or closes
- **THEN** automation SHALL NOT treat the pull request as acceptance
- **AND** SHALL report the incomplete checklist without inferring completion from merge state alone

#### Scenario: Automated checks remain machine-owned
- **WHEN** the acceptance pull request is reviewed
- **THEN** source CI, exact implementation identity, candidate scope, and merge provenance SHALL be verified by automation rather than represented as human checkboxes

#### Scenario: Archive bookkeeping remains operation-bound
- **WHEN** the all-checked manual merge accepts remaining source tasks
- **THEN** archive preparation MAY reconcile non-mechanical source-task bookkeeping in the archived copy
- **AND** SHALL NOT claim that archive preparation or archive integration occurred before those operations actually succeed

### Requirement: Acceptance-bound documentation requires manual integration
A dedicated acceptance-record PR SHALL be a manual lifecycle exclusion from documentation auto-merge, even when non-draft and all changed paths are under the documentation allowlist. Complete changed and renamed-from paths, reserved acceptance records, and authoritative base/head lifecycle evidence SHALL maintain this hold independently of editable titles, labels, and body markers. Every automatic integration path SHALL refuse the PR and disable any armed auto-merge. Missing or ambiguous evidence SHALL fail closed. Ordinary documentation and verified archive follow-ups carrying copies of accepted evidence SHALL retain their existing automatic path.

#### Scenario: Validated acceptance record awaits a reviewer
- **WHEN** an acceptance-bound PR passes required current-head CI
- **THEN** it SHALL remain open for the maintainer's explicit manual merge

#### Scenario: Acceptance metadata is removed
- **WHEN** an acceptance request loses its display marker or moves its reserved record
- **THEN** the manual hold SHALL remain or classification SHALL block rather than enabling auto-merge

#### Scenario: Archive copies a verified acceptance receipt
- **WHEN** the verified archive PR copies accepted evidence into the archive without creating or modifying authoritative acceptance records
- **THEN** that copy SHALL NOT itself prevent normal CI-gated archive auto-merge

### Requirement: Delivery versions select one authoritative lifecycle
Version-3 OpenSpec delivery SHALL use the single-PR lifecycle defined by this change. Requirements that publish a dedicated acceptance-record PR or a generated archive PR SHALL apply only to version-1 and version-2 deliveries and already-published legacy records. New version-3 deliveries SHALL NOT create those follow-up PRs. Readers SHALL continue to verify legacy comment-backed, acceptance-PR-backed, and archive-PR-backed evidence without converting it.

#### Scenario: New delivery uses version 3
- **WHEN** a new implementation-bound change is linked with supported version-3 metadata
- **THEN** its ordinary development PR SHALL be the only implementation, acceptance, synchronization, and archive PR
- **AND** trusted automation SHALL refuse to publish acceptance-only or archive-only follow-ups

#### Scenario: Legacy delivery remains incomplete
- **WHEN** a version-1 or version-2 implementation still requires its established acceptance or archive follow-up
- **THEN** legacy reconciliation SHALL remain available under its existing fail-closed policy
- **AND** the delivery SHALL NOT be silently reclassified as version 3

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

### Requirement: Plain acceptance scenarios are bound to the final candidate
A version-3 delivery SHALL contain one to three concise, distinct behavior-and-expected-result scenarios in a final `Acceptance` section of the ordinary PR and in its committed conditional acceptance manifest. They SHALL be plain bullets, not checkboxes. Generic review, CI, no-gap, approval, archive, source-task, or automated-test boilerplate SHALL be rejected. The trusted candidate check SHALL require exact normalized membership between the PR list and manifest and SHALL bind the manifest to the finalized change identity and archive contents.

Automation SHALL validate structure, objective evidence, finalization, and exact current-head CI without asserting that human scenarios passed. Only an authorized human's non-automatic merge of that exact head SHALL activate the conditional manifest as acceptance. A body edit, changed manifest, changed head, missing check, or contradictory acceptance evidence SHALL fail closed or require renewed validation.

#### Scenario: Candidate presents specific scenarios
- **WHEN** a finalized implementation provides one to three unique observable scenarios as plain bullets
- **THEN** trusted validation SHALL match them exactly to the committed conditional manifest
- **AND** SHALL leave the actual acceptance decision to manual merge

#### Scenario: Candidate uses checkboxes or boilerplate
- **WHEN** the acceptance section uses checkbox state or generic process assertions instead of implementation-specific behavior
- **THEN** trusted candidate validation SHALL reject it with an actionable reason

#### Scenario: Automation observes green CI
- **WHEN** required exact-head checks pass
- **THEN** automation SHALL report only objective candidate validity
- **AND** SHALL NOT mark human scenarios accepted, arm auto-merge, or merge the PR

#### Scenario: Authorized maintainer merges manually
- **WHEN** an authorized human manually merges the exact validated head
- **THEN** the conditional manifest SHALL become the durable acceptance record for its listed scenarios
- **AND** no body checkbox edit, acceptance PR, archive PR, or later acceptance command SHALL be required

### Requirement: Agents use the standardized completed-worktree cleanup procedure
When the owning agent hands a validated candidate to the maintainer for review and authorized manual merge, it SHALL invoke the repository's standard hand-off command from the primary checkout with the exact worktree, change, and pull-request identity, and SHALL invoke it again after any repair push. Every delivery session SHALL begin, before creating a worktree, by invoking the repository's standard sweep from the primary checkout and relaying its per-candidate outcomes in one line; a session that verifies or is told of a merge SHALL invoke the sweep, or the exact-candidate completed-delivery command, at that point. Pending or blocked sweep results SHALL NOT delay the new delivery. The agent SHALL NOT manually choose disposable paths, recursively delete generated content, directly remove a worktree, or delete a local topic branch as an improvised substitute. The command's result SHALL be the authority for reporting local cleanup success or the reason a worktree or branch remains retained.

#### Scenario: Validated candidate is handed off
- **WHEN** the stable protected aggregate succeeds and the agent hands the unchanged candidate to the maintainer
- **THEN** the agent SHALL run the standard hand-off command once for that exact worktree and report the released registration
- **AND** SHALL NOT wait for the merge, start a watcher, or remove anything

#### Scenario: New session sweeps earlier deliveries
- **WHEN** a delivery session starts in the primary checkout
- **THEN** the agent SHALL run the standard sweep before creating its worktree and relay each candidate's outcome
- **AND** SHALL proceed with the new delivery regardless of `pending`, `awaiting-discard`, `deferred`, or blocked results

#### Scenario: Verified delivery is ready for local cleanup
- **WHEN** the agent has verified authorized merge, integrated archive/specs, required exact-head validation, and remote topic-ref absence within its own session
- **THEN** the agent SHALL run the standard sweep or candidate-scoped cleanup command once
- **AND** SHALL report removal only when the command verifies the worktree and local ref are removed or already absent

#### Scenario: Standard cleanup reports a blocker
- **WHEN** the command reports unknown content, active ownership, identity drift, unavailable evidence, a nested repository/submodule, or another safety blocker
- **THEN** the agent SHALL retain the worktree and report that blocker
- **AND** SHALL NOT bypass the command with force removal or ad hoc file deletion

### Requirement: Selected complete PR validation gates repair handoff without a dispatch cycle
A delivery whose trusted PR selection requires Full regression SHALL use that PR-attached complete run as a required exact-final-head handoff gate together with the existing protected aggregate. It SHALL not require a second manual Full regression dispatch merely to repeat successful selected PR execution. Draft implementation runs MAY provide investigation and pre-finalization evidence but SHALL not certify later heads, authorize implementation without approval, finalize a draft, or establish human acceptance.

Implementation, substantive tasks, focused evidence, and gap disposition SHALL be complete before normal ready/finalization handling. Required post-finalization CI outcomes SHALL remain pending integration gates until they actually succeed; they SHALL not be represented as already completed implementation tasks or as evidence that must name a future final-head run before finalization can proceed. The final run, source head, target/selection identity, and lane results SHALL be preserved in PR-associated Actions evidence and reported at handoff. An additional committed design/task edit or accepted-body edit solely to insert that final run identifier SHALL not be required. Existing manual acceptance, target currency, and renewed validation after material changes SHALL remain unchanged.

#### Scenario: Implementation is ready for final validation
- **WHEN** approved implementation, substantive tasks, pre-finalization evidence, and gap disposition are complete
- **THEN** the candidate MAY enter normal ready/finalization handling while final-head remote checks remain pending
- **AND** no task SHALL falsely claim the future complete-regression run already passed

#### Scenario: Finalization creates a new head
- **WHEN** finalization pushes a new candidate head
- **THEN** PR validation SHALL execute all selected complete-regression and ordinary gates against that head
- **AND** earlier draft or independent workflow results SHALL not authorize its integration

#### Scenario: Final candidate is handed to the maintainer
- **WHEN** selected complete regression and every other required exact-head gate succeed
- **THEN** the handoff SHALL identify that PR run and head without another dispatch or evidence-only commit
- **AND** the PR SHALL remain open for authorized manual merge

#### Scenario: Candidate or selection changes after success
- **WHEN** source head, acceptance list, manifest, target baseline, or relevant regression-selection metadata changes
- **THEN** the previous result SHALL not authorize handoff of the changed candidate
- **AND** applicable finalization and current-selection validation SHALL run again

#### Scenario: Draft full validation passes
- **WHEN** selected full checks pass on an implementation-bearing draft
- **THEN** their result SHALL be implementation feedback only
- **AND** planning approval, completion, finalization, final-head validation, and manual integration requirements SHALL remain in force

#### Scenario: Selected validation fails
- **WHEN** a required complete-regression lane is failed, cancelled, missing, stale, or unexpectedly skipped
- **THEN** the repair SHALL not be handed off as validated even if focused checks or an independent branch run passed

#### Scenario: PR validation succeeds but numbered nightly recovery is unproven
- **WHEN** a repair's final PR checks succeed but the actual repaired numbered-package nightly outcome is unavailable
- **THEN** the implementation MAY proceed to manual review under its normal gates
- **AND** no report SHALL claim recovered nightly publication solely from that PR result

### Requirement: Agents bind the owning session to the active delivery worktree

An interactive A1 delivery agent SHALL treat its one owned task worktree as the active repository context for the delivery. Immediately after creating a new worktree, or after selecting and acquiring an existing worktree for a resumed delivery, the agent SHALL run `a1 session link-worktree <absolute-worktree>` from the owning session and SHALL require the command to confirm that exact canonical worktree before changing planning, implementation, test, or delivery-documentation files. The association SHALL remain bound to the same worktree, branch, history, and pull request through plan review and approved implementation.

The agent SHALL keep the primary checkout on `develop` and SHALL explicitly scope repository reads, edits, Git operations, builds, and tests to the active worktree. Session association SHALL select footer repository metadata and pull-request discovery only; it SHALL NOT be treated as a process/tool cwd change, worktree cleanup registration, ownership transfer, acceptance, or merge authority.

If association fails, identifies another path, or is unavailable in the owning interactive session, the agent SHALL report the blocker and SHALL NOT silently continue feature edits while the footer remains associated with the primary checkout. The agent SHALL NOT infer a replacement context by scanning worktrees, choosing a recent branch or pull request, or adopting another session's checkout. When the owning session deliberately switches delivery streams, it SHALL link the new exact owned worktree before work begins there so stale branch and pull-request metadata are not retained.

A draft pull request need not exist when the worktree is first linked. After that pull request exists, the established bounded repository refresh SHALL discover its open branch association and make its `#<number>` visible in the linked bare-A1 footer without requiring tool-cwd mutation or another delivery identity.

#### Scenario: Start a feature from the primary checkout

- **GIVEN** an interactive A1 delivery session started in the primary checkout on `develop`
- **WHEN** the agent creates its fresh feature worktree from the selected target
- **THEN** it SHALL successfully link that absolute worktree to the owning session before writing planning or implementation files
- **AND** all repository operations SHALL be explicitly scoped to that worktree
- **AND** the primary checkout SHALL remain on `develop`

#### Scenario: The linked feature gains a draft pull request

- **GIVEN** the owning session is linked to its feature worktree and branch
- **AND** the feature's draft pull request did not exist when the link was established
- **WHEN** the draft pull request is created and bounded repository refresh observes it
- **THEN** the bare-A1 footer SHALL show that worktree path and branch with the pull request's `#<number>`
- **AND** it SHALL NOT continue presenting the primary checkout's `develop` context

#### Scenario: Resume approved implementation

- **GIVEN** planning exists in an owned worktree, branch, and draft pull request
- **WHEN** a later interactive session acquires that delivery for approved implementation
- **THEN** it SHALL link the exact existing worktree before editing
- **AND** implementation SHALL continue in the same worktree, branch, history, and pull request rather than create a second delivery context

#### Scenario: Switch to another delivery stream

- **GIVEN** the session is associated with one delivery worktree
- **WHEN** it deliberately begins or resumes another owned delivery
- **THEN** it SHALL link the new exact worktree before reading or changing that stream as active work
- **AND** footer discovery SHALL stop using the prior stream's branch and pull request after the association refreshes

#### Scenario: Worktree association fails

- **WHEN** `a1 session link-worktree` fails, is unavailable, or confirms a path other than the intended owned worktree
- **THEN** the agent SHALL report the exact blocker and stop before feature edits
- **AND** SHALL NOT continue from the primary checkout, guess among local worktrees, or claim that the session switched successfully

#### Scenario: Linking does not transfer other authority

- **WHEN** an owned worktree is linked to the session
- **THEN** commands SHALL still address that worktree explicitly because tool cwd is unchanged
- **AND** cleanup ownership, acceptance, finalization, merge, and deletion SHALL continue to require their independent established evidence and commands
