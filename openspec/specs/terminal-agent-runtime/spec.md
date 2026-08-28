# Terminal Agent Runtime Specification

## Purpose

Defines the retained application-agnostic transparent terminal capability for an explicitly selected directly attached command and its limitations. Current `a1` and prerelease `a1 pi` launch forms use the separate shared owned UI pipeline.

## Requirements

### Requirement: A1 launches one exact foreground command
A transparent launch profile SHALL identify an exact executable, arguments, environment, working directory, and recovery policy. Launch behavior SHALL NOT be selected by executable identity, argument patterns, CLI-named environment variables, or visible terminal content.

#### Scenario: Launch an exact command
- **WHEN** a validated transparent profile identifies an executable and arguments
- **THEN** A1 SHALL launch that exact command in the declared working directory without shell interpretation

#### Scenario: Executable is unavailable
- **WHEN** the configured executable cannot be resolved or spawned
- **THEN** A1 SHALL report a concise launch failure without starting a partial terminal path

### Requirement: Transparent execution is application-agnostic
Transparent launch SHALL use one generic production path for Pi, shells, editors, pagers, multiplexers, other agent CLIs, and arbitrary interactive/fullscreen commands. Production terminal behavior SHALL NOT contain application-specific rendering, input, timing, mouse, mode, query, resize, or cleanup workarounds.

#### Scenario: Run unrelated applications
- **WHEN** unrelated commands are launched through equivalent transparent profiles
- **THEN** A1 SHALL use the same launcher, lease, lifecycle, and direct-attachment contracts

#### Scenario: Generic behavior cannot be provided
- **WHEN** a platform cannot provide a required behavior generically
- **THEN** A1 SHALL report the capability unsupported rather than add an executable- or content-specific workaround

### Requirement: Transparent sessions delegate terminal behavior to the physical terminal
A transparent full-viewport session SHALL attach the child to inherited native terminal handles or controlling TTY without A1 reading ordinary input, parsing/reconstructing output, inferring visual frames, synthesizing terminal responses, or adding repaint delays after handoff.

#### Scenario: Child receives input
- **WHEN** the user sends key, text, control, paste, focus, mouse, wheel, or resize interaction
- **THEN** the physical terminal and operating-system path SHALL deliver it without an A1 semantic input relay

#### Scenario: Child renders output
- **WHEN** the child writes terminal content or control sequences
- **THEN** the physical terminal SHALL interpret the original interaction without A1 framebuffer reconstruction or replacement output

#### Scenario: Child emits multiple writes
- **WHEN** output arrives in multiple synchronized or unsynchronized writes
- **THEN** A1 SHALL add no parser, quiescence timer, transaction assembler, or guessed source-frame boundary

### Requirement: Transparent sessions advertise their limitations
A transparent session SHALL advertise no A1-authoritative resident surface, internal pane, virtual scrollback, replayable display stream, or visual reconnection. A1 SHALL NOT claim those capabilities from a shadow parser or lifecycle metadata. Transparent direct attachment SHALL remain independent from both the A1-owned Pi UI and the terminal-host proof paths, and SHALL NOT be used to manufacture UI customization by interception.

#### Scenario: Foreground owner disconnects
- **WHEN** the foreground owner disappears from a non-detachable transparent session
- **THEN** A1 SHALL apply bounded declared cleanup and report the result rather than reconstruct terminal continuity

#### Scenario: Internal arbitrary-CLI tabs are requested
- **WHEN** a feature needs inactive resident terminal surfaces, switching, clipping, overlays, or reconnection
- **THEN** a separate composed-terminal capability SHALL be planned and certified instead of intercepting transparent mode

#### Scenario: Owned UI is requested
- **WHEN** the user selects the A1-owned Pi UI development mode
- **THEN** A1 SHALL enter the owned fullscreen UI path rather than routing the stock Pi process through transparent attachment and mutating its terminal surface

#### Scenario: Transparent fallback is selected
- **WHEN** an explicit launch mode or recovery policy selects transparent direct attachment
- **THEN** the child and physical terminal SHALL retain native rendering and input authority without initializing the owned UI, terminal-host proof, parser, renderer, topology, or input router

### Requirement: Foreground lease carries lifecycle but no terminal bytes
The foreground broker and supervisor SHALL exchange only validated launch intent, lease state, native process identity, heartbeat/ownership, stop intent, and lifecycle outcome. Ordinary terminal bytes and reconstructed display state SHALL NOT cross the control protocol.

#### Scenario: Handoff completes
- **WHEN** the child starts successfully
- **THEN** the broker SHALL register exact process identity and wait for lifecycle completion without ordinary terminal reads, writes, parsing, or render timers

#### Scenario: Update requests shutdown
- **WHEN** an update targets a verified active transparent generation
- **THEN** A1 SHALL use bounded owned-process lifecycle control without introducing terminal emulation as a cleanup path

### Requirement: Terminal exit returns a usable parent terminal
On transparent child exit, A1 SHALL preserve child-produced final output and spacing, perform bounded ownership cleanup, report the process outcome, and leave the parent terminal usable. It SHALL NOT add, remove, relocate, parse, or reconstruct child output.

#### Scenario: Child exits normally
- **WHEN** the foreground child exits normally
- **THEN** A1 SHALL return its outcome without a synthetic newline or terminal repaint

#### Scenario: Child or broker fails
- **WHEN** failure occurs while terminal modes may be active
- **THEN** A1 SHALL apply only its bounded platform failsafe and retain actionable lifecycle evidence

### Requirement: Stable support is certified per platform
Transparent physical parity and supported-platform claims SHALL be certified separately on Windows, Linux, and macOS against exact packaged artifacts and application-independent workloads. Passing one platform SHALL NOT certify another.

#### Scenario: Certification remains deferred
- **WHEN** only structural and manual acceptance evidence exists
- **THEN** A1 MAY continue development previews but SHALL NOT claim stable platform parity or move `latest` based on that evidence alone
