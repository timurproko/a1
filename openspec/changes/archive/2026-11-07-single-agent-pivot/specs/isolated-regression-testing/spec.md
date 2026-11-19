## ADDED Requirements

### Requirement: Exact-package startup performance is release-gated for update, restart-equivalent, and warm launches
The accepted Windows release runner SHALL measure command invocation through first input-ready frame for exact packaged `a1` and `a1 pi` launches. Evidence SHALL include a newly addressed cold release path, the first launch after completed update handling, a restart-equivalent launch of an approved active release in a fresh process, and a subsequent warm launch, with phase durations and immutable content identities. Each release-gating scenario SHALL execute once without automatic retry, and acceptance evidence SHALL demonstrate reliable margin on every supported Windows Node lane rather than relying on a preceding failed launch to warm the path.

The measured budgets SHALL be the interactive startup budgets declared by the A1 shell capability rather than separately restated numbers. Measurement SHALL be unconditional; enforcement SHALL depend on the declared channel. Windows Defender real-time protection SHALL be enabled before the first packaged launch of a measured scenario, and MAY be disabled while dependencies and the exact candidate are installed and extracted. Stable publication SHALL fail on an overrun. Nightly publication, complete regression, and development previews SHALL record every measurement, SHALL upload it as evidence next to the tier outcome, and SHALL fail only through the persistent-overrun verdict the A1 shell capability declares, computed from the uploaded evidence of the three most recent consecutive `develop` runs of the same workflow and never from re-measurement. A launch that records no input-ready frame SHALL fail in every channel.

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

## MODIFIED Requirements

### Requirement: Scenarios run in hermetic instances
Automated scenarios SHALL isolate application state, release and update state, runtime paths, Pi configuration, environment, artifacts, and owned process trees from user state and from concurrent scenarios. An operating-system-boundary fixture SHALL supply controlled results at the acquisition boundary actually selected on its native platform, including command-based fallbacks, and SHALL NOT access the host clipboard or require an interactive clipboard service. Successful and failing scenarios SHALL await verified completion of their owned executors before releasing fixture state or asserting capacity in subsequent scenarios.

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

### Requirement: Architecture-independent tests survive terminal changes
Domain, release-store, update-transaction, package identity, dependency-policy, and non-terminal lifecycle tests SHALL remain mandatory when they express current contracts rather than retired implementation assumptions.

#### Scenario: A terminal implementation is removed
- **WHEN** obsolete renderer, mode, input, or simulator code is deleted
- **THEN** architecture-independent tests SHALL continue validating their owned contracts without importing retired modules

### Requirement: Update transitions remain release-gating scenarios
Stable release gates SHALL exercise exact target resolution, verified owned-process shutdown, mutable-package unlock, single-pass immutable materialization, certification, activation, transaction recovery, rollback, and clean process exit without manual PID or state deletion. Release evidence SHALL record phase durations and payload read/write counts for the exact packaged updater. On the accepted Windows release runner, the representative unchanged-dependency preview fixture of at least 10,000 payload files SHALL complete post-npm materialization through verified activation within 30 seconds and SHALL perform no more than one complete source-payload read and one candidate-payload write for a new release.

#### Scenario: Update is interrupted
- **WHEN** a fault occurs at a durable update phase
- **THEN** rerunning the command SHALL converge to one verified active or rollback release

#### Scenario: Representative preview update is measured
- **WHEN** the exact packaged updater replaces a preview whose dependency versions are unchanged on the accepted Windows release runner
- **THEN** evidence SHALL show post-npm verified activation completes within 30 seconds without a complete post-copy certification read

#### Scenario: Performance budget regresses
- **WHEN** the measured fixture exceeds the time or payload-pass budget
- **THEN** stable release gating SHALL fail with phase timing and file-operation diagnostics

#### Scenario: Packaged update completes
- **WHEN** the exact packaged update transition reports success or failure
- **THEN** the updater process SHALL exit cleanly and return control to the invoking terminal without requiring `Ctrl+C`

### Requirement: Release retention and cleanup receive exact-state regression coverage
Release validation SHALL exercise bounded retention migration, age-based retention of recently approved releases, rollback protection, active update transactions, external holds, interrupted cleanup, malformed paths, stale candidates, worker continuation and observability, fair retry scheduling, legacy Windows path casing, and production-shaped historical backlogs in isolated data and runtime roots.

#### Scenario: Large legacy retention set is migrated
- **WHEN** an isolated exact-package fixture contains at least forty valid historical releases and a production-representative payload backlog under append-only retention with one active release, one rollback release, and one older release approved within the retention window
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
- **WHEN** isolated update, launch, and duplicate maintenance scheduling operations overlap
- **THEN** every retained or selected release SHALL remain executable, one physical cleanup owner SHALL operate per data root, and every obsolete release SHALL remain safely retryable

#### Scenario: One item remains persistently blocked
- **WHEN** one obsolete item repeatedly fails while other release and artifact classes remain eligible
- **THEN** bounded retries SHALL preserve diagnostics for the blocked item while the other eligible work continues to completion

#### Scenario: Windows holds an obsolete file temporarily
- **WHEN** exact-package cleanup encounters a temporary Windows sharing or antivirus lock
- **THEN** the operation SHALL remain bounded, preserve retry state and diagnostics, allow unrelated work to progress, and succeed after the lock is released

#### Scenario: Legacy managed paths differ only by Windows casing
- **WHEN** a migrated release record or certification path uses legacy casing for the same managed Windows directory
- **THEN** cleanup SHALL accept the canonical managed identity, delete only the obsolete contained artifact, and preserve unrelated paths

### Requirement: Required PR validation remains fail closed after runtime deferral
The required development aggregate SHALL depend on successful current-head Node 22 startup validation whenever authoritative ordinary impact selection requires it. It SHALL not wait for Node 24 evidence when trusted policy proves complete regression unselected. When PR Full regression is selected, the aggregate SHALL additionally require its complete matrix, including Windows Node 24. It SHALL also require every selected image/history, exact-package, delivery, and governance scope. Failed, cancelled, missing, stale, or unexpectedly skipped required results SHALL NOT be accepted as successful validation. Unselected work SHALL be accepted only with complete trustworthy current-head selection explicitly proving it unnecessary; missing or invalid selection SHALL require conservative execution or block the aggregate. Nightly, independent dispatch, or earlier-head results SHALL NOT substitute for current PR checks. The named protected aggregate and all other mandatory gates SHALL remain in force.

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
- **WHEN** startup passes but a required package, image/history, or delivery scope fails
- **THEN** the aggregate SHALL remain unsuccessful

### Requirement: Exact-package gates prove launcher continuity across cancellation
Release validation SHALL exercise the physical global package and launcher boundary with an exact packed candidate. It SHALL inject cancellation, updater loss, and npm failure before package mutation and after each observable launcher-removal, package-replacement, launcher-creation, and transaction boundary. Every case SHALL prove the complete platform launcher set is callable, recovery uses one verified owner, the prior immutable release remains protected until target activation, and rerunning `a1` converges without manual repair.

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
- **WHEN** the exact candidate runs the existing complete platform validation matrix
- **THEN** every retained session-shell paste case SHALL execute once under its existing assertions and deadlines on each selected runtime
- **AND** a failed lane SHALL remain failed without semantic retry, timeout extension, workload removal, or acceptance inferred from another runtime

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
- **WHEN** resume integration validates launcher and UI behavior from exact packed candidate bytes
- **THEN** the fixture MAY prepare, certify, and activate those bytes through production release-store operations before starting the bounded public resume launch
- **AND** separate exact-package and first-attempt startup scopes SHALL retain cold materialization and startup authority
- **AND** resume readiness SHALL be polled with backoff to one generous hang bound, SHALL report the startup phases reached when that bound expires, and SHALL NOT be retried

### Requirement: Exact-package startup graph and latency are release-gated
Exact-package validation SHALL record the modules, files, evaluated bytes, and elapsed phases required from command invocation through first input-ready render for both interactive profiles. Evidence SHALL distinguish A1-owned startup code, documented Pi entry points, other dependency modules, process startup, runtime initialization, and rendering. The accepted baseline SHALL fail when an unapproved broad entry point or optional feature becomes eagerly reachable, even when aggregate time happens to remain within budget.

On the accepted Defender-enabled Windows runner, each supported Node lane SHALL execute post-update, restart-equivalent, and warm scenarios once without automatic retry. Post-update and warm launches SHALL complete within 2 seconds; restart-equivalent launches SHALL complete within 2.5 seconds.

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
An exact candidate's immutable clean installation MAY supply multiple validation owners within one platform/runtime lane only when every owner receives fresh mutable configuration, data, runtime, process, and cleanup state. Consumers SHALL treat the installed package as read-only, SHALL verify its candidate identity before use, and SHALL NOT leave changes that affect another consumer. Owner execution order SHALL NOT serve as an oracle or prerequisite unless the suite contract explicitly declares that dependency. A lane selecting startup SHALL schedule it immediately after shared preparation and before package-contract workload solely to isolate first-attempt runner load; installed bytes SHALL be reverified before a later owner consumes them.

A first-attempt startup consumer SHALL remain cold with respect to product launch, release materialization, certification, warmup, compile caches, and profile state. Reusing downloaded dependency bytes or the immutable installed package SHALL NOT count as a prior launch and SHALL NOT permit startup evidence produced by another owner. Cleanup SHALL remove or safely defer only owner-specific mutable state and SHALL preserve the primary failure when cleanup also fails.

#### Scenario: Contract and startup owners consume one installation
- **WHEN** package-contract and startup owners use one verified installed package in a publication lane
- **THEN** they SHALL use distinct mutable roots and owned process trees
- **AND** neither owner's mutations or cleanup SHALL affect the other's assertions or outcome

#### Scenario: Startup consumes shared preparation
- **WHEN** the startup owner receives an immutable package installation shared with a contract owner
- **THEN** startup SHALL run before the package-contract workload and its first measured launch SHALL begin without prior product launch, materialization, certification, warmup, profile, or mutable compile-cache state
- **AND** all first-attempt budgets and assertions SHALL remain unchanged and execute without retry

#### Scenario: A consumer mutates the installed package
- **WHEN** an owner changes installed package bytes or identity evidence before another owner consumes them
- **THEN** identity verification SHALL fail before the later owner's assertions can pass
- **AND** publication SHALL remain blocked

#### Scenario: Owner cleanup encounters contention
- **WHEN** one consumer cannot immediately remove its mutable fixture state
- **THEN** cleanup SHALL remain bounded and attributable to that owner
- **AND** it SHALL not delete the shared immutable preparation or another owner's mutable state

## REMOVED Requirements

### Requirement: Exact-package startup performance is release-gated
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Exact-package startup performance is release-gated for update, restart-equivalent, and warm launches".
