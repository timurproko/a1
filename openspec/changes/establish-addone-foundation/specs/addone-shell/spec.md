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

### Requirement: The AddOne command launches vanilla Native Pi transparently
The installed application SHALL expose an `addone` terminal command that immediately starts the configured vanilla Native Pi command in Pi's default interactive mode without requiring user activation and without publishing an AddOne intro, logo, version frame, blank alternate-screen prelude, reconstructed readiness frame, or other application output before Pi. The initial transparent path SHALL NOT force a Pi interaction mode or mediate terminal behavior in a way that changes native selection, scrolling, copy, input, startup, or closure.

#### Scenario: Launch the command
- **WHEN** the user runs `addone` in a supported terminal
- **THEN** AddOne SHALL start and attach the configured Native Pi executable immediately and the first application content SHALL be Native Pi's own output delivered through the native terminal path

#### Scenario: Launch again after a prior Native Pi exit
- **WHEN** the user runs `addone` after one or more prior Native Pi generations have exited
- **THEN** AddOne SHALL start a fresh transparent Native Pi generation without replaying retained surfaces, repainting prior output, or failing lifecycle negotiation because of historical generations

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

### Requirement: Input ownership follows terminal capability
During the initial transparent Native Pi iteration, AddOne SHALL reserve no application shortcut after handoff and SHALL NOT read, decode, serialize, translate, duplicate, delay, or re-encode ordinary physical terminal input. The native terminal path SHALL deliver input directly to the attached child. After composed multi-agent shell controls are introduced, the one certified composed terminal boundary SHALL route input in the order of documented global shell shortcuts, focused application shortcuts, focused component behavior, and active surface input, with each input consumed at most once.

#### Scenario: Native Pi receives complete control in transparent mode
- **WHEN** a physical key, text, paste, focus, mouse, wheel, or resize action occurs after transparent Native Pi handoff
- **THEN** the physical terminal and operating system SHALL deliver it through the same native path used by direct execution without an AddOne input command

#### Scenario: Ctrl+C and Ctrl+P remain distinct
- **WHEN** the user presses Ctrl+C or Ctrl+P during transparent Native Pi
- **THEN** Pi SHALL observe the corresponding native action and AddOne SHALL neither intercept it nor translate one control key into the other

#### Scenario: Repeated Ctrl+C follows Native Pi behavior
- **WHEN** the user performs Native Pi's repeated Ctrl+C clear-and-exit interaction after transparent handoff
- **THEN** Native Pi and the native terminal path SHALL handle it as in direct execution without AddOne semantic delivery

#### Scenario: Global shortcut in a later composed terminal tab
- **WHEN** a documented global workspace shortcut is entered while a composed terminal surface is focused
- **THEN** AddOne SHALL handle the shortcut without forwarding an equivalent event through the authoritative terminal core

#### Scenario: Unclaimed input in the later composed shell
- **WHEN** input is not claimed by the later shell or a focused AddOne component and a composed terminal surface is focused
- **THEN** the certified composed terminal boundary SHALL deliver the action once according to authoritative terminal state

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

### Requirement: AddOne remains a cross-platform terminal application
AddOne SHALL run inside the user's native terminal environment on Windows, macOS, and Linux. Its core shell and terminal-agent interaction SHALL remain terminal-based and SHALL NOT require a browser, desktop GUI, remote canvas, or application-specific display host to provide supported behavior.

#### Scenario: Launch AddOne on a supported platform
- **WHEN** the user launches AddOne from a supported Windows, macOS, or Linux terminal
- **THEN** AddOne SHALL operate within that terminal using the platform's certified terminal and process facilities

#### Scenario: A terminal application is not Pi
- **WHEN** the user launches a supported shell, editor, pager, multiplexer, agent CLI, or other interactive terminal application
- **THEN** AddOne SHALL use the same capability contract without requiring an application-specific shell or renderer

### Requirement: The initial Native Pi session uses transparent full-viewport handoff
From launch, the initial iteration SHALL present exactly one automatically selected transparent Native Pi session across the complete physical terminal viewport, with no AddOne intro, tab strip, `+` control, sidebar, status line, border, padding, reserved rows, reconstructed readiness frame, or AddOne display output after handoff.

#### Scenario: Launch attaches Native Pi transparently
- **WHEN** AddOne starts the initial Native Pi generation
- **THEN** it SHALL attach the child to the foreground terminal without an AddOne startup frame, semantic input relay, virtual framebuffer repaint, or inferred readiness-frame delay

#### Scenario: Outer terminal resizes
- **WHEN** the physical terminal changes size during the transparent session
- **THEN** Native Pi SHALL observe the same dimensions through the native terminal path without AddOne chrome offsets

#### Scenario: Native Pi exits
- **WHEN** the transparent Native Pi process exits
- **THEN** AddOne SHALL retain child-produced output and spacing, perform only bounded ownership cleanup, emit no synthetic newline or reconstructed final frame, and return the Native Pi outcome

### Requirement: Physical-terminal ownership follows terminal capability
During a transparent session, the attached child and physical terminal SHALL own terminal rendering, input encoding, selection, scrollback, and child-requested terminal modes as they do during direct execution; AddOne SHALL retain only foreground process ownership and bounded abnormal-exit cleanup. During a composed session, AddOne SHALL own physical presentation and isolate child modes through the certified composed terminal boundary. The two ownership models SHALL NOT be mixed within one active session.

#### Scenario: Transparent child changes terminal modes
- **WHEN** transparent Native Pi changes screen, mouse, keyboard, paste, focus, cursor, synchronized-output, or Win32 input modes
- **THEN** the request SHALL travel through the native attached terminal path without AddOne decoding, virtualizing, or replaying it

#### Scenario: Composed child changes terminal modes
- **WHEN** a composed child changes a supported terminal mode
- **THEN** the composed terminal boundary SHALL mediate it without granting the child uncontrolled access to unrelated AddOne shell presentation

#### Scenario: Foreground transparent broker exits unexpectedly
- **WHEN** the broker, child, or connection fails during transparent attachment
- **THEN** AddOne SHALL perform bounded platform cleanup, report that transparent visual reconnection is unavailable, and leave the parent terminal usable before printing a diagnostic

### Requirement: UI reconnection respects terminal capability
A newly started AddOne UI client SHALL reconstruct durable workspace, tab, draft, status, and capability bindings from a supervisor snapshot and subsequent ordered events. It SHALL restore resident visual surfaces only for capabilities that provide authoritative reconnectable state.

#### Scenario: Restart the UI with managed or composed agents
- **WHEN** the AddOne UI restarts while Managed agents or certified composed terminal agents remain recoverable or resident
- **THEN** the new UI SHALL restore their durable bindings and supported state without restarting them solely because the UI restarted

#### Scenario: Restart the UI after transparent ownership is lost
- **WHEN** a transparent foreground owner disconnects and its profile does not support detach
- **THEN** the new UI SHALL report the recorded stop or detach outcome and SHALL NOT present a reconstructed continuous terminal surface
