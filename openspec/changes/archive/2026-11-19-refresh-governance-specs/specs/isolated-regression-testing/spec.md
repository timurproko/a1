## ADDED Requirements

### Requirement: Predecessor fixtures reuse the immediate predecessor's installation

Within one sequential predecessor fixture, the newest selected predecessor MAY retain its one npm-installed private prefix after materialization and warmup and use that same still-owned, previously unmodified tree for the applicable Windows protected-replacement assertion. Every other selected recent predecessor SHALL still execute its own published release code, and an explicitly declared historical bridge SHALL retain a separate exact npm installation. Installation reuse SHALL NOT reduce predecessor count, skip behavior, share mutable state between shards, run npm installations concurrently, increase deadlines, retry failures, or replace npm-produced topology with copied, linked, or manually extracted package trees.

#### Scenario: The immediate predecessor serves both compatibility assertions
- **WHEN** the newest selected predecessor has completed materialization and warmup from its npm-installed private prefix
- **THEN** the Windows direct protected-replacement case MAY consume that same fixture-owned unmodified installation
- **AND** the predecessor SHALL still perform its real replacement, launcher, activation, and callable-command behavior before the root is discarded

#### Scenario: Other predecessor identities are selected
- **WHEN** validation selects the remaining recent predecessors and the declared historical bridge
- **THEN** each distinct selected package SHALL retain its own exact npm installation and execute its own shipped release code
- **AND** retaining the immediate predecessor SHALL NOT satisfy or suppress another version's evidence

### Requirement: Windows Node 22 and Node 24 complete coverage runs outside ordinary pull requests
Nightly publication validation and stable candidate validation SHALL validate the exact package on Windows Node 22, Windows Node 24, Linux Node 24, and macOS Node 24. Scheduled and manually dispatched Full regression SHALL run the complete non-physical suite on both Windows runtimes, including first-attempt exact-package startup with Defender real-time protection enabled. A numbered development preview SHALL validate on the three Node 24 lanes only. A failed required lane SHALL block that workflow's publication.

#### Scenario: Scheduled nightly validation runs
- **WHEN** the nightly pipeline validates its selected exact package
- **THEN** Windows Node 24 and Node 22 SHALL both be required lanes
- **AND** failure of either SHALL block its publication

#### Scenario: Full regression is dispatched
- **WHEN** the Full regression workflow runs on schedule or by dispatch
- **THEN** it SHALL run both Windows runtimes with the complete non-physical suite

### Requirement: Regression oracles protect current behavior
A permanent regression test SHALL protect a current product, compatibility, or repository-policy contract through behavior, structured policy, or a hermetic fixture. It SHALL NOT depend on the continued active location of an OpenSpec change, reread one-time implementation or benchmark evidence as its runtime oracle, or require exact explanatory prose when equivalent wording preserves the contract. One-time planning, benchmark, and acceptance evidence SHALL NOT be a prerequisite of product test runs.

Tests for generators and evidence readers SHALL use temporary or versioned fixtures that exercise supported schemas and failure behavior. Tests for workflow guidance SHALL assert stable structured policy or executable launch behavior; exact text SHALL be required only when that text is itself a declared external contract.

#### Scenario: An OpenSpec change is archived
- **WHEN** a completed change moves from its active directory into a dated archive
- **THEN** permanent product and governance tests SHALL continue to pass without rewriting paths to that historical change

#### Scenario: Policy wording changes without changing meaning
- **WHEN** explanatory workflow text is shortened or rephrased while retaining the same structured or executable requirement
- **THEN** regression validation SHALL evaluate the retained semantic contract rather than an exact sentence
- **AND** a separately declared user-visible text contract, if any, SHALL remain exact

#### Scenario: Evidence tooling changes
- **WHEN** a generator, parser, or reader for evidence changes
- **THEN** hermetic fixtures SHALL prove supported schema, identity, bounds, and failure behavior
- **AND** the test SHALL not depend on mutable repository history or a particular prior change remaining active

#### Scenario: An isolated helper completes asynchronously
- **WHEN** a regression assertion depends on an owned child process adopting a prepared value
- **THEN** the fixture SHALL synchronize on the helper's structured completion event rather than use a generic polling deadline as completion authority
- **AND** the semantic assertion, failure behavior, and production timeout policy SHALL remain unchanged

#### Scenario: Resume behavior uses an exact package candidate
- **WHEN** resume integration validates launcher and UI behavior from exact packed candidate bytes
- **THEN** the fixture MAY prepare, certify, and activate those bytes through production release-store operations before starting the bounded public resume launch
- **AND** separate exact-package and first-attempt startup scopes SHALL retain cold materialization and startup authority
- **AND** resume readiness SHALL be polled with backoff to one generous hang bound, SHALL report the startup phases reached when that bound expires, and SHALL NOT be retried

## MODIFIED Requirements

### Requirement: Uncertified development previews are explicit
A preview published under npm tag `next` SHALL pass the fast tier, architecture
checks, and exact packed-candidate gates (package content, clean install, dependency
policy) on every supported platform. The complete suite is not required for a
preview. A preview SHALL NOT move `latest`, and SHALL NOT claim certified terminal
parity or platform support.

Preview publication SHALL start from the nightly schedule or an explicit development
dispatch of authoritative `develop`, never from a push alone, and SHALL need no separate
manual acceptance of the commit: what makes a commit publishable is that it passed the
required development check before it landed.

#### Scenario: Physical workers are unavailable
- **WHEN** a commit passes the required development check, merges, and no physical certification exists for it
- **THEN** its preview MAY publish without further acceptance, as an explicitly uncertified development preview

#### Scenario: Stable publication is requested
- **WHEN** a version would move `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version bytes on every supported platform first

### Requirement: Development startup validation uses one required Windows runtime lane
For non-draft pull requests into `develop` that are neither documentation-only nor version-only, ordinary Development scopes SHALL select first-attempt exact-package startup according to the complete trusted impact selection. An ordinary selected startup scope SHALL run exactly one Windows Node 22 startup lane and SHALL NOT schedule an additional Node 24 lane in that bounded scope. Manual invocation of Development validation SHALL retain the same ordinary startup runtime selection and conservative retained development scopes when no trusted comparison exists. Only a CI-created repair with valid failed-Full-regression provenance SHALL additionally execute the complete suite, including Windows Node 22 and Node 24, through its shared complete-regression matrix. This explicit full-suite exception SHALL not change ordinary scope cadence or supported Node runtimes.

The retained Node 22 startup scope SHALL preserve first-attempt exact-package startup checks, enabled Defender real-time protection, unchanged performance limits, isolation, assertions, failure semantics, and evidence artifacts. Image preparation, packaged image workers, and durable-history compatibility SHALL remain Node 22 impact-selectable ordinary scopes independent of startup timing. Package identity, layer reuse, cleanup backlog, and updater cancellation/loss scenarios SHALL retain explicit exact-package owners. Changed tests and support SHALL select all affected ordinary owners even without production changes. Full-regression and nightly/release compositions SHALL retain all extracted scenarios on their existing applicable platforms and runtimes.

Ordinary documentation-only, version-only, and draft exemptions SHALL remain unchanged except for the eligible generated repair's selected PR Full regression. Draft pull requests, including generated repair drafts, SHALL run no validation. No reduced startup smoke test SHALL replace the complete selected startup contract or weaken the required aggregate.

#### Scenario: Applicable code PR is validated
- **WHEN** a ready ordinary PR has startup impact and lacks valid generated failed-Full-regression repair provenance
- **THEN** exactly one Windows startup lane SHALL run on Node 22
- **AND** no Node 24 startup job SHALL be queued or required for that PR
- **AND** retained startup assertions SHALL execute without semantic retries or ignored failures

#### Scenario: Full regression is selected inside a PR
- **WHEN** trusted CI's App-created failed-Full-regression repair requires complete regression
- **THEN** its full matrix SHALL retain both Windows runtimes and the complete startup contract
- **AND** ordinary Node 22 success SHALL not exempt the selected full Node 24 result

#### Scenario: Release or validation-authority PR is evaluated
- **WHEN** an ordinary PR changes release, publication, build, workflow, configuration, shared-support, or validation-authority inputs
- **THEN** its applicable ordinary owners SHALL run without scheduling PR Full regression
- **AND** complete coverage SHALL remain available through scheduled/manual Full regression and nightly/stable release validation

#### Scenario: Exempt or draft PR is evaluated
- **WHEN** an unselected docs-only or version-only PR, or a planning-only draft, is evaluated
- **THEN** existing lightweight behavior SHALL be preserved without starting startup lanes unnecessarily

#### Scenario: Development validation is manually dispatched
- **WHEN** the maintainer invokes ordinary Development validation for a non-exempt source without a trusted impact comparison
- **THEN** its startup portion SHALL run on Windows Node 22 only and retained development compatibility scopes SHALL run
- **AND** complete Windows Node 24 coverage SHALL remain available through Full regression

#### Scenario: Startup is proven unrelated
- **WHEN** complete trusted classification proves a ready PR does not affect startup, no supporting input or invalidator changed, and generated-repair Full regression is unselected
- **THEN** the ordinary Node 22 startup job SHALL be explicitly unselected
- **AND** mandatory fast partitions and every other selected integration scope SHALL still gate the PR

#### Scenario: Image or history compatibility changes
- **WHEN** an image/history implementation, packaged worker, test, or shared dependency changes
- **THEN** all affected Node 22 compatibility owners SHALL execute independently of whether ordinary startup timing is selected
- **AND** any transitive startup impact SHALL still select startup validation

#### Scenario: Cleanup scenarios move out of the startup suite
- **WHEN** package cleanup or recovery scenarios receive separate suite ownership
- **THEN** their existing exact-package assertions, representative backlog sizes, failure cases, and full-validation platform/runtime coverage SHALL remain intact
- **AND** changes to those tests or their dependencies SHALL require their ordinary PR execution

### Requirement: Required PR validation remains fail closed after runtime deferral
The required development aggregate SHALL depend on successful current-head Node 22 startup validation whenever authoritative ordinary impact selection requires it. It SHALL not wait for Node 24 evidence when trusted policy proves complete regression unselected. When PR Full regression is selected, the aggregate SHALL additionally require its complete matrix, including Windows Node 24. It SHALL also require every selected image/history, exact-package, and governance scope. Failed, cancelled, missing, stale, or unexpectedly skipped required results SHALL NOT be accepted as successful validation. Unselected work SHALL be accepted only with complete trustworthy current-head selection explicitly proving it unnecessary; missing or invalid selection SHALL require conservative execution or block the aggregate. Nightly, independent dispatch, or earlier-head results SHALL NOT substitute for current PR checks. The named protected aggregate and all other mandatory gates SHALL remain in force.

#### Scenario: Required Node 22 startup succeeds
- **WHEN** Node 22 startup and every other required PR gate succeed and full regression is proven unselected
- **THEN** the aggregate MAY succeed without any Node 24 startup result

#### Scenario: Selected full runtime coverage fails
- **WHEN** ordinary Node 22 startup passes but a selected full Node 24 or other platform lane does not succeed
- **THEN** the protected aggregate SHALL remain unsuccessful

#### Scenario: Retained startup coverage does not succeed
- **WHEN** selected Node 22 startup fails, is cancelled, is missing, or is unexpectedly skipped
- **THEN** the required aggregate SHALL reject the result and integration SHALL remain blocked

#### Scenario: Previous or nightly startup evidence is green
- **WHEN** the current PR lacks successful selected validation but an earlier head or independent workflow passed
- **THEN** that other evidence SHALL NOT satisfy the PR's required aggregate

#### Scenario: A startup skip lacks authority
- **WHEN** startup is skipped without a valid current-head selection explicitly excluding it
- **THEN** the aggregate SHALL fail rather than infer irrelevance from the skip

#### Scenario: Selected compatibility coverage fails
- **WHEN** startup passes but a required package or image/history scope fails
- **THEN** the aggregate SHALL remain unsuccessful

### Requirement: Exact-package startup graph and latency are release-gated
Exact-package validation SHALL record the modules, files, evaluated bytes, and elapsed phases required from command invocation through first input-ready render for both interactive profiles. Evidence SHALL distinguish A1-owned startup code, documented Pi entry points, other dependency modules, process startup, runtime initialization, and rendering. The accepted baseline SHALL fail when an unapproved broad entry point or optional feature becomes eagerly reachable, even when aggregate time happens to remain within budget.

On the accepted Defender-enabled Windows runner, each supported Node lane SHALL execute post-update, restart-equivalent, and warm scenarios once without automatic retry. The budgets SHALL be the ones `src/foundation/startup/startup-budget.ts` declares, 2 seconds for post-update and warm launches and 2.5 seconds for restart-equivalent launches, and what an overrun does SHALL follow the enforcement mode the channel declares.

#### Scenario: Broad entry point enters the startup graph
- **WHEN** a change makes an unapproved barrel, command mode, optional workflow, or optional presentation module eagerly reachable before first input-ready render
- **THEN** deterministic graph validation SHALL fail with the introducing edge and affected module/file totals

#### Scenario: Startup graph grows within the elapsed budget
- **WHEN** loaded module count or evaluated bytes exceed the accepted startup baseline without an explicitly reviewed baseline change
- **THEN** validation SHALL fail even if elapsed startup remains below its time budget

#### Scenario: Startup exceeds its budget
- **WHEN** an exact packaged profile exceeds its applicable first-attempt budget
- **THEN** validation SHALL record the overrun with its dominant phases without retry
- **AND** the gate SHALL fail only where the enforcement mode is `fail`

#### Scenario: Deferred capability is exercised
- **WHEN** exact-package validation invokes a feature excluded from the eager graph
- **THEN** that feature SHALL load on demand and retain its supported behavior, diagnostics, and triggering interaction

#### Scenario: Generated startup artifact is packaged
- **WHEN** a candidate contains an A1-owned bundled or generated startup artifact
- **THEN** validation SHALL bind it to exact source and dependency identities and SHALL verify public Pi provenance, licenses, provider registration, extension compatibility, terminal identity, and runtime payload completeness

### Requirement: Exact-package startup performance is release-gated for update, restart-equivalent, and warm launches
The accepted Windows release runner SHALL measure command invocation through first input-ready frame for exact packaged `a1` and `a1 pi` launches. Evidence SHALL include a newly addressed cold release path, the first launch after completed update handling, a restart-equivalent launch of an approved active release in a fresh process, and a subsequent warm launch, with phase durations and immutable content identities. Each release-gating scenario SHALL execute once without automatic retry, and acceptance evidence SHALL demonstrate reliable margin on every supported Windows Node lane rather than relying on a preceding failed launch to warm the path.

The measured budgets SHALL be the interactive startup budgets declared by the A1 shell capability rather than separately restated numbers. Measurement SHALL be unconditional; enforcement SHALL depend on the declared channel. Windows Defender real-time protection SHALL be enabled before the first packaged launch of a measured scenario, and MAY be disabled while dependencies and the exact candidate are installed and extracted. Stable publication SHALL fail on an overrun. Nightly publication, complete regression, development previews, and the pull-request startup lane SHALL record every measurement, SHALL upload it as evidence next to the tier outcome, and SHALL NOT fail on an overrun; they SHALL be judged by the persistent-overrun verdict the A1 shell capability declares, which the nightly regression triage computes from the uploaded evidence of the three most recent consecutive `develop` runs of the same workflow, never from re-measurement, and proposes as a fix candidate. A launch that records no input-ready frame SHALL fail in every channel.

#### Scenario: First launch follows update
- **WHEN** an exact packaged update activates a release whose product path has not previously launched on the worker
- **THEN** both supported profile scenarios SHALL be measured against the declared post-update startup budget and record phase-level evidence

#### Scenario: Restart-equivalent launch is measured
- **WHEN** exact-package validation starts a fresh process for the approved active release while preserving its immutable release and durable certification
- **THEN** both supported profiles SHALL be measured against the declared restart-equivalent startup budget, evidence SHALL identify durable validation and UI child startup separately, and the accepted fast path SHALL perform no payload-wide file reads or hashes

#### Scenario: Restart evidence is invalid
- **WHEN** exact-package validation changes the certified release, dependency binding, managed path, or platform immutability evidence before a restart-equivalent launch
- **THEN** launch SHALL reject the restart fast path before executing selected release content and the gate SHALL observe safe fallback or failure

#### Scenario: Warm launch is measured
- **WHEN** the active release startup graph and dependency layer have already been warmed
- **THEN** both supported profile scenarios SHALL be measured against the declared warm startup budget

#### Scenario: Startup budget regresses
- **WHEN** bootstrap, UI child startup, module loading, services, resources, session creation, or first render causes any budget to be exceeded
- **THEN** the gate SHALL name the dominant measured phases and record the overrun
- **AND** stable publication SHALL fail before publication, while a recording channel SHALL succeed and SHALL be judged by the persistent-overrun verdict

#### Scenario: A launch never becomes input-ready
- **WHEN** a measured profile and launch kind records no input-ready frame
- **THEN** the gate SHALL fail in every channel regardless of its enforcement mode

#### Scenario: A retry would warm the failed path
- **WHEN** a first Node 22 or Node 24 exact-package startup attempt exceeds its budget
- **THEN** validation SHALL retain the failure and SHALL NOT rerun the scenario to obtain a warmed passing result

#### Scenario: Supported Windows Node lanes differ
- **WHEN** the same exact candidate passes a warm startup budget on one supported Windows Node version and fails it on another
- **THEN** acceptance SHALL remain blocked until phase-attributed evidence shows the slower supported lane meets the unchanged budget with reliable first-attempt margin

#### Scenario: Protection is enabled after installation
- **WHEN** a Windows validation lane installs its dependencies and extracts the exact candidate with real-time protection in the runner default state
- **THEN** protection SHALL be enabled before the first measured packaged launch
- **AND** the startup gate SHALL prove enabled protection from inside the measured run rather than from workflow order alone

#### Scenario: Protection is not enabled at launch
- **WHEN** the startup gate observes real-time protection disabled when it begins measuring
- **THEN** the gate SHALL fail in every channel before recording a measurement

#### Scenario: The trend window is incomplete
- **WHEN** fewer than three consecutive `develop` measurements exist for a lane, profile, and launch kind because a lane, workflow, or artifact is new or expired
- **THEN** the verdict for that key SHALL be insufficient evidence, never a regression

## REMOVED Requirements

### Requirement: Development publication records startup budget evidence
**Reason**: It stated that nightly publication and complete regression fail on a startup overrun; both run in `record` mode. The recording behaviour is specified once elsewhere.
**Migration**: See "Startup budget enforcement is declared per channel" in `continuous-integration` and "Exact-package startup performance is release-gated for update, restart-equivalent, and warm launches".

### Requirement: Nightly recovery is proven by numbered merged-package evidence
**Reason**: It defined the completion criteria of one finished nightly recovery effort, including when its change could be archived.
**Migration**: None.

### Requirement: Published-predecessor evidence avoids duplicate exact installations
**Reason**: Its first paragraph had the predecessor owner consume the package shard's installation; the `predecessor` shard prepares and verifies its own, as "Published predecessor subprocess waits preserve runner responsiveness" states.
**Migration**: See "Predecessor fixtures reuse the immediate predecessor's installation".

### Requirement: Deferred Windows Node 24 coverage remains mandatory outside ordinary PR validation
**Reason**: It was written as the acceptance of a past cadence change, including a handoff disclosure.
**Migration**: See "Windows Node 22 and Node 24 complete coverage runs outside ordinary pull requests".

### Requirement: Durable regression oracles protect current behavior
**Reason**: It specified how OpenSpec finalization and audits validate one-time evidence, which this repository does not perform; the rules for tests are carried.
**Migration**: See "Regression oracles protect current behavior".
