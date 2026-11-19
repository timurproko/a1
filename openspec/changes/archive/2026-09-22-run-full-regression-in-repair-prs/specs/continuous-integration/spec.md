## MODIFIED Requirements

### Requirement: Integration owners declare pull-request or exhaustive cadence
Every retained integration owner SHALL declare exactly one execution cadence: `pull-request` or `exhaustive`. Ordinary bounded `pull_request` and manual Development validation SHALL schedule only pull-request owners. Impact selection SHALL choose affected pull-request owners, while conservative ordinary selection SHALL choose all pull-request owners. A PR selected for complete regression SHALL additionally invoke the shared Full regression implementation inside its PR workflow, including all exhaustive owners. This explicit complete-regression selection SHALL be an exception to ordinary cadence deferral, not a reclassification or deletion of owners. Exhaustive owners SHALL remain mandatory in manual and scheduled Full regression and nightly/stable release validation and SHALL never be inferred from focused PR coverage. An owner whose assertion is wall-clock timing on shared runners SHALL remain exhaustive, with its deterministic contracts covered by pull-request owners.

A malformed, missing, or unknown cadence declaration SHALL block selection rather than default an exhaustive owner into or out of validation. Selection evidence SHALL distinguish ordinary selected owners, ordinary cadence-deferred owners, and owners executed by selected complete regression. The protected aggregate SHALL require every selected PR owner and any selected complete-regression result. It SHALL neither wait for nor accept evidence from an owner proven deferred by both selections.

#### Scenario: Validation-authority pull request is conservative
- **WHEN** a PR changes Development workflow, complete-regression selection, or aggregation authority
- **THEN** trusted classification SHALL retain conservative ordinary coverage and additionally select PR-attached Full regression
- **AND** the protected aggregate SHALL require both applicable outcomes

#### Scenario: Ordinary release implementation changes
- **WHEN** a PR changes package or update production code covered by release-impact policy
- **THEN** affected ordinary deterministic contracts SHALL run
- **AND** PR-attached Full regression SHALL execute the real predecessor and timing owners on their retained targets before integration

#### Scenario: Unrelated ordinary implementation is validated
- **WHEN** trusted classification proves that an ordinary PR has no repair association, release impact, or full-regression opt-in
- **THEN** exhaustive owners SHALL remain explicitly cadence-deferred and ordinary bounded validation SHALL not wait for them

#### Scenario: Full regression is requested
- **WHEN** a maintainer dispatches Full regression
- **THEN** all pull-request and exhaustive owners SHALL execute with their retained assertions and targets

#### Scenario: Nightly or stable validation runs
- **WHEN** nightly or stable release validation expands complete coverage
- **THEN** all exhaustive owners SHALL execute against the selected exact package
- **AND** a failed exhaustive owner SHALL block that workflow's publication authority

#### Scenario: Cadence policy is malformed
- **WHEN** an integration owner omits cadence or declares an unsupported value
- **THEN** selection and aggregation SHALL fail closed
- **AND** no omitted owner SHALL be interpreted as safely deferred

### Requirement: A failed nightly regression proposes its fix
When a `Full regression` run on `develop` or a scheduled `Release` validation completes with a failure, one trusted workflow SHALL open or refresh a draft pull request against `develop` whose body carries the failure evidence: the failed owners per platform and Node lane, the test files those owners retain, a bounded excerpt of the failing test output, the `develop` commits since the last successful run of the same workflow, and a link to the failed run. The pull request SHALL start from the failed head, SHALL contain only an OpenSpec change scaffold for the fix, and SHALL follow the ordinary implementation-bound delivery rules from there. After implementation, a repair candidate SHALL receive complete regression inside its PR workflow and SHALL be handed off only after that complete suite and the other required checks succeed on the final candidate head. A separate manual dispatch SHALL NOT be required in addition to successful selected PR-attached complete regression. Pre-finalization investigation evidence MAY remain in design.md, while final-head run identity and outcomes SHALL be bound through PR checks, Actions artifacts, and the handoff without a self-invalidating evidence-only commit.

A run on any other branch, including manually dispatched or PR-attached Full regression on a fix candidate, SHALL open or refresh nothing. The same trusted triage workflow SHALL continue to evaluate every eligible completed `develop` run, failed or not, for a persistent startup-budget overrun from that run and the two previous completed runs of the same workflow; a persistent overrun SHALL be proposed as a failure of `package-startup` with the three measurements per lane, profile, and launch kind under its own candidate key, while a single overrun SHALL be recorded in the triage report and summary only. The proposal SHALL NOT re-run validation, edit `develop`, mark the pull request ready, merge, or change the nightly failure's own visibility or publication authority.

#### Scenario: Nightly regression fails on one lane
- **WHEN** the scheduled Full regression fails with owners `a` and `b` on Windows Node 24 and passes elsewhere
- **THEN** a draft pull request `fix/nightly-regression-<date>` SHALL exist with `a` and `b`, their test files, the lane, the log excerpt, the suspect commits, and the run link in its `## Implementation` section
- **AND** its branch SHALL add only `openspec/changes/fix-nightly-regression-<date>/`

#### Scenario: The same owners fail again
- **WHEN** a later nightly fails with the same failed owner set while that triage pull request is open
- **THEN** the workflow SHALL append the new run's evidence to the existing pull request and change instead of opening another

#### Scenario: A lane fails before producing owner evidence
- **WHEN** a lane fails in installation, packing, or runner preparation and uploads no owner outcomes
- **THEN** the evidence SHALL name the failed job and its bounded final log lines and SHALL record the owner set as an orchestration failure

#### Scenario: Manual publication fails
- **WHEN** a manually dispatched Release run fails
- **THEN** no triage pull request SHALL be opened or refreshed

#### Scenario: The fix is proven before hand-off
- **WHEN** a nightly repair's finalized candidate is handed to the maintainer
- **THEN** its PR-attached Full regression SHALL have succeeded on that exact head across every required lane
- **AND** the PR checks, evidence, and handoff SHALL identify the run and head without requiring an additional dispatch or committed run-ID edit

#### Scenario: A candidate branch runs Full regression
- **WHEN** manually dispatched or PR-attached Full regression on a repair branch fails
- **THEN** no triage pull request SHALL be opened or refreshed
- **AND** that failure SHALL remain visible as candidate evidence and SHALL block its applicable handoff gate

#### Scenario: A green nightly carries a persistent startup overrun
- **WHEN** the scheduled Full regression succeeds and one lane, profile, and launch kind has exceeded its budget on this and the two previous `develop` runs
- **THEN** the triage SHALL open or refresh a candidate whose key names `package-startup` and whose evidence lists the three measurements

#### Scenario: A nightly carries one startup overrun
- **WHEN** a measurement exceeds its budget on this run but not on both previous `develop` runs
- **THEN** the triage SHALL record the overrun in its report and summary and SHALL open or refresh nothing for it

## ADDED Requirements

### Requirement: Repair and publishing pull requests select visible complete regression
Development validation SHALL select PR-attached Full regression for established nightly-repair implementations, changes covered by a reviewed release/publishing and prerequisite impact policy, changes to the relevant validation authority, and explicit `ci:full-regression` opt-ins. Selection SHALL use base-controlled policy, complete changed and renamed-from paths, current PR metadata, and supported lifecycle association, not title inference or an untrusted opt-out. It SHALL record the exact head, target baseline, input identity, decision, and reasons. Unknown, incomplete, or contradictory evidence SHALL block selection or require conservative full execution rather than silently exempting the PR.

Planning-only drafts SHALL not launch complete regression. Implementation-bearing drafts selected by policy SHALL expose complete-regression checks without gaining integration authority. Ordinary docs-only and pure version-only changes SHALL retain their exemptions unless a repair association or explicit opt-in selects full validation. Labels SHALL be additive to automatic selection; removing a label SHALL not erase an automatic reason. Head, lifecycle, label, and readiness changes SHALL trigger fresh evaluation.

#### Scenario: Repair remains draft while code is developed
- **WHEN** a nightly-repair draft acquires approved executable implementation changes
- **THEN** its full-regression lanes SHALL appear as native checks in that PR
- **AND** the PR SHALL remain draft and ineligible for integration

#### Scenario: Planning scaffold is proposed
- **WHEN** a draft contains only planning artifacts, even with a nightly association or opt-in label
- **THEN** it SHALL retain lightweight planning behavior without scheduling exhaustive jobs

#### Scenario: Publishing preparation changes
- **WHEN** a PR changes a release build prerequisite, packaging input, publication workflow, or policy-mapped release support path
- **THEN** full regression SHALL be selected even if the previous failure occurred before owner outcomes existed

#### Scenario: A path or repair marker is moved
- **WHEN** finalization, a rename, or metadata removal changes the visible location of a repair association or release-sensitive input
- **THEN** base/head and renamed-from evidence SHALL preserve the selection or block on ambiguity

#### Scenario: Opt-in is removed
- **WHEN** the full-regression label is removed
- **THEN** selection SHALL be recomputed and full work SHALL remain required whenever an automatic reason remains
- **AND** an earlier green selection SHALL not authorize the new decision

### Requirement: Selected full regression participates in the protected PR aggregate
The PR workflow SHALL call a shared, non-publishing complete-regression implementation that also serves scheduled and manual Full regression. Its existing complete Windows Node 22/24, Linux Node 24, and macOS Node 24 coverage SHALL appear in the PR Checks rollup with stable per-lane names. Execution SHALL validate the explicit PR head rather than accidentally certifying only a synthetic merge ref. Artifacts and outcomes SHALL bind source, selection, target, run, attempt, and lane identity.

The existing `Development validation required` aggregate SHALL require the complete current selected result in addition to all other mandatory checks. Failed, cancelled, missing, stale, or unexpectedly skipped required work SHALL block integration. A skip SHALL be acceptable only with trustworthy current selection proving full regression unselected. Other workflow runs SHALL not substitute for this PR execution. PR jobs SHALL not gain write credentials, publication secrets, or OIDC publication authority. Scheduled/manual entry points, eligible triage behavior, and publication's own exact-byte gates SHALL remain independent and intact.

#### Scenario: Complete PR validation succeeds
- **WHEN** every selected native lane and all other mandatory gates succeed for the final PR head and selection
- **THEN** their checks SHALL be visible in the PR and the stable protected aggregate MAY succeed

#### Scenario: One required lane does not succeed
- **WHEN** a selected full lane fails, is cancelled, is absent, or is unexpectedly skipped
- **THEN** the protected aggregate SHALL remain unsuccessful even if ordinary PR checks pass

#### Scenario: Successful evidence belongs elsewhere
- **WHEN** evidence belongs to another head, target, selection, run, or incompatible attempt
- **THEN** the aggregate SHALL reject it rather than reuse an earlier or independently dispatched success

#### Scenario: Scheduled or manual full validation is requested
- **WHEN** an existing scheduled trigger or explicit Full regression dispatch runs
- **THEN** it SHALL retain the named workflow entry point, full coverage, non-publishing authority, and compatible evidence through the shared implementation

#### Scenario: PR work is superseded
- **WHEN** a new PR head supersedes an active full run
- **THEN** the old PR work MAY be cancelled and SHALL not certify the new head
- **AND** PR cancellation SHALL not cancel an unrelated scheduled/manual run or its own caller
