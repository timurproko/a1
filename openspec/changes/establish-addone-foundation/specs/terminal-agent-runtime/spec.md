## Purpose

Defines capability-specific terminal execution for transparent native-parity sessions and composed resident sessions without forcing incompatible latency, rendering, and reconnection guarantees through one pipeline.

## ADDED Requirements

### Requirement: AddOne can launch arbitrary terminal commands
AddOne SHALL launch a configured executable or interactive shell with explicit arguments, environment, working directory, dimensions, terminal identity, and terminal capability. A profile SHALL explicitly select `transparent` or `composed`; terminal-core code SHALL NOT select behavior by inspecting an executable name, argument, CLI-named environment variable, or visible content.

#### Scenario: Launch an exact command
- **WHEN** a profile identifies an executable and arguments
- **THEN** AddOne SHALL launch that exact command using the profile's declared terminal capability and working directory

#### Scenario: Launch an interactive shell
- **WHEN** a profile requests a shell-backed session
- **THEN** AddOne SHALL allow successive foreground commands to run in that same session according to the declared terminal capability

### Requirement: Terminal execution is cross-platform and application-agnostic
Transparent and composed terminal capabilities SHALL support Windows, macOS, and Linux through certified native platform facilities. Terminal behavior SHALL derive only from the selected capability, platform terminal state, declared profile, and terminal protocols. It SHALL NOT depend on executable identity, argument patterns, CLI-named environment variables, visible content, or per-application rendering, input, timing, mouse, mode, query, resize, or cleanup hacks.

#### Scenario: Run unrelated terminal applications
- **WHEN** Pi, a shell, an editor, a pager, a multiplexer, another agent CLI, or an arbitrary interactive/fullscreen command emits the same terminal protocol and receives the same physical actions
- **THEN** the selected terminal capability SHALL process them through the same production path without an application-specific exception

#### Scenario: An application exposes an unsupported protocol behavior
- **WHEN** correct behavior cannot be provided generically by the selected capability on a platform
- **THEN** AddOne SHALL report the behavior or capability unsupported and fail certification rather than add an executable- or content-specific workaround

#### Scenario: Compare with native terminal execution
- **WHEN** a supported application is launched directly and through AddOne in the same native terminal with identical profile, dimensions, environment, and interactions
- **THEN** rendering, character presentation, input effects, terminal modes, resize, lifecycle, and restoration SHALL be equivalent within that capability's declared native-parity contract

### Requirement: Transparent sessions delegate terminal behavior to the physical terminal
A transparent full-viewport session SHALL attach the child to the foreground physical terminal without AddOne decoding and re-encoding ordinary input, parsing and reconstructing visible output, inferring visual frame boundaries, synthesizing terminal-query responses, compensating screen origins, or inserting repaint delays. During handoff AddOne SHALL emit no application frame or display-control stream between the child and the physical terminal.

#### Scenario: Native Pi receives keyboard input
- **WHEN** the user sends ordinary, modified, control, repeat, release, paste, focus, mouse, or wheel input during a transparent Native Pi session
- **THEN** the physical terminal and operating-system terminal path SHALL deliver it without an AddOne semantic input translation round trip

#### Scenario: Native Pi renders content
- **WHEN** Native Pi writes text, Unicode graphemes, colors, attributes, cursor changes, synchronized output, alternate-screen controls, scroll operations, terminal queries, or terminal modes
- **THEN** the physical terminal SHALL interpret the original child interaction without AddOne framebuffer reconstruction or manually generated replacement VT output

#### Scenario: Unsynchronized output arrives in multiple writes
- **WHEN** a transparent child emits an unsynchronized update across multiple writes
- **THEN** AddOne SHALL introduce no quiescence timer or guessed source-frame boundary and the physical terminal SHALL observe the writes as it would for the same directly launched child

### Requirement: Transparent sessions advertise their limitations
A transparent session SHALL advertise that it has no AddOne-authoritative resident framebuffer, composited panes, virtual scrollback, replayable display stream, or exact visual reconnection guarantee. AddOne SHALL NOT silently claim those capabilities from a diagnostic shadow parser.

#### Scenario: Foreground UI disconnects
- **WHEN** the foreground terminal owner disconnects from a non-detachable transparent session
- **THEN** AddOne SHALL apply the declared stop or detach lifecycle and report the result rather than reconstructing an apparently continuous surface

#### Scenario: A pane is requested
- **WHEN** a feature requires clipping, overlays, panes, or AddOne-owned rendering
- **THEN** AddOne SHALL require a certified composed session instead of partially intercepting the transparent path

### Requirement: Transparent Native Pi is the compatibility baseline
The initial Native Pi profile SHALL use transparent full-viewport execution unless the user explicitly selects another certified capability. With the same executable, arguments, environment, dimensions, host terminal, and physical interaction, hosted Native Pi SHALL preserve direct behavior for rendering, character presentation, selection, clipboard, scrollback, keyboard, paste, focus, mouse, wheel, dialogs, extensions, resize, startup, exit, and parent-terminal restoration.

#### Scenario: Compare direct and transparent Native Pi
- **WHEN** identical Native Pi runs receive identical physical-host interactions directly and through transparent AddOne
- **THEN** their observable terminal behavior and process outcomes SHALL be equivalent without an AddOne-specific rendering or input exception

#### Scenario: Compare interactive latency
- **WHEN** direct and transparent Native Pi receive the same timed input workload
- **THEN** transparent AddOne SHALL add no input batching timer, render timer, terminal emulation turn, or control-protocol input round trip and SHALL remain within the independently measured direct-host tolerance

#### Scenario: Select and scroll text
- **WHEN** the user selects content or uses terminal scrollback in transparent Native Pi
- **THEN** painting, copy behavior, selection-aware Ctrl+C, anchoring during output, scrollbar behavior, and wheel distance SHALL remain owned by and equivalent to the physical terminal

### Requirement: Composed sessions use one authoritative terminal core
A composed session SHALL use one terminal core as the authority for PTY integration, parsed terminal state, effective modes, input encoding, terminal responses, primary and alternate screens, scrollback, cursor, graphemes, cell widths, styles, palette state, and ordered operation or damage reporting. AddOne SHALL NOT combine that authority with a second regex mode tracker, query interceptor, custom protocol encoder, framebuffer-derived scroll inference, or independently reconstructed terminal state.

#### Scenario: Child changes terminal state
- **WHEN** a composed child emits supported screen, cursor, input-mode, query, scroll, erase, style, color, or Unicode operations
- **THEN** one authoritative core SHALL update state and produce the corresponding child response or host-facing operation

#### Scenario: Platform transport represents a mode internally
- **WHEN** a PTY backend consumes, synthesizes, or represents terminal protocol state differently from another platform
- **THEN** the composed terminal boundary SHALL expose one documented effective state without an AddOne fallback guessed from application identity or visible content

### Requirement: Composed rendering does not invent application commits
A composed session SHALL preserve explicit synchronized-output transactions atomically. For output without an explicit atomic boundary, AddOne SHALL process ordered terminal operations without cadence-derived waiting or a claim that transport timing identifies one application visual commit. It SHALL avoid AddOne-created clears, stale overwrites, redundant whole-view repaints, reordered operations, and unbounded buffering, but SHALL NOT promise to hide partial updates that are also observable during equivalent direct unsynchronized execution.

#### Scenario: Child uses synchronized output
- **WHEN** a child encloses an update in a supported synchronized-output transaction
- **THEN** composed presentation SHALL reveal the transaction atomically without exposing its intermediate state

#### Scenario: Child does not use synchronized output
- **WHEN** a child emits multiple unsynchronized writes
- **THEN** AddOne SHALL preserve their order without delaying for transport cadence or asserting an unknowable source-frame boundary

#### Scenario: Host output is backpressured
- **WHEN** host presentation cannot immediately consume composed terminal operations
- **THEN** AddOne SHALL bound memory, preserve non-supersedable operation order, and resynchronize from authoritative state when necessary

### Requirement: Composed input is encoded exactly once by the authoritative terminal boundary
For composed sessions, physical key, text, paste, focus, mouse, wheel, and resize events SHALL retain their identity through a single host-input boundary and SHALL be encoded exactly once from the authoritative effective child state. Unsupported or ambiguous physical input SHALL produce an explicit capability failure rather than an approximate key substitution.

#### Scenario: Control key is entered on Windows
- **WHEN** the physical host reports Ctrl+A through Ctrl+Z
- **THEN** the child SHALL observe the same control-key identity as the equivalent direct terminal path and AddOne SHALL NOT reinterpret it through duplicated mode or keyboard-protocol models

#### Scenario: Wheel and arrow input are distinct
- **WHEN** the user rotates the wheel or presses Up or Down
- **THEN** the authoritative terminal boundary SHALL preserve those distinct physical actions and apply only the routing required by its effective terminal state

#### Scenario: Input capability is unavailable
- **WHEN** a platform adapter cannot preserve a required key, IME, paste, focus, or mouse behavior
- **THEN** certification SHALL fail or the capability SHALL be reported unsupported instead of silently degrading input

### Requirement: Generic terminal output remains semantically opaque
AddOne SHALL not infer tool execution, model state, settled state, conversation state, or successful work from terminal text or screen position unless a specialized driver supplies that information through an explicit structured channel.

#### Scenario: Terminal prints success-like text
- **WHEN** a generic terminal displays text containing words such as `done` or `success`
- **THEN** AddOne SHALL not convert that text into semantic agent status

### Requirement: Terminal capabilities are certified per supported platform
Transparent and composed capabilities SHALL be certified separately on Windows 11 x64, current Ubuntu LTS x64, and current and previous macOS arm64. Passing one capability or platform SHALL NOT imply another is supported.

#### Scenario: One platform fails parity
- **WHEN** a required capability fails its independent host validation on one supported platform
- **THEN** AddOne SHALL block that capability's release for the platform and report the unsupported result

### Requirement: Terminal exit returns a usable parent terminal
On transparent or composed terminal exit, AddOne SHALL stop accepting input, preserve the child-produced final output appropriate to that capability, perform bounded ownership cleanup, and leave the parent terminal usable with its expected input mode, cursor, screen, selection, and line-editing behavior. AddOne SHALL NOT add, remove, or relocate child-produced spacing.

#### Scenario: Native Pi exits normally
- **WHEN** Native Pi exits from a terminal session
- **THEN** the parent SHALL accept typing, cursor movement, Backspace, Delete, command submission, and output without visible protocol leakage or AddOne-generated spacing

#### Scenario: Child exits abnormally
- **WHEN** a child or foreground broker fails while terminal modes may be active
- **THEN** AddOne SHALL apply its bounded platform failsafe and retain actionable lifecycle evidence

### Requirement: Terminal failures and recovery promises are capability-specific
Spawn errors, exits, signals, transport failures, stop behavior, detach behavior, and recovery SHALL be reported without affecting sibling agents. Each profile SHALL declare `exact`, `best-effort`, `detach-only`, or `none` recovery, and AddOne SHALL not manufacture continuity beyond that declaration.

#### Scenario: Transparent process is lost
- **WHEN** a transparent non-resumable process exits
- **THEN** AddOne SHALL report it as ended rather than presenting a reconstructed continuous terminal

#### Scenario: Composed session reconnects
- **WHEN** a certified composed session remains resident while its UI reconnects
- **THEN** AddOne SHALL provide authoritative bounded state followed by ordered updates or explicitly resynchronize on a gap
