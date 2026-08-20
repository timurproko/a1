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
A manually accepted `-dev.N` candidate MAY publish under npm tag `next` after applicable architecture, structural, lifecycle, update, dependency, build, package-content, and exact-artifact gates pass. It SHALL identify physical and cross-platform certification as deferred, SHALL NOT move `latest`, and SHALL NOT claim certified terminal parity or platform support.

#### Scenario: Physical workers are unavailable
- **WHEN** a candidate passes non-desktop gates and manual acceptance but physical certification is deferred
- **THEN** publication MAY proceed only as an explicitly uncertified development preview

#### Scenario: Stable publication is requested
- **WHEN** a candidate would move `latest` or claim terminal support on a platform
- **THEN** deferred physical and cross-platform certification SHALL complete against the exact candidate first

### Requirement: Architecture-independent tests survive terminal changes
Domain, storage, release-cohort, update-transaction, protocol, package identity, dependency-policy, and non-terminal lifecycle tests SHALL remain mandatory when they express current contracts rather than retired implementation assumptions.

#### Scenario: A terminal implementation is removed
- **WHEN** obsolete renderer, mode, input, or simulator code is deleted
- **THEN** architecture-independent tests SHALL continue validating their owned contracts without importing retired modules

### Requirement: Stable transparent acceptance uses independent physical evidence
Before stable terminal publication or parity/support claims, transparent rendering, character presentation, input identity, selection, clipboard, scrollback, mouse, resize, modes, latency, exit, and restoration SHALL be compared against direct execution through actual supported host-terminal behavior. A test encoder, emulator, or A1 terminal model SHALL NOT be the sole oracle.

#### Scenario: Physical certification is attempted
- **WHEN** direct and transparent workloads are compared on a supported platform
- **THEN** evidence SHALL originate from isolated native host actions, child effects, physical observations, exact process identity, and exact packaged bytes

#### Scenario: One generic workload fails
- **WHEN** Native Pi passes but another application-independent workload exposes a terminal difference
- **THEN** the capability and platform SHALL remain uncertified

### Requirement: Raw relay is not an implicit transparent fallback
A raw PTY relay SHALL NOT replace selected direct attachment unless a future change establishes a mandatory PTY-ownership constraint and independently proves complete physical parity.

#### Scenario: No mandatory PTY constraint exists
- **WHEN** direct attachment satisfies the selected single-foreground lifecycle
- **THEN** A1 SHALL not add a raw relay, parser, input translation, or shadow terminal authority

### Requirement: Packaged candidates validate exact publication artifacts
Every publication SHALL pack once and bind evidence to source commit, version, integrity, declared certification status, and applicable gate results before uploading those exact bytes.

#### Scenario: Candidate bytes change
- **WHEN** package integrity differs from accepted or certified evidence
- **THEN** publication SHALL fail and require validation of the new bytes

#### Scenario: Uncertified preview is packed
- **WHEN** a manually accepted candidate is prepared while physical certification is deferred
- **THEN** evidence SHALL identify it as stable-ineligible and preserve `latest`

### Requirement: Update transitions remain release-gating scenarios
Stable and preview update gates SHALL exercise exact target resolution, verified owned-process shutdown, mutable-package unlock, immutable materialization, activation, endpoint verification, transaction recovery, and rollback without manual PID or state deletion.

#### Scenario: Update is interrupted
- **WHEN** a fault occurs at a durable update phase
- **THEN** rerunning the command SHALL converge to one verified active or rollback cohort

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

### Requirement: Changed tests pass focused and containing gates
A retained or newly added test SHALL pass focused execution and its containing mandatory gate before its task is complete.

#### Scenario: Focused execution passes but containing gate fails
- **WHEN** the focused command succeeds and its required containing gate fails
- **THEN** the task SHALL remain incomplete
