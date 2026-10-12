## Purpose

Defines the separately gated terminal-hosted authority for A1 workspace tabs containing independently retained interactive CLI panes inside an existing terminal.

## ADDED Requirements

### Requirement: Composed topology distinguishes tabs, panes, and terminal sessions
A composed workspace tab SHALL own a revisioned split-tree layout. Each leaf pane SHALL reference exactly one terminal session, and each terminal session SHALL own one exact executable, arguments, environment, working directory, platform pseudoterminal, process-tree identity, dimensions, terminal state, and lifecycle policy. A tab MAY contain one pane or multiple panes, including a 2×2 layout.

#### Scenario: Create a four-pane tab
- **WHEN** A1 requests one tab with a valid 2×2 split tree and four terminal-session definitions
- **THEN** the terminal host SHALL create four distinct pane identities and four independently owned pseudoterminal sessions under that tab

#### Scenario: Launch an arbitrary CLI pane
- **WHEN** a validated pane request identifies an executable and arguments
- **THEN** the terminal host SHALL create one pseudoterminal session and launch the exact command without shell interpretation

#### Scenario: Platform capability is unavailable
- **WHEN** the platform cannot provide a required pseudoterminal, rendering, input, or lifecycle primitive
- **THEN** A1 SHALL reject composed launch as unsupported rather than fall back silently to a partial relay

#### Scenario: Production multipane layout is requested before isolated proof acceptance
- **WHEN** the owned fullscreen UI and structured agent tabs are accepted but the isolated-worker composed-terminal proof remains pending
- **THEN** A1 SHALL keep arbitrary CLI panes, split layouts, and multiplexer controls disabled even if the development terminal host can technically create them

### Requirement: The terminal host owns the complete terminal data path
For composed panes, the terminal host SHALL own pseudoterminal bytes, terminal interpretation and retained state, terminal query responses, keyboard/text/mouse/IME encoding, rendering, frame scheduling, and presentation to the containing terminal. A1's control plane SHALL exchange typed identity, topology, capability, lifecycle, and recovery messages and SHALL NOT relay terminal bytes, individual child input events, or rendered cell frames.

#### Scenario: Child emits fragmented terminal data
- **WHEN** a control sequence or Unicode grapheme spans multiple pseudoterminal reads
- **THEN** the terminal host SHALL preserve stream state and produce the same declared terminal result as an unfragmented stream

#### Scenario: Control plane restarts
- **WHEN** the A1 control plane restarts while the terminal host and terminal sessions survive
- **THEN** terminal I/O and rendering SHALL remain owned by the terminal host and reconnection SHALL use typed host state rather than replaying terminal bytes through A1

#### Scenario: A terminal feature is unsupported
- **WHEN** the selected native terminal implementation cannot provide a required behavior
- **THEN** A1 SHALL report the composed capability as unavailable or degraded and SHALL NOT insert a lightweight parser, renderer, or input translator as fallback

### Requirement: Topology mutations are revisioned and authoritative
The terminal host SHALL be authoritative for live composed window, tab, split, pane-focus, and pane-session topology. Mutating requests SHALL identify durable A1 entities and an expected topology revision, and the host SHALL either commit the complete mutation and publish a newer snapshot or reject it without a partial topology change.

#### Scenario: Apply a valid layout revision
- **WHEN** A1 requests a valid layout mutation against the current topology revision
- **THEN** the terminal host SHALL atomically commit it and return a newer revision with stable A1-to-native identity mappings

#### Scenario: Apply a stale layout revision
- **WHEN** A1 requests a layout mutation against an obsolete revision
- **THEN** the terminal host SHALL reject it and return or make available the current authoritative topology without partially applying the request

### Requirement: Input routes only to the focused composed pane
Keyboard, text, paste, focus, mouse, wheel, and resize interactions SHALL be encoded according to the focused pane's retained terminal modes and sent only to that pane's pseudoterminal. The terminal host SHALL own shortcut arbitration, clipping, overlays, selection, clipboard behavior, and IME composition for composed surfaces.

#### Scenario: User changes focus while typing
- **WHEN** pane focus changes between two input events
- **THEN** each event SHALL route atomically according to the focused pane at its native acceptance ordering point

#### Scenario: Mouse reporting is enabled
- **WHEN** the focused terminal declares a supported mouse mode and the user interacts inside its viewport
- **THEN** the terminal host SHALL encode the declared mouse protocol with coordinates relative to that pane

#### Scenario: User selects terminal text
- **WHEN** selection mode consumes pointer or keyboard interaction
- **THEN** the terminal host SHALL update pane-scoped selection and clipboard state without leaking the interaction to another pane

### Requirement: Visible and inactive panes have explicit bounded lifecycles
Every pane SHALL declare whether it remains visible, remains live but unpainted, pauses display processing, suspends where safely supported, or terminates. Non-focused panes that remain visible in a grid SHALL continue independent rendering; hidden panes SHALL retain authority according to policy. Per-pane and global limits SHALL prevent one session from exhausting the workspace.

#### Scenario: Four visible panes produce output
- **WHEN** four panes in a 2×2 layout emit output concurrently
- **THEN** each pane SHALL update and present independently without borrowing state, dimensions, damage, or input from another pane

#### Scenario: Live hidden pane continues
- **WHEN** a live-retained pane becomes hidden because its tab is inactive
- **THEN** its process and terminal model SHALL continue under bounded output and memory limits while remaining unpainted

#### Scenario: Inactive pane exceeds limits
- **WHEN** a hidden pane exceeds its declared retained-output or resource budget
- **THEN** A1 SHALL apply a documented compaction, backpressure, pause, or termination outcome and report it without corrupting other panes

### Requirement: Reconnection uses retained native authority
A reconnectable composed session SHALL bind durable A1 tab, pane, and terminal-session identities to a compatible terminal-host instance, verified pseudoterminal/process ownership, and authoritative retained terminal state. If any required authority is lost, A1 SHALL report visual reconnection unavailable rather than reconstruct state from logs or lifecycle metadata.

#### Scenario: Control plane reconnects to a surviving host
- **WHEN** host protocol compatibility, durable mappings, process ownership, pseudoterminal channels, dimensions, and retained terminal state are verified
- **THEN** A1 SHALL restore control of the authoritative topology without replay duplication

#### Scenario: Terminal authority was lost
- **WHEN** a process survives but its terminal host, pseudoterminal channel, or retained terminal state is unavailable
- **THEN** A1 SHALL refuse visual reconnection and offer only declared cleanup or diagnostic actions

### Requirement: Composed panes are isolated from each other
Process identity, pseudoterminal handles, byte streams, retained terminal state, terminal modes, dimensions, selection, clipboard transfer, input queues, rendering resources, cleanup, and diagnostics SHALL be scoped by pane and terminal-session identity. Failure or malicious output in one pane SHALL NOT mutate another pane's state or receive its input.

#### Scenario: One terminal stream is malformed
- **WHEN** one pane produces unsupported or malformed terminal data
- **THEN** the terminal host SHALL bound and isolate the failure to that pane while preserving diagnostics and the other panes

#### Scenario: One process tree is stopped
- **WHEN** the user stops a composed pane
- **THEN** A1 SHALL terminate only verified resources owned by that pane and preserve every other pane

#### Scenario: Terminal host fails
- **WHEN** the terminal host exits abnormally
- **THEN** the A1 control plane and structured agents SHALL remain available and each affected composed pane SHALL enter an explicit discontinuous or failed state

### Requirement: An in-terminal 2×2 proof gate precedes composed integration
Before composed-terminal production integration into `develop`, an isolated proof SHALL demonstrate one fullscreen composed surface inside an existing terminal, one tab, four independently PTY-backed panes in a 2×2 layout, and terminal-hosted rendering and input without routing terminal bytes through A1 or opening a separate desktop window. The fixed geometry and dashed pane chrome SHALL be treated only as disposable proof scaffolding. The proof SHALL record pinned source revisions, exact artifact integrity, workloads, latency and resource measurements, paint/resize diagnostics, cleanup outcomes, and a user-controlled manual verdict or isolated-worker physical verdict.

#### Scenario: Automated proof is technically successful
- **WHEN** four-pane output, focus/input routing, resize, DPI, IME, paste, mouse, alternate-screen, abnormal-exit, and cleanup checks pass with recorded measurements
- **THEN** composed integration SHALL remain blocked until the exact proof artifact also receives an accepted manual or isolated-worker physical verdict

#### Scenario: Proof fails acceptance criteria
- **WHEN** the spike exhibits unacceptable flicker, latency, input routing, resizing, rendering, or cleanup behavior
- **THEN** A1 SHALL stop the composed integration path and SHALL NOT merge it by weakening the proof criteria, continuing custom rendering/input remediation, or substituting a desktop application

#### Scenario: Structured work proceeds while proof is pending
- **WHEN** the terminal-host proof is postponed, incomplete, or unsuccessful
- **THEN** fullscreen owned-UI and structured-agent-tab work MAY proceed independently without launching the terminal host or claiming composed-terminal support

#### Scenario: Structured UI checkpoint is published while proof is pending
- **WHEN** fullscreen owned-UI and structured-tab acceptance passes before isolated composed proof
- **THEN** A1 MAY publish that independent development checkpoint under npm `next` only with the terminal host absent or disabled in normal use, composed multipane behavior unavailable, and no composed-terminal support claim

#### Scenario: Proof verdict is recorded
- **WHEN** task 5.10 records the accepted or failed verdict for the exact 2×2 artifact
- **THEN** A1 SHALL preserve the evidence, remove the fixed multipane presentation from the shipping path, and restore a one-session fullscreen terminal-host path

### Requirement: Composed support is certified per platform and exact package
After the spike permits integration, stable composed support claims SHALL require hermetic host-protocol, topology, input, lifecycle, and isolation tests plus isolated disposable-worker certification on each claimed platform against exact packaged bytes and application-independent workloads. Desktop automation SHALL NOT run on an active user workstation.

#### Scenario: Only automated integration tests pass
- **WHEN** host protocol, topology, input-routing, and lifecycle suites pass without isolated physical certification
- **THEN** A1 SHALL NOT claim stable physical terminal parity for composed panes

#### Scenario: One platform is certified
- **WHEN** the exact package passes isolated-worker gates on one operating system
- **THEN** certification SHALL apply only to that platform and package integrity
