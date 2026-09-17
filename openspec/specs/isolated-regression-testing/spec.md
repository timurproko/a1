# Isolated Regression Testing Specification

## Purpose

Defines independent, isolated validation for A1 lifecycle, updates, transparent terminal policy, exact package artifacts, and confirmed regressions.

## Requirements

### Requirement: Scenarios run in hermetic instances
Automated scenarios SHALL isolate application state, supervisor storage, runtime paths, Pi configuration, endpoints, environment, artifacts, and owned process trees from user state and from concurrent scenarios. An operating-system-boundary fixture SHALL supply controlled results at the acquisition boundary actually selected on its native platform, including command-based fallbacks, and SHALL NOT access the host clipboard or require an interactive clipboard service. Successful and failing scenarios SHALL await verified completion of their owned executors before releasing fixture state or asserting capacity in subsequent scenarios.

#### Scenario: Run scenarios concurrently
- **WHEN** two scenarios execute at the same time
- **THEN** neither SHALL discover, control, or mutate the other's state or processes

#### Scenario: User configuration exists
- **WHEN** a machine contains normal Pi settings, extensions, sessions, and credentials
- **THEN** a hermetic scenario SHALL not load or mutate them unless explicitly supplied as identified input

#### Scenario: Clipboard acquisition uses a platform command
- **WHEN** a hermetic clipboard regression runs on a platform whose text acquisition uses operating-system commands instead of a native text adapter
- **THEN** the fixture SHALL intercept that command boundary without invoking the host clipboard
- **AND** the real helper protocol and downstream classification SHALL process the controlled result
- **AND** supplied text, successful empty acquisition, denied acquisition, and supported fallback SHALL retain their distinct production outcomes
- **AND** an unexpected acquisition operation SHALL fail the fixture rather than escape to an uncontrolled host service

#### Scenario: Cold packaged clipboard acquisition executes
- **WHEN** the packaged clipboard regression runs emitted helper and worker entries
- **THEN** it SHALL retain the same controlled acquisition semantics and exact independent payload assertions as the source regression
- **AND** fixture interception SHALL NOT replace the emitted helper or classification behavior with a self-generated success response

#### Scenario: A clipboard assertion fails before executor shutdown
- **WHEN** a clipboard regression rejects before its owned executor has stopped
- **THEN** teardown SHALL cancel if necessary and await that executor's completion even on the failure path
- **AND** the original failure SHALL remain visible without leaking executor capacity, owned processes, or fixture state into a later scenario
- **AND** assertions about configured executor capacity SHALL NOT be reduced to accommodate leaked state

### Requirement: Physical-host automation is isolated from the user's desktop
Any automation that launches, focuses, drives, resizes, captures, or closes a terminal window, injects operating-system input, changes interactive desktop state, or cleans up terminal processes SHALL execute only inside a dedicated disposable worker or virtual machine with an exclusive test desktop and no user-owned applications. Isolation SHALL be verified before process launch, and cleanup SHALL target only exact recorded process/start identities.

#### Scenario: Safe isolation is unavailable
- **WHEN** a physical-host scenario cannot prove dedicated worker and exclusive-desktop ownership
- **THEN** it SHALL return a blocked or skipped verdict without launching a terminal, injecting input, or changing the desktop

#### Scenario: Development workstation is active
- **WHEN** an agent invokes a physical gate from a workstation containing the user's applications
- **THEN** that workstation MAY only submit a non-interactive job to an already isolated worker and SHALL NOT host the automated terminal workload

#### Scenario: Physical cleanup runs
- **WHEN** an isolated physical scenario finishes or times out
- **THEN** cleanup SHALL stop only its exact recorded process tree and SHALL leave every pre-existing or unverified process untouched

### Requirement: Transparent validation is manual-first
After non-desktop structural, lifecycle, and integration gates pass, A1 SHALL provide an exact candidate and checklist for the user to launch, interact with, and close manually. The checkpoint SHALL NOT automate terminal launch, focus, input, resize, closure, or workstation process cleanup.

#### Scenario: Candidate becomes manually testable
- **WHEN** transparent implementation and non-desktop checks are complete
- **THEN** A1 SHALL provide exact build/install/launch steps and checks for rendering, input, selection, mouse, resize, exit, and parent-shell usability without starting it automatically

#### Scenario: Manual regression is reported
- **WHEN** the user reports a failure
- **THEN** A1 SHALL preserve the finding, correct it, and repeat affected non-desktop and manual checks

### Requirement: Uncertified development previews are explicit
A preview published under npm tag `next` SHALL pass the fast tier, architecture
checks, and exact packed-candidate gates (package content, clean install, dependency
policy) on every supported platform. The complete suite is not required for a
preview. A preview SHALL NOT move `latest`, and SHALL NOT claim certified terminal
parity or platform support.

Preview publication SHALL follow from a push rather than from manual acceptance:
what makes a commit publishable is that it passed the required development check
before it landed.

#### Scenario: Physical workers are unavailable
- **WHEN** a commit passes the required development check, merges, and no physical certification exists for it
- **THEN** its preview MAY publish without further acceptance, as an explicitly uncertified development preview

#### Scenario: Stable publication is requested
- **WHEN** a version would move `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version bytes on every supported platform first

### Requirement: Architecture-independent tests survive terminal changes
Domain, storage, release-cohort, update-transaction, protocol, package identity, dependency-policy, and non-terminal lifecycle tests SHALL remain mandatory when they express current contracts rather than retired implementation assumptions.

#### Scenario: A terminal implementation is removed
- **WHEN** obsolete renderer, mode, input, or simulator code is deleted
- **THEN** architecture-independent tests SHALL continue validating their owned contracts without importing retired modules

### Requirement: Stable transparent acceptance uses independent physical evidence
Claims of certified terminal parity or platform support SHALL rest on comparing
transparent rendering, character presentation, input identity, selection, clipboard,
scrollback, mouse, resize, modes, latency, exit, and restoration against direct
execution through actual supported host-terminal behavior. A test encoder, emulator,
or A1 terminal model SHALL NOT be the sole oracle.

Physical evidence governs what A1 may claim, not whether a version may be published.
Where no physical evidence exists for a platform, that platform SHALL remain
uncertified and A1 SHALL NOT represent it as supported — and a release MAY still
publish, because withholding releases for evidence no machine produces protects
nobody.

#### Scenario: Physical certification is attempted
- **WHEN** direct and transparent workloads are compared on a supported platform
- **THEN** evidence SHALL originate from isolated native host actions, child effects, physical observations, exact process identity, and exact packaged bytes

#### Scenario: One generic workload fails
- **WHEN** Native Pi passes but another application-independent workload exposes a terminal difference
- **THEN** the capability and platform SHALL remain uncertified

#### Scenario: No physical worker exists
- **WHEN** a platform has no physical evidence at all
- **THEN** that platform SHALL remain uncertified and unclaimed, and publication SHALL NOT be blocked on it

### Requirement: Raw relay is not an implicit transparent fallback
A raw PTY relay SHALL NOT replace selected direct attachment unless a future change establishes a mandatory PTY-ownership constraint and independently proves complete physical parity.

#### Scenario: No mandatory PTY constraint exists
- **WHEN** direct attachment satisfies the selected single-foreground lifecycle
- **THEN** A1 SHALL not add a raw relay, parser, input translation, or shadow terminal authority

### Requirement: Packaged candidates validate exact publication artifacts
Every publication SHALL pack once, SHALL bind the packed bytes to the source commit
and the version they carry by digest, and SHALL upload exactly those bytes. The
digest SHALL be re-checked after validation and before upload, so what was tested
and what is published are known to be the same bytes.

What separates a preview from a release SHALL remain observable where it is
consulted: the npm tag the version is published under. A preview SHALL NOT move
`latest`. A declared certification status SHALL NOT be required of a publication,
because nothing consumes one.

#### Scenario: Candidate bytes change
- **WHEN** the package digest differs between validation and publication
- **THEN** publication SHALL fail before contacting the registry

#### Scenario: Uncertified preview is packed
- **WHEN** a preview is packed and published
- **THEN** it SHALL be published under the `next` tag and SHALL leave `latest` where it was

### Requirement: Update transitions remain release-gating scenarios
Stable release gates SHALL exercise exact target resolution, verified owned-process shutdown, mutable-package unlock, single-pass immutable materialization, certification, activation, endpoint verification, transaction recovery, rollback, and clean process exit without manual PID or state deletion. Release evidence SHALL record phase durations and payload read/write counts for the exact packaged updater. On the accepted Windows release runner, the representative unchanged-dependency preview fixture of at least 10,000 payload files SHALL complete post-npm materialization through verified activation within 30 seconds and SHALL perform no more than one complete source-payload read and one candidate-payload write for a new release.

#### Scenario: Update is interrupted
- **WHEN** a fault occurs at a durable update phase
- **THEN** rerunning the command SHALL converge to one verified active or rollback cohort

#### Scenario: Representative preview update is measured
- **WHEN** the exact packaged updater replaces a preview whose dependency versions are unchanged on the accepted Windows release runner
- **THEN** evidence SHALL show post-npm verified activation completes within 30 seconds without a complete post-copy certification read

#### Scenario: Performance budget regresses
- **WHEN** the measured fixture exceeds the time or payload-pass budget
- **THEN** stable release gating SHALL fail with phase timing and file-operation diagnostics

#### Scenario: Packaged update completes
- **WHEN** the exact packaged update transition reports success or failure
- **THEN** the updater process SHALL exit cleanly and return control to the invoking terminal without requiring `Ctrl+C`

### Requirement: A1 releases contain no deprecated dependencies
The exact production, development, build, test, optional, and native dependency graph SHALL contain no package marked deprecated by its registry.

#### Scenario: A transitive dependency is deprecated
- **WHEN** registry metadata marks a reachable dependency deprecated
- **THEN** packaging and publication SHALL fail with its dependency path

### Requirement: Confirmed regressions receive architecture-appropriate coverage
A confirmed regression SHALL gain the smallest independent current-contract test capable of detecting its cause. Physical-only behavior SHALL remain at the physical/integration boundary instead of being duplicated by a self-modelled simulation. A subprocess-directory regression SHALL distinguish filesystem identity from lexical path spelling while retaining exact argument and environment contracts; alias acceptance SHALL NOT admit execution in a different directory. Diagnostic evidence for a failing native regression SHALL be bounded, preserve the original result, identify observed phase or operation timing where available, and exclude private payloads. Test-fixture corrections SHALL retain existing deadlines, independent assertions, real exercised operations, and failure-safe ownership; diagnostic instrumentation or isolated success SHALL NOT itself count as recovery.

#### Scenario: Regression belongs to deterministic logic
- **WHEN** a defect is isolated to domain, storage, protocol, release, or update behavior
- **THEN** A1 SHALL add a focused deterministic test and pass its containing gate

#### Scenario: Regression crosses the physical boundary
- **WHEN** a rendering or input defect cannot be represented independently in a unit test
- **THEN** A1 SHALL retain it for isolated physical or exact-package integration certification

#### Scenario: A temporary path names an aliased directory
- **WHEN** a subprocess starts in a requested directory whose lexical spelling differs from the platform's reported canonical path
- **THEN** the regression SHALL verify that the child actually uses the independently identified requested directory
- **AND** equivalent aliases SHALL pass while a distinct-directory negative control SHALL fail
- **AND** exact arguments, space-containing paths, and environment-isolation assertions SHALL remain enforced

#### Scenario: Asynchronous shell paste misses its assertion deadline
- **WHEN** a native shell regression retains a pending image or fails to apply the expected clipboard fallback before its existing deadline
- **THEN** diagnosis SHALL distinguish observed acquisition, preparation, completion, and cleanup phases without disclosing clipboard contents
- **AND** correction SHALL retain real asynchronous completion, exact image/text and submission assertions, and the original wait/test limits
- **AND** teardown SHALL release the scenario's owned shell work even when the assertion fails
- **AND** a longer wait, synthetic completion, or an isolated passing rerun SHALL NOT substitute for a verified correction

#### Scenario: Real Git release validation exceeds its deadline
- **WHEN** a release-workflow regression using isolated real repositories exceeds its existing test limit
- **THEN** bounded operation timing and counts SHALL preserve the original failure and the real Git-backed workflow outcome
- **AND** fixture correction SHALL retain independently verified source/version identities, manual integration gates, publication ordering, and dirty/unrelated state protections
- **AND** real operations SHALL NOT be replaced with fabricated answers, stale cached assertions, shared mutable fixtures, omitted checks, or work shifted outside the measured scenario
- **AND** the existing deadline SHALL remain enforced

### Requirement: Changed tests pass in pull-request validation
A retained or newly added pull-request-eligible test SHALL pass in the pull-request validation of continuous integration before its change is integrated. A changed exhaustive-only test SHALL receive focused deterministic contract validation in the pull request, SHALL be recorded as cadence-deferred, and SHALL remain mandatory in Full regression and nightly/release validation. Local execution is an optional debugging aid, not a completion gate.

#### Scenario: Pull-request validation passes
- **WHEN** continuous integration validates the pull request containing changed pull-request-eligible tests
- **THEN** every selected changed test SHALL pass before the change MAY be integrated
- **AND** no local suite execution SHALL be required

#### Scenario: Exhaustive-only test changes
- **WHEN** a pull request changes a test whose declared cadence is exhaustive
- **THEN** pull-request validation SHALL run its focused deterministic contract coverage and report the exhaustive test as cadence-deferred
- **AND** the exhaustive test SHALL remain required in Full regression and nightly/release validation without reduced assertions

### Requirement: Resource-sensitive regressions avoid shared runner contention
Automated tests that repeatedly create repositories, launch subprocesses, mutate temporary storage, or coordinate release processes SHALL be eligible for a declared resource-sensitive execution class. Tests in that class SHALL run one file at a time in one serial process under the partition's explicit hang bound rather than sharing the parallel fast-test worker pool. Classification SHALL be reviewed configuration, SHALL be applied consistently across supported platforms, and SHALL not suppress output, remove assertions, or authorize retries of semantic failures. The hang bound SHALL be a fixed explicit value shared with the other explicit fast-tier invocations, not a per-test allowance that grows to fit a slow test. Repeated isolated evidence SHALL expose available fixture and subprocess timing and SHALL name every test body above five seconds, and a test that stays on that list SHALL be optimized rather than accommodated. Tests not assigned to the class SHALL retain the ordinary fast scheduler unless another declared isolation contract applies.

#### Scenario: A repeated contention timeout is confirmed
- **WHEN** evidence shows a process- or filesystem-intensive fast test passes independently but intermittently times out while sharing the parallel runner
- **THEN** the test MAY be assigned to the resource-sensitive class with its evidence recorded
- **AND** its assertions and fail-closed outcome SHALL remain unchanged

#### Scenario: Resource-sensitive tests execute
- **WHEN** multiple tests in the resource-sensitive class are selected
- **THEN** their files SHALL execute without file parallelism in one process under the explicit hang bound
- **AND** no selected file SHALL execute more than once

#### Scenario: Serialization is insufficient
- **WHEN** a resource-sensitive test body stays above five seconds during repeated isolated execution
- **THEN** its setup and subprocess phases SHALL be measured and optimized
- **AND** the test SHALL NOT receive its own larger bound or an automatic retry

#### Scenario: An ordinary test is not resource-sensitive
- **WHEN** a fast test has no declared resource-sensitive ownership and no other isolation requirement
- **THEN** it SHALL remain in the ordinary parallel remainder

### Requirement: Release retention and cleanup receive exact-state regression coverage
Release validation SHALL exercise bounded retention migration, live superseded cohorts, rollback protection, active update transactions, external holds, interrupted cleanup, malformed paths, stale candidates, worker continuation and observability, fair retry scheduling, legacy Windows path casing, and production-shaped historical backlogs in isolated data and runtime roots.

#### Scenario: Large legacy retention set is migrated
- **WHEN** an isolated exact-package fixture contains at least forty valid historical releases and a production-representative payload backlog under append-only retention with one active release, one rollback release, and one older live cohort
- **THEN** one update SHALL preserve exactly the protected releases, detach every other known release, return without waiting for full deletion, and cause release count and disk usage to converge without a second user command

#### Scenario: One batch cannot drain the backlog
- **WHEN** item or duration limits stop a cleanup batch while ordinary eligible work remains
- **THEN** the packaged worker SHALL continue or schedule another bounded batch until that work is complete

#### Scenario: Preparation exceeds a batch duration
- **WHEN** injected discovery, ownership, or durable-state preparation time exceeds the configured batch duration before any item is attempted
- **THEN** the worker SHALL still attempt at least one eligible item and later batches SHALL converge

#### Scenario: Cleanup is interrupted at each durable boundary
- **WHEN** fault injection stops cleanup before state detachment, after detachment, after trash movement, during recursive deletion, or at worker startup and continuation boundaries
- **THEN** automatic resumption SHALL converge without a dangling selector, deletion outside the managed store, or loss of a protected release

#### Scenario: Worker execution fails before an item attempt
- **WHEN** the packaged cleanup entry cannot import or its worker fails at top level
- **THEN** durable evidence SHALL identify the incomplete run and every planned item SHALL remain safely retryable

#### Scenario: Update and launch race with cleanup
- **WHEN** isolated update, launch, cohort-retirement, and duplicate maintenance scheduling operations overlap
- **THEN** every verified live or selected release SHALL remain executable, one physical cleanup owner SHALL operate per data root, and every obsolete release SHALL remain safely retryable

#### Scenario: One item remains persistently blocked
- **WHEN** one obsolete item repeatedly fails while other release and artifact classes remain eligible
- **THEN** bounded retries SHALL preserve diagnostics for the blocked item while the other eligible work continues to completion

#### Scenario: Windows holds an obsolete file temporarily
- **WHEN** exact-package cleanup encounters a temporary Windows sharing or antivirus lock
- **THEN** the operation SHALL remain bounded, preserve retry state and diagnostics, allow unrelated work to progress, and succeed after the lock is released

#### Scenario: Legacy managed paths differ only by Windows casing
- **WHEN** a migrated release record or certification path uses legacy casing for the same managed Windows directory
- **THEN** cleanup SHALL accept the canonical managed identity, delete only the obsolete contained artifact, and preserve unrelated paths

### Requirement: Development startup validation uses one required Windows runtime lane
For non-draft pull requests into `develop` that are neither documentation-only nor version-only, Development validation SHALL select first-attempt exact-package startup according to the complete trusted impact selection. A selected startup scope SHALL run exactly one Windows Node 22 startup lane and SHALL NOT schedule a Windows Node 24 PR startup lane. Manual invocation of Development validation SHALL use the same startup runtime selection and SHALL run the retained development scopes conservatively when no trusted change comparison exists. This is a validation-cadence decision, not removal of Node 24 runtime support or of tests from their retained scopes.

The retained Node 22 startup scope SHALL preserve first-attempt exact-package startup checks, enabled Defender real-time protection, unchanged performance limits, isolation, assertions, failure semantics, and evidence artifacts. Image preparation, packaged image workers, and durable-history compatibility SHALL remain Node 22 impact-selectable PR scopes independent of startup timing. Package identity, layer reuse, cleanup backlog, and updater cancellation/loss scenarios SHALL retain explicit exact-package owners instead of running solely because startup timing was selected. Changed tests and support SHALL select all affected owners even without production changes. Full-regression and nightly/release compositions SHALL retain all extracted scenarios on their existing applicable platforms and runtimes.

Documentation-only and version-only exemptions and draft behavior SHALL remain unchanged. This change SHALL not introduce a reduced startup smoke test in place of the complete selected startup contract or weaken the required aggregate.

#### Scenario: Applicable code PR is validated
- **WHEN** a ready code/operational PR has classified startup impact
- **THEN** exactly one Windows startup lane SHALL run on Node 22
- **AND** no Node 24 startup job SHALL be queued or required for that PR
- **AND** all retained startup assertions SHALL execute without semantic retries or ignored failures

#### Scenario: Exempt or draft PR is evaluated
- **WHEN** a PR is documentation-only, version-only, or draft
- **THEN** the existing applicable validation and startup-skip behavior SHALL be preserved rather than starting either startup lane unnecessarily

#### Scenario: Development validation is manually dispatched
- **WHEN** the maintainer invokes Development validation for a non-exempt source without a trusted impact comparison
- **THEN** the startup portion SHALL run on Windows Node 22 only and all retained development compatibility scopes SHALL run
- **AND** full Windows Node 24 validation SHALL remain available through the separate Full regression workflow

#### Scenario: Startup is proven unrelated
- **WHEN** complete trusted classification proves a ready PR does not affect startup and no startup test, supporting input, or invalidator changed
- **THEN** the Node 22 startup job SHALL be explicitly unselected
- **AND** mandatory fast partitions and every other selected integration scope SHALL still gate the PR

#### Scenario: Image or history compatibility changes
- **WHEN** an image/history implementation, packaged worker, test, or shared dependency changes
- **THEN** all affected Node 22 compatibility owners SHALL execute independently of whether startup timing is selected
- **AND** any transitive startup impact SHALL still select startup validation

#### Scenario: Cleanup scenarios move out of the startup suite
- **WHEN** package cleanup or recovery scenarios receive separate suite ownership
- **THEN** their existing exact-package assertions, representative backlog sizes, failure cases, and full-validation platform/runtime coverage SHALL remain intact
- **AND** changes to those tests or their dependencies SHALL require their PR execution

### Requirement: Required PR validation remains fail closed after runtime deferral
The required development aggregate SHALL depend on successful current-head Node 22 startup validation whenever the authoritative impact selection requires it, without waiting for a Node 24 PR startup result. It SHALL also require every selected image/history, exact-package, and containment scope. A failed, cancelled, missing, or unexpectedly skipped required result SHALL NOT be accepted as successful validation. An unselected startup result SHALL be accepted only with a complete trustworthy current-head selection explicitly proving it unnecessary; missing or invalid selection SHALL require conservative execution or block the aggregate. Nightly or earlier-head results SHALL NOT substitute for current-head PR checks. The named protected-branch aggregate and every other selected or mandatory gate SHALL remain in force.

#### Scenario: Required Node 22 startup succeeds
- **WHEN** current-head Node 22 startup and every other selected required PR gate succeed
- **THEN** the aggregate SHALL be able to succeed without any Node 24 PR startup result

#### Scenario: Retained startup coverage does not succeed
- **WHEN** a PR's selected Node 22 startup job fails, is cancelled, is missing, or is unexpectedly skipped
- **THEN** the required aggregate SHALL reject the result and integration SHALL remain blocked

#### Scenario: Previous or nightly startup evidence is green
- **WHEN** the current PR head lacks successful selected validation but an earlier head or nightly run passed
- **THEN** that other evidence SHALL NOT satisfy the PR's required aggregate

#### Scenario: A startup skip lacks authority
- **WHEN** a startup job is skipped without a valid current-head selection explicitly excluding it
- **THEN** the aggregate SHALL fail rather than infer irrelevance from the skip

#### Scenario: Selected compatibility coverage fails
- **WHEN** startup passes but a required extracted package, image/history, or containment scope fails
- **THEN** the aggregate SHALL remain unsuccessful

### Requirement: Deferred Windows Node 24 coverage remains mandatory outside ordinary PR validation
The existing scheduled nightly/release validation pipeline SHALL retain Windows Node 24 and Node 22, including first-attempt exact-package startup coverage with Defender enabled and unchanged budget, artifact-identity, and publication-gating rules. Manual Full regression SHALL retain both Windows runtimes and the complete existing non-physical suite. The tests currently run in the Node 24 PR startup job SHALL remain covered through the existing full-validation owners; this change SHALL NOT delete or weaken startup, image, history, or packaged-worker tests.

No additional release may be published on the strength of the reduced PR matrix alone when the publication's own required validation is incomplete or failing. The existing nightly schedule, supported-platform matrix, release modes, and permission boundaries SHALL remain unchanged.

#### Scenario: Scheduled nightly validation runs
- **WHEN** the existing nightly pipeline validates its selected exact package
- **THEN** Windows Node 24 and Node 22 SHALL retain their required validation with the original assertions and startup limits
- **AND** failure of either required lane SHALL block its publication under the existing policy

#### Scenario: Maintainer requests full validation before nightly
- **WHEN** the Full regression workflow is manually dispatched
- **THEN** it SHALL retain both Windows runtimes and the current complete non-physical validation, including the deferred Node 24 coverage

#### Scenario: Cadence change is accepted
- **WHEN** the reduced PR startup matrix is delivered for acceptance
- **THEN** evidence SHALL identify a current-head PR run with only Node 22 startup, its successful aggregate, and retained Node 24 full-validation run evidence
- **AND** workflow policy tests SHALL guard both the reduced PR selection and the preserved full-validation coverage
- **AND** the handoff SHALL disclose that Node-24-specific regressions may be detected only after integration rather than claiming equivalent pre-merge runtime coverage

### Requirement: Shortcut help regression evidence respects platform presentation
Shortcut-help regression checks SHALL distinguish the configured binding identity from its platform-specific visible label. Checks SHALL retain live override, unbound-command fallback, and pinned-profile coverage rather than accepting arbitrary labels or changing runtime presentation to satisfy a host-specific expectation.

#### Scenario: A live model-selection override uses Alt
- **WHEN** the effective model-selection binding is changed to `alt+m` after the startup header is created
- **THEN** the regression check SHALL require the refreshed header to display `option+m` on macOS and `alt+m` on Windows and Linux
- **AND** the logical binding SHALL remain `alt+m`

#### Scenario: Model selection is unbound
- **WHEN** the owned profile has no effective model-selection shortcut
- **THEN** the regression check SHALL require the `/model` fallback rather than an invented keybinding

### Requirement: Repeated event-frame diagnostics are deterministic and actionable
Repeated scripted terminal-frame diagnostics SHALL capture identical structured state and normalized frame bytes for the same declared workload, independent of opposing ambient color capabilities and host scheduling variation. Workloads SHALL explicitly control their relevant capture inputs and boundaries and restore test-owned global state and scheduled work on success or failure. Normalization SHALL remain limited to the already declared portability envelopes; semantic ANSI, reset boundaries, row payloads, geometry, cursor addressing, clearing order, and event stages SHALL remain strict. A diagnostic fixture SHALL NOT replace independent pinned-versus-owned parity authority.

#### Scenario: Equivalent captures are repeated
- **WHEN** the same declared truecolor workload is captured repeatedly under truecolor and 256-color ambient capabilities
- **THEN** every capture SHALL produce the same diagnostic hash and preserve all declared stages
- **AND** scheduling delays between captures SHALL NOT change workload evidence

#### Scenario: Captures diverge
- **WHEN** repeated equivalent captures produce different structured results
- **THEN** validation SHALL fail and report the repetition, ambient mode, first differing state or frame stage, and a bounded escaped difference sufficient to locate the mismatch
- **AND** it SHALL NOT accept multiple hashes, retry until one passes, strip semantic ANSI, or regenerate a baseline to conceal unexplained divergence

#### Scenario: Capture fails or is disposed
- **WHEN** a capture succeeds or throws
- **THEN** its capability, theme, clock, or scheduler overrides SHALL be restored as applicable and its owned timers and resources SHALL be disposed before the next workload

### Requirement: Exact-package gates prove launcher continuity across cancellation
Release validation SHALL exercise the physical global package and launcher boundary with an exact packed candidate. It SHALL inject cancellation, updater loss, and npm failure before package mutation and after each observable launcher-removal, package-replacement, launcher-creation, and transaction boundary. Every case SHALL prove the complete platform launcher set is callable, recovery uses one verified owner, the prior immutable cohort remains protected until target activation, and rerunning `a1` converges without manual repair.

#### Scenario: Windows launcher replacement is interrupted
- **WHEN** validation interrupts replacement around the shell, command, and PowerShell launcher mutations
- **THEN** `a1`, `a1.cmd`, and `a1.ps1` SHALL all be restored or verified before cancellation is acknowledged and each SHALL resolve through the same verified recovery disposition

#### Scenario: Unix launcher replacement is interrupted
- **WHEN** validation interrupts replacement around the executable launcher mutation on Linux or macOS
- **THEN** the launcher SHALL be restored or verified as executable before cancellation is acknowledged

#### Scenario: Invoking updater is terminated
- **WHEN** validation terminates the updater after it delegates replacement but before npm completes
- **THEN** the detached recovery owner SHALL establish a callable launcher and a subsequent invocation SHALL converge without manual npm installation

#### Scenario: Recovery evidence is corrupted
- **WHEN** validation changes a capsule identity, path, payload digest, transaction identity, or worker identity
- **THEN** recovery SHALL fail closed without executing the changed payload or overwriting launchers outside the canonical global npm bin root

#### Scenario: Cancellation regression removes the command
- **WHEN** any tested cancellation or process-loss point leaves a launcher absent, non-executable, bound to incomplete content, or dependent on manual cleanup
- **THEN** release validation SHALL fail before publication

### Requirement: Exact-package startup performance is release-gated
The accepted Windows release runner SHALL measure command invocation through first input-ready frame for exact packaged `a1` and `a1 pi` launches. Evidence SHALL include a newly addressed cold release path, the first launch after completed update handling, a launch of an approved active release after its supervisor has stopped, and a subsequent warm launch, with phase durations and immutable content identities. Each release-gating scenario SHALL execute once without automatic retry, and acceptance evidence SHALL demonstrate reliable margin on every supported Windows Node lane rather than relying on a preceding failed launch to warm the path.

The measured budgets SHALL be the interactive startup budgets declared by the A1 shell capability rather than separately restated numbers. Measurement SHALL be unconditional; enforcement SHALL depend on the declared channel. Windows Defender real-time protection SHALL be enabled before the first packaged launch of a measured scenario, and MAY be disabled while dependencies and the exact candidate are installed and extracted. Nightly publication, stable publication, and complete regression SHALL fail on an overrun. A launch that records no input-ready frame SHALL fail in every channel.

#### Scenario: First launch follows update
- **WHEN** an exact packaged update activates a release whose product path has not previously launched on the worker
- **THEN** both supported profile scenarios SHALL be measured against the declared post-update startup budget and record phase-level evidence

#### Scenario: Restart-equivalent launch has no live supervisor
- **WHEN** exact-package validation stops the active release's supervisor while preserving its approved immutable release and durable certification
- **THEN** both supported profiles SHALL be measured against the declared no-live-supervisor startup budget, evidence SHALL identify durable validation and replacement-supervisor startup separately, and the accepted fast path SHALL perform no payload-wide file reads or hashes

#### Scenario: Restart evidence is invalid
- **WHEN** exact-package validation changes the certified release, dependency binding, managed path, or platform immutability evidence while no supervisor is live
- **THEN** launch SHALL reject the restart fast path before executing selected release content and the gate SHALL observe safe fallback or failure

#### Scenario: Warm launch is measured
- **WHEN** the active release startup graph and dependency layer have already been warmed
- **THEN** both supported profile scenarios SHALL be measured against the declared warm startup budget

#### Scenario: Startup budget regresses
- **WHEN** bootstrap, guardian, module loading, services, resources, session creation, or first render causes any budget to be exceeded
- **THEN** the gate SHALL name the dominant measured phases and record the overrun
- **AND** an enforcing channel SHALL fail before publication

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

### Requirement: Optimized runtime payload and layers are exact-package validated
Release gates SHALL prove minimal-payload completeness, unchanged-layer reuse, changed-layer isolation, persistent compile-cache invalidation, side-effect-free warmup, full-copy rollback compatibility, extension loading, native assets, and terminal module identity against exact packed bytes.

#### Scenario: Required runtime file is omitted
- **WHEN** any supported command, profile, provider path, extension boundary, export workflow, theme, native adapter, or runtime asset requires a file absent from the generated payload
- **THEN** exact-package validation SHALL fail before publication

#### Scenario: Dependency layer is tampered
- **WHEN** a selected layer file, manifest, binding, or managed path differs from its certified identity
- **THEN** activation and launch SHALL fail closed without selecting mixed content or damaging a valid rollback release

#### Scenario: Consecutive previews share dependencies
- **WHEN** a representative exact update changes product files while retaining the dependency set
- **THEN** evidence SHALL show one certified dependency layer path is reused and no duplicate full dependency tree is written

#### Scenario: Compile cache is stale or unavailable
- **WHEN** the Node version or immutable content identity changes, or cache storage cannot be used
- **THEN** A1 SHALL reject stale entries or fall back safely without changing runtime behavior

### Requirement: Integration fixtures isolate test-loader overhead without mutable selection
A file-owned integration fixture SHALL use the current build's real cold emitted helper and worker entries consistently when source-language loader and transpilation startup are not behavior under test and measured native evidence shows that overhead crosses retained assertion boundaries. Entry selection SHALL be immutable for the test file, SHALL preserve a caller's explicit entry, worker data and options, SHALL match only the owned source bootstrap being replaced, and SHALL leave unrelated workers untouched. Every operation SHALL still create a new real child process or worker and exercise the production protocol and asynchronous completion path. Independent tests SHALL retain source-entry contract coverage and prove equivalent source/emitted outcomes.

#### Scenario: Integration file exercises clipboard paste behavior
- **WHEN** a shell integration file starts controlled text or image paste operations whose source-loader startup is outside its asserted contract
- **THEN** each operation SHALL start the current build's real emitted helper or exact corresponding emitted worker without prewarming, caching, process reuse, or synthetic results
- **AND** all payload, ordering, pending-state, cleanup, copy, submission, and failure assertions SHALL remain unchanged
- **AND** existing wait and test deadlines SHALL remain unchanged

#### Scenario: Caller supplies an explicit helper or unrelated worker
- **WHEN** the fixture observes an explicit helper entry, a non-matching worker bootstrap, or unrelated worker options and data
- **THEN** it SHALL preserve that entry, options, and data exactly rather than redirecting them through the emitted clipboard fixture

#### Scenario: Source and emitted contracts are compared
- **WHEN** focused regression coverage validates helper and worker behavior
- **THEN** source entries and built emitted entries SHALL retain equivalent controlled text, image, malformed-input, lifecycle, and protocol outcomes
- **AND** using emitted entries in the integration file SHALL NOT remove the independent source-entry coverage

#### Scenario: Native complete regression is evaluated
- **WHEN** the exact candidate runs the existing complete native validation matrix
- **THEN** every retained session-shell paste case SHALL execute once under its existing assertions and deadlines on each selected runtime
- **AND** a failed lane SHALL remain failed without semantic retry, timeout extension, workload removal, or acceptance inferred from another runtime

### Requirement: Published predecessor subprocess waits preserve runner responsiveness
Published-predecessor compatibility validation SHALL remain able to process runner messages, timers, and cancellation while waiting for package installation, registry lookup, or shipped setup subprocesses. Command waits SHALL NOT block the test worker's event loop. The real multi-release scenario SHALL retain existing test, hook, warmup, runner, and workflow time limits, predecessor selection and coverage, exact candidate bytes, command ordering, and the requirement to execute each selected predecessor's own release code.

The real multi-release scenario SHALL use exhaustive cadence: it SHALL run in manual Full regression and scheduled nightly/stable release validation and SHALL NOT run in ordinary `pull_request` or manual Development validation. Pull-request validation SHALL retain focused deterministic predecessor command, lifecycle, error, fixture, materialization, and warmup contracts, but SHALL NOT claim that those contracts exercised published predecessor code. Moving the real scenario SHALL not reduce its default predecessor count, supported-entry checks, exact-package authority, assertions, or failure semantics.

Subprocess results SHALL be bounded and fail closed. Validation SHALL not report success before the owned command and its captured output have closed successfully. Spawn failure, nonzero exit, signal termination, cancellation, output overflow, malformed required metadata, or failed setup SHALL prevent later dependent phases. Cleanup SHALL preserve unrelated state and processes and SHALL not remove a temporary installation while its owned subprocess is active.

#### Scenario: A package command remains in progress
- **WHEN** a predecessor-validation subprocess is still running
- **THEN** the test worker SHALL continue servicing control-plane events without waiting for that subprocess to exit
- **AND** the subprocess SHALL still be subject to the existing enclosing validation lifetime

#### Scenario: A prerequisite fails
- **WHEN** installation, registry lookup, or shipped setup fails or produces unusable required evidence
- **THEN** validation SHALL fail with bounded phase, version where known, elapsed-time, and error identity
- **AND** subsequent dependent import, materialization, and warmup steps SHALL NOT run
- **AND** diagnostic output SHALL NOT expose credentials, environment contents, or arbitrary captured subprocess output

#### Scenario: Output exceeds the supported bound
- **WHEN** a subprocess exceeds the retained capture limit
- **THEN** validation SHALL fail and clean up the owned command
- **AND** truncated output SHALL NOT be interpreted as successful or complete evidence

#### Scenario: Validation is cancelled during installation
- **WHEN** the enclosing validation is cancelled or expires while an owned command is active
- **THEN** its command lifetime SHALL end through ownership-safe cleanup before temporary installation removal
- **AND** unrelated processes and paths SHALL remain untouched

#### Scenario: Ordinary pull-request validation runs
- **WHEN** a product, test, workflow, selector, or unknown operational change is validated by the Development pull-request workflow
- **THEN** the real multi-release predecessor scenario SHALL be reported as exhaustive-cadence deferred and SHALL not be scheduled
- **AND** focused deterministic predecessor contracts selected by the change SHALL retain their assertions and fail-closed outcomes

#### Scenario: Real predecessor coverage executes
- **WHEN** Full regression or nightly/stable release validation selects complete coverage
- **THEN** the published-predecessor gate SHALL retain publication-time selection, the existing default predecessor limit and override semantics, supported-entry checks, and the existing minimum exercised-predecessor assertion
- **AND** it SHALL exercise real predecessor release code against the exact selected candidate without using the user's npm installation prefix
- **AND** it SHALL not reduce coverage, add success retries, restore mutable installed fixtures, or replace published code with a candidate-authored oracle

#### Scenario: Focused coverage passes but exhaustive coverage fails
- **WHEN** deterministic pull-request predecessor contracts pass and a later exhaustive run fails
- **THEN** the exhaustive workflow SHALL remain failed and block its publication authority
- **AND** focused PR success SHALL not be reinterpreted as real published-predecessor compatibility evidence

### Requirement: Nightly recovery is proven by numbered merged-package evidence
A nightly recovery effort SHALL not be declared complete solely from focused tests, passing PR CI, an implementation merge, a branch Full regression run, or reduced-scope manual development publication. Completion SHALL require the actual scheduled nightly workflow to successfully perform full-release validation on a newly numbered package whose merged source contains the accepted repairs, across Windows Node 22 and 24, Linux Node 24, and macOS Node 24, with a successful aggregate publication or immutable-registry verification outcome.

Evidence SHALL identify source commit, merged-PR/version identity, package integrity/digest, nightly run and native job identities, selected full-release scope, and every lane's result. Existing registry bytes SHALL remain immutable. Additional failed stages SHALL remain explicit blockers until corrected and verified; their checks SHALL NOT be skipped or weakened to obtain a successful result.

#### Scenario: Nightly builds a new numbered package
- **WHEN** the repaired merged source selects a development version not yet published
- **THEN** the scheduled nightly SHALL build and pack that numbered candidate once and validate the same bytes in every native lane
- **AND** successful publication to the development channel SHALL be verified against the validated package identity before recovery is accepted

#### Scenario: The newer numbered package is already published
- **WHEN** an authorized development publication has already produced the repaired numbered package
- **THEN** scheduled nightly SHALL fully validate those exact immutable registry bytes on all four lanes
- **AND** a successful manual existing-version no-op SHALL NOT substitute for that validation

#### Scenario: Another validation stage fails
- **WHEN** any required native or publication stage fails after the initial correction
- **THEN** recovery SHALL remain incomplete with the failed stage and available cause evidence recorded
- **AND** further correction SHALL preserve the gate and receive the applicable scope approval before implementation

#### Scenario: A retained regression still consumes a retired copy result
- **WHEN** a retained transcript-lifetime regression uses a retired copy-result representation after a reviewed ownership change
- **THEN** the test SHALL consume the current selection snapshot through the existing copy serialization contract
- **AND** it SHALL retain its exact independent expected copied text and all original lifecycle assertions without modifying production clipboard behavior or adding an exception

#### Scenario: The implementation is merged but nightly is pending
- **WHEN** accepted implementation has merged but the numbered-package nightly outcome is missing, failed, or incomplete
- **THEN** completed-change archival and retained-worktree cleanup SHALL remain blocked
- **AND** the implementation acceptance report SHALL NOT be represented as evidence of successful nightly recovery

### Requirement: Faster package fixtures preserve cold-state and oracle independence
Fixture optimizations SHALL preserve fresh installation boundaries, exact package identity, representative workload sizes, independent comparison processes, hermetic mutable state, and verified owned-process cleanup. Immutable source templates or downloaded bytes SHALL be reusable only where their reuse does not supply the behavior under test or pre-warm a measured first-attempt launch. Every mutable instance, prefix, endpoint, release state, and cancellation lifecycle SHALL remain scenario-owned. Failed setup, assertions, command execution, or cleanup SHALL remain visible under the retained failure semantics rather than becoming a timing success.

#### Scenario: Repeated command fixtures share preparation
- **WHEN** equivalent command tests reuse an immutable repository template
- **THEN** each mutating scenario SHALL receive separate writable state and the same independent command assertions
- **AND** subsequent scenarios SHALL not observe prior refs, files, processes, or captured output

#### Scenario: A first-attempt startup fixture is prepared
- **WHEN** the exact candidate startup fixture is created using cached dependency downloads
- **THEN** it SHALL still use a fresh installation and preserve the existing declared certification and warmup sequence
- **AND** no additional warm launch, restored launch compile cache, or reused certified fixture SHALL precede its first measured attempt

#### Scenario: An independent parity oracle is expensive
- **WHEN** profiling identifies repeated pinned-versus-owned command processes as a cost
- **THEN** optimization SHALL retain independent oracle execution and strict output assertions rather than substituting owned output, recorded passing output, or shared mutable oracle state

#### Scenario: A large cleanup backlog dominates setup
- **WHEN** a production-shaped historical backlog is expensive to construct
- **THEN** optimization SHALL retain the existing release and payload counts and ownership/failure cases
- **AND** smaller workloads SHALL not be reported as equivalent acceptance evidence

#### Scenario: A failure would otherwise be hidden by cleanup
- **WHEN** a fixture command or assertion fails and teardown also encounters a problem
- **THEN** evidence SHALL retain the primary failure and separately identify cleanup outcome without reporting the fixture as passed

### Requirement: Durable regression oracles protect current behavior
A permanent regression test SHALL protect a current product, compatibility, or repository-policy contract through behavior, structured policy, or a hermetic fixture. It SHALL NOT depend on the continued active location of an OpenSpec change, reread one-time implementation or benchmark evidence as its runtime oracle, or require exact explanatory prose when equivalent wording preserves the contract. One-time planning, benchmark, and acceptance evidence SHALL be validated by its producing operation and OpenSpec finalization or audit, then retained as historical evidence without remaining a prerequisite of unrelated product test runs.

Tests for generators and evidence readers SHALL use temporary or versioned fixtures that exercise supported schemas and failure behavior. Tests for workflow guidance SHALL assert stable structured policy or executable launch behavior; exact text SHALL be required only when that text is itself a declared external contract. Removing a historical-evidence assertion SHALL NOT remove the underlying current behavior test, full-suite owner, release contract, or accepted evidence file.

#### Scenario: An OpenSpec change is archived
- **WHEN** a completed change moves from its active directory into a dated archive
- **THEN** permanent product and governance tests SHALL continue to pass without rewriting paths to that historical change
- **AND** archive validation SHALL preserve the evidence under its accepted archive identity

#### Scenario: One-time performance evidence is retained
- **WHEN** implementation acceptance records a local or hosted benchmark report
- **THEN** finalization or audit SHALL validate the report required by that change
- **AND** unrelated future PR tests SHALL NOT reread the report as proof of current runtime behavior

#### Scenario: Policy wording changes without changing meaning
- **WHEN** explanatory workflow text is shortened or rephrased while retaining the same structured or executable requirement
- **THEN** regression validation SHALL evaluate the retained semantic contract rather than an exact sentence
- **AND** a separately declared user-visible text contract, if any, SHALL remain exact

#### Scenario: Evidence tooling changes
- **WHEN** a generator, parser, finalizer, or reader for evidence changes
- **THEN** hermetic fixtures SHALL prove supported schema, identity, bounds, and failure behavior
- **AND** the test SHALL not depend on mutable repository history or a particular prior change remaining active

#### Scenario: A historical-only assertion is removed
- **WHEN** audit shows a test's only oracle is an accepted change's static evidence or prose
- **THEN** that assertion MAY be removed or replaced with a hermetic semantic test
- **AND** current product assertions, retained suite ownership, release coverage, and the historical evidence itself SHALL remain intact

#### Scenario: An isolated helper completes asynchronously
- **WHEN** a regression assertion depends on an owned child process adopting a prepared value
- **THEN** the fixture SHALL synchronize on the helper's structured completion event rather than use a generic polling deadline as completion authority
- **AND** the semantic assertion, failure behavior, and production timeout policy SHALL remain unchanged

#### Scenario: Resume behavior uses an exact package candidate
- **WHEN** resume integration validates supervisor, guardian, and UI behavior from exact packed candidate bytes
- **THEN** the fixture MAY prepare, certify, and activate those bytes through production release-store operations before starting the bounded public resume launch
- **AND** separate exact-package and first-attempt startup scopes SHALL retain cold materialization and startup authority
- **AND** resume readiness SHALL be polled with backoff to one generous hang bound, SHALL report the startup phases reached when that bound expires, and SHALL NOT be retried

### Requirement: Exact-package startup graph and latency are release-gated
Exact-package validation SHALL record the modules, files, evaluated bytes, and elapsed phases required from command invocation through first input-ready render for both interactive profiles. Evidence SHALL distinguish A1-owned startup code, documented Pi entry points, other dependency modules, process startup, runtime initialization, and rendering. The accepted baseline SHALL fail when an unapproved broad entry point or optional feature becomes eagerly reachable, even when aggregate time happens to remain within budget.

On the accepted Defender-enabled Windows runner, each supported Node lane SHALL execute post-update, no-live-supervisor, and warm scenarios once without automatic retry. Post-update and warm launches SHALL complete within 2 seconds; no-live-supervisor launches SHALL complete within 2.5 seconds.

#### Scenario: Broad entry point enters the startup graph
- **WHEN** a change makes an unapproved barrel, command mode, optional workflow, or optional presentation module eagerly reachable before first input-ready render
- **THEN** deterministic graph validation SHALL fail with the introducing edge and affected module/file totals

#### Scenario: Startup graph grows within the elapsed budget
- **WHEN** loaded module count or evaluated bytes exceed the accepted startup baseline without an explicitly reviewed baseline change
- **THEN** validation SHALL fail even if elapsed startup remains below its time budget

#### Scenario: Startup exceeds its budget
- **WHEN** an exact packaged profile exceeds its applicable first-attempt budget
- **THEN** validation SHALL fail without retry and report the dominant phases, module groups, loaded file count, and evaluated bytes

#### Scenario: Deferred capability is exercised
- **WHEN** exact-package validation invokes a feature excluded from the eager graph
- **THEN** that feature SHALL load on demand and retain its supported behavior, diagnostics, and triggering interaction

#### Scenario: Generated startup artifact is packaged
- **WHEN** a candidate contains an A1-owned bundled or generated startup artifact
- **THEN** validation SHALL bind it to exact source and dependency identities and SHALL verify public Pi provenance, licenses, provider registration, extension compatibility, terminal identity, and runtime payload completeness

### Requirement: Shared exact-package preparation preserves fixture independence
An exact candidate's immutable clean installation MAY supply multiple validation owners within one platform/runtime lane only when every owner receives fresh mutable configuration, data, runtime, endpoint, process, and cleanup state. Consumers SHALL treat the installed package as read-only, SHALL verify its candidate identity before use, and SHALL NOT leave changes that affect another consumer. Owner execution order SHALL NOT serve as an oracle or prerequisite unless the suite contract explicitly declares that dependency. A lane selecting startup SHALL schedule it immediately after shared preparation and before package-contract workload solely to isolate first-attempt runner load; installed bytes SHALL be reverified before a later owner consumes them.

A first-attempt startup consumer SHALL remain cold with respect to product launch, release materialization, certification, warmup, supervisor state, compile caches, and profile state. Reusing downloaded dependency bytes or the immutable installed package SHALL NOT count as a prior launch and SHALL NOT permit startup evidence produced by another owner. Cleanup SHALL remove or safely defer only owner-specific mutable state and SHALL preserve the primary failure when cleanup also fails.

#### Scenario: Contract and startup owners consume one installation
- **WHEN** package-contract and startup owners use one verified installed package in a publication lane
- **THEN** they SHALL use distinct mutable roots and owned process trees
- **AND** neither owner's mutations or cleanup SHALL affect the other's assertions or outcome

#### Scenario: Startup consumes shared preparation
- **WHEN** the startup owner receives an immutable package installation shared with a contract owner
- **THEN** startup SHALL run before the package-contract workload and its first measured launch SHALL begin without prior product launch, materialization, certification, warmup, supervisor, profile, or mutable compile-cache state
- **AND** all first-attempt budgets and assertions SHALL remain unchanged and execute without retry

#### Scenario: A consumer mutates the installed package
- **WHEN** an owner changes installed package bytes or identity evidence before another owner consumes them
- **THEN** identity verification SHALL fail before the later owner's assertions can pass
- **AND** publication SHALL remain blocked

#### Scenario: Owner cleanup encounters contention
- **WHEN** one consumer cannot immediately remove its mutable fixture state
- **THEN** cleanup SHALL remain bounded and attributable to that owner
- **AND** it SHALL not delete the shared immutable preparation or another owner's mutable state

### Requirement: Development publication records startup budget evidence
The development publication channel SHALL measure both supported profiles and all three launch kinds on the first attempt exactly as an enforcing channel does. It SHALL record every overrun with its profile, launch kind, measured elapsed time, applicable budget, and dominant phases in the startup performance evidence and in the run summary, and SHALL annotate the run so the overrun is visible without downloading an artifact. It SHALL NOT block publication on an overrun, SHALL NOT reduce the number of measured scenarios, and SHALL NOT retry a measurement.

The recorded evidence SHALL name the enforcement mode under which it was produced so a recorded result is never mistaken for an enforced pass. Nightly publication, stable publication, and complete regression SHALL continue to fail on the same overrun.

#### Scenario: A development preview exceeds a budget
- **WHEN** a numbered development preview measures an exact packaged launch above its declared budget
- **THEN** validation SHALL record the violation, annotate the run, and allow publication to proceed
- **AND** the recorded evidence SHALL identify the recording enforcement mode

#### Scenario: Nightly measures the same overrun
- **WHEN** nightly publication or complete regression measures the same overrun on the same bytes
- **THEN** validation SHALL fail with the dominant measured phases and publication SHALL be blocked

#### Scenario: Enforcement mode is unspecified
- **WHEN** the exact-package startup gate runs without a declared enforcement mode or with an unrecognized one
- **THEN** it SHALL enforce the budgets and fail on an overrun
