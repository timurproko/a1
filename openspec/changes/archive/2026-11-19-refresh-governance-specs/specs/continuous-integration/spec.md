## ADDED Requirements

### Requirement: Development validation publishes one required check
The workflows of this repository SHALL publish exactly one merge-gating check for pull requests into `develop`: the `Development validation required` aggregate job of `.github/workflows/ci.yml`. The same job SHALL be named `Development validation diagnostic` when the workflow is dispatched manually, so a dispatched run never produces the gating check. `master` SHALL record the commit the npm `latest` tag serves; only a completed stable publication SHALL write it, by a non-forced fast-forward. Publication SHALL NOT serve as the first automated validation of a change.

#### Scenario: A pull request is validated
- **WHEN** Development validation runs for a ready pull request into `develop`
- **THEN** its aggregate job SHALL report as `Development validation required`

#### Scenario: Development validation is dispatched manually
- **WHEN** the workflow runs from `workflow_dispatch`
- **THEN** its aggregate job SHALL report as `Development validation diagnostic`

#### Scenario: A stable version is published
- **WHEN** publication to npm `latest` completes
- **THEN** `master` SHALL be fast-forwarded to the published commit without force
- **AND** a preview publication SHALL leave `master` unchanged

### Requirement: Nightly regression triage opens a draft fix candidate
The trusted `Nightly regression triage` workflow SHALL evaluate, from default-branch code, every `Full regression` run and every scheduled `Publish` run on `develop` that concluded with failure or success. A cancelled run, a manually dispatched `Publish` run, and a run on any other branch SHALL be recorded as not triaged and SHALL open or refresh nothing.

For a failed run the triage SHALL collect the failed commands per platform, Node lane, and Windows shard, the tests those commands retain, a bounded excerpt of the failed job logs, the first-parent `develop` commits since the last successful run of the same workflow, and the run link. A lane that failed without uploading owner outcomes SHALL be recorded as an orchestration failure naming its job. When the run yields a failure and no open candidate carries the same triage key, the triage SHALL open a draft pull request against `develop` titled `chore(regression): ...` from branch `fix/nightly-regression-<date>`, started at the failed head, whose single commit adds only an OpenSpec change scaffold including `regression-provenance.json` with the workflow, run, event, conclusion, and source head. The body SHALL carry a proposal, two unchecked implementation outcomes (reproduce, fix), one acceptance bullet, and an automation block holding the triage key and the link to the change; the evidence SHALL be posted as a comment. When an open candidate carries the same triage key, the triage SHALL append the run to that change's design and provenance, push that commit, post the evidence as another comment, and SHALL NOT edit the pull-request body.

For every triaged run, failed or not, the triage SHALL compare the startup evidence of that run and the two previous completed `develop` runs of the same workflow with the budgets. A lane, profile, and launch kind that overran in all three SHALL be proposed as a failure of `package-startup` under its own triage key with the three measurements as evidence; any other overrun SHALL be recorded in the triage report and run summary only. The triage SHALL NOT re-run validation, write `develop`, mark a pull request ready, or merge, and a dry run SHALL write only its report.

#### Scenario: Nightly regression fails on one lane
- **WHEN** the scheduled Full regression fails with two commands on Windows Node 24 and passes elsewhere
- **THEN** a draft pull request from `fix/nightly-regression-<date>` SHALL exist whose comment and change design carry those commands, their tests, the lane, the log excerpt, the suspect commits, and the run link
- **AND** its body SHALL carry two unchecked implementation outcomes, one acceptance bullet, and the triage key
- **AND** its branch SHALL add only the OpenSpec change scaffold with its provenance

#### Scenario: The same failure set fails again
- **WHEN** a later run produces the same triage key while that candidate is open
- **THEN** the triage SHALL append the run to the change's design and provenance and post another evidence comment instead of opening another pull request
- **AND** it SHALL NOT edit the pull-request body

#### Scenario: A lane fails before producing owner evidence
- **WHEN** a lane fails in installation, packing, or runner preparation and uploads no owner outcomes
- **THEN** the evidence SHALL name the failed job with its bounded log excerpt as an orchestration failure

#### Scenario: Manual publication fails
- **WHEN** a manually dispatched Publish run fails
- **THEN** no triage pull request SHALL be opened or refreshed

#### Scenario: A candidate branch runs Full regression
- **WHEN** a Full regression run on a branch other than `develop` fails
- **THEN** no triage pull request SHALL be opened or refreshed

#### Scenario: A green nightly carries a persistent startup overrun
- **WHEN** the scheduled Full regression succeeds and one lane, profile, and launch kind exceeded its budget on this and the two previous `develop` runs
- **THEN** the triage SHALL open or refresh a candidate whose failure names `package-startup` and whose evidence lists the three measurements

#### Scenario: A nightly carries one startup overrun
- **WHEN** a measurement exceeds its budget on this run but not on both previous `develop` runs
- **THEN** the triage SHALL record the overrun in its report and summary and SHALL open or refresh nothing for it

### Requirement: Development validation defers until a pull request is ready and finalized
Development validation SHALL run no job for a draft pull request. For a ready pull request, one readiness job SHALL decide, before any suite is selected, whether validation runs. It SHALL execute the policy from the pull request's exact base commit, without pull-request-head code or dependency installation, SHALL re-read the current pull request through read-only GitHub authority, and SHALL fail when the current number, head, or base differs from the event that started the run.

Readiness SHALL read at most one `openspec-implementation` record from the pull-request body. A body without one SHALL validate as an ordinary ready pull request. A body with one SHALL validate only when the record names an archive path under `openspec/changes/archive/` and its `finalizedHead` equals the event head; otherwise readiness SHALL defer with the reason `awaiting-finalization`. A repeated, unparsable, unclosed, or malformed record SHALL fail the readiness job. Readiness SHALL NOT judge whether the delivery itself is valid.

When readiness defers or fails, impact selection, every suite, and the aggregate SHALL NOT run, so no `Development validation required` check exists for that head. When readiness validates, selection, lanes, assertions, evidence binding, and the aggregate SHALL be the ordinary ones. A run that is not a pull-request event SHALL always validate. A newer event for the same pull request SHALL cancel the run in progress, and no earlier-head result SHALL be reused.

#### Scenario: A draft receives pushes
- **WHEN** a draft pull request receives head or body changes
- **THEN** Development validation SHALL schedule no readiness job, suite, or aggregate

#### Scenario: An unlinked pull request becomes ready
- **WHEN** a pull request whose body links no OpenSpec change becomes ready for review
- **THEN** readiness SHALL validate with the reason `ready` and impact-selected validation SHALL start

#### Scenario: A linked pull request is ready but not finalized
- **WHEN** a ready pull request's record names a change without an archive path, or its finalized head differs from the event head
- **THEN** readiness SHALL defer with the reason `awaiting-finalization`
- **AND** no suite SHALL run and no `Development validation required` check SHALL be produced for that head

#### Scenario: The finalized head arrives
- **WHEN** a pull-request event's head equals the finalized head its body records together with the archive path
- **THEN** readiness SHALL validate and that exact head SHALL receive impact-selected validation and the aggregate

#### Scenario: The delivery record is malformed
- **WHEN** a ready pull request's body holds a repeated, unparsable, unclosed, or malformed record
- **THEN** the readiness job SHALL fail with the record's error code
- **AND** no suite or aggregate SHALL run

#### Scenario: Current metadata drifted or is unavailable
- **WHEN** the current pull request cannot be read, or its number, head, or base differs from the event identity
- **THEN** the readiness job SHALL fail and no suite or aggregate SHALL run

#### Scenario: Ready work is superseded
- **WHEN** a ready pull request receives another head or body change or is converted back to draft
- **THEN** the in-progress Development validation run for that pull request SHALL be cancelled

#### Scenario: Development validation is dispatched manually
- **WHEN** the workflow is dispatched on a branch
- **THEN** readiness SHALL validate with the reason `non-pull-request`
- **AND** the run SHALL produce `Development validation diagnostic`, not the pull-request check

### Requirement: Development partitions run independently under one aggregate
Development validation SHALL schedule the mandatory PR core and each selected integration partition independently after its actual prerequisites. Resource-sensitive files selected by ownership SHALL remain non-file-parallel on an isolated runner, with the same authoritative membership and the same explicit hang bound used by complete validation. No selected test SHALL be duplicated between partitions on the same platform/runtime merely because job boundaries changed. Cross-platform and cross-runtime executions SHALL remain distinct evidence where selected.

The single protected-branch aggregate SHALL require the PR core and every scope selected for the current head and selection identity. It SHALL reject missing, failed, cancelled, stale, malformed, or unexpectedly skipped selected results. A skipped integration scope SHALL be acceptable only when the current trustworthy selection explicitly excludes it. Independent jobs SHALL not share mutable application state or owned process trees. The modular job matrix SHALL be derived from the trusted selection by one reviewed repository script that declares every Development modular job; an entry the selection leaves inactive SHALL NOT be scheduled, each scheduled job SHALL still resolve its own owners from the uploaded selection, and the aggregate SHALL still require successful evidence for every selected owner.

#### Scenario: Fast work and resume checks are selected
- **WHEN** a code PR requires the PR core, a resource-sensitive owner, and package resume integration
- **THEN** the resource-sensitive and resume jobs SHALL not depend on completion of unrelated core tests solely for sequencing
- **AND** all selected results SHALL be required before the aggregate succeeds

#### Scenario: Serialization would be replaced by contention
- **WHEN** a resource-sensitive partition is selected alongside ordinary validation
- **THEN** it SHALL execute on an isolated runner rather than concurrently on the ordinary runner
- **AND** it SHALL retain one-file-at-a-time execution and all existing assertions under the partition's explicit hang bound

#### Scenario: A selected partition is skipped
- **WHEN** the current selection requires a core or integration partition but that partition is missing, cancelled, or skipped
- **THEN** the aggregate SHALL fail even if every completed partition passed

#### Scenario: Evidence belongs to another selection
- **WHEN** a result belongs to another head, workflow run, or selection identity
- **THEN** it SHALL NOT satisfy the current aggregate

#### Scenario: Complete validation is requested
- **WHEN** conservative PR classification, Full regression, nightly, preview, or stable validation requests complete retained coverage
- **THEN** every retained fast and applicable integration owner SHALL execute under its declared isolation and platform/runtime contract

#### Scenario: Inactive matrix entries are not scheduled
- **WHEN** the trusted selection activates only some declared modular jobs
- **THEN** the workflow SHALL schedule only the active entries and record the unscheduled ones in the run summary
- **AND** the aggregate SHALL fail when an active entry produced no successful evidence

### Requirement: Development validation reports timing without weakening coverage
Development validation SHALL report selection time, available queue time, setup/build/pack time, repository gate time, per-scope outcomes, and aggregate elapsed time separately. Package fixtures SHALL report bounded phase timings for installation, materialization, certification/warmup, launch, shutdown, and cleanup where executed, including unsuccessful phases. Evidence SHALL identify head, selection, runner, Node version, candidate digest where applicable, cache state, build/pack counts, and test ownership. Reporting SHALL not expose credentials or raw user content.

Wall-clock improvement targets SHALL be reported as achieved or unmet, not enforced by increasing product budgets, shortening representative workloads, hiding failed attempts, or retrying until green.

#### Scenario: A startup job is slow
- **WHEN** a startup job takes substantially longer than its measured command launches
- **THEN** the evidence SHALL distinguish install and fixture phases from actual launch latency and cleanup

#### Scenario: An optimized partition fails
- **WHEN** a scope fails before the remaining scopes execute
- **THEN** completed and failing phase evidence SHALL be retained and unfinished work SHALL remain explicitly incomplete

### Requirement: Release reopening pull requests are prepared by publication
After stable publication, the reopening job of `.github/workflows/release.yml` SHALL create or reuse the reopening pull request through `scripts/release/prepare-reopening.mjs`. The pull request SHALL be one single-parent commit on then-current `origin/develop`, on branch `chore/release-<next>-dev`, whose only changes are the version fields of `package.json`, `package-lock.json`, and `packages/a1-install/package.json` and the added `docs/releases/<released>.md` equal to the approved note and its digest. Preparation SHALL fail when the published source is not an ancestor of `develop`, when `develop` no longer consistently declares the open development version of the published source, or when the note already exists there.

An existing pull request SHALL be reused only when it is open, same-repository, based on `develop`, at the expected head, with auto-merge either absent or armed for squash, and when its commit matches exactly. More than one pull request for the branch, or the branch without one matching pull request, SHALL be refused without overwriting it. Preparation SHALL NOT arm auto-merge or merge. The release command SHALL prepare only the draft Release and its candidate validation and SHALL create no pull request.

#### Scenario: Stable publication prepares reopening
- **WHEN** stable `0.1.8` is published from a source declaring `0.1.8-dev`
- **THEN** one pull request from `chore/release-0.1.9-dev` SHALL declare `0.1.9-dev` in the three manifests and add the exact approved `docs/releases/0.1.8.md`

#### Scenario: A matching reopening pull request exists
- **WHEN** preparation runs again and one open pull request for the branch matches the expected commit
- **THEN** it SHALL be reused, whether auto-merge is absent or armed for squash

#### Scenario: Conflicting reopening work exists
- **WHEN** the branch exists without one matching pull request, several pull requests exist, or the commit changes anything else
- **THEN** preparation SHALL fail and SHALL NOT overwrite the branch or the pull request

#### Scenario: The release command prepares a stable version
- **WHEN** the command prepares stable `0.1.8` from `0.1.8-dev`
- **THEN** it SHALL present the draft GitHub Release for editing and SHALL create no pull request

## MODIFIED Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and specification changes SHALL require no product build or product test execution, but SHALL run every lightweight governance consistency check whose scanned inputs they change; OpenSpec changes SHALL also pass strict OpenSpec validation. Pull requests into `develop` SHALL require a bounded PR core consisting of typechecking, architecture and applicable governance checks, directly changed tests, reviewed path-owned test scopes, and a small current-product smoke set. They SHALL select additional rendering, startup, package, compatibility, and platform evidence only when coarse reviewed ownership marks it affected. Unknown operational inputs and changes to validation authority SHALL select conservative development validation: every coarse owner's critical test floor and every integration owner with `pull-request` cadence. Preview publication SHALL additionally require the complete fast tier and exact-package gates on every supported platform. A numbered development preview SHALL validate the exact package on the Windows, Linux, and macOS Node 24 lanes; Windows Node 22 coverage of every development head SHALL be provided by nightly publication and complete regression rather than by each preview. The lane set SHALL be derived from the publication mode by one reviewed repository script rather than a literal workflow matrix. Stable publication SHALL require the complete automated suite on every supported platform. The scheduled nightly workflow SHALL run one full tracked-repository documentation review and complete retained automated coverage against its authoritative `origin/develop` source before publication can succeed.

An exact post-publication release reopening MAY use a dedicated lightweight route only when policy from the pull request's exact base re-verifies the current pull-request number, base and head identities, trusted App author, branch, complete four-file diff, version-only manifest changes, patch succession, published stable Release, and release-note equivalence. That route SHALL avoid dependency installation, head-controlled impact selection, product builds, product tests, rendering, and unrelated naming or documentation scans. It SHALL still produce the protected current-head aggregate and retain independent PR Full regression selection. Missing, stale, malformed, unavailable, or negative evidence SHALL grant no reopening exemption and SHALL fall back to ordinary validation or block.

#### Scenario: Docs-only pull request
- **WHEN** every changed path is documentation, an OpenSpec artifact, a Markdown file, `LICENSE`, or `.gitignore`
- **THEN** the required development check SHALL avoid product builds and tests, run strict OpenSpec validation when applicable, and run docs-sensitive governance consistency checks

#### Scenario: Code pull request targets develop
- **WHEN** a pull request changes classified non-documentation paths without changing validation authority or an unknown operational input
- **THEN** validation SHALL run the bounded PR core and every additional scope selected by reviewed ownership
- **AND** it SHALL NOT require unrelated retained tests merely because they belong to the complete fast tier
- **AND** the required aggregate check SHALL gate the merge

#### Scenario: Validation authority or unknown input changes
- **WHEN** a pull request changes workflow selection, ownership, suite composition, aggregation authority, common build policy, or an operational path with no trustworthy owner
- **THEN** validation SHALL run conservative development coverage or block
- **AND** no selective result SHALL be inferred from the untrusted policy

#### Scenario: Preview candidate is built
- **WHEN** a preview is published to `next`
- **THEN** validation SHALL run the complete fast tier and exact packed-candidate gates on Windows, Linux, and macOS without requiring every stable-only scope

#### Scenario: Stable candidate is certified
- **WHEN** a version is published to `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version package bytes on Windows, Linux, and macOS before publication

#### Scenario: Scheduled nightly source is selected
- **WHEN** the nightly publication workflow resolves the authoritative `origin/develop` commit
- **THEN** one platform-independent job SHALL inspect documentation governance across every tracked policy-relevant file at that exact commit
- **AND** the retained platform validation matrix SHALL execute complete coverage without repeating the same documentation review

#### Scenario: Development preview lanes are selected
- **WHEN** a manual development publication resolves its validation matrix
- **THEN** it SHALL validate the exact package on Windows Node 24, Linux Node 24, and macOS Node 24
- **AND** nightly and stable publication SHALL keep validating on Windows Node 22 as well
- **AND** the selected lanes SHALL come from the reviewed matrix script for that mode

#### Scenario: Exact post-publication reopening is validated
- **WHEN** trusted exact-base policy verifies the current generated reopening head, its four-file content, and the corresponding published Release
- **THEN** Development validation SHALL skip generic impact analysis and unrelated product and governance lanes
- **AND** `Development validation required` SHALL accept those skips only for that exact verified head

#### Scenario: Reopening verification is not exact
- **WHEN** a reopening-shaped pull request has stale identity, another author, an incomplete or additional path, non-version manifest changes, mismatched note content, unavailable evidence, or any other classifier refusal
- **THEN** it SHALL receive no lightweight reopening exemption
- **AND** validation SHALL use the ordinary impact route or fail closed

### Requirement: Development validation impact is classified deterministically
The development workflow SHALL derive one machine-readable validation selection from the complete merge-base-to-head change, including additions, modifications, copies, deletions, rename sources, and rename destinations. Selection SHALL use a bounded, reviewed ownership registry that maps stable path groups, changed tests, shared support, explicit invalidators, and integration execution cadence to logical scopes and platform/runtime targets. The ownership result SHALL be understandable from path and policy records without requiring successful whole-repository source parsing. Dependency reachability MAY add scope reasons but SHALL NOT be the sole authority for a known coarse owner.

Every changed pull-request-eligible retained test SHALL select its owning scope, including tests outside the PR core. A changed exhaustive-only test SHALL be recorded as deferred from ordinary PR execution and SHALL select its focused deterministic contract coverage rather than its exhaustive owner. Changes to shared test support SHALL select the pull-request owners of every retained test that reaches the changed path through the test tree's static import graph, and SHALL record affected exhaustive owners for Full/nightly execution; when no retained test reaches the path (including support consumed only from outside the test tree) or the graph cannot be built, the change SHALL select every owner the shared rule declares and SHALL record that fallback. Reachability SHALL only narrow a shared rule's declared owner set and SHALL never remove an owner selected by its own path or changed-test rules. Unknown ownership, unavailable history, malformed policy, or classifier failure SHALL select conservative coverage, which is every coarse owner's critical test floor and every integration owner with `pull-request` cadence, or block rather than produce an empty selection. Typechecking, architecture, applicable naming/documentation governance, validation-policy integrity, directly changed pull-request tests, and the declared smoke contracts SHALL remain mandatory in the PR core. Manual Development validation without a complete trusted change comparison SHALL use the same conservative coverage; Full regression and nightly/release coverage SHALL remain complete and SHALL not be reduced by PR impact selection. A link to an OpenSpec change in the pull-request body SHALL NOT change selection: a linked pull request SHALL be classified from its complete change exactly as an unlinked one.

#### Scenario: Changed source is transitively rendered
- **WHEN** a changed operational path belongs to the reviewed UI/rendering owner or a declared shared input affects rendering
- **THEN** the classifier SHALL select the applicable rendering scope and target
- **AND** it SHALL record the owner and changed paths as bounded reasons

#### Scenario: Unrelated foundation changes
- **WHEN** the complete change contains no path, test, shared support, or invalidator owned by rendering or another integration scope
- **THEN** each unrelated integration scope SHALL be explicitly unselected
- **AND** the mandatory PR core SHALL still run

#### Scenario: Reachable dependency is deleted or renamed
- **WHEN** a base or head path participating in reviewed ownership is deleted, copied, or renamed
- **THEN** classification SHALL account for both source and destination identities
- **AND** moving a path SHALL not evade its applicable owners

#### Scenario: A transitive launch dependency changes
- **WHEN** a changed path belongs to the broad reviewed launch/startup group or declared shared support used by packaged launch
- **THEN** startup and every other declared affected pull-request integration owner SHALL be selected with bounded ownership reasons

#### Scenario: Only unrelated governance tooling changes
- **WHEN** every changed operational path belongs to reviewed governance tooling outside product integration and no validation invalidator changes
- **THEN** unrelated startup, package, rendering, compatibility, and platform scopes SHALL be explicitly unselected
- **AND** applicable PR-core governance checks SHALL remain required

#### Scenario: Integration tests or shared fixtures change
- **WHEN** a retained pull-request integration test or its declared shared support changes without production changes
- **THEN** the pull-request owners of that test, and of every retained test that imports the changed support directly or through other support files, SHALL execute in current-head PR validation with the reaching tests recorded as the reason
- **AND** affected exhaustive-only owners SHALL be recorded as deferred rather than silently omitted
- **AND** unknown test ownership SHALL select conservative coverage or block

#### Scenario: Shared support has no known importer
- **WHEN** a changed path under a shared-support rule is reached by no retained test, including one consumed only from outside the test tree, or the import graph cannot be built
- **THEN** classification SHALL select every owner the shared rule declares
- **AND** the selection SHALL record the declared fallback as the reason

#### Scenario: Exhaustive predecessor test changes
- **WHEN** the real multi-release predecessor test or its exhaustive-only support changes
- **THEN** ordinary PR validation SHALL run the focused deterministic predecessor contracts and record the exhaustive owner as deferred
- **AND** Full regression and nightly/release SHALL continue to execute the changed exhaustive test

#### Scenario: Validation selection infrastructure changes
- **WHEN** workflow selection, ownership, suite composition, aggregation, package dependencies, or common build configuration changes
- **THEN** classification SHALL select conservative coverage: every coarse owner's critical test floor and every integration owner with `pull-request` cadence
- **AND** the conservative fallback alone SHALL NOT select a direct-impact owner
- **AND** exhaustive-only owners SHALL remain required by their Full/nightly cadence rather than becoming ordinary PR work

#### Scenario: Classification cannot prove safety
- **WHEN** the authoritative head, complete diff, registry, or required changed path cannot be established or interpreted
- **THEN** development validation SHALL run conservative coverage or block
- **AND** the reason and every cadence-deferred owner SHALL be visible in machine-readable and human-readable evidence

#### Scenario: Manual development validation has no trusted comparison
- **WHEN** Development validation is manually dispatched without a complete authoritative change comparison
- **THEN** conservative coverage SHALL run rather than treating an empty diff as proof of no impact
- **AND** the maintainer SHALL use Full regression when exhaustive validation is required

#### Scenario: Implementation-bound diff is documentation-shaped
- **WHEN** a pull request that links an OpenSpec change has a complete diff touching only documentation, OpenSpec, or archive paths
- **THEN** selection SHALL classify it from that diff exactly as it would an unlinked pull request
- **AND** the link in the pull-request body SHALL NOT change the selected scopes

#### Scenario: Implementation-bound diff touches owned source
- **WHEN** a pull request that links an OpenSpec change changes a path with a reviewed coarse owner
- **THEN** selection SHALL choose that owner's tests and the integration owners its ownership links
- **AND** unrelated pull-request owners SHALL remain explicitly unselected

### Requirement: The complete suite remains available on demand

The complete non-physical automated suite SHALL remain runnable locally (`npm run test:full`) and through manual workflow dispatch, so a maintainer can widen validation when a change feels risky, and SHALL run on a nightly schedule against the current `develop` tip so exhaustive owners run and startup budgets are measured every day independent of publication. Routine development SHALL NOT require it.

Standalone and selected PR-attached Full regression SHALL execute the complete Windows Node 22 and Node 24 coverage through reviewed parallel hosted-runner shards. Each Windows runtime SHALL have `core`, `resource`, `rendering`, `package`, and `predecessor` shard evidence derived from one canonical complete plan. Every canonical command and test invocation SHALL belong to exactly one shard, and one successful Windows lane result SHALL be reconstructed only from all five exact-source, exact-run, exact-attempt, exact-runtime shard results. Missing, duplicate, stale, malformed, failed, cancelled, or unexpected shard evidence SHALL fail the applicable lane and required aggregate. Linux, macOS, local full validation, and publication validation MAY retain one sequential complete plan.

A scope that the complete-regression lanes cannot run MAY be excluded from the `full-release` plan only through an explicit `fullReleaseExclusion` reason on its definition in `config/validation-suites.json`. No scope is currently permitted such an exclusion; adding one SHALL require a reviewed change to this requirement that names the scope and its reason.

#### Scenario: Maintainer requests full validation

- **WHEN** the maintainer dispatches the full-regression workflow or runs the full tier locally
- **THEN** every non-physical scope without a declared `fullReleaseExclusion` SHALL execute and report per-scope timing and outcomes
- **AND** workflow-dispatched Windows coverage SHALL reconstruct each runtime lane from all five required shards while local validation MAY remain sequential

#### Scenario: Nightly schedule fires

- **WHEN** the scheduled Full regression runs
- **THEN** it SHALL validate the current `develop` tip with every pull-request and exhaustive owner whose scopes are not declared `fullReleaseExclusion`, and with startup budgets measured and recorded
- **AND** its failure SHALL be visible as a workflow failure without changing publication authority

#### Scenario: Windows shard evidence is complete

- **WHEN** all five Windows shards for one runtime belong to the same exact source, canonical plan, workflow run, and attempt and every assigned outcome succeeds
- **THEN** validation SHALL reconstruct one complete result in canonical outcome order and bind it to the existing Windows runtime lane
- **AND** the protected complete-regression aggregate SHALL continue to require that lane alongside the other three platform/runtime lanes

#### Scenario: Windows shard evidence is incomplete

- **WHEN** a required shard is missing, duplicated, stale, malformed, cancelled, failed, belongs to another runtime or plan, or omits or duplicates assigned work
- **THEN** no successful Windows lane envelope SHALL be produced
- **AND** the final complete-regression aggregate SHALL fail closed with available shard failure evidence

#### Scenario: A scope is excluded from complete regression

- **WHEN** a scope definition declares `fullReleaseExclusion`
- **THEN** validation SHALL reject the definition unless this requirement names that scope as a permitted exclusion
- **AND** a permitted exclusion SHALL carry a non-empty reason and SHALL NOT be included by `full-release`

### Requirement: Startup budget enforcement is declared per channel
Validation SHALL select startup budget enforcement through the `STARTUP_BUDGET_ENFORCEMENT` contract. The value `fail` SHALL enforce the declared budgets by failing the gate on an overrun. The value `record` SHALL retain every measurement, record each overrun as evidence and as a run annotation, and allow the run to succeed. An absent or unrecognized value SHALL mean `fail`.

Development publication, nightly publication, complete regression, and ordinary pull-request validation SHALL run in `record` mode, each stating its mode explicitly rather than relying on the default. Stable candidate validation, whose validated bytes stable publication adopts, SHALL run in `fail` mode. A recording channel SHALL be judged by the persistent-overrun verdict the nightly regression triage computes. No mode SHALL reduce the measured profiles or launch kinds, retry a measurement, or suppress a launch that never became input-ready.

The startup performance evidence SHALL name the enforcement mode it was produced under and SHALL list every recorded violation with its profile, launch kind, measured elapsed time, applicable budget, and dominant phases. Publication lanes SHALL upload that evidence with their platform outcomes and SHALL summarize each measurement, its budget, and its status in the run summary.

#### Scenario: A development preview lane records an overrun
- **WHEN** a publication lane resolves the `next` channel, for a development preview or a nightly, and an exact packaged launch exceeds its budget
- **THEN** the lane SHALL receive `record`, annotate the run, upload the violation with its platform outcomes, and succeed

#### Scenario: A publication lane enforces an overrun
- **WHEN** a publication lane resolves the stable `latest` channel and the same launch exceeds the same budget
- **THEN** the lane SHALL receive `fail` and block publication with the dominant measured phases

#### Scenario: A pull request measures startup
- **WHEN** the pull-request startup owner runs on a shared runner
- **THEN** it SHALL measure every declared scenario in `record` mode and SHALL NOT fail the required aggregate on a timing overrun alone

#### Scenario: The contract is unset
- **WHEN** the exact-package startup gate runs with no enforcement variable, an empty value, or an unrecognized value
- **THEN** it SHALL enforce the budgets

### Requirement: Integration owners declare pull-request or exhaustive cadence
Every retained integration owner SHALL declare exactly one execution cadence: `pull-request`, `direct-impact`, or `exhaustive`. Ordinary bounded `pull_request` and manual Development validation SHALL schedule only pull-request owners and directly affected direct-impact owners. Impact selection SHALL choose affected owners, while conservative ordinary selection SHALL choose all pull-request owners and SHALL NOT select a direct-impact owner on the strength of the fallback alone. Only a trusted-CI-created repair pull request carrying valid provenance for a failed Full regression SHALL additionally invoke the shared Full regression implementation inside its PR workflow, including all exhaustive owners. This explicit complete-regression selection SHALL be an exception to ordinary cadence deferral, not a reclassification or deletion of owners. Exhaustive owners SHALL remain mandatory in manual and scheduled Full regression and nightly/stable release validation and SHALL never be inferred from focused PR coverage. An owner whose assertion is wall-clock timing on shared runners SHALL remain exhaustive, with its deterministic contracts covered by pull-request owners.

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

### Requirement: Pull-request latency targets are measured by owner and scope
Development validation SHALL report setup, per-scope invocation, selected-job execution, aggregate processing, and runner execution critical-path durations without counting pre-runner queue delay as test execution. The ordinary PR target SHALL be no more than eight minutes of runner execution critical path and no more than five minutes for any individual PR-required scope invocation.

These targets SHALL be evaluated by removing or optimizing inappropriate work, not by increasing timeouts, shrinking representative workloads, caching mutable installed state, suppressing assertions, or retrying failures. Hosted variance MAY be reported, but an observation above either target SHALL remain an unmet result.

#### Scenario: Conservative PR timing is inspected
- **WHEN** a validation-authority change selects conservative pull-request coverage
- **THEN** evidence SHALL identify every owner and scope on the critical path with separate setup and invocation durations
- **AND** it SHALL report the eight-minute and five-minute targets as met or unmet

#### Scenario: Exhaustive work is deferred
- **WHEN** the published-predecessor owner is excluded from an ordinary PR by cadence
- **THEN** evidence SHALL identify cadence deferral rather than classify the owner as unrelated, skipped unexpectedly, or passed

#### Scenario: A PR-required scope exceeds its target
- **WHEN** an individual selected PR scope takes more than five minutes or the runner execution critical path exceeds eight minutes
- **THEN** the aggregate evidence SHALL report the target as unmet
- **AND** validation SHALL retain the original assertions, timeout, first-attempt outcome, and failure visibility

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the open base version and the
first-parent commit count of the exact selected `develop` commit, as
`<base>-dev.<count>`. Because the count rises with every merge to `develop`, a later
development publication SHALL sort above every earlier one under semantic-version
precedence regardless of the order in which pull requests were opened. The unique
merged pull-request number associated with that commit and the commit itself SHALL be
recorded in the published application and installer manifests as publication metadata
rather than in the version; a stable publication SHALL record its source commit the
same way. A stable version SHALL be derived from the tag of the published source-bound
Release and stamped only while packing. Neither version SHALL be committed before
publication. Between releases the repository SHALL declare one open prerelease
version.

After verified stable publication, trusted automation SHALL create one reopening
pull request whose single commit persists the exact published note and consistently
declares the next prerelease in the application manifest, root lockfile, and installer
manifest. It SHALL use then-current compatible `develop`, change no other paths, and never merge the pull request itself; integration belongs to the
release-reopening auto-merge manager.

#### Scenario: Several commits land in a row
- **WHEN** several commits are pushed to `develop`
- **THEN** no publication SHALL start from those pushes alone, and a later development request SHALL derive one preview from the then-authoritative source without a version commit

#### Scenario: An older pull request merges after a newer one
- **WHEN** pull request 828 merges into `develop` after pull request 835 was merged and published as `0.2.7-dev.1215`
- **THEN** the publication from the 828 merge commit SHALL be versioned with that commit's higher first-parent count, such as `0.2.7-dev.1218`, SHALL record pull request 828 in its manifests, and the `next` dist-tag SHALL move above `0.2.7-dev.1215`

#### Scenario: The publication client predicts the version
- **WHEN** the local publication client requests or verifies a development publication for a selected `develop` commit
- **THEN** it SHALL derive the same `<base>-dev.<count>` from that commit's first-parent count that the workflow stamps and SHALL report the associated pull request beside it

#### Scenario: A release is prepared for review
- **WHEN** `develop` declares `0.1.8-dev` and stable `0.1.8` is selected
- **THEN** preparation SHALL create the draft without committing either `0.1.8` or its note to `develop`

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version, a state release automation does not produce
- **THEN** development and stable publication SHALL refuse it until a reviewed PR restores one open prerelease identity

#### Scenario: A release reopens development
- **WHEN** stable `0.1.8` is published to npm from approved source declaring `0.1.8-dev`
- **THEN** trusted automation SHALL prepare one PR declaring `0.1.9-dev` and adding the exact published `docs/releases/0.1.8.md`
- **AND** development SHALL be reopened only when that PR is merged after required CI passes on its current head

#### Scenario: Develop advances during publication
- **WHEN** unrelated work advances `develop` before reopening is prepared
- **THEN** reopening SHALL use the then-current tip only when its package identity and open version remain compatible and the released note is absent
- **AND** it SHALL never rewrite or discard unrelated work

#### Scenario: Reopening work already exists
- **WHEN** the expected reopening branch or PR already exists
- **THEN** automation SHALL reuse it only if repository, state, base, head, single-parent commit, exact changed paths, versions, and approved-note digest all match and auto-merge is either absent or armed for squash
- **AND** conflicting work SHALL be preserved and refused rather than overwritten

### Requirement: Development reopens only after verified stable publication
Trusted automation SHALL prepare the next patch development version only after the
publication run has verified both exact npm packages, exercised the published pair,
uploaded the asset, and fast-forwarded `master` for the published source. It SHALL
use the version, source, and note digest that publication bound, and SHALL fail
rather than silently substitute a newer source SHA or regenerated note.

For released `x.y.z`, the reopening target SHALL be `x.y.(z+1)-dev`. Reopening SHALL
be reported complete only after its separate PR containing the next version and exact
approved note is merged. Failed or uncertain
publication SHALL not trigger reopening. Successful publication followed by
incomplete reopening SHALL be reported as two distinct outcomes without republishing
or altering immutable release records.

#### Scenario: Finish the current release cycle
- **WHEN** publication of stable `0.1.8` and its published note completes
- **THEN** trusted automation SHALL prepare a separate PR for `0.1.9-dev` plus `docs/releases/0.1.8.md`
- **AND** development SHALL be reported reopened only after that PR is merged

#### Scenario: Publication fails or remains uncertain
- **WHEN** stable publication fails, is cancelled, or cannot be confirmed
- **THEN** no next-development PR SHALL be created by that run and the run summary SHALL provide recovery guidance without claiming release success

#### Scenario: The publication source becomes stale
- **WHEN** the published tag does not point at the source bound to the prepared draft
- **THEN** publication SHALL stop with the mismatch and SHALL not publish a newly selected SHA without a fresh deliberate preparation

#### Scenario: Reopening is incomplete after publication
- **WHEN** `0.1.8` is confirmed published but the `0.1.9-dev` and note PR fails or is not merged
- **THEN** the outcome SHALL distinguish published `0.1.8` from pending development reopening and SHALL not republish, move its tag, or falsely report develop at `0.1.9-dev`

### Requirement: Maintainer release documentation matches the command
The root README release section SHALL present concise, accurate `npm run release --
patch`, `minor`, `major`, and exact-version preparation examples and SHALL NOT be
required to duplicate internal publication lifecycle or recovery prose. The release
runbook and applicable command help SHALL explain the target-required rule,
prerelease promotion, draft Release editing, candidate validation, native **Publish
release** as the only stable npm trigger, automatic return to draft before npm,
rerunning failed jobs after npm, publication-before-reopening order, next-development
version, the automatic squash merge of the reopening PR once required CI passes, and its manual-merge fallback. They SHALL NOT advertise a no-argument
release mode, the retired `--approve` form, a Save-draft handoff, waiting for npm
readiness, a pre-publication notes PR, or self-merging reopening.

A dependency-free semantic governance check SHALL validate the applicable contract
whenever the root README or release runbook changes, including documentation-only
pull requests. It SHALL reject malformed or
resolver-inaccurate command examples, missing operator safety gates, and retired
handoff instructions. Unrelated documentation changes SHALL not gain product builds
or broad product tests solely for this contract.

#### Scenario: Follow the README example
- **WHEN** a maintainer reads the root release section
- **THEN** `patch`, `minor`, `major`, and exact-version examples SHALL resolve to the documented stable targets and explain that choosing **Publish release** on the prepared draft publishes npm

#### Scenario: Read recovery guidance
- **WHEN** a maintainer needs preparation, validation, publication, reopening, or recovery behavior
- **THEN** the runbook SHALL state that a failure before npm returns the Release to draft, that a failure after npm is recovered by rerunning the same run's failed jobs, and that reopening follows confirmed publication, is squash-merged automatically once required CI passes, and is merged manually when that automation fails

#### Scenario: Documentation-only release commands drift
- **WHEN** a documentation-only pull request changes root release examples or the release runbook
- **THEN** lightweight semantic governance SHALL validate the changed contract and inaccurate examples, missing safety gates, or retired handoff instructions SHALL fail without broad product tests

### Requirement: Stable release notes are generated, editable, and manually accepted before publication
The release command SHALL resolve the previous verified stable release as an ancestor
of current authoritative `origin/develop`, enumerate uniquely associated merged pull
requests in that range, and deterministically generate one bounded user-facing body
for the selected stable target. It SHALL render escaped linked pull-request titles in
stable order under feature, fix, other-change, and breaking-change groups as
applicable while excluding release housekeeping. Version identity SHALL come from the
source-bound draft Release and target metadata rather than a redundant level-one
heading in the body. Missing, ambiguous, stale, or non-ancestral evidence SHALL stop
before draft or publication mutation.

The command SHALL create or safely reuse one unpublished draft GitHub Release bound
to the exact repository, target version, and authoritative source. A maintainer may
edit its body directly in the Releases UI. Native publication of that draft by an
authorized human SHALL be the acceptance of its body: trusted code SHALL snapshot the
published normalized body and digest and pack exactly that note.

Committed `docs/releases/*.md` files SHALL represent completed release history. The
stable package SHALL combine prior committed history with the published snapshot.
Publication SHALL require the package and the published Release to contain the same
body immediately before npm, and the reopening PR SHALL persist that
snapshot at `docs/releases/<target>.md` with the next-development version. Draft
creation, draft edits or saves, candidate validation, CI success, or automatic
integration SHALL NOT authorize npm publication.

#### Scenario: Prepare a stable release
- **WHEN** the maintainer selects stable `0.1.8` from current reviewed history after the previous stable ancestor
- **THEN** the command SHALL open an editable source-bound draft GitHub Release and start its validation without creating a notes PR

#### Scenario: Edit generated wording
- **WHEN** the maintainer changes headings or prose in the valid draft body and then publishes the draft
- **THEN** trusted publication SHALL validate and snapshot the edited Markdown for both package and GitHub Release content
- **AND** publishing unchanged generated wording SHALL also be accepted

#### Scenario: CI succeeds without manual merge
- **WHEN** the draft exists, is valid, and its candidate validation succeeded, but it has not been published
- **THEN** stable npm publication SHALL remain forbidden and no package, tag, public Release, or `master` movement SHALL occur

#### Scenario: The candidate changes outside release-note paths
- **WHEN** the published Release points at another source or target, is ambiguous, exceeds bounds, contains unsafe content, or differs from the snapshotted digest before npm
- **THEN** trusted publication SHALL reject it before npm without overwriting maintainer text and SHALL return the Release to draft

#### Scenario: Develop advances after review
- **WHEN** another change becomes authoritative `develop` after the draft was bound and before it is published
- **THEN** publication SHALL publish the bound source and its snapshot rather than retarget the draft to the newer tip

#### Scenario: Publication succeeds
- **WHEN** the exact approved source and published snapshot complete npm publication
- **THEN** the package and published GitHub Release SHALL contain the same approved body, and the reopening PR SHALL persist that body with the next-development version

## REMOVED Requirements

### Requirement: A failing pull request is the next piece of work
**Reason**: It prescribes how an agent orders its work while delivering; nothing in this repository implements it.
**Migration**: None. Delivery conduct is owned by the shared delivery workflow.

### Requirement: Development merges are gated by one required check
**Reason**: It restated the `develop`, `master`, and tag rulesets and the shared `delivery / Delivery check`, which the shared delivery workflow declares. What this repository's workflows do is kept.
**Migration**: See "Development validation publishes one required check".

### Requirement: A failed nightly regression proposes its fix
**Reason**: It mixed what the triage workflow does with shared-workflow readiness promotion and agent handoff rules.
**Migration**: See "Nightly regression triage opens a draft fix candidate"; complete-regression selection for such a candidate stays in "Repair and publishing pull requests select visible complete regression".

### Requirement: Pull-request validation waits for a reviewable candidate
**Reason**: It mixed this repository's readiness routing with the shared delivery workflow's promotion, finalization, and merge-authorization rules, in two overlapping requirements.
**Migration**: See "Development validation defers until a pull request is ready and finalized".

### Requirement: Final implementation validation remains attached to the pull request
**Reason**: It mixed this repository's readiness routing with the shared delivery workflow's promotion, finalization, and merge-authorization rules, in two overlapping requirements.
**Migration**: See "Development validation defers until a pull request is ready and finalized".

### Requirement: Independent development partitions do not serialize feedback
**Reason**: Two of its scenarios described manual review and the delivery lifecycle rather than validation behaviour; the remaining text is carried unchanged.
**Migration**: See "Development partitions run independently under one aggregate".

### Requirement: Feedback optimization is measured without weakening coverage
**Reason**: Its second paragraph and last scenario specified the acceptance procedure of a finished optimization; the reporting rules are carried unchanged.
**Migration**: See "Development validation reports timing without weakening coverage".

### Requirement: Release reopening pull requests integrate after validation
**Reason**: It described a release command that displays, waits for, and verifies the reopening pull request. The release command only prepares the draft Release; the reopening pull request is created by the stable publication workflow.
**Migration**: See "Release reopening pull requests are prepared by publication"; integration is specified by "Verified release reopening pull requests auto-merge" in `github-repository-governance`.
