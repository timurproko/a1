## MODIFIED Requirements

### Requirement: Integration owners declare pull-request or exhaustive cadence
Every retained integration owner SHALL declare exactly one execution cadence: `pull-request` or `exhaustive`. Ordinary bounded `pull_request` and manual Development validation SHALL schedule only pull-request owners. Impact selection SHALL choose affected pull-request owners, while conservative ordinary selection SHALL choose all pull-request owners. Only a trusted-CI-created repair pull request carrying valid provenance for a failed Full regression SHALL additionally invoke the shared Full regression implementation inside its PR workflow, including all exhaustive owners. This explicit complete-regression selection SHALL be an exception to ordinary cadence deferral, not a reclassification or deletion of owners. Exhaustive owners SHALL remain mandatory in manual and scheduled Full regression and nightly/stable release validation and SHALL never be inferred from focused PR coverage. An owner whose assertion is wall-clock timing on shared runners SHALL remain exhaustive, with its deterministic contracts covered by pull-request owners.

A malformed, missing, or unknown cadence declaration SHALL block ordinary selection rather than default an exhaustive owner into or out of validation. Selection evidence SHALL distinguish ordinary selected owners, ordinary cadence-deferred owners, and owners executed by an eligible generated repair's complete regression. The protected aggregate SHALL require every selected PR owner and any selected complete-regression result. It SHALL neither wait for nor accept evidence from an owner proven deferred by both selections.

#### Scenario: Validation-authority pull request is conservative
- **WHEN** a human-authored PR changes Development workflow, complete-regression selection, or aggregation authority
- **THEN** trusted ordinary classification SHALL retain conservative pull-request coverage
- **AND** PR-attached Full regression SHALL remain unselected

#### Scenario: Ordinary release implementation changes
- **WHEN** a human-authored PR changes package, update, release, build, or publication code
- **THEN** affected ordinary deterministic contracts SHALL run
- **AND** exhaustive owners SHALL remain cadence-deferred until scheduled/manual Full regression or nightly/stable release validation

#### Scenario: Generated failed-regression repair is validated
- **WHEN** trusted CI creates a repair PR from a failed Full regression and its implementation is no longer planning-only
- **THEN** PR-attached Full regression SHALL execute pull-request and exhaustive owners on their retained targets before integration

#### Scenario: Unrelated ordinary implementation is validated
- **WHEN** trusted classification proves that a PR lacks valid generated failed-Full-regression repair provenance
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
When a `Full regression` run on `develop` or a scheduled `Release` validation completes with a failure, one trusted workflow SHALL open or refresh a draft pull request against `develop` whose body carries the failure evidence: the failed owners per platform and Node lane, the test files those owners retain, a bounded excerpt of the failing test output, the `develop` commits since the last successful run of the same workflow, and a link to the failed run. The pull request SHALL start from the failed head, SHALL contain only an OpenSpec change scaffold for the fix, and SHALL follow the ordinary implementation-bound delivery rules from there. The generated scaffold SHALL include bounded machine-readable source provenance naming the workflow, run, event, conclusion, source head, and candidate identity.

After implementation, a repair candidate created from a failed Full regression SHALL receive complete regression inside its PR workflow and SHALL be handed off only after that complete suite and the other required checks succeed on the final candidate head. A repair created only from a scheduled Release failure SHALL retain ordinary selected PR validation and the release pipeline's independent complete validation, but SHALL NOT select PR-attached Full regression solely because it is a triage candidate. A separate manual dispatch SHALL NOT be required in addition to successful selected PR-attached complete regression. Pre-finalization investigation evidence MAY remain in design.md, while final-head run identity and outcomes SHALL be bound through PR checks, Actions artifacts, and the handoff without a self-invalidating evidence-only commit.

A run on any other branch, including manually dispatched or PR-attached Full regression on a fix candidate, SHALL open or refresh nothing. The same trusted triage workflow SHALL continue to evaluate every eligible completed `develop` run, failed or not, for a persistent startup-budget overrun from that run and the two previous completed runs of the same workflow; a persistent overrun SHALL be proposed as a failure of `package-startup` with the three measurements per lane, profile, and launch kind under its own candidate key, while a single overrun SHALL be recorded in the triage report and summary only. The proposal SHALL NOT re-run validation, edit `develop`, mark the pull request ready, merge, or change the nightly failure's own visibility or publication authority.

#### Scenario: Nightly regression fails on one lane
- **WHEN** the scheduled Full regression fails with owners `a` and `b` on Windows Node 24 and passes elsewhere
- **THEN** a draft pull request `fix/nightly-regression-<date>` SHALL exist with `a` and `b`, their test files, the lane, the log excerpt, the suspect commits, the run link, and generated source provenance
- **AND** its branch SHALL add only the OpenSpec planning scaffold

#### Scenario: The same owners fail again
- **WHEN** a later nightly fails with the same failed owner set while that triage pull request is open
- **THEN** the workflow SHALL append the new run's evidence and refresh generated provenance in the existing pull request and change instead of opening another

#### Scenario: A lane fails before producing owner evidence
- **WHEN** a lane fails in installation, packing, or runner preparation and uploads no owner outcomes
- **THEN** the evidence SHALL name the failed job and its bounded final log lines and SHALL record the owner set as an orchestration failure

#### Scenario: Scheduled publication fails
- **WHEN** a scheduled Release run creates a repair candidate
- **THEN** that candidate SHALL retain ordinary selected PR validation without PR-attached Full regression unless valid failed-Full-regression provenance is later added by trusted triage

#### Scenario: Manual publication fails
- **WHEN** a manually dispatched Release run fails
- **THEN** no triage pull request SHALL be opened or refreshed

#### Scenario: The fix is proven before hand-off
- **WHEN** a generated failed-Full-regression repair's finalized candidate is handed to the maintainer
- **THEN** its PR-attached Full regression SHALL have succeeded on that exact head across every required lane
- **AND** the PR checks, evidence, and handoff SHALL identify the run and head without requiring an additional dispatch or committed run-ID edit

#### Scenario: A candidate branch runs Full regression
- **WHEN** manually dispatched or PR-attached Full regression on a repair branch fails
- **THEN** no triage pull request SHALL be opened or refreshed
- **AND** that failure SHALL remain visible as candidate evidence and SHALL block its applicable handoff gate

#### Scenario: A green nightly carries a persistent startup overrun
- **WHEN** the scheduled Full regression succeeds and one lane, profile, and launch kind has exceeded its budget on this and the two previous `develop` runs
- **THEN** the triage SHALL open or refresh a candidate whose key names `package-startup` and whose evidence lists the three measurements
- **AND** the candidate SHALL use ordinary PR validation because its source Full regression did not fail

#### Scenario: A nightly carries one startup overrun
- **WHEN** a measurement exceeds its budget on this run but not on both previous `develop` runs
- **THEN** the triage SHALL record the overrun in its report and summary and SHALL open or refresh nothing for it

### Requirement: Repair and publishing pull requests select visible complete regression
Development validation SHALL select PR-attached Full regression only for a nightly-repair pull request that the trusted regression-triage automation created from a failed Full regression. Selection SHALL use base-controlled policy, immutable configured GitHub App author identity, generated source-run provenance, complete changed and renamed-from paths, current PR metadata, and supported lifecycle association. A matching branch, title, OpenSpec identifier, body text, changed release/publishing path, unknown operational path, or label SHALL NOT select complete regression without that generated provenance. Release/publishing, build/prerequisite, shared-support, and validation-authority impact SHALL use ordinary Development selection and SHALL NOT independently select PR-attached Full regression. No PR label SHALL opt into or opt out of the complete suite.

Selection SHALL record the exact head, target baseline, input identity, decision, and reasons. Invalid PR identity, contradictory lifecycle data, or stale recorded selection SHALL block validation. Missing or invalid generated-repair provenance SHALL not grant complete-regression selection; ordinary validation SHALL still fail closed under its existing impact and lifecycle policy rather than treating the missing full suite as successful evidence.

Planning-only generated repair drafts SHALL not launch complete regression. Implementation-bearing generated repairs SHALL expose complete-regression checks without gaining integration authority. Head, lifecycle, provenance, and readiness changes SHALL trigger fresh evaluation. Human-authored and other automation-authored PRs SHALL retain ordinary bounded validation regardless of matching names or changed paths.

#### Scenario: Repair remains draft while code is developed
- **WHEN** an App-created failed-Full-regression repair draft acquires approved executable implementation changes with valid provenance
- **THEN** its full-regression lanes SHALL appear as native checks in that PR
- **AND** the PR SHALL remain draft and ineligible for integration

#### Scenario: Planning scaffold is proposed
- **WHEN** trusted triage creates a draft containing only planning artifacts and failed-run provenance
- **THEN** it SHALL retain lightweight planning behavior without scheduling exhaustive jobs

#### Scenario: Publishing preparation changes
- **WHEN** a human-authored PR changes a release build prerequisite, packaging input, publication workflow, or validation policy
- **THEN** ordinary impact-selected or conservative Development validation SHALL run
- **AND** PR-attached Full regression SHALL remain unselected

#### Scenario: Human creates a lookalike repair
- **WHEN** a human creates a matching `fix/nightly-regression-*` branch, OpenSpec association, title, body, or provenance-shaped file
- **THEN** immutable author and generated-origin checks SHALL keep PR-attached Full regression unselected

#### Scenario: App creates unrelated work
- **WHEN** the configured App authors a PR without valid failed-Full-regression source provenance
- **THEN** App identity alone SHALL NOT select complete regression

#### Scenario: Maintainer applies the former opt-in label
- **WHEN** `ci:full-regression` or another label is added to an ordinary PR
- **THEN** selection MAY be recomputed for freshness but SHALL remain unselected unless generated failed-regression provenance independently qualifies

#### Scenario: A path or repair marker is moved
- **WHEN** trusted finalization moves the eligible repair's active OpenSpec path into its archive
- **THEN** author, source provenance, and renamed/history evidence SHALL preserve complete-regression selection on the final head

#### Scenario: Opt-in is removed
- **WHEN** `ci:full-regression` or another label is removed from any PR
- **THEN** selection MAY be recomputed for freshness but SHALL continue to depend only on valid generated failed-regression provenance
- **AND** an earlier selected or unselected result SHALL not authorize a changed selection identity

#### Scenario: Source provenance is not a failed Full regression
- **WHEN** generated provenance identifies a successful or cancelled Full regression, a Release run, an unsupported event, or an unverifiable source
- **THEN** PR-attached Full regression SHALL remain unselected
- **AND** ordinary required validation and independent release/nightly gates SHALL retain their authority
