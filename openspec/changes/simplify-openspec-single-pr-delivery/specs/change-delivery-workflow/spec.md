## MODIFIED Requirements

### Requirement: Specification approval precedes implementation
A new implementation-bound OpenSpec change SHALL begin as planning artifacts in one normally named draft pull request. A request to prepare, write, design, or update a specification SHALL authorize only planning, not implementation. Implementation SHALL begin only after the maintainer approves the plan and explicitly requests implementation; the planning PR SHALL NOT need to merge first. Approved implementation SHALL continue in the same worktree, branch, commit history, and pull request, including its related documentation.

After implementation and required task/evidence preparation are complete, the same branch SHALL be finalized by conservatively synchronizing its deltas, staging its dated archive and conditional delivery record, and removing its active-change copy. The PR SHALL remain draft until that final candidate is ready for exact-head CI and review. The finalized PR SHALL integrate only after required validation and an authorized maintainer manually merges it; that manual merge SHALL be the final implementation acceptance and merge authorization.

Approved refinements SHALL update the affected planning artifacts coherently before corresponding implementation edits in that same PR. New unimplemented deltas SHALL NOT be synchronized into canonical specs on `develop` during planning. Standalone revisions to existing merged planning artifacts SHALL remain OpenSpec-only unless specification and implementation refinement together is explicitly authorized in an existing implementation PR.

#### Scenario: User requests a specification
- **WHEN** the user asks an agent to plan a new implementation-bound change
- **THEN** the agent SHALL create OpenSpec artifacts in a normally named draft PR linked to that change
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
- **AND** plan approval SHALL NOT count as final implementation acceptance or merge authorization

#### Scenario: Implementation changes the agreed approach
- **WHEN** the maintainer approves a refinement during implementation
- **THEN** the agent SHALL reconcile proposal, design, delta specs, and tasks in the same PR before implementing the refinement
- **AND** the superseded unmerged plan SHALL require no reconciliation on `develop`

#### Scenario: Completed implementation is finalized
- **WHEN** implementation and its required evidence are complete
- **THEN** the same branch SHALL stage conservative spec synchronization, the dated archive, and its conditional delivery record before the PR becomes ready
- **AND** no acceptance-only, spec-only, or archive-only follow-up PR SHALL be required for that delivery

#### Scenario: Entire unmerged change is rejected
- **WHEN** the maintainer rejects and closes the change PR without merging
- **THEN** neither its plan nor its implementation SHALL be integrated or archived as completed on `develop`
- **AND** local worktree or unmerged branch cleanup SHALL retain its separate authorization and cleanliness requirements

#### Scenario: Standalone revision or legacy merged plan
- **WHEN** an existing merged plan needs a standalone revision or already has a separate implementation PR
- **THEN** the revision SHALL remain planning-only unless combined refinement is explicitly authorized
- **AND** the existing implementation identity SHALL be retained without rewriting merged planning history
- **AND** rejecting that already-merged plan SHALL require explicit reconciliation rather than completed-change archival

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

## ADDED Requirements

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

The finalization operation SHALL be deterministic and idempotent for the same inputs. Before merge, a rejected or superseded candidate MAY be revised by restoring/regenerating the active form in the same branch; no canonical state changes on `develop` until the PR merges.

#### Scenario: Finalization succeeds
- **WHEN** every required artifact, substantive task, evidence item, gap disposition, and delta is complete and unambiguous against the current target baseline
- **THEN** the branch SHALL contain the verified synchronized specs and complete dated archive as one candidate
- **AND** the active change SHALL no longer appear in that candidate

#### Scenario: Target specs changed concurrently
- **WHEN** current `develop` no longer matches the baseline used to prepare synchronization
- **THEN** candidate validation SHALL block readiness or merge until the branch is reconciled and finalization reruns
- **AND** stale successful validation SHALL NOT authorize integration

#### Scenario: Finalization finds incomplete work
- **WHEN** an implementation, validation, evidence, or required manual-observation task remains incomplete without explicit disposition
- **THEN** finalization SHALL preserve the active working state and identify the blocker
- **AND** SHALL NOT manufacture task completion or an accepted archive

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
