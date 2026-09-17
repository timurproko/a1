## MODIFIED Requirements

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
