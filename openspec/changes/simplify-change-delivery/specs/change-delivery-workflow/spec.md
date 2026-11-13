## MODIFIED Requirements

### Requirement: Specification approval precedes implementation
A new implementation-bound OpenSpec change SHALL begin as planning artifacts in one normally named draft pull request. Every newly authored version-3 OpenSpec delivery PR SHALL use one human-readable structure: `## Proposal` as its first nonblank content with concise prose explaining intent, `## Implementation` with concrete delivery details, final `## Acceptance` outcomes when complete, and last `## Automation` with required machine linkage in a clearly explained collapsed disclosure. The body SHALL NOT add a quoted `Phase: Proposal` or `Phase: Implementation` line. GitHub draft/ready state, the visible sections, and explicit maintainer authorization SHALL communicate delivery posture without a redundant phase banner. After merge, verification SHALL derive `Archived` without editing the accepted PR body. The body SHALL omit routine validation command listings. A request to prepare, write, design, or update a specification SHALL authorize only planning, not implementation. Implementation SHALL begin only after the maintainer approves the plan and explicitly requests implementation; the planning PR SHALL NOT need to merge first. Approved implementation SHALL continue in the same repository, branch, commit history, change, and pull request, using an owned implementation checkout that MAY be created later or on another machine, including its related documentation.

After implementation and required task/evidence preparation are complete, the same branch SHALL be finalized by conservatively synchronizing its deltas, staging its dated archive and conditional delivery record, and removing its active-change copy. The PR SHALL remain draft until that final candidate is ready for exact-head CI and review. One ordinary exact-head workflow SHALL validate both the finalized record and all applicable product/governance scopes and SHALL expose the stable protected check when they succeed. Applicable scopes SHALL be selected by the same impact classification as any other pull request; the implementation association SHALL disable only the documentation-only and version-only shortcuts and SHALL NOT force complete conservative coverage. The finalized PR SHALL integrate only after required validation and an authorized maintainer chooses that exact candidate by directly merging it, personally arming native auto-merge, or explicitly requesting the active agent's protected expected-head merge while the candidate is currently eligible. That exact-candidate decision SHALL be the final implementation acceptance and merge authorization. No manual body-phase promotion or second phase-only workflow run SHALL be required.

Approved refinements SHALL update the affected planning artifacts coherently before corresponding implementation edits in that same PR. New unimplemented deltas SHALL NOT be synchronized into canonical specs on `develop` during planning. Standalone revisions to existing merged planning artifacts SHALL remain OpenSpec-only unless specification and implementation refinement together is explicitly authorized in an existing implementation PR.

#### Scenario: User requests a specification
- **WHEN** the user asks an agent to plan a new implementation-bound change
- **THEN** the agent SHALL create OpenSpec artifacts in a normally named draft PR whose first nonblank body content is `## Proposal`
- **AND** the body SHALL NOT contain a quoted proposal or implementation phase line
- **AND** `Proposal` SHALL explain the intent in concise prose
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
- **THEN** the agent SHALL continue in the same repository, branch, history, change, and PR in an owned implementation checkout without a planning merge
- **AND** SHALL NOT add or replace a body phase line merely to record the transition
- **AND** plan approval SHALL NOT count as final implementation acceptance or merge authorization

#### Scenario: Implementation changes the agreed approach
- **WHEN** the maintainer approves a refinement during implementation
- **THEN** the agent SHALL reconcile proposal, design, delta specs, and tasks in the same PR before implementing the refinement
- **AND** the superseded unmerged plan SHALL require no reconciliation on `develop`

#### Scenario: Completed implementation is finalized
- **WHEN** implementation and its required evidence are complete
- **THEN** the same branch SHALL stage conservative spec synchronization, the dated archive, and its conditional delivery record before the PR becomes ready
- **AND** the finalized body SHALL present `Proposal`, `Implementation`, `Acceptance`, then collapsed `Automation` sections without a quoted phase line through validation, review, and authorized integration
- **AND** no acceptance-only, spec-only, archive-only, or phase-promotion follow-up SHALL be required for that delivery

#### Scenario: Required tests pass
- **WHEN** every required exact-head product, governance, and finalized-delivery check passes for the implementation candidate
- **THEN** the stable protected check SHALL succeed without a body lifecycle edit or second workflow run
- **AND** the agent SHALL hand off the unchanged candidate for maintainer review and an authorized integration decision

#### Scenario: Integrated delivery is verified
- **WHEN** authorized exact-candidate integration merges the accepted candidate and trusted verification confirms its archive and synchronized specs on current `develop`
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

#### Scenario: Remote planning without a checkout
- **WHEN** planning is requested from another directory or machine
- **THEN** selected planning artifacts SHALL be published with explicit repository/base/head and unchecked outcomes
- **AND** no worktree, attachment, dependency setup or sweep SHALL be required
- **AND** implementation and merge remain unauthorized until requested

### Requirement: Auto-merge eligibility uses an exact documentation allowlist
A pull request SHALL be eligible for automation-owned squash integration only when it is non-draft, not implementation-bound, and every changed and renamed-from path is under `openspec/**`, under `docs/**`, or is exactly the root `README.md`. Any pull request containing another path SHALL be classified as code/operational, regardless of whether it claims to preserve behavior. Classification SHALL examine the complete pull-request diff and lifecycle association and SHALL fail closed. Governance, agent-authority, cleanup-policy and privileged-workflow documentation SHALL be excluded even under allowed paths. Delivery hold and no-auto-merge opt-out SHALL prevent unattended integration.

An explicit implementation association or introduction of a new active OpenSpec change SHALL hold the PR outside documentation-owned integration even when its current diff is documentation-only. Removing the association SHALL NOT make a newly introduced active change eligible. Malformed or ambiguous lifecycle metadata SHALL block automation. Existing-change standalone planning revisions, ordinary docs, and generated archive follow-ups without an implementation-bound hold SHALL retain documentation auto-merge eligibility. A finalized version-3 candidate MAY separately retain native auto-merge personally armed by an authorized maintainer; that human choice SHALL NOT make it documentation-auto-merge eligible or grant repository automation merge authority.

For an eligible documentation pull request, automation MAY arm auto-merge while required validation is pending because protected `develop` remains the merge gate. Automation SHALL reconcile an eligible current head reported as `clean`, or as `unstable` with positive mergeability, only after successful validation for that same head and through a normal protected squash-merge request enforcing its expected head SHA. An unstable-status rejection when arming SHALL cause bounded state re-evaluation or explicit deferral rather than an unhandled failure or protection bypass. Failed or stale validation, conflicting or unconfirmed mergeability, and GitHub refusal SHALL NOT authorize integration. Automation-armed auto-merge SHALL be disabled when a draft, implementation-bound, or code/operational exclusion is detected. A qualifying human arm on a finalized version-3 candidate SHALL instead remain owned by that maintainer and SHALL be disabled when the candidate changes.

#### Scenario: OpenSpec-only pull request
- **WHEN** every changed path is under `openspec/**` and the non-draft PR is a standalone revision without an implementation-bound hold
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Maintained documentation-only pull request
- **WHEN** every changed path is routine non-governance documentation under `docs/**` and the PR is non-draft, unheld and not implementation-bound
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Root README-only pull request
- **WHEN** every changed path is exactly `README.md` and the PR is non-draft and not implementation-bound
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Documentation surfaces are combined
- **WHEN** every changed and renamed-from path is under `openspec/**`, under `docs/**`, or exactly root `README.md`, and no lifecycle, governance, hold or opt-out exclusion applies
- **THEN** automation SHALL classify the pull request as documentation-only and arrange squash integration behind its required validation

#### Scenario: Validation and reconciliation race
- **WHEN** an eligible current head becomes clean before auto-merge is armed
- **THEN** automation MAY squash-merge only after matching successful validation and with the expected head SHA

#### Scenario: Stale successful validation
- **WHEN** successful validation belongs to an older pull-request head
- **THEN** automation SHALL NOT directly merge the current head

#### Scenario: Behavior-preserving refactor
- **WHEN** a pull request changes source or any other path outside the allowlist
- **THEN** it SHALL NOT be eligible for documentation auto-merge
- **AND** a claim that behavior is unchanged SHALL NOT alter that classification

#### Scenario: Documentation and code are mixed
- **WHEN** a pull request changes an allowed documentation path and any path outside the allowlist
- **THEN** the entire pull request SHALL be classified as code/operational
- **AND** repository automation SHALL NOT arm auto-merge for it

#### Scenario: Specification and code are mixed
- **WHEN** a pull request changes an OpenSpec path and any path outside the allowlist
- **THEN** the entire pull request SHALL be classified as code/operational
- **AND** repository automation SHALL NOT arm auto-merge for it

#### Scenario: Operational file is renamed into documentation
- **WHEN** a renamed file's previous path is outside the allowlist even though its new path is allowed
- **THEN** the pull request SHALL NOT be eligible for documentation auto-merge

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
- **THEN** automation SHALL re-evaluate eligibility and disable an existing arm unless authorized-human exact-final-candidate provenance is freshly established

#### Scenario: Maintainer arms finalized implementation
- **WHEN** an authorized maintainer personally enables native auto-merge for the current finalized version-3 head
- **THEN** automation SHALL preserve that human-owned arm while continuing to classify the PR as code/operational
- **AND** SHALL NOT create or exercise the authorization itself

#### Scenario: Archive follow-up is ready
- **WHEN** a verified non-draft archive PR only removes the completed active change, adds its archive, and updates declared main specs
- **THEN** the archived planning artifacts SHALL NOT themselves establish an implementation-bound hold
- **AND** documentation integration SHALL proceed behind required validation

#### Scenario: Authority-changing documentation
- **WHEN** instructions or policy change delivery, cleanup or privileged authority, including through renames
- **THEN** the PR SHALL remain outside routine docs integration

#### Scenario: Explicit documentation hold
- **WHEN** eligible docs are held or opted out
- **THEN** automation SHALL not arm or exercise integration

### Requirement: Agents use the standardized completed-worktree cleanup procedure

Repository tooling SHALL own bounded removal and exact reporting. Analysis, planning and remote administration SHALL NOT require a sweep or registration. A sweep SHALL be optional and separately scoped. Exact operations SHALL evaluate only the named checkout. Automatic completion keeps its evidence gates; explicit local removal uses publication/preservation without declaring acceptance. Generic cleanup SHALL NOT authorize remote deletion, unknown-file disposal or ownership takeover.

#### Scenario: Validated candidate is handed off
- **WHEN** a candidate is handed off
- **THEN** the report SHALL identify repository/branch/change/PR, observed head, publication state and optional path
- **AND** cleanup enrollment SHALL remain separate and optional

#### Scenario: New session sweeps earlier deliveries
- **WHEN** a delivery session starts
- **THEN** a sweep SHALL be optional and scoped
- **AND** unrelated pending cleanup SHALL NOT delay work

#### Scenario: Verified delivery is ready for local cleanup
- **WHEN** the agent has verified authorized merge, integrated archive/specs, required exact-head validation, and remote topic-ref absence within its own session
- **THEN** the agent SHALL run the standard sweep or candidate-scoped cleanup command once
- **AND** SHALL report removal only when the command verifies the worktree and local ref are removed or already absent

#### Scenario: Maintainer explicitly requests one redundant unmanaged checkout be retired
- **WHEN** the named checkout has no delivery association and the maintainer explicitly authorizes its cleanup
- **THEN** the agent MAY invoke the exact confirmed redundant-retirement command from the primary checkout
- **AND** SHALL report only the command's removed, already-retired, partial, or blocked result

#### Scenario: Unmanaged worktree was not explicitly authorized or fails a gate
- **WHEN** an unmanaged worktree is merely old, integrated by ancestry, missing a remote, observed by sweep, excluded by the maintainer, or blocked by any redundant-retirement safeguard
- **THEN** the agent SHALL retain it
- **AND** SHALL NOT adopt it, delete content manually, force-remove it, or broaden authority to another checkout

#### Scenario: Standard cleanup reports a blocker
- **WHEN** the selected operation finds unsafe content/ownership/identity or missing preservation evidence
- **THEN** it SHALL retain the resource without force fallback
- **AND** an open PR or present remote alone SHALL NOT block published local-only removal

### Requirement: Agents bind the owning session to the active delivery worktree

Before implementation edits, agents SHALL establish an owned isolated checkout and scope local operations to its canonical root while primary stays on develop. Analysis, planning-only publication and remote administration SHALL NOT require checkout/sweep/claim. A1 enter/attach success SHALL be authoritative without a second inventory approval. External agents SHALL use ordinary Git without runtime installation. Branch/history/change/PR identity SHALL survive machine changes. Owned dirty edits SHALL be preserved; collisions, divergence, foreign/locked checkouts and live/unverifiable owners SHALL not authorize reset or takeover. Runtime and cleanup claims remain separate protections coordinated by tooling.

#### Scenario: External agent starts a new delivery without A1

- **GIVEN** an external coding agent has Git and the repository tooling but no active A1 runtime
- **WHEN** it creates a fresh isolated task worktree and verifies its exact repository, path, branch, and state
- **THEN** it SHALL be permitted to write authorized planning or implementation files there without running A1 session commands
- **AND** the primary checkout SHALL remain on develop

#### Scenario: Resume approved implementation

- **GIVEN** an existing worktree matches the requested branch, change, and PR and has an explicit ownership handoff with no conflicting editor or Git lock
- **WHEN** the agent verifies its exact context and successfully claims any released cleanup registration
- **THEN** it MAY resume in an owned checkout on the same branch, history, and PR without an A1 footer association

#### Scenario: Familiar checkout has no ownership evidence

- **WHEN** a checkout looks related or clean but its ownership or handoff cannot be established
- **THEN** the agent SHALL NOT adopt it based on Git inventory alone
- **AND** it SHALL use a safe fresh worktree or report the exact continuation blocker

#### Scenario: Resume conflicts with a live owner

- **WHEN** a live editing owner, foreign cleanup owner, Git lock, or failed cleanup claim prevents reuse
- **THEN** the agent SHALL stop before edits in that checkout
- **AND** it SHALL NOT override, recover, unlock, or release the other owner's work

#### Scenario: Active A1 session links its delivery

- **GIVEN** the agent runs inside an active A1 shell-tool session
- **WHEN** it begins or resumes implementation
- **THEN** it SHALL require successful atomic linking of the exact task worktree before edits
- **AND** a conflict or failed link SHALL preserve the previous association and stop edits in the candidate checkout
- **AND** bounded footer discovery SHALL identify the linked branch's PR once it exists

#### Scenario: External agent has no session-link command

- **WHEN** A1 is absent or its command reports that an active A1 shell-tool runtime is required in an external agent environment
- **THEN** that absence alone SHALL NOT block the ordinary Git worktree path
- **AND** the agent SHALL NOT forge a runtime identity or claim that A1 linking succeeded

#### Scenario: Worktree context is wrong

- **WHEN** the canonical root, shared repository, or intended branch verification fails
- **THEN** the agent SHALL stop edits and report the mismatch
- **AND** it SHALL NOT fall back to editing the primary checkout

#### Scenario: Linking does not transfer other authority
- **WHEN** implementation context is acquired
- **THEN** publication, acceptance, merge and deletion permissions SHALL remain separate
- **AND** remote planning SHALL remain available without attachment

#### Scenario: Start a feature from the primary checkout

- **GIVEN** a delivery session starts in the primary checkout on develop
- **WHEN** it creates a fresh feature worktree from the selected target
- **THEN** it SHALL establish exact Git context and ownership before writing implementation files
- **AND** an active A1 session SHALL also acquire its runtime claim and association
- **AND** external agents SHALL not need A1 integration

#### Scenario: Similar existing worktree is busy

- **GIVEN** an existing worktree appears related to the requested task
- **WHEN** available ownership evidence reports another live owner
- **THEN** the agent SHALL NOT use or displace that checkout
- **AND** it SHALL create a safe separate worktree or report the exact continuation blocker

#### Scenario: Existing worktree is available and matches the stream

- **GIVEN** the exact branch, change, and PR match the delivery being resumed
- **WHEN** ownership or explicit handoff is established and any applicable cleanup and runtime claims succeed
- **THEN** the agent MAY reuse the checkout after exact-context verification
- **AND** inventory alone SHALL NOT grant authority

#### Scenario: Available result loses a race

- **GIVEN** inventory reported a worktree as available
- **WHEN** a competing owner acquires the applicable runtime or cleanup claim first
- **THEN** this session SHALL stop before edits without changing the competing ownership
- **AND** it SHALL use a safe fresh checkout or report the blocker rather than override or retry takeover

#### Scenario: The linked feature gains a draft pull request

- **GIVEN** an active A1 session linked its feature worktree before creating the draft PR
- **WHEN** bounded repository refresh observes the new PR
- **THEN** the footer SHALL show the linked branch's PR number
- **AND** this A1 display behavior SHALL impose no footer requirement on external agents

#### Scenario: Switch to another delivery stream

- **GIVEN** an agent has an established delivery context
- **WHEN** it deliberately begins or resumes another delivery
- **THEN** it SHALL verify the new exact worktree and ownership before editing
- **AND** an active A1 session SHALL atomically claim and link the new context, preserving the prior association on failure
- **AND** external agents SHALL explicitly scope their tools to the newly verified worktree

#### Scenario: Worktree association fails

- **WHEN** attachment inside an active A1 runtime fails, is unavailable, reports a conflicting owner, or confirms another path
- **THEN** that session SHALL report the blocker and stop before edits in the candidate checkout
- **AND** it SHALL NOT spoof a successful association, override ownership, or edit primary instead
- **AND** an external agent with no A1 runtime SHALL follow the ordinary Git path and its independent ownership checks

### Requirement: Agents keep repository-delivery scratch files inside the owning worktree

Implementation scratch SHALL remain ignored, secret-free and non-authoritative beneath its checkout artifact root. Remote-only planning/administration SHALL allow stdin, memory or isolated session scratch without a checkout. Durable source/evidence SHALL not be scratch-only. Internal temp storage remains tool-owned. These permissions SHALL not broaden credential persistence, private disclosure or deletion.

#### Scenario: Agent prepares a pull-request body file
- **WHEN** a remote-only operation needs a PR body
- **THEN** stdin, memory or isolated secret-free scratch SHALL be allowed without a worktree
- **AND** implementation files SHALL continue using their artifact root

#### Scenario: Linked task worktree owns the scratch file

- **GIVEN** the session is linked to an exact task worktree while the primary checkout and other worktrees also exist
- **WHEN** the agent materializes a transient command payload, captured output, patch, diff, or log for that delivery
- **THEN** the selected path SHALL resolve beneath the linked task worktree's `.artifacts/` root
- **AND** repository operations SHALL consume that worktree-owned path explicitly rather than relying on tool cwd

#### Scenario: Scratch content remains disposable

- **WHEN** an agent-created file beneath `.artifacts/` is no longer needed or the delivery is handed off
- **THEN** the file SHALL remain ignored, unstaged, uncommitted, and eligible for the existing guarded generated-content cleanup
- **AND** it SHALL NOT serve as the only copy of required durable evidence or source content

#### Scenario: Content is unsafe to persist

- **WHEN** a command can be completed without materializing a credential, token, or other prohibited sensitive value
- **THEN** the agent SHALL not write that value to `.artifacts/` merely because the directory is ignored
- **AND** the ordinary repository data-handling restrictions SHALL remain authoritative

#### Scenario: Invoked tooling owns an internal temporary path

- **WHEN** an invoked repository command, third-party tool, product runtime, or hermetic test internally allocates temporary storage without the agent selecting that path
- **THEN** this delivery-scratch requirement SHALL NOT require that internal path to move beneath `.artifacts/`
- **AND** the applicable runtime, tooling, isolation, and cleanup contract SHALL continue to govern it

### Requirement: Implementation progress is visible without changing acceptance semantics

New linked drafts SHALL use one or more meaningful unchecked outcomes without an arbitrary maximum. Tasks SHALL map to outcomes without process duplication. Local progress SHALL be recorded promptly and PR completion synchronized to published work at coherent checkpoints and before handoff. Push SHALL NOT be required before the next local outcome. Implementation, observed checks, required CI and optional acceptance remain distinct. Material changes require approval; clarification/reordering without behavioral change do not. Structural ambiguity, missing identity or incomplete work SHALL block readiness; prose limits, links or testing/coverage vocabulary alone SHALL not. Legacy reading and exact acceptance binding remain compatible.

#### Scenario: Draft exposes approved implementation scope

- **WHEN** an agent creates a new version-3 draft delivery PR
- **THEN** its `Implementation` section SHALL contain at least one unchecked implementation-specific task item derived from the proposed scope
- **AND** it SHALL permit additional distinct outcome-sized items without a fixed item-count maximum
- **AND** GitHub's native task progress SHALL expose the completed and total implementation item counts

#### Scenario: Focused change has one implementation outcome

- **WHEN** the approved scope contains one independently understandable delivered code outcome
- **THEN** the draft SHALL represent that scope with one Implementation item
- **AND** it SHALL NOT invent or split scope merely to meet a minimum count above one

#### Scenario: Large change has more than ten implementation outcomes

- **WHEN** the approved scope contains more than ten independently completable delivered code outcomes
- **THEN** the draft SHALL permit each outcome to remain a separate Implementation item
- **AND** it SHALL NOT combine unrelated outcomes merely to meet a maximum item count

#### Scenario: Agent completes one scope item
- **WHEN** an outcome is complete
- **THEN** local tasks SHALL be updated and PR progress synchronized when published
- **AND** another local outcome MAY begin first

#### Scenario: Item names validation instead of an outcome
- **WHEN** an item describes actual test development or coverage
- **THEN** wording alone SHALL not block readiness
- **AND** unperformed checks or acceptance SHALL not be claimed

#### Scenario: Implementation scope changes after approval
- **WHEN** behavior or scope changes materially
- **THEN** approval and planning updates SHALL precede implementation
- **AND** wording-only edits SHALL not require approval

#### Scenario: Checklist remains incomplete at readiness
- **WHEN** required outcomes/tasks are incomplete or structure is ambiguous
- **THEN** readiness SHALL be blocked for that reason, not prose style

#### Scenario: Historical body uses plain Implementation bullets

- **WHEN** a historical version-3 body contains only the former plain-bullet Implementation form
- **THEN** trusted readers SHALL preserve compatibility without requiring a merged-body edit
- **AND** the compatibility path SHALL NOT permit mixed plain and task-list syntax

#### Scenario: Completed candidate presents acceptance

- **WHEN** every Implementation task-list item and detailed OpenSpec task is complete and the candidate is prepared for finalization
- **THEN** `Acceptance` SHALL contain plain implementation-specific behavior-and-result bullets rather than checkboxes
- **AND** authorized maintainer integration of the exact validated head SHALL remain the acceptance decision

### Requirement: Agents own progress while automation owns readiness

Agents SHALL own truthful task and published progress; automation SHALL own readiness. Checkpoints MAY contain multiple outcomes without intermediate push barriers. Before final publication authors SHALL complete required inputs, plain Acceptance, reconciliation and structure checks. Delivery hold SHALL pause readiness. Implementation requests/checks SHALL not imply acceptance, merge or deletion.

#### Scenario: One implementation outcome finishes
- **WHEN** an outcome finishes
- **THEN** local tasks SHALL be updated promptly and PR progress at publication
- **AND** unfinished work SHALL stay unchecked

#### Scenario: Several outcomes are approved
- **WHEN** multiple outcomes are approved
- **THEN** agents MAY publish coherent groups
- **AND** local-only and published progress SHALL be distinguished

#### Scenario: Root guidance carries the rule

- **WHEN** an agent of any runtime loads the repository's root instructions
- **THEN** it SHALL follow the exact R17 routing paragraph in `AGENTS.md` to the shared `docs/delivery-rules.md` contract, including R05 progress rules
- **AND** `CLAUDE.md` and the delivery skill SHALL refer to that paragraph rather than restate it

#### Scenario: Outcome awaits only CI or manual validation
- **WHEN** implementation is written/published but CI or optional observation is pending
- **THEN** implementation progress MAY be complete
- **AND** validation SHALL remain explicitly unperformed

#### Scenario: Final implementation outcome finishes
- **WHEN** all pre-ready inputs are published
- **THEN** automation MAY promote only the valid unheld snapshot

#### Scenario: Implementation cannot finish

- **WHEN** stale state, unwritten code or tests, an unfinished task, or another concrete condition prevents implementation completion
- **THEN** the agent SHALL leave the affected progress state truthful and report that blocker
- **AND** it SHALL NOT check incomplete work or invoke the ready mutation

#### Scenario: GitHub checks are green while implementation progress is stale

- **WHEN** GitHub reports completed CI checks but the PR-body Implementation items remain unchecked
- **THEN** the agent SHALL treat those as separate signals and reconcile only truthful implementation progress
- **AND** it SHALL NOT present CI check counts as implementation task completion

### Requirement: Trusted automation promotes only a complete draft snapshot

The trusted default-branch finalization entrypoint SHALL mark a draft ready only when one exact same-repository version-3 snapshot targets `develop`, has every current-form `Implementation` item checked, contains valid plain `Acceptance`, and satisfies existing pre-finalization checks for association, detailed tasks, evidence, gaps, target, head, and body. A delivery hold SHALL prevent promotion. It SHALL re-read and match hold state and the PR identity, repository, base, head, body, open state, and draft state immediately before mutation. When every task-list `Implementation` item is checked but promotion is refused for a content reason, the finalization run SHALL fail visibly with that stable reason instead of completing successfully.

#### Scenario: Final checkbox exposes an eligible draft

- **WHEN** a draft version-3 task-list candidate has every Implementation item checked, no hold and every exact pre-finalization input is valid
- **AND** its final re-read matches the inspected snapshot
- **THEN** trusted automation SHALL mark that pull request ready for review
- **AND** the resulting event SHALL invoke ordinary finalization followed by exact-head CI

#### Scenario: Implementation item remains unchecked

- **WHEN** any Implementation item remains unchecked
- **THEN** trusted automation SHALL leave the pull request draft
- **AND** Development test suites SHALL remain suppressed
- **AND** the finalization run SHALL complete successfully with a stable skip reason

#### Scenario: Body completion disagrees with authoritative records

- **WHEN** every PR-body item is checked but acceptance, detailed tasks, evidence, gap disposition, association, or target state is incomplete or invalid
- **THEN** trusted automation SHALL leave the pull request draft with an actionable stable reason
- **AND** the finalization run SHALL fail with an error annotation naming that reason
- **AND** it SHALL NOT repair, infer, or rewrite the missing state

#### Scenario: Candidate changes during promotion

- **WHEN** the final pre-mutation re-read differs from the inspected head, body, base, repository identity, open state, or draft state
- **THEN** the promotion attempt SHALL stop without mutating readiness
- **AND** a later bounded event MAY inspect the new snapshot independently

#### Scenario: Completed candidate is held
- **WHEN** delivery-hold is present
- **THEN** promotion/finalization/automated refresh/auto-merge SHALL remain paused
- **AND** release SHALL trigger fresh bounded reconciliation

### Requirement: Agents verify the delivery body before the final checkbox

One validator SHALL serve local inspection and trusted promotion. Machine association, unambiguous sections/checklists, required completion and acceptance binding SHALL remain hard checks. Meaningful prose SHALL not fail solely for sentence/byte/count limits, coverage/testing words, links or notation. Checkpoints MAY validate internally without a separate ritual.

#### Scenario: Final body contains a rejected item
- **WHEN** machine linkage or required structure is malformed or incomplete
- **THEN** validation SHALL name the defect and block readiness
- **AND** harmless wording SHALL not be a defect

#### Scenario: Final body is valid

- **WHEN** the intended final body passes every body validator
- **THEN** the check SHALL report success
- **AND** detailed tasks, evidence, and target state SHALL remain subject to the existing pre-finalization checks

### Requirement: Agents push after targeted checks and rely on CI after readiness

Agents SHALL choose focused checks proportional to impact and honestly report results. Broader checks MAY be used for impact, diagnosis or explicit requests without mandatory repeated pre-push loops. Known failures SHALL not be hidden or reported as success. Publication, implementation completion and exact-head CI remain separate.

#### Scenario: Agent pushes implementation
- **WHEN** a coherent checkpoint is published
- **THEN** focused results and limitations SHALL be reported truthfully
- **AND** repeated broad validation SHALL not be compulsory

#### Scenario: A targeted check fails
- **WHEN** one of the targeted checks fails before a push
- **THEN** the agent SHALL fix the cause and rerun that check before pushing

#### Scenario: CI fails after readiness
- **WHEN** required CI fails
- **THEN** repairs SHALL use the same branch/PR with proportionate diagnostics
- **AND** the new head SHALL require its own CI

#### Scenario: Agent reproduces a reported failure
- **WHEN** CI has reported a specific failure and the agent needs to investigate it
- **THEN** the agent MAY run the matching broader local command for that failure
- **AND** that run SHALL NOT become a precondition for later pushes

### Requirement: Trusted automation re-promotes a complete finalized draft

A finalized draft SHALL retain archive/history. Delivery hold SHALL keep it paused. Without hold policy MAY re-promote only a freshly verified complete snapshot with matching head/archive/tasks/body/target. Release SHALL re-evaluate current state without hand-restoring active artifacts or inferring merge authority.

#### Scenario: Finalized pull request returned to draft
- **WHEN** a finalized complete PR returns to draft
- **THEN** hold SHALL keep it paused until released
- **AND** an unheld valid snapshot MAY resume idempotently

#### Scenario: Fence no longer matches the tree
- **WHEN** the body fence names the head as finalized but the tree lacks that archive or holds the active change again
- **THEN** trusted automation SHALL leave the pull request draft
- **AND** the finalization run SHALL fail with the stable reason `draft-finalization-redraft-form`

### Requirement: Code integration requires local maintainer acceptance
Every code/operational pull request SHALL remain open after automated validation until an authorized maintainer chooses its integration. The agent SHALL provide exact applicable local run or inspection instructions and SHALL NOT infer acceptance from CI success. Manual validation SHALL remain the maintainer's optional choice and SHALL NOT be a prerequisite for finalization or integration.

For a finalized single-PR OpenSpec delivery, the pull request SHALL present one or more implementation-specific acceptance scenarios as plain bullets. The maintainer SHALL NOT need to check boxes or perform a separate acceptance edit: manually merging the exact current head after review, personally enabling native auto-merge for that unchanged head, or explicitly instructing the active agent to merge that identified currently mergeable head SHALL mean the maintainer accepts the listed scenarios and authorizes protected integration. A delegated agent SHALL refresh authoritative state immediately before merging, require the instructed exact head, current target, finalized binding, successful required exact-head validation, positive mergeability, and an authorized human GitHub principal, and SHALL use a protected expected-head squash merge without administrative bypass. Any new commit, acceptance-list change, target advance, failed or pending gate, ambiguous request, or unavailable state SHALL cancel that authority and require a fresh maintainer integration decision.

An agent SHALL NOT treat implementation approval, green CI, a standing preference, or an earlier merge request for another candidate as integration authority. It SHALL NOT wait for pending validation, arm auto-merge, use merge queue, use an App/bot or workflow identity, bypass protection, or retry against a changed candidate. Repository automation SHALL remain unable to merge an implementation-bound pull request through this delegated route.

#### Scenario: Code pull request passes CI
- **WHEN** all required automated checks pass for a code/operational pull request without a valid maintainer integration decision
- **THEN** the pull request SHALL remain open
- **AND** the agent SHALL report that an authorized integration choice is still required and that manual validation is optional

#### Scenario: Maintainer has not accepted locally
- **WHEN** the maintainer has neither manually merged, personally armed native auto-merge, nor explicitly requested an agent merge for the exact candidate
- **THEN** neither the agent nor repository automation SHALL merge it or record human acceptance

#### Scenario: Maintainer accepts and authorizes merge
- **WHEN** an authorized maintainer reviews a finalized current-head candidate with its plain acceptance list and manually merges it
- **THEN** that merge SHALL constitute acceptance of the listed scenarios and explicit merge authorization
- **AND** implementation, synchronized specs, acceptance record, and archive SHALL integrate atomically

#### Scenario: Maintainer accepts and enables auto-merge
- **WHEN** an authorized maintainer reviews the finalized current-head candidate and personally enables native auto-merge
- **THEN** the arm SHALL constitute acceptance of the listed scenarios for that exact candidate
- **AND** GitHub MAY integrate it only after required current-head validation succeeds

#### Scenario: Maintainer requests an agent merge
- **WHEN** an authorized maintainer explicitly instructs the active agent to merge one identified finalized candidate that is currently green and mergeable
- **THEN** the agent SHALL re-read the candidate and MAY perform a protected squash merge only for the instructed exact head using expected-head enforcement and the authorized human GitHub credential
- **AND** that instruction and resulting direct merge SHALL constitute the maintainer's acceptance of the listed scenarios

#### Scenario: Requested candidate is not currently eligible
- **WHEN** the instructed PR is draft, stale, behind, conflicted, blocked, pending or failed, ambiguously identified, bound to another finalized head, or cannot be authoritatively read
- **THEN** the agent SHALL leave it unmerged and report the blocker
- **AND** SHALL NOT wait, watch, arm auto-merge, bypass protection, or retain standing authority

#### Scenario: Maintainer integrates without manual validation
- **WHEN** an authorized maintainer directly merges, arms, or requests an agent merge for a finalized current-head candidate without having manually tested it
- **THEN** that integration choice SHALL be as valid as one made after manual testing
- **AND** no policy, check, or checkbox SHALL require evidence of manual validation

#### Scenario: Candidate changes after review
- **WHEN** a new commit, acceptance-list edit, target advance, or finalization update changes the pull-request candidate
- **THEN** prior CI and any earlier human arm or agent-merge instruction SHALL NOT authorize the new candidate
- **AND** the maintainer SHALL make a new integration decision after renewed current-head validation

### Requirement: Plain acceptance scenarios are bound to the final candidate
A version-3 delivery SHALL contain one or more concise, distinct behavior-and-expected-result scenarios in a final `Acceptance` section of the ordinary PR and in its committed conditional acceptance manifest. They SHALL be plain bullets, not checkboxes. Generic review, CI, no-gap, approval, archive, source-task, or automated-test boilerplate SHALL be rejected. The trusted candidate check SHALL require exact normalized membership between the PR list and manifest and SHALL bind the manifest to the finalized change identity and archive contents.

Automation SHALL validate structure, objective evidence, finalization, and exact current-head CI without asserting that human scenarios passed. Only an authorized human's non-automatic merge of that exact head SHALL activate the conditional manifest as acceptance. A body edit, changed manifest, changed head, missing check, or contradictory acceptance evidence SHALL fail closed or require renewed validation.

#### Scenario: Candidate presents specific scenarios
- **WHEN** a finalized implementation provides one or more unique observable scenarios as plain bullets
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

## ADDED Requirements

### Requirement: Both repositories implement one exact delivery contract

Delivery simplification SHALL use the byte-identical `portable-delivery-v1` rulebook, adapter table, verification cases and digest manifest supplied by this change. Implementers SHALL copy them unchanged to the R17 destinations and use only the listed repository-specific bindings. They SHALL NOT paraphrase shared policy, change expected cases, invent exceptions or override OpenSpec.

#### Scenario: Agent installs repository guidance
- **WHEN** the approved delivery implementation installs guidance
- **THEN** the four contract files SHALL match the approved planning bytes and SHA-256 digests
- **AND** `AGENTS.md` SHALL contain the exact R17 routing paragraph once while other repository-owned entries link rather than restate policy

#### Scenario: Existing implementation predates the contract
- **WHEN** work has already started under an earlier plan
- **THEN** the agent SHALL preserve it and record the inspected head, rule/case reconciliation, corrections and blockers before further affected implementation
- **AND** unrelated completed tasks SHALL remain truthful without automatically discarding work

#### Scenario: Shared verification is executed
- **WHEN** either repository verifies implementation conformance
- **THEN** its test bindings SHALL consume every identical case and assert actual behavior against the unchanged expected results
- **AND** dropped cases, changed contract bytes, adapter drift or framework overrides SHALL fail verification rather than be silently accepted

#### Scenario: Implementer encounters ambiguity
- **WHEN** a requirement conflicts with the exact contract or a policy decision is unspecified
- **THEN** the affected action SHALL stop for explicit clarification without inventing an exception
- **AND** a contract refinement SHALL require matching approved updates in both repositories before affected implementation

### Requirement: Workflow simplification preserves the OpenSpec framework

Workflow simplification SHALL be limited to repository-owned delivery tooling and guidance around the unchanged OpenSpec framework. It SHALL NOT modify, regenerate, replace, or override OpenSpec skills (including `openspec-*`), generated OpenSpec/`opsx` commands, framework implementation, schemas, templates, or lifecycle semantics. Project-specific proposals, designs, tasks and specification deltas MAY be edited without granting framework-change authority. Repository guidance SHALL NOT shadow or override OpenSpec instructions. Any outcome requiring a framework change SHALL be reported as blocked and moved to a separate explicitly approved scope.

#### Scenario: Repository delivery guidance is simplified
- **WHEN** this change simplifies root instructions, the repository-owned delivery skill, runbooks or project context
- **THEN** the changes SHALL use supported integration points without changing or overriding OpenSpec skills or framework behavior
- **AND** project-specific planning artifacts SHALL remain distinct from protected framework assets

#### Scenario: Implementation diff is reviewed
- **WHEN** the implementation candidate is reviewed
- **THEN** the complete diff, including additions, deletions and rename sources/destinations, SHALL leave protected OpenSpec skills, commands and framework assets unchanged
- **AND** repository guidance SHALL be inspected for indirect overrides, not only changes to protected paths

#### Scenario: Simplification would require a framework change
- **WHEN** a proposed outcome cannot be delivered without changing or overriding OpenSpec
- **THEN** the agent SHALL report that outcome as blocked and seek a separate explicitly approved scope
- **AND** it SHALL NOT bundle the framework change into this delivery
