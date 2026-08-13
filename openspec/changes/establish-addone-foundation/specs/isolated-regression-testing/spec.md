## Purpose

Defines independent, isolated validation for AddOne lifecycle, updates, transparent terminal parity, composed terminal behavior, packaged artifacts, and confirmed regressions without treating a product-like simulator as proof of real terminal behavior.

## ADDED Requirements

### Requirement: Scenarios run in hermetic instances
Each full-system scenario SHALL isolate application state, supervisor storage, runtime paths, Pi configuration, sessions, endpoints, workspace, environment, artifacts, and owned process trees.

#### Scenario: Run scenarios concurrently
- **WHEN** two scenarios execute at the same time
- **THEN** neither SHALL discover, control, or mutate the other's state or processes

#### Scenario: User configuration exists
- **WHEN** the machine contains normal Pi settings, extensions, sessions, and credentials
- **THEN** a hermetic scenario SHALL not load or mutate them unless explicitly imported as identified input

### Requirement: Physical-host automation is isolated from the user's desktop
Any automated scenario that launches, focuses, drives, resizes, captures, or closes a terminal window, injects operating-system input, changes interactive desktop state, or cleans up terminal processes SHALL execute only inside a dedicated disposable worker or virtual machine with an exclusive interactive test desktop and no user-owned applications. The runner SHALL verify that isolation before the first process launch. It SHALL track test-owned processes by exact process and start identity, limit cleanup to that owned process tree, and SHALL NOT terminate processes by broad executable name, wildcard, terminal application identity, or unverified ownership.

#### Scenario: Safe isolation is unavailable
- **WHEN** a physical-host scenario cannot prove that it owns a dedicated isolated worker and exclusive interactive desktop
- **THEN** it SHALL produce a blocked or skipped verdict with diagnostics without launching, focusing, driving, resizing, or closing any terminal or injecting any desktop input

#### Scenario: Development workstation is active
- **WHEN** an agent invokes a physical-host gate from a workstation containing the user's interactive session and applications
- **THEN** the workstation MAY act only as a non-interactive controller for an already isolated worker and SHALL NOT host any terminal window or application process created by the gate

#### Scenario: Physical-host cleanup runs
- **WHEN** a physical-host scenario completes, fails, or times out
- **THEN** cleanup SHALL stop only the exact process tree created and recorded by that scenario inside its isolated worker and SHALL leave every pre-existing or unverified process untouched

### Requirement: Architecture-independent tests survive terminal replacement
Domain, storage, release-cohort, update-transaction, protocol framing, package identity, dependency-policy, and non-terminal lifecycle tests SHALL remain mandatory when they do not encode assumptions from the retired terminal pipeline.

#### Scenario: Legacy terminal implementation is removed
- **WHEN** the old renderer, mode tracker, input translator, or terminal simulator is deleted
- **THEN** architecture-independent tests SHALL continue to validate their owned contracts without importing retired terminal modules

### Requirement: Retired terminal tests are removed before replacement implementation
Before a replacement terminal stack is implemented, AddOne SHALL remove executable tests and fixtures whose purpose is to validate the retired custom renderer, inferred frame scheduler, startup-origin compensation, regex mode/query handling, custom Win32/Kitty/modifyOtherKeys translation, framebuffer-derived damage, manually serialized cells, ConPTY fallbacks, or simulations that reproduce those product assumptions. Historical failure descriptions MAY remain as non-executable evidence, but SHALL NOT impose obsolete implementation details on the replacement.

#### Scenario: A test encodes a retired workaround
- **WHEN** a test expects a cadence constant, origin offset, reconstructed VT sequence, custom terminal mode, synthetic Win32 record, or old damage shape
- **THEN** the cleanup phase SHALL delete or archive it as non-executable evidence rather than porting it to the replacement

#### Scenario: Coverage decreases during cleanup
- **WHEN** deleting invalid terminal tests lowers line or branch coverage
- **THEN** cleanup SHALL remain valid and SHALL NOT retain self-confirming tests solely to preserve a coverage metric

### Requirement: Terminal acceptance uses an independent physical-host oracle
Transparent terminal rendering, character presentation, input identity, selection, clipboard, scrollback, mouse, resize, modes, latency, and restoration SHALL be validated through actual supported host-terminal behavior. A test-side encoder, mode tracker, framebuffer emulator, or production-equivalent parser SHALL NOT be the sole acceptance oracle for the behavior it models.

#### Scenario: Validate Windows keyboard identity
- **WHEN** the Windows parity gate exercises Ctrl+A through Ctrl+Z, modified and printable keys, repeat and release, paste, focus, arrows, mouse, and wheel
- **THEN** evidence SHALL originate through Windows Terminal and the operating-system input path rather than a test function that synthesizes the expected child encoding

#### Scenario: Validate physical rendering
- **WHEN** direct and AddOne-hosted workloads render text, Unicode graphemes, width-sensitive cells, colors, attributes, cursor changes, scrolls, selection, and alternate-screen content
- **THEN** the gate SHALL compare independently captured physical-host observations and child effects instead of comparing two instances of the same AddOne terminal model

### Requirement: Cross-platform gates use an application-independent terminal corpus
Terminal certification SHALL run on Windows 11 x64, current Ubuntu LTS x64, and current and previous macOS arm64 using the native host-terminal path for each platform. The corpus SHALL include Native Pi, an interactive shell, a text editor or equivalent full-input workload, a pager or scrollback workload, an alternate-screen application, and at least one unrelated interactive/fullscreen CLI. No application SHALL receive a weaker assertion or production workaround selected by its identity or content.

#### Scenario: Pi passes but another application fails
- **WHEN** Native Pi passes while a generic corpus application exposes a rendering, character, input, mode, resize, latency, or restoration defect
- **THEN** the affected terminal capability and platform SHALL remain uncertified

#### Scenario: A proposed fix targets one executable
- **WHEN** implementation or architecture validation detects behavior selected by executable, arguments, CLI-named environment, or visible text
- **THEN** the generic corpus gate SHALL fail even if that application's focused scenario passes

#### Scenario: Supported platforms differ internally
- **WHEN** Windows, macOS, and Linux use different native process, terminal, or input facilities
- **THEN** each platform MAY use its native adapter while preserving the same application-independent observable contract

### Requirement: Transparent parity is compared directly against native execution
The transparent gate SHALL run the same exact command, arguments, environment, dimensions, host terminal, and physical interaction directly and through AddOne. It SHALL verify that AddOne introduces no input translation, output reconstruction, repaint scheduling, terminal-query synthesis, or application frame after handoff.

#### Scenario: Compare Native Pi interaction
- **WHEN** direct and transparent Native Pi exercise startup, editor input, Ctrl+C, Ctrl+P, all control keys, paste, focus, arrows, selection, clipboard, mouse, wheel, dialogs, resize, normal exit, repeated-Ctrl+C exit, and parent-shell editing
- **THEN** independently observed behavior SHALL be equivalent and Ctrl+C SHALL never cause the Ctrl+P model-cycle effect

#### Scenario: Compare latency
- **WHEN** the gate measures input-to-child and input-to-visible-effect latency over repeated direct and transparent runs
- **THEN** it SHALL report distributions and fail any AddOne-specific batching, emulation, protocol, or repaint delay outside the declared physical-host tolerance

#### Scenario: Compare character rendering
- **WHEN** the workload includes combining marks, wide and ambiguous-width graphemes, emoji sequences, indexed and truecolor styles, defaults, erases, and cursor shapes
- **THEN** physical-host output SHALL remain equivalent to direct execution without an AddOne cell reserializer

### Requirement: Raw-relay experiments must prove parity independently
A raw PTY relay SHALL remain an experimental alternative until it passes the complete transparent physical-host matrix. A shadow terminal model MAY collect diagnostics but SHALL NOT determine acceptance.

#### Scenario: Nested PTY changes behavior
- **WHEN** a raw relay changes input identity, selection, scrollback, mouse, character rendering, terminal modes, latency, or restoration compared with direct attachment
- **THEN** AddOne SHALL reject raw relay as the transparent production baseline

### Requirement: Composed terminal candidates pass a generic conformance matrix
Each composed candidate SHALL be evaluated as a complete authoritative terminal boundary before integration. The matrix SHALL cover supported control sequences, screens, scrollback, graphemes, widths, colors, styles, cursor, terminal queries, keyboard protocols, paste, focus, mouse, wheel, resize, sustained output, backpressure, exit, and reconnection without application-specific acceptance rules.

#### Scenario: Candidate requires a second terminal model
- **WHEN** a candidate cannot provide required authoritative state or operations without restoring AddOne regex trackers, custom encoders, query interception, or framebuffer inference
- **THEN** the candidate SHALL fail evaluation

#### Scenario: Unsynchronized application emits multiple writes
- **WHEN** a composed candidate receives output without an explicit atomic boundary
- **THEN** the gate SHALL require ordered direct-compatible progression and no AddOne-created clear, stale overwrite, or redundant repaint, but SHALL NOT require the candidate to infer an unknowable source commit

#### Scenario: Synchronized output is emitted
- **WHEN** the application supplies a supported synchronized-output boundary
- **THEN** the candidate SHALL preserve the transaction atomically

### Requirement: Packaged candidates validate exact production artifacts
Publication validation SHALL pack once, bind evidence to source commit, version, integrity, platform, runtime identity, capability, and default inventory, install that exact artifact, and run applicable architecture-independent plus terminal capability gates before uploading the same bytes.

#### Scenario: Packaged transparent Native Pi starts
- **WHEN** the exact candidate is installed and launches the identified Native Pi runtime under production defaults
- **THEN** its foreground process, terminal attachment, interaction, exit, and parent restoration SHALL pass the transparent physical-host gate

#### Scenario: Candidate bytes change after certification
- **WHEN** package integrity differs from the certified artifact
- **THEN** packaging or publication SHALL fail and require certification of the new bytes

### Requirement: Supported platforms receive separate machine-readable verdicts
Windows 11 x64, current Ubuntu LTS x64, and current and previous macOS arm64 SHALL each produce capability-specific machine-readable verdicts. Transparent success SHALL NOT certify composed mode, and one platform's result SHALL NOT certify another.

#### Scenario: One capability is pending
- **WHEN** transparent mode passes but composed mode has not completed evaluation
- **THEN** the release SHALL identify transparent support only and later pane or reconnection features SHALL remain blocked

### Requirement: Update transitions remain release-gating scenarios
Stable and preview update gates SHALL exercise exact target resolution, verified owned-process shutdown, mutable-package unlock, immutable materialization, activation, endpoint verification, transaction recovery, and rollback without manual PID or state deletion.

#### Scenario: Update with live owned processes
- **WHEN** `a1 update` or `a1 update:next` runs while an older verified cohort is active
- **THEN** AddOne SHALL complete or safely roll back one durable stop-install-activate transaction without mixed ownership

#### Scenario: Update is interrupted
- **WHEN** a fault occurs at a durable update phase
- **THEN** rerunning the command SHALL converge to one verified active or rollback cohort

### Requirement: AddOne releases contain no deprecated dependencies
The exact AddOne production, development, build, test, optional, and native dependency graph SHALL contain no package marked deprecated by its package registry.

#### Scenario: A transitive package is deprecated
- **WHEN** registry metadata marks a reachable dependency deprecated
- **THEN** packaging and publication SHALL fail with its dependency path

### Requirement: Every failed gate preserves reproducible evidence
A failed gate SHALL preserve its capability, exact artifact identity, platform and host-terminal identity, runtime identity, physical action timeline, process inventory, relevant native observations, output captures, lifecycle events, assertions, and concise failure classification.

#### Scenario: Physical parity fails
- **WHEN** direct and AddOne-hosted observations differ
- **THEN** evidence SHALL identify the first divergent physical action or visible state without requiring the retired simulator to explain the cause

### Requirement: Confirmed regressions receive architecture-appropriate coverage
Every confirmed regression SHALL preserve sufficient evidence and gain the smallest independent test capable of detecting its cause under the active architecture. A unit test SHALL be used for pure contracts; a real integration or physical-host gate SHALL be used when the behavior exists only at that boundary. A synthetic reproduction SHALL NOT be mandatory when synthesis would duplicate the production mechanism being tested.

#### Scenario: Regression crosses the physical terminal boundary
- **WHEN** a rendering or input defect cannot be represented independently in a unit test
- **THEN** AddOne SHALL retain it in the physical-host or packaged integration gate rather than creating a self-modelled terminal simulation

#### Scenario: Regression belongs to core logic
- **WHEN** a defect is isolated to a deterministic domain, storage, protocol, release, or update contract
- **THEN** AddOne SHALL add a focused deterministic test and run its containing gate

### Requirement: Every retained or newly added test is executed
A test changed or introduced during cleanup or replacement SHALL pass both focused execution and its containing mandatory gate before its task is complete. Deleted invalid tests SHALL not require replacement until the new architecture defines an independent contract for that behavior.

#### Scenario: Focused test passes but containing gate fails
- **WHEN** the focused command succeeds and its required integration, package, or release gate fails
- **THEN** the task SHALL remain incomplete

### Requirement: Deterministic assertions remain authoritative where valid
Architecture-independent deterministic assertions SHALL remain primary for the contracts they can represent. Independent evaluator findings MAY supplement them but SHALL NOT override a deterministic failure.

#### Scenario: Evaluator approves a failing lifecycle transition
- **WHEN** evaluator inspection reports success but an authoritative update or ownership assertion fails
- **THEN** the gate SHALL remain failed
