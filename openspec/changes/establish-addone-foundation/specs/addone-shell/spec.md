## Purpose

Defines the standalone AddOne terminal experience that presents and controls heterogeneous managed conversations and native terminal agents without delegating application ownership to an agent runtime.

## ADDED Requirements

### Requirement: The AddOne command plays the launch intro before the shell
The installed application SHALL expose an `addone` terminal command that plays the v2-derived AddOne intro animation before revealing an operational shell, without requiring an agent runtime to be ready.

#### Scenario: Launch the command
- **WHEN** the user runs `addone` in a supported terminal
- **THEN** AddOne SHALL play the launch intro animation to completion and then reveal the shell with application-level controls

### Requirement: AddOne owns the application shell
AddOne SHALL run as a standalone terminal application and SHALL own workspace navigation, tabs, sidebar presentation, global input routing, drafts, statuses, dialogs, and notifications independently of any selected agent runtime.

#### Scenario: Start without a Pi host
- **WHEN** AddOne starts with no Pi process running
- **THEN** the workspace shell SHALL render and allow the user to navigate application-level controls

#### Scenario: Agent runtime exits
- **WHEN** the active agent runtime exits unexpectedly
- **THEN** the AddOne shell SHALL remain operational and present the runtime failure without terminating the application

### Requirement: Workspaces organize heterogeneous agent tabs
AddOne SHALL let users create, select, rename, reorder, and close workspaces and agent tabs, and each agent tab SHALL present either a structured conversation surface or a terminal surface according to its driver capabilities.

#### Scenario: Mixed agent surfaces
- **WHEN** a workspace contains a Managed Pi agent and a Claude Code PTY agent
- **THEN** selecting the Managed Pi tab SHALL show the AddOne conversation surface and selecting the Claude Code tab SHALL show its terminal surface

#### Scenario: Reorder and rename tabs
- **WHEN** the user renames or reorders agent tabs
- **THEN** the tab strip and sidebar SHALL reflect the updated names and order consistently

### Requirement: The add control creates a Native Pi terminal tab
The shell SHALL keep an always-reachable `+` add control that can be activated by keyboard or mouse to create and select a terminal tab running the configured vanilla Native Pi command through the terminal-agent runtime.

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
AddOne SHALL route input in the order of global shell shortcuts, focused application shortcuts, focused component behavior, and active surface input, with each input consumed at most once.

#### Scenario: Global shortcut in a PTY tab
- **WHEN** a global workspace shortcut is entered while a PTY tab is focused
- **THEN** AddOne SHALL handle the shortcut without forwarding its bytes to the child PTY

#### Scenario: Unclaimed PTY input
- **WHEN** input is not claimed by the shell or a focused AddOne component and a PTY surface is focused
- **THEN** AddOne SHALL forward the original input bytes to that PTY

### Requirement: Drafts belong to AddOne
AddOne SHALL preserve unsent structured-conversation drafts independently of worker process lifetime and SHALL maintain a separate draft for each applicable agent tab.

#### Scenario: Managed worker replacement
- **WHEN** a Managed Pi worker is replaced while its tab contains an unsent draft
- **THEN** the draft SHALL remain available after the replacement becomes ready

#### Scenario: Switch between agent tabs
- **WHEN** the user edits drafts in two managed agent tabs and switches between them
- **THEN** each tab SHALL restore its own draft

### Requirement: Core v2 workspace UX is retained as behavior
The initial AddOne shell SHALL provide an always-reachable add-agent action, visible active-tab state, tab working/error decorations, workspace and agent rows in the sidebar, and usable narrow-terminal behavior.

#### Scenario: Narrow terminal
- **WHEN** the terminal is too narrow to display every tab
- **THEN** AddOne SHALL preserve access to add-agent and active-agent navigation while collapsing or otherwise exposing overflow tabs

#### Scenario: Agent status changes
- **WHEN** a driver reports that an agent starts work, completes, fails, or recovers
- **THEN** the tab strip and sidebar SHALL update the agent decoration without changing the active selection

### Requirement: UI clients can reconnect to the supervisor
A newly started AddOne UI client SHALL reconstruct the current workspace, tab, draft, status, and surface bindings from a supervisor snapshot and subsequent ordered events.

#### Scenario: Restart the UI
- **WHEN** the AddOne UI process is terminated and restarted while the supervisor remains running
- **THEN** the new UI SHALL restore the current workspaces and agents without restarting those agents solely because the UI restarted
