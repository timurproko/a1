## Purpose

Defines the terminal authority required for AddOne-managed tabs that retain and switch arbitrary interactive CLI surfaces independently of transparent direct attachment.

## ADDED Requirements

### Requirement: Every composed tab owns an exact pseudoterminal session
A composed-terminal tab SHALL own one exact executable, arguments, environment, working directory, platform pseudoterminal, process tree identity, dimensions, terminal state, and lifecycle policy. Launch SHALL be application-agnostic and SHALL NOT use shell interpretation or executable-specific terminal workarounds.

#### Scenario: Launch an arbitrary CLI tab
- **WHEN** a validated tab request identifies an executable and arguments
- **THEN** AddOne SHALL create one isolated pseudoterminal session and launch the exact command without shell interpretation

#### Scenario: Platform capability is unavailable
- **WHEN** the platform cannot provide a required pseudoterminal or lifecycle primitive
- **THEN** AddOne SHALL reject composed launch as unsupported rather than fall back silently to a partial relay

### Requirement: AddOne owns composed terminal interpretation and rendering
For composed tabs, AddOne SHALL parse the original terminal byte stream into a retained terminal model and render the selected surface. The model SHALL cover cursor, attributes, Unicode width, alternate screen, scrolling regions, modes, hyperlinks, synchronized output, resize, and terminal queries required by the declared compatibility level. It SHALL preserve byte ordering and SHALL NOT infer application frames from quiescence or content.

#### Scenario: Child emits fragmented control sequences
- **WHEN** a control sequence or Unicode grapheme spans multiple reads
- **THEN** the parser SHALL preserve stream state and produce the same declared terminal-model result as an unfragmented stream

#### Scenario: Inactive tab emits output
- **WHEN** a non-selected tab writes output
- **THEN** AddOne SHALL update that tab's retained model without painting it into the selected viewport

#### Scenario: Selected viewport resizes
- **WHEN** the available tab viewport changes dimensions
- **THEN** AddOne SHALL resize the pseudoterminal and retained model according to one documented ordering contract without cross-tab dimensions

### Requirement: Input routes only to the selected composed tab
Keyboard, text, paste, focus, mouse, wheel, and resize interactions SHALL be encoded according to the selected tab's retained terminal modes and sent only to that tab. AddOne SHALL own shortcut arbitration, clipping, overlays, selection, and clipboard behavior for composed surfaces.

#### Scenario: User switches tabs while typing
- **WHEN** selection changes between two input events
- **THEN** each event SHALL route atomically according to the selected tab at its accepted ordering point

#### Scenario: Mouse reporting is enabled
- **WHEN** the selected terminal model declares a supported mouse mode and the user interacts inside the child viewport
- **THEN** AddOne SHALL encode the declared mouse protocol with coordinates relative to that viewport

#### Scenario: User selects terminal text
- **WHEN** selection mode consumes pointer or keyboard interaction
- **THEN** AddOne SHALL update AddOne-owned selection and clipboard state without leaking the interaction to another tab

### Requirement: Inactive surfaces have an explicit lifecycle
Each tab SHALL declare whether inactivity keeps the pseudoterminal live, pauses display only, suspends the process where safely supported, or terminates it. Switching SHALL preserve retained display and process state according to that policy, and bounded resource limits SHALL prevent inactive tabs from exhausting the workspace.

#### Scenario: Live inactive tab continues
- **WHEN** a live-retained tab becomes inactive
- **THEN** its process and terminal model SHALL continue under bounded output and memory limits while its surface remains unpainted

#### Scenario: Inactive tab exceeds limits
- **WHEN** an inactive tab exceeds its declared retained-output or resource budget
- **THEN** AddOne SHALL apply a documented compaction, backpressure, pause, or termination outcome and report it without corrupting other tabs

### Requirement: Reconnection uses retained authority, not screen scraping
A reconnectable composed session SHALL bind durable tab identity to verified pseudoterminal/process ownership and an authoritative retained terminal model. If any required authority is lost, AddOne SHALL report visual reconnection unavailable rather than reconstruct state from logs or lifecycle metadata.

#### Scenario: Workspace reconnects to a surviving tab
- **WHEN** ownership, pseudoterminal channel, dimensions, parser state, and retained model are all verified
- **THEN** AddOne SHALL restore the tab surface and continue ordered input/output without replay duplication

#### Scenario: Terminal authority was lost
- **WHEN** the process survives but the pseudoterminal channel or parser/model state is unavailable
- **THEN** AddOne SHALL refuse visual reconnection and offer only declared stop or diagnostic actions

### Requirement: Composed tabs are isolated from each other
Process identity, pseudoterminal handles, byte streams, parser state, terminal modes, dimensions, selection, clipboard transfer, input queues, cleanup, and diagnostics SHALL be scoped by tab identity. Failure or malicious output in one tab SHALL NOT mutate another tab's state or receive its input.

#### Scenario: One parser rejects malformed input
- **WHEN** one tab produces unsupported or malformed terminal data
- **THEN** AddOne SHALL bound and isolate the failure to that tab while preserving diagnostics

#### Scenario: One process tree is stopped
- **WHEN** the user stops a composed tab
- **THEN** AddOne SHALL terminate only verified resources owned by that tab and preserve all other tabs

### Requirement: Composed support is certified per platform and exact package
Stable support claims SHALL require hermetic parser/model/input/lifecycle tests plus isolated disposable-worker certification on each claimed platform against exact packaged bytes and application-independent workloads. Desktop automation SHALL NOT run on an active user workstation.

#### Scenario: Only automated model tests pass
- **WHEN** parser, rendering-model, input-routing, and lifecycle suites pass without isolated physical certification
- **THEN** AddOne SHALL NOT claim stable physical terminal parity for composed tabs

#### Scenario: One platform is certified
- **WHEN** the exact package passes isolated-worker gates on one operating system
- **THEN** certification SHALL apply only to that platform and package integrity
