## Purpose

Defines the user-visible workspace that bare `a1` provides for managing multiple agents while preserving stable explicit launch modes.

## ADDED Requirements

### Requirement: Bare AddOne opens the multi-agent workspace
Bare `addone` and `a1` SHALL open the AddOne-owned multi-agent workspace. `a1 pi` SHALL continue to launch vanilla Pi using `~/.pi/agent`, and `a1 sandbox` SHALL continue to launch the isolated `~/.a1/sandbox` profile without entering the workspace.

#### Scenario: Launch bare AddOne
- **WHEN** the user runs bare `a1`
- **THEN** AddOne SHALL present the workspace and SHALL NOT reinterpret the invocation as `a1 pi` or `a1 sandbox`

#### Scenario: Launch an explicit stable mode
- **WHEN** the user runs `a1 pi` or `a1 sandbox`
- **THEN** AddOne SHALL launch the selected explicit mode without creating or attaching to a workspace surface

### Requirement: Workspace agents have durable identities and explicit lifecycle
Each managed agent SHALL have a stable identity, display name, adapter type, capability declaration, creation time, lifecycle state, and latest recoverable state reference. The workspace SHALL expose create, select, rename, stop, restart, and remove operations with explicit outcomes.

#### Scenario: Create two agents
- **WHEN** the user creates two agents with the same display-name request
- **THEN** AddOne SHALL assign distinct stable identities and SHALL present an unambiguous selectable label for each

#### Scenario: Stop one agent
- **WHEN** the user stops a selected agent
- **THEN** AddOne SHALL stop only that agent's verified owned resources and SHALL retain other agents and the workspace

#### Scenario: Remove an active agent
- **WHEN** the user requests removal of an agent that still owns live resources
- **THEN** AddOne SHALL require an explicit bounded stop outcome before deleting its durable workspace record

### Requirement: Workspace switching does not conflate agent state
The workspace SHALL preserve independent state, unread activity, status, and input target for every managed agent. Switching the visible agent SHALL NOT send input to, resize, restart, or discard another agent unless that agent's declared capability requires and reports the transition.

#### Scenario: Switch away from an active agent
- **WHEN** the user selects another agent while the current agent remains active
- **THEN** the first agent SHALL enter its declared inactive-surface state and subsequent user commands SHALL target only the selected agent

#### Scenario: Background agent changes state
- **WHEN** a non-selected agent emits activity, requests attention, exits, or fails
- **THEN** the workspace SHALL retain the event under that agent identity and surface a non-destructive status indication

### Requirement: Agent failures are isolated and recoverable
A malformed event, adapter crash, terminal process exit, or reconnection failure for one agent SHALL NOT terminate unrelated agents or corrupt workspace state. Recovery SHALL use durable identity and capability-specific state rather than terminal screen scraping.

#### Scenario: One adapter fails
- **WHEN** one structured-agent adapter crashes or emits invalid data
- **THEN** AddOne SHALL mark only that agent failed, preserve diagnostics, and keep other agents operable

#### Scenario: Workspace process restarts
- **WHEN** AddOne restarts with durable agent records and surviving reconnectable resources
- **THEN** it SHALL reconcile verified ownership and offer capability-valid reconnection without fabricating continuity for non-reconnectable agents

### Requirement: Workspace commands are capability-gated
The workspace SHALL enable only operations declared by the selected agent's negotiated capabilities. It SHALL distinguish structured agents from terminal-backed CLIs and SHALL NOT emulate missing structured behavior by parsing terminal output.

#### Scenario: Structured command is unavailable
- **WHEN** an agent does not declare a structured command capability
- **THEN** the workspace SHALL disable or reject that command with a concise capability explanation

#### Scenario: Terminal-backed CLI is selected
- **WHEN** an arbitrary interactive CLI tab is selected
- **THEN** the workspace SHALL route interaction through the composed-terminal contract and SHALL NOT claim structured message, tool, or task semantics
