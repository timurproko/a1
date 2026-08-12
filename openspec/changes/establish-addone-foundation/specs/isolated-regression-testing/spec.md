## Purpose

Defines an automated, isolated regression system that exercises AddOne and its agent drivers in real PTYs, preserves evidence, and lets deterministic checks and an independent evaluator detect failures before the user does.

## ADDED Requirements

### Requirement: Scenarios run in hermetic instances
Each full-system scenario SHALL use isolated application state, supervisor storage, runtime paths, Pi configuration, sessions, sockets, workspace, environment, and process tree.

#### Scenario: Run two scenarios concurrently
- **WHEN** two scenarios execute at the same time
- **THEN** neither scenario SHALL discover, control, or mutate the other's agents, sessions, sockets, or artifacts

#### Scenario: Run two repository-local development instances
- **WHEN** the developer invokes `npm start` in two terminals from the same checkout and built release
- **THEN** each invocation SHALL receive a distinct development-instance identity, supervisor endpoint, database, runtime state, and Native Pi generation without replacing, attaching to, or interrupting the other instance

#### Scenario: Explicitly reconnect a development instance
- **WHEN** multiple development launches use the same explicit `ADDONE_DEV_INSTANCE_ID`
- **THEN** they MAY resolve the same development state and endpoint for intentional debugging while generated default identities remain independent

#### Scenario: User configuration exists
- **WHEN** the developer machine contains normal Pi settings, extensions, sessions, and credentials
- **THEN** a hermetic scenario SHALL not load or mutate them unless the scenario explicitly imports a fixture

### Requirement: AddOne releases contain no deprecated dependencies
The AddOne package SHALL contain no direct or transitive production, development, build, test, or optional dependency marked deprecated by its package registry. Packaging and publishing SHALL fail until every such dependency is removed, replaced, or upgraded and the exact lockfile is regenerated.

#### Scenario: Direct dependency is deprecated
- **WHEN** the exact AddOne dependency graph contains a direct package whose registry metadata marks it deprecated
- **THEN** the release dependency check SHALL fail and SHALL identify the package and dependency path

#### Scenario: Transitive dependency is deprecated
- **WHEN** a non-deprecated direct dependency resolves to a transitive package whose registry metadata marks it deprecated
- **THEN** the release dependency check SHALL fail rather than treating the transitive warning as acceptable

#### Scenario: Vulnerability audit is clean but deprecation exists
- **WHEN** the security audit reports no known vulnerability but the dependency graph contains a deprecated package
- **THEN** AddOne packaging and publishing SHALL remain blocked because deprecation compliance is independently required

### Requirement: UI behavior is testable without real model access
The test system SHALL support deterministic fake or replay drivers that emit normalized lifecycle, conversation, tool, failure, extension-UI, and terminal events.

#### Scenario: Test working decoration
- **WHEN** a fake driver emits working and settled events
- **THEN** a test SHALL be able to assert the corresponding tab and sidebar states without contacting a model provider

#### Scenario: Test recovery failure
- **WHEN** a fake driver reports a session identity mismatch during recovery
- **THEN** a test SHALL be able to assert the exact recovery state and available actions deterministically

### Requirement: Real CLI scenarios execute through PTYs
AddOne acceptance scenarios SHALL be able to launch the real AddOne CLI through the applicable platform terminal boundary, produce semantic keyboard, paste, focus, mouse, and resize events, and inspect normalized terminal cells, cursor state, child effects, host mode state, and application artifacts.

#### Scenario: Drive a mixed workspace
- **WHEN** a scenario creates a Managed Pi tab and a terminal-agent tab through user-visible interactions
- **THEN** it SHALL verify switching, focus, input routing, and surface restoration through the real CLI process

#### Scenario: Terminal width regression
- **WHEN** a scenario resizes the CLI to a narrow supported width
- **THEN** it SHALL verify that required navigation and add-agent actions remain reachable

#### Scenario: Physical wheel-equivalent action
- **WHEN** a scenario exercises wheel behavior
- **THEN** it SHALL originate a host wheel event through the same platform input path used by AddOne and SHALL NOT inject a pre-encoded child mouse report as proof of physical-wheel behavior

### Requirement: Generic terminal native parity blocks later product work
Before later shell, managed-agent, or multi-agent features proceed, the release gate SHALL compare identical terminal workloads launched directly and through AddOne's application-agnostic terminal pipeline. The corpus SHALL include synchronized and unsynchronized output, shell scrolling, rapidly changing progress or status rows, cursor-only epilogues, alternate-screen applications, colors and Unicode, resize, sustained output, and host-output backpressure. Pi SHALL be one mandatory real CLI workload, but no production renderer branch or acceptance exception SHALL depend on Pi identity, arguments, or visible content.

#### Scenario: One source commit arrives in multiple writes
- **WHEN** a corpus workload emits one logical visual update as multiple PTY writes
- **THEN** the direct and hosted committed-frame traces SHALL show equivalent visible progression and AddOne SHALL produce at most one visible host transaction for that source commit

#### Scenario: Generic CLI changes fixed and generated rows
- **WHEN** any corpus application scrolls generated content while updating progress, footer, status, or cursor rows
- **THEN** direct and hosted runs SHALL expose equivalent committed frames without an intermediate blank, shifted, stale, or partially redrawn row

#### Scenario: Host output applies backpressure
- **WHEN** sustained terminal output fills the host write queue
- **THEN** AddOne SHALL bound memory, await host drain, preserve ordered scroll/screen operations, merge only superseded state, and converge to the same terminal state without irregular stale-frame replay

#### Scenario: Renderer has a CLI-specific branch
- **WHEN** architecture validation finds terminal-core behavior selected from an executable name, CLI argument, CLI-named environment variable, or visible content
- **THEN** the generic terminal parity gate SHALL fail even if the corresponding Pi scenario appears to pass

### Requirement: Fullscreen Native Pi parity is release-gated across supported platforms
The terminal-host baseline SHALL be exercised on Windows 11 x64 with Windows Terminal and system ConPTY, current Ubuntu LTS x64 with a UTF-8 xterm-compatible terminal, and current and previous macOS arm64 with a UTF-8 xterm-compatible terminal. Every Native Pi behavior declared cross-platform SHALL have deterministic coverage where possible and a packaged real-Pi gate on each supported platform before release.

#### Scenario: One supported platform fails
- **WHEN** a release candidate passes Native Pi parity on two supported platforms but fails a required behavior on the third
- **THEN** the candidate SHALL remain release-blocked and SHALL NOT describe that platform as parity-complete

#### Scenario: Platform-specific encoding differs
- **WHEN** equivalent physical input uses different host or child byte encodings across platforms
- **THEN** the parity gate SHALL compare semantic event identity, child-observable behavior, rendered state, and restored host state rather than requiring unrelated host encodings to be byte-identical

### Requirement: The first walking skeleton validates direct-versus-hosted fullscreen terminal parity
The test system SHALL exercise the real AddOne command, UI-to-supervisor boundary, host-input adapter, virtual terminal, and child PTY path while substituting a deterministic Native Pi fixture for transport scenarios. It SHALL run equivalent direct and AddOne-hosted cases and compare normalized cells, styles, cursor, effective child terminal modes, semantic host inputs, protocol-correct child effects, resize behavior, host-mode isolation, and visible-frame stability without model or network access.

#### Scenario: Validate immediate fullscreen launch without an intro
- **WHEN** the walking-skeleton scenario launches `addone`
- **THEN** it SHALL verify that Native Pi starts immediately without a second user action, that no AddOne intro, logo, version, blank alternate-screen prelude, or shell frame is published, and that Pi occupies every terminal row and column

#### Scenario: Validate color and attribute parity
- **WHEN** the deterministic fixture paints indexed colors, truecolor foregrounds and backgrounds, text attributes, Unicode-width cells, cursor changes, and alternate-screen transitions
- **THEN** the direct and AddOne-hosted normalized checkpoints SHALL preserve equivalent visible terminal state

#### Scenario: Validate protocol-correct keyboard and paste input
- **WHEN** the scenario sends ordinary keys, Native Pi shortcuts including Ctrl+C, escape, UTF-8 text, and paste events after handoff
- **THEN** the fixture SHALL observe each semantic event exactly once, in order, with modifiers and text preserved and with encoding appropriate to the effective child keyboard and bracketed-paste state

#### Scenario: Validate Pi-controlled mouse interaction
- **WHEN** the fixture enables supported mouse reporting and the scenario originates physical-equivalent clicks, motion, and wheel actions across the viewport
- **THEN** the fixture SHALL observe equivalent direct and AddOne-hosted child mouse effects and full-viewport coordinates without the test pre-encoding the expected child report

#### Scenario: Simulate wheel scrolling separately from arrow-key history
- **WHEN** the deterministic fullscreen fixture exposes a scrollable transcript and editor-message history under mouse-reporting, alternate-scroll, and host-scroll states
- **THEN** equivalent direct and AddOne-hosted physical wheel actions SHALL follow the effective state without becoming ordinary Up or Down keys, while explicit Up and Down key actions SHALL navigate the fixture's editor history

#### Scenario: Simulate repeated Ctrl+C terminal restoration
- **WHEN** the deterministic direct and AddOne-hosted cases begin over known pre-launch terminal content and the fixture exits through repeated Ctrl+C
- **THEN** both cases SHALL restore equivalent pre-launch content and modes, and a shell launched afterward through the same host terminal SHALL accept typing, cursor movement, Backspace, Delete, and command submission without visibly leaked control payloads

#### Scenario: Validate full-viewport resize
- **WHEN** the scenario resizes the outer PTY after Native Pi starts
- **THEN** the child SHALL receive the same complete dimensions as the outer PTY and the rendered surface SHALL match those dimensions without chrome offsets

#### Scenario: Validate flicker-free output
- **WHEN** the fixture emits rapid partial updates followed by an idle interval
- **THEN** captured frames and output diagnostics SHALL show ordered virtual-terminal updates, no intermediate whole-screen clear or stale frame, no raw child control-sequence passthrough, and no unchanged periodic repaint during the idle interval

#### Scenario: Validate atomic generated-content presentation
- **WHEN** an application-agnostic fixture emits synchronized and unsynchronized multi-write updates that repeatedly scroll generated content while replacing a fixed footer, progress, or status row
- **THEN** direct and hosted committed-frame timelines SHALL remain equivalent, every physical host scroll and associated exposed text and cursor damage SHALL occur in one balanced AddOne-owned transaction, and no fixed render timer or CLI-specific rule SHALL be used

#### Scenario: Validate child protocol isolation
- **WHEN** the fixture enters and leaves alternate screen and enables or disables mouse, keyboard, paste, focus, cursor, synchronized-output, and Win32 input modes
- **THEN** the harness SHALL prove that only the virtual child state changes while the physical host remains under AddOne ownership and returns exactly to its captured state on exit

#### Scenario: Child fixture exits
- **WHEN** the deterministic Pi fixture exits with a configured status
- **THEN** the scenario SHALL verify that the foreground AddOne UI restores outer terminal modes and exits with the fixture outcome

### Requirement: Native-terminal corrections pass deterministic simulation before user validation
Every correction to fullscreen Native Pi input, scrolling, mode handoff, or exit cleanup SHALL first have a deterministic direct-versus-AddOne simulation that fails on the regression and passes on the correction. The applicable simulation SHALL be mandatory in automated validation before packaged-real-Pi comparison or manual user validation is requested.

#### Scenario: Simulation remains failing
- **WHEN** the deterministic wheel/history or repeated-Ctrl+C restoration scenario fails
- **THEN** the correction SHALL remain unvalidated and SHALL NOT be handed to the user for manual acceptance

#### Scenario: Simulation passes
- **WHEN** the deterministic correction scenarios pass with retained input, mode, frame, and raw-output evidence
- **THEN** validation MAY proceed to the packaged direct-versus-AddOne real-Pi gate before requesting manual user acceptance

### Requirement: Packaged candidates prove real Pi fullscreen usability
The release gate SHALL install the candidate AddOne package into an isolated temporary prefix and exercise an exactly identified real Pi runtime without model or network access. It SHALL launch the same absolute Pi executable, vanilla default interaction arguments, environment, terminal type, dimensions, and interaction timeline directly and through the packaged AddOne command. Synthetic fixtures SHALL remain terminal-transport oracles but SHALL not be accepted as proof that real Pi is usable.

#### Scenario: Real Pi reaches interactive readiness
- **WHEN** direct and AddOne-hosted real Pi start in isolated fullscreen, offline, approved, non-session mode
- **THEN** both SHALL reach a recognizable interactive state containing Pi's editor and applicable startup or footer content before the deadline, and an empty or cursor-only frame SHALL fail

#### Scenario: Real Pi accepts editor input
- **WHEN** the scenario types deterministic text into direct and AddOne-hosted Pi
- **THEN** normalized frames SHALL show equivalent editor content, styles, cursor state, active screen, and terminal modes without invoking a model

#### Scenario: Real Pi opens a native dialog
- **WHEN** the scenario opens and interacts with a built-in Pi dialog such as settings and then returns to the editor
- **THEN** the direct and AddOne-hosted checkpoints SHALL remain equivalent and every input SHALL be consumed exactly once

#### Scenario: Real Pi distinguishes physical wheel scrolling from arrow-key history
- **WHEN** direct and AddOne-hosted Pi contain a scrollable transcript and editor history
- **THEN** physical-wheel-equivalent actions sent through each host-input path SHALL scroll the transcript without recalling prior editor messages, explicit Up and Down keys SHALL retain Pi's history behavior, and stable checkpoints SHALL remain equivalent

#### Scenario: Real Pi exits through repeated Ctrl+C
- **WHEN** direct and AddOne-hosted Pi are launched over known terminal content and receive the same repeated Ctrl+C clear-and-exit interaction
- **THEN** both SHALL restore equivalent prior terminal content and modes without visible raw, Win32-input, or terminal-control text

#### Scenario: Parent shell remains usable after packaged Pi
- **WHEN** packaged AddOne returns after Pi's normal or repeated-Ctrl+C quit flow
- **THEN** a shell using the same host terminal SHALL accept normal typing, left and right movement, Backspace, Delete, command execution, and output before the scenario may pass

#### Scenario: Packaged Pi exits normally
- **WHEN** the scenario invokes Pi's normal quit flow
- **THEN** the packaged AddOne foreground process SHALL restore terminal state and exit without requiring test-process or user cleanup

#### Scenario: Packaged vanilla selection remains host-native
- **WHEN** the scenario selects vanilla Pi transcript or editor text and presses Ctrl+C while that host selection is active
- **THEN** direct and AddOne-hosted runs SHALL use equivalent selection painting, show no AddOne-specific or false Pi `Copied!` augmentation, dismiss the selection without clearing editor text, and preserve normal copy behavior

#### Scenario: Packaged interaction speed matches vanilla Pi
- **WHEN** the scenario sends a timed rapid typing burst and one physical wheel notch
- **THEN** AddOne SHALL add no fixed 50 millisecond render delay and the wheel SHALL move the same three rows observed in direct vanilla Pi

#### Scenario: Packaged vanilla scrollback remains native and stable
- **WHEN** generated output pushes selected content beyond its prior viewport row
- **THEN** direct and AddOne-hosted runs SHALL retain a native host scrollbar, move the selection with its content, emit equivalent scroll distance, and avoid whole-viewport repaint flicker

#### Scenario: Packaged Pi status and text updates are atomic
- **WHEN** packaged real Pi output causes normal-screen scrolling together with footer, status, text, or cursor damage
- **THEN** the hosted renderer SHALL enclose each physical scroll and related damage in one balanced host synchronized-output transaction while retaining direct-equivalent rapid editor latency

#### Scenario: Packaged Pi restores cursor shape
- **WHEN** packaged AddOne exits back to the parent shell
- **THEN** the parent cursor SHALL use the terminal's default shape and visibility as it does after directly launched Pi

#### Scenario: Packaged Pi preserves native resume-hint spacing
- **WHEN** direct Pi prints a `To resume this session:` hint with one blank row before it and one blank row after it before the parent prompt
- **THEN** packaged AddOne SHALL preserve the same row spacing from child output and SHALL NOT inject a restoration newline or relocate blank rows

### Requirement: V2-derived behavior uses a deferred extension-enabled PTY oracle
The later v2 migration suite SHALL pin an exactly identified Pi runtime and v2 extension profile, launch that combination directly and through AddOne's PTY simulation with identical arguments, environment, terminal type, dimensions, and interaction timeline, and compare normalized terminal and process observations. Historical screenshots MAY be retained as diagnostics but SHALL NOT be required or treated as normative assertions. This suite SHALL remain separate from and SHALL NOT block the initial vanilla Pi fullscreen release gate.

#### Scenario: Capture executable v2 behavior
- **WHEN** a catalogued v2 interaction is selected for later migration
- **THEN** the harness SHALL run the pinned extension-enabled Pi profile directly and through AddOne and retain identified checkpoints for cells, styles, cursor, active screen, terminal modes, input effects, timing, and process outcome

#### Scenario: V2 profile has not been prepared yet
- **WHEN** the pinned v2 extension profile or one of its executable scenarios is not yet available
- **THEN** the corresponding later migration work SHALL remain pending while the vanilla Pi release remains governed by its deterministic-fixture, packaged-real-Pi, and update-transition gates

#### Scenario: Screenshot differs from executable observation
- **WHEN** a historical screenshot differs from a reproducible run of the exactly identified v2 extension profile
- **THEN** the executable run and its retained identity and timeline SHALL define the behavioral baseline

### Requirement: AddOne update transitions are release-gating scenarios
The release gate SHALL exercise candidate installation and launch while a retained older AddOne supervisor cohort is running. It SHALL inspect process and release identity, negotiated control outcomes, active-generation continuity, activation state, and cleanup without shell-specific manual intervention.

#### Scenario: Update with a live older supervisor
- **WHEN** a candidate is installed and `addone` is launched while an N−1 supervisor owns a live terminal generation
- **THEN** AddOne SHALL use the matching retained UI or complete a safe replacement, and the scenario SHALL observe no malformed-message or protocol-version error

#### Scenario: Busy PTY defers candidate activation
- **WHEN** the N−1 supervisor owns a busy non-resumable PTY
- **THEN** the scenario SHALL verify that the old cohort remains usable, candidate activation is durably pending, and activation completes automatically after the PTY exits

#### Scenario: Stale endpoint has no live owner
- **WHEN** stale endpoint metadata or an unresponsive owner with no live generation remains from an older release
- **THEN** AddOne SHALL reconcile it through bounded platform-native cleanup and launch successfully without requesting a manual PID kill

#### Scenario: Installed files match candidate package
- **WHEN** the packaged-candidate scenarios start
- **THEN** their process inventory and release metadata SHALL prove that the bootstrap, UI, supervisor, and workers execute from the intended immutable release content rather than the development checkout

### Requirement: Development previews use one immutable publish-and-update workflow
AddOne SHALL provide one repository command that, from clean `develop`, selects the next unpublished `-dev.N` SemVer version, commits the package and lockfile bump, runs the available development-preview gates once, packs one exact tarball, publishes that tarball under npm tag `next` without recursively rerunning lifecycle gates, verifies the registry tag, and removes the local tarball only after success. The installed CLI SHALL map `update` to npm `latest` and `update:next` to npm `next`, and both SHALL use the same immediate replacement transaction.

#### Scenario: Publish another development preview
- **WHEN** a developer invokes the documented development-preview publication command from clean `develop`
- **THEN** AddOne SHALL create and commit the next immutable `-dev.N` version, validate once, publish its exact validated tarball under `next`, and report the command or artifact retained for retry if validation, authentication, or publication fails

#### Scenario: Update an installed preview
- **WHEN** the user runs `addone update:next` or `a1 update:next`
- **THEN** AddOne SHALL resolve npm tag `next` and complete the exact newer preview's immediate verified stop-install-activate transaction through npm's active global installation

#### Scenario: Stable update selects only stable content
- **WHEN** the user runs `addone update` or `a1 update`
- **THEN** AddOne SHALL resolve npm tag `latest`, perform the same immediate stop-install-activate transaction, and SHALL NOT opt the installation into development previews

#### Scenario: Inspect installed and channel versions hermetically
- **WHEN** unit and CLI-isolation tests invoke `addone version` and `a1 version` with deterministic npm responses or failures
- **THEN** both aliases SHALL report `Installed`, `Release`, and `Next` consistently without importing or creating interactive runtime, supervisor, PTY, native-module, database, endpoint, or release-state artifacts

### Requirement: Windows package replacement needs no manual cleanup
The packaged update suite SHALL exercise publication-equivalent stable and preview installation with immediate activation on Windows while the old installed cohort has loaded `conpty.node` and owns multiple terminal generations. It SHALL prove that mutable npm package files are replaceable after verified shutdown, old native modules came from immutable release content, stale prior-boot generation rows cannot block candidate activation, and the next launch uses the new release presentation. The scenario SHALL fail if success requires `taskkill`, PID discovery, global package surgery, release-state deletion, database deletion, or removal of the AddOne data directory outside the product command.

#### Scenario: Replace a running Windows stable or preview release
- **WHEN** a packaged N−1 AddOne release owns terminal generations and the test invokes either `a1 update` or `a1 update:next`
- **THEN** each command SHALL terminate only verified AddOne-owned processes, replace the npm package from its selected tag, activate the candidate, preserve durable data, and launch the new release without an old intro or retained old UI

#### Scenario: Prior supervisor died uncleanly
- **WHEN** update begins with dead endpoint ownership and nonterminal generation rows from the prior supervisor boot
- **THEN** automatic reconciliation SHALL remove those rows from liveness and activation decisions without deleting the control database

#### Scenario: Update transaction is interrupted at every durable phase
- **WHEN** faults are injected after shutdown intent, ownership release, npm replacement, materialization, certification, or active-reference commit
- **THEN** rerunning the same update command SHALL converge to one verified active cohort or one verified rollback cohort without mixed ownership or manual cleanup

### Requirement: Every failed scenario preserves reproducible evidence
A failed scenario SHALL preserve its scenario definition, semantic host-input timeline, encoded child-input timeline, package and immutable release identities, negotiated control features, runtime and profile identities, platform and terminal identity, process inventory, activation and ownership metadata, relevant process logs, supervisor events, child PTY output, host renderer output, virtual terminal frames and mode timeline, captured host console modes where applicable, session references, assertions, and failure summary.

#### Scenario: PTY assertion fails
- **WHEN** an expected terminal condition is not met before its deadline
- **THEN** the artifact bundle SHALL include the final surface and preceding relevant frames rather than only a timeout message

### Requirement: Pi compatibility is certified before promotion
The test system SHALL run a defined compatibility matrix against each candidate Managed Pi runtime and extension profile before that candidate can become approved for new or migrated agents. Runtime and package identity SHALL come from installed manifests, lockfiles, and installation digests rather than a duplicated test version constant.

#### Scenario: Candidate changes RPC event shape
- **WHEN** the adapter contract suite cannot normalize a candidate Pi event or response
- **THEN** certification SHALL fail and the approved runtime SHALL remain unchanged

#### Scenario: Candidate preserves compatibility
- **WHEN** the candidate passes startup, prompt, tool, extension, exact-session recovery, and shutdown scenarios
- **THEN** the candidate MAY be marked approved without migrating existing agents automatically

### Requirement: Deterministic assertions remain the primary release oracle
Release-gating requirements with deterministic representations SHALL be asserted by code, while evaluator-agent judgments SHALL supplement those assertions for usability and visual-semantic regressions.

#### Scenario: Deterministic requirement fails but evaluator approves
- **WHEN** an evaluator agent reports success but a deterministic session-continuity assertion fails
- **THEN** the scenario SHALL remain failed

### Requirement: An independent evaluator can inspect candidate PTYs
The test system SHALL support a known-good evaluator agent that is isolated from the candidate process and can observe terminal snapshots, send controlled input, wait for states, request fault injection, and submit a structured verdict with evidence.

#### Scenario: Evaluator detects confusing recovery UX
- **WHEN** deterministic lifecycle checks pass but the candidate presents an ambiguous recovery interaction
- **THEN** the evaluator SHALL be able to fail or flag the scenario with referenced frames and a requirement-oriented explanation

#### Scenario: Candidate agent is broken
- **WHEN** the candidate's embedded or managed agent cannot operate correctly
- **THEN** the independent evaluator SHALL remain operational because it runs under a separately pinned known-good runtime

### Requirement: Regressions become permanent scenarios
A confirmed production or evaluator-discovered regression SHALL be representable as a reproducible fixture or scenario that runs independently of the original user environment.

#### Scenario: Regression is fixed
- **WHEN** a regression fix is accepted
- **THEN** its scenario SHALL pass on the fixed build and remain in the applicable regression suite
