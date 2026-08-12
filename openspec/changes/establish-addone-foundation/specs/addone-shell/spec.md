## Purpose

Defines the standalone AddOne terminal experience that presents and controls heterogeneous managed conversations and native terminal agents without delegating application ownership to an agent runtime.

## ADDED Requirements

### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `addone update`/`a1 update` as equivalent stable update commands resolving npm tag `latest`, and `addone update:next`/`a1 update:next` as equivalent development-preview update commands resolving npm tag `next`. The selected tag SHALL be the only lifecycle difference. Invocation of either command SHALL constitute explicit consent to stop every process and non-resumable terminal session whose ownership AddOne verifies, install the exact resolved version, materialize and certify that immutable release, reconcile stale generation ownership, activate the new release atomically, and verify the resulting active version. Neither command SHALL require a separate status command, shutdown command, restart flag, process identifier, manual process kill, state-directory deletion, or subsequent activation command.

#### Scenario: Replace the current stable release immediately
- **WHEN** the user runs `a1 update` while an older AddOne cohort owns terminal sessions
- **THEN** AddOne SHALL gracefully stop those verified AddOne-owned sessions and processes, apply bounded owned-process cleanup if necessary, install and activate the exact npm `latest` version, and report the old and newly active versions

#### Scenario: Replace the current preview immediately
- **WHEN** the user runs `a1 update:next` while an older AddOne cohort owns terminal sessions
- **THEN** AddOne SHALL perform the same replacement transaction using the exact npm `next` version
- **AND** SHALL report `AddOne update (next): <old> → <new>.` before replacement and `AddOne updated successfully: <new> (next).` after verified activation

#### Scenario: Selected channel is already active
- **WHEN** the selected npm tag resolves to the exact active AddOne release version
- **THEN** the update command SHALL report that the selected channel is current without stopping or reinstalling it

#### Scenario: Ownership cannot be verified
- **WHEN** a process or endpoint might be related to AddOne but ownership cannot be proved from process identity, boot identity, endpoint identity, and durable metadata
- **THEN** `a1 update:next` SHALL fail safely without terminating that process, deleting control state, or claiming activation success

#### Scenario: Update is interrupted
- **WHEN** either update command is interrupted after shutdown, installation, or candidate materialization
- **THEN** the next invocation SHALL reconcile the transaction journal and continue or roll back to one verified active cohort without requiring manual cleanup

### Requirement: Installed and channel versions are visible without runtime startup
The installed application SHALL expose `addone version` and `a1 version` as equivalent non-interactive read-only commands. Each SHALL report, in exact display order, `Installed` from the invoked AddOne package metadata, `Release` from npm tag `latest`, and `Next` from npm tag `next`, and SHALL NOT start, connect to, stop, or otherwise mutate an AddOne UI, supervisor, PTY, agent, release cohort, database, or update transaction.

#### Scenario: Registry versions are available
- **WHEN** the user runs `a1 version` while npm `latest` and `next` are reachable
- **THEN** AddOne SHALL display valid exact semantic versions in the order `Installed`, `Release`, and `Next`

#### Scenario: Registry is unavailable
- **WHEN** the installed package metadata is readable but one or both npm tag queries fail
- **THEN** AddOne SHALL still display `Installed`, mark each unavailable remote field without claiming a version, emit concise diagnostics, and exit successfully

### Requirement: The AddOne command launches vanilla Native Pi immediately
The installed application SHALL expose an `addone` terminal command that immediately starts the configured vanilla Native Pi command in Pi's default interactive mode without requiring user activation and without publishing an AddOne intro, logo, version frame, blank alternate-screen prelude, or other application frame before Pi. AddOne MAY project that terminal over its complete viewport but SHALL NOT force a Pi interaction mode that changes vanilla selection, scrolling, copy, Ctrl+C, startup, or closure behavior.

#### Scenario: Launch the command
- **WHEN** the user runs `addone` in a supported terminal
- **THEN** AddOne SHALL start the configured Native Pi executable immediately and the first application content published by AddOne SHALL be the first ready Pi frame

#### Scenario: Launch again after a prior Native Pi exit
- **WHEN** the user runs `addone` after one or more prior fullscreen Native Pi generations have exited
- **THEN** AddOne SHALL start a fresh Native Pi generation, preserve the invoking command and prior terminal history without an intermediate blank or clear frame, and SHALL NOT replay retained exited surfaces or fail its control handshake because of their accumulated state

### Requirement: AddOne owns the application shell
AddOne SHALL run as a standalone terminal application and SHALL own workspace navigation, tabs, sidebar presentation, global input routing, drafts, statuses, dialogs, and notifications independently of any selected agent runtime.

#### Scenario: Start the later multi-agent shell without a Pi host
- **WHEN** a later multi-agent AddOne shell starts with no Pi process running
- **THEN** the workspace shell SHALL render and allow the user to navigate application-level controls

#### Scenario: Agent runtime exits in the later multi-agent shell
- **WHEN** an active agent runtime exits unexpectedly after multi-agent shell chrome is introduced
- **THEN** the AddOne shell SHALL remain operational and present the runtime failure without terminating the application

### Requirement: Workspaces organize heterogeneous agent tabs
AddOne SHALL let users create, select, rename, reorder, and close workspaces and agent tabs, and each agent tab SHALL present either a structured conversation surface or a terminal surface according to its driver capabilities.

#### Scenario: Mixed agent surfaces
- **WHEN** a workspace contains a Managed Pi agent and a Claude Code PTY agent
- **THEN** selecting the Managed Pi tab SHALL show the AddOne conversation surface and selecting the Claude Code tab SHALL show its terminal surface

#### Scenario: Reorder and rename tabs
- **WHEN** the user renames or reorders agent tabs
- **THEN** the tab strip and sidebar SHALL reflect the updated names and order consistently

### Requirement: The later multi-agent shell add control creates a Native Pi terminal tab
After the dedicated fullscreen Native Pi iteration, the multi-agent shell SHALL keep an always-reachable `+` add control that can be activated by keyboard or mouse to create and select a terminal tab running the configured vanilla Native Pi command through the terminal-agent runtime.

#### Scenario: Add Native Pi with the keyboard
- **WHEN** the user focuses the `+` control and activates it with the documented keyboard input
- **THEN** AddOne SHALL create and select a Native Pi terminal tab without surrendering ownership of the outer shell

#### Scenario: Add Native Pi with the mouse
- **WHEN** the user clicks the `+` control in a terminal with supported mouse reporting
- **THEN** AddOne SHALL consume the click once and create and select a Native Pi terminal tab without forwarding that click to another child PTY

### Requirement: The shell adapts to driver capabilities
AddOne SHALL expose only controls supported by the selected agent driver and SHALL not imply unavailable semantic state or operations.

#### Scenario: Managed agent controls
- **WHEN** a selected driver advertises structured messages, steering, models, and session capabilities
- **THEN** AddOne SHALL expose the corresponding conversation and control affordances

#### Scenario: Generic terminal controls
- **WHEN** a selected driver advertises only a terminal surface and process lifecycle
- **THEN** AddOne SHALL limit its controls to supported terminal and lifecycle operations and SHALL not present inferred model, tool, or conversation state

### Requirement: Input routing is deterministic
During the initial fullscreen Native Pi iteration, AddOne SHALL reserve no application shortcut after handoff but SHALL retain ownership of the physical host-input protocol. It SHALL decode each keyboard, paste, focus, and supported mouse event once and deliver one protocol-correct equivalent to Native Pi according to the child terminal's negotiated state, including Ctrl+C. Host and child byte encodings MAY differ when their negotiated keyboard or mouse protocols differ, but child-observable behavior SHALL match direct Pi and no event SHALL be duplicated, dropped, or converted into a different input kind. After multi-agent shell controls are introduced, AddOne SHALL route input in the order of documented global shell shortcuts, focused application shortcuts, focused component behavior, and active surface input, with each input consumed at most once.

#### Scenario: Native Pi receives complete control in fullscreen mode
- **WHEN** a physical input event is received after the initial fullscreen Native Pi session starts
- **THEN** AddOne SHALL deliver the equivalent event to Native Pi exactly once in its negotiated terminal protocol and SHALL not interpret it as an AddOne shortcut

#### Scenario: Ctrl+C in fullscreen mode
- **WHEN** the user presses Ctrl+C after Native Pi starts
- **THEN** Native Pi SHALL receive exactly one Ctrl+C event and AddOne SHALL not terminate the UI as a result of intercepting that input
- **AND** the event SHALL NOT be converted into Ctrl+P or trigger Pi's model-cycle action

#### Scenario: Windows control-key identity crosses negotiated protocols
- **WHEN** Windows reports any Ctrl+A through Ctrl+Z key through a native input record or Win32 VT input record and the child uses legacy, modifyOtherKeys, Kitty, or Win32 input
- **THEN** AddOne SHALL preserve the same control-letter identity exactly once regardless of layout-dependent virtual-key metadata and SHALL NOT encode a key release as another press

#### Scenario: Repeated Ctrl+C follows Native Pi clear and exit behavior
- **WHEN** the user performs Native Pi's repeated Ctrl+C clear-and-exit interaction after handoff
- **THEN** AddOne SHALL deliver each Ctrl+C exactly once and SHALL allow Native Pi to clear or exit exactly as it does when launched directly

#### Scenario: Physical wheel remains distinct from arrow keys
- **WHEN** the user rotates the wheel and later presses Up or Down in fullscreen Native Pi
- **THEN** AddOne SHALL preserve the wheel as a mouse-or-host-scroll event selected from the child terminal state and preserve Up or Down as a keyboard event, without converting either input kind into the other

#### Scenario: Global shortcut in a later PTY tab
- **WHEN** a documented global workspace shortcut is entered after multi-agent shell controls are introduced while a PTY tab is focused
- **THEN** AddOne SHALL handle the shortcut without forwarding an equivalent event to the child PTY

#### Scenario: Unclaimed PTY input in the later shell
- **WHEN** input is not claimed by the later shell or a focused AddOne component and a PTY surface is focused
- **THEN** AddOne SHALL deliver the event once using the focused terminal session's negotiated input protocol

### Requirement: Drafts belong to AddOne
AddOne SHALL preserve unsent structured-conversation drafts independently of worker process lifetime and SHALL maintain a separate draft for each applicable agent tab.

#### Scenario: Managed worker replacement
- **WHEN** a Managed Pi worker is replaced while its tab contains an unsent draft
- **THEN** the draft SHALL remain available after the replacement becomes ready

#### Scenario: Switch between agent tabs
- **WHEN** the user edits drafts in two managed agent tabs and switches between them
- **THEN** each tab SHALL restore its own draft

### Requirement: Later v2-derived workspace behavior uses the executable oracle
After fullscreen vanilla Native Pi parity is established, v2-derived multi-agent shell behavior SHALL be baselined by exercising an exactly identified Pi runtime with the pinned v2 extension profile enabled in direct and AddOne-hosted PTYs. Historical screenshots MAY supplement diagnostics but SHALL NOT be required or treated as the normative behavior oracle. The resulting AddOne-owned shell SHALL provide an always-reachable add-agent action, visible active-tab state, tab working/error decorations, workspace and agent rows in the sidebar, and usable narrow-terminal behavior.

#### Scenario: Establish a later v2 behavior baseline
- **WHEN** implementation begins for a v2-derived shell flow
- **THEN** its interaction and presentation baseline SHALL come from identified extension-enabled PTY runs with normalized checkpoints and timelines rather than reconstructed historical screenshots

#### Scenario: Narrow terminal
- **WHEN** the terminal is too narrow to display every tab
- **THEN** AddOne SHALL preserve access to add-agent and active-agent navigation while collapsing or otherwise exposing overflow tabs

#### Scenario: Agent status changes
- **WHEN** a driver reports that an agent starts work, completes, fails, or recovers
- **THEN** the tab strip and sidebar SHALL update the agent decoration without changing the active selection

### Requirement: The initial Native Pi session owns the complete viewport
From launch, the initial iteration SHALL present exactly one automatically selected Native Pi fullscreen-TUI terminal surface across the complete outer terminal viewport, with no AddOne intro, tab strip, `+` control, sidebar, status line, border, padding, or reserved rows.

#### Scenario: Launch hands directly to Native Pi
- **WHEN** the Native Pi generation becomes available
- **THEN** a recognizable ready Pi frame containing its interactive editor and applicable startup or footer content SHALL become the first AddOne-published application frame across the complete viewport without an intro, blank alternate-screen prelude, or intermediate AddOne shell frame

#### Scenario: Cursor-only startup
- **WHEN** Native Pi remains alive but AddOne observes only an empty surface or cursor movement before the startup deadline
- **THEN** AddOne SHALL fail readiness with retained terminal and process diagnostics rather than treating the handoff as successful

#### Scenario: Outer terminal resizes
- **WHEN** the outer terminal dimensions change during the fullscreen session
- **THEN** AddOne SHALL resize Native Pi to the same column and row dimensions without subtracting space for application chrome

#### Scenario: Native Pi exits
- **WHEN** the initial fullscreen Native Pi process exits
- **THEN** the foreground AddOne UI SHALL restore the exact host input and cursor state, retain vanilla Pi's normal-screen output, scrollback, final cursor position, and child-produced line spacing exactly as direct Pi does, restore prior normal-screen content when an explicitly fullscreen child used AddOne's alternate projection, emit no synthetic newline or visible raw control-sequence text, and exit with the Native Pi outcome rather than displaying AddOne chrome

### Requirement: AddOne exclusively owns the physical terminal
While an AddOne UI client is attached, AddOne SHALL be the sole owner of physical-terminal raw mode, alternate-screen state, mouse capture, keyboard enhancement, bracketed paste, focus reporting, cursor policy, and platform console input mode. Terminal-agent control sequences SHALL affect only their virtual terminal session. AddOne SHALL restore the exact pre-launch host state on every normal, error, interruption, and panic exit path.

#### Scenario: Child changes terminal modes
- **WHEN** Native Pi enters or leaves its alternate screen or changes mouse, keyboard, paste, focus, cursor, or synchronized-output modes
- **THEN** AddOne SHALL update the child session's virtual state and rendered result without transferring ownership of the corresponding physical-terminal mode to Pi

#### Scenario: Child requests Win32 input mode
- **WHEN** a Windows child emits a request that would enable Win32 input mode on a directly attached terminal
- **THEN** that request SHALL remain confined to the child terminal session and SHALL NOT cause encoded Win32 input records to become visible or leak into the parent shell

#### Scenario: Foreground client exits unexpectedly
- **WHEN** the AddOne UI exits because of a normal quit, child failure, connection failure, interrupt, or panic
- **THEN** the physical terminal SHALL return to its captured pre-launch input mode, screen, cursor, wrapping, mouse, paste, focus, and keyboard state before any final diagnostic is printed

### Requirement: UI clients can reconnect to the supervisor
A newly started AddOne UI client SHALL reconstruct the current workspace, tab, draft, status, and surface bindings from a supervisor snapshot and subsequent ordered events.

#### Scenario: Restart the UI
- **WHEN** the AddOne UI process is terminated and restarted while the supervisor remains running
- **THEN** the new UI SHALL restore the current workspaces and agents without restarting those agents solely because the UI restarted
