# Isolated Regression Testing Specification

## Purpose

Defines independent, isolated validation for A1 lifecycle, updates, transparent terminal policy, exact package artifacts, and confirmed regressions.

## Requirements

### Requirement: Scenarios run in hermetic instances
Automated scenarios SHALL isolate application state, supervisor storage, runtime paths, Pi configuration, endpoints, environment, artifacts, and owned process trees from user state and from concurrent scenarios.

#### Scenario: Run scenarios concurrently
- **WHEN** two scenarios execute at the same time
- **THEN** neither SHALL discover, control, or mutate the other's state or processes

#### Scenario: User configuration exists
- **WHEN** a machine contains normal Pi settings, extensions, sessions, and credentials
- **THEN** a hermetic scenario SHALL not load or mutate them unless explicitly supplied as identified input

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
A confirmed regression SHALL gain the smallest independent current-contract test capable of detecting its cause. Physical-only behavior SHALL remain at the physical/integration boundary instead of being duplicated by a self-modelled simulation.

#### Scenario: Regression belongs to deterministic logic
- **WHEN** a defect is isolated to domain, storage, protocol, release, or update behavior
- **THEN** A1 SHALL add a focused deterministic test and pass its containing gate

#### Scenario: Regression crosses the physical boundary
- **WHEN** a rendering or input defect cannot be represented independently in a unit test
- **THEN** A1 SHALL retain it for isolated physical or exact-package integration certification

### Requirement: Changed tests pass in pull-request validation
A retained or newly added test SHALL pass in the pull-request validation of continuous integration before its change is integrated. Local execution is an optional debugging aid, not a completion gate.

#### Scenario: Pull-request validation passes
- **WHEN** continuous integration validates the pull request containing the changed tests
- **THEN** the change MAY be integrated and no local suite execution SHALL be required

### Requirement: Resource-sensitive regressions avoid shared runner contention
Automated tests that repeatedly create repositories, launch subprocesses, mutate temporary storage, or coordinate release processes SHALL be eligible for a declared resource-sensitive execution class. Tests in that class SHALL run one file at a time under the unchanged fast-tier test timeout rather than sharing the parallel fast-test worker pool. Classification SHALL be reviewed configuration, SHALL be applied consistently across supported platforms, and SHALL not suppress output, remove assertions, increase timeouts, or authorize retries of semantic failures. Repeated isolated evidence SHALL expose available fixture and subprocess timing, and a test that remains slow SHALL be optimized before acceptance. Tests not assigned to the class SHALL retain the ordinary fast scheduler unless another declared isolation contract applies.

#### Scenario: A repeated contention timeout is confirmed
- **WHEN** evidence shows a process- or filesystem-intensive fast test passes independently but intermittently times out while sharing the parallel runner
- **THEN** the test MAY be assigned to the resource-sensitive class with its evidence recorded
- **AND** its assertions and fail-closed outcome SHALL remain unchanged

#### Scenario: Resource-sensitive tests execute
- **WHEN** multiple tests in the resource-sensitive class are selected
- **THEN** their files SHALL execute without file parallelism under the existing fast-tier timeout
- **AND** no selected file SHALL execute more than once

#### Scenario: Serialization is insufficient
- **WHEN** a resource-sensitive test remains near or beyond the existing timeout during repeated isolated execution
- **THEN** its setup and subprocess phases SHALL be measured and optimized
- **AND** the test SHALL NOT receive a larger timeout or an automatic retry

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
For non-draft pull requests into `develop` that are neither documentation-only nor version-only, Development validation SHALL run the complete Windows Node 22 startup lane and SHALL NOT schedule a Windows Node 24 startup lane. Manual invocation of Development validation SHALL use the same startup runtime selection. This is a validation-cadence decision, not removal of Node 24 runtime support or of tests from their retained scopes.

The retained Node 22 lane SHALL preserve first-attempt exact-package startup checks, enabled Defender real-time protection, image preparation and packaged-worker coverage, durable-history coverage, and evidence artifacts. Performance limits, isolation, assertions, and failure semantics SHALL remain unchanged. Documentation-only and version-only startup exemptions, draft behavior, and all other required PR gates SHALL remain unchanged.

#### Scenario: Applicable code PR is validated
- **WHEN** a ready code/operational PR receives Development validation
- **THEN** exactly one Windows startup lane SHALL run on Node 22
- **AND** no Node 24 startup job SHALL be queued or required for that PR
- **AND** all existing Node 22 startup-job checks SHALL execute without semantic retries or ignored failures

#### Scenario: Exempt or draft PR is evaluated
- **WHEN** a PR is documentation-only, version-only, or draft
- **THEN** the existing applicable validation and startup-skip behavior SHALL be preserved rather than starting either startup lane unnecessarily

#### Scenario: Development validation is manually dispatched
- **WHEN** the maintainer invokes Development validation for a non-exempt source
- **THEN** the startup portion SHALL run on Windows Node 22 only
- **AND** full Windows Node 24 validation SHALL remain available through the separate Full regression workflow

### Requirement: Required PR validation remains fail closed after runtime deferral
The required development aggregate SHALL depend on successful current-head Node 22 startup validation for applicable PRs, without waiting for a Node 24 PR startup result. A failed, cancelled, missing, or unexpectedly skipped required startup result SHALL NOT be accepted as successful validation. Nightly or earlier-head results SHALL NOT substitute for current-head PR checks. The named protected-branch aggregate and every other required gate SHALL remain in force.

#### Scenario: Required Node 22 startup succeeds
- **WHEN** current-head Node 22 startup and every other selected required PR gate succeed
- **THEN** the aggregate SHALL be able to succeed without any Node 24 PR startup result

#### Scenario: Retained startup coverage does not succeed
- **WHEN** an applicable PR's Node 22 startup job fails, is cancelled, is missing, or is unexpectedly skipped
- **THEN** the required aggregate SHALL reject the result and integration SHALL remain blocked

#### Scenario: Previous or nightly startup evidence is green
- **WHEN** the current PR head lacks successful required validation but an earlier head or nightly run passed
- **THEN** that other evidence SHALL NOT satisfy the PR's required aggregate

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

#### Scenario: First launch follows update
- **WHEN** an exact packaged update activates a release whose product path has not previously launched on the worker
- **THEN** both supported profile scenarios SHALL satisfy the 5-second post-update startup budget and record phase-level evidence

#### Scenario: Restart-equivalent launch has no live supervisor
- **WHEN** exact-package validation stops the active release's supervisor while preserving its approved immutable release and durable certification
- **THEN** both supported profiles SHALL satisfy the 5-second startup budget, evidence SHALL identify durable validation and replacement-supervisor startup separately, and the accepted fast path SHALL perform no payload-wide file reads or hashes

#### Scenario: Restart evidence is invalid
- **WHEN** exact-package validation changes the certified release, dependency binding, managed path, or platform immutability evidence while no supervisor is live
- **THEN** launch SHALL reject the restart fast path before executing selected release content and the gate SHALL observe safe fallback or failure

#### Scenario: Warm launch is measured
- **WHEN** the active release startup graph and dependency layer have already been warmed
- **THEN** both supported profile scenarios SHALL satisfy the 3-second warm startup budget

#### Scenario: Startup budget regresses
- **WHEN** bootstrap, guardian, module loading, services, resources, session creation, or first render causes either budget to be exceeded
- **THEN** release gating SHALL fail and name the dominant measured phases

#### Scenario: A retry would warm the failed path
- **WHEN** a first Node 22 or Node 24 exact-package startup attempt exceeds its budget
- **THEN** validation SHALL retain the failure and SHALL NOT rerun the scenario to obtain a warmed passing result

#### Scenario: Supported Windows Node lanes differ
- **WHEN** the same exact candidate passes a warm startup budget on one supported Windows Node version and fails it on another
- **THEN** acceptance SHALL remain blocked until phase-attributed evidence shows the slower supported lane meets the unchanged budget with reliable first-attempt margin

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
