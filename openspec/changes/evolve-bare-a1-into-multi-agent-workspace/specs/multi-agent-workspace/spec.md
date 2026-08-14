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

### Requirement: Workspace presentation is AddOne-owned and SDK-backed
The production workspace presentation SHALL use an accepted AddOne-owned UI foundation. Pi-backed agents SHALL use Pi's documented public SDK as their engine behind AddOne-owned view state, reducers, input, focus, composition, and customization slots. Pi SDK and UI types SHALL be confined to adapters and SHALL NOT become workspace-domain contracts. The presentation SHALL NOT patch or inspect Pi's stock `InteractiveMode`, prototypes, private fields, deep imports, or distribution-file hashes.

The foundation MAY wrap documented public Pi UI component exports behind AddOne-owned adapters and MAY port tightly coupled MIT-licensed Pi components into provenance-recorded AddOne modules with retained attribution. Exact current upstream Pi SHALL remain available through `a1 pi`.

#### Scenario: Open the first accepted owned UI
- **WHEN** the user launches the initial accepted AddOne-owned Pi experience
- **THEN** AddOne SHALL present one fullscreen session with accepted transcript, streaming, tools, editor, queued input, abort/retry/compaction, model and thinking controls, session resume, settings, clipboard, resize, diagnostics, and shutdown behavior

#### Scenario: Customize the owned presentation
- **WHEN** the user selects an AddOne theme, component, command, or layout customization
- **THEN** AddOne SHALL resolve it through stable owned slots without mutating installed Pi code or relying on Pi interactive-TUI internals

#### Scenario: Upgrade the Pi engine
- **WHEN** AddOne evaluates a newer Pi package
- **THEN** engine and public-component adapters SHALL pass conformance tests before release, and incompatible changes SHALL remain contained at those adapters

#### Scenario: Request structured tabs before base UX acceptance
- **WHEN** multi-agent tabs are requested before the owned fullscreen base-UX and upgrade-conformance gates pass
- **THEN** AddOne SHALL keep structured tabs unavailable rather than building them on the stock Pi interactive root or the disposable 2×2 proof UI

### Requirement: Structured agent tabs do not imply terminal composition
After fullscreen base-UX acceptance, the workspace MAY present multiple structured SDK-backed agents as AddOne-owned tabs. Each structured tab SHALL bind one durable agent identity to its own semantic transcript, tools, editor state, activity, status, and command target. Creating, selecting, or closing a structured tab SHALL NOT create a pseudoterminal, initialize the terminal host, or claim arbitrary CLI-pane support.

#### Scenario: Open two structured Pi agents in tabs
- **WHEN** the user creates two Pi SDK-backed agents after fullscreen base-UX acceptance
- **THEN** AddOne SHALL show two independently identified tabs whose views, commands, activity, and lifecycle remain isolated

#### Scenario: Switch structured tabs while agents are active
- **WHEN** the user switches tabs while both structured agents continue working
- **THEN** AddOne SHALL change only the selected semantic view and input target while retaining background activity under the correct agent identity

#### Scenario: Composed proof remains pending
- **WHEN** structured tabs are accepted but isolated-worker terminal-host proof is incomplete
- **THEN** AddOne MAY continue structured multi-agent UI work but SHALL keep arbitrary terminal panes, split layouts, and multiplexer controls unavailable

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

#### Scenario: Terminal-backed CLI pane is selected
- **WHEN** an arbitrary interactive CLI pane is selected within a composed tab
- **THEN** the workspace SHALL delegate native interaction to the composed-terminal host and SHALL NOT claim structured message, tool, or task semantics

#### Scenario: Composed capability has not passed its proof gate
- **WHEN** the native composed-terminal capability is unavailable, unaccepted, or disabled
- **THEN** the workspace SHALL keep terminal-pane actions unavailable while preserving structured-agent operations and explicit transparent modes
