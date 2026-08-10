## Purpose

Defines the terminal-agent mode that lets AddOne host native Pi, Claude Code, Codex, shells, and arbitrary command-line agents without coupling the shell to their private UI implementations.

## ADDED Requirements

### Requirement: AddOne can launch arbitrary commands in isolated PTYs
The terminal driver SHALL launch a configured executable with explicit arguments, environment, working directory, terminal type, dimensions, and runtime identity.

#### Scenario: Launch a supported native agent
- **WHEN** the user creates a terminal agent using a configured Claude Code, Codex, or Native Pi profile
- **THEN** AddOne SHALL launch the command in a PTY and present its terminal surface in the selected tab

#### Scenario: Launch an arbitrary command
- **WHEN** the user creates a generic terminal agent with a valid executable and arguments
- **THEN** AddOne SHALL host that command without requiring agent-specific semantics

### Requirement: Terminal surfaces preserve PTY behavior
The terminal driver SHALL process terminal output into a bounded surface with cursor state and SHALL forward unclaimed input, paste, resize, and supported mouse data to the focused PTY.

#### Scenario: Resize a terminal tab
- **WHEN** the AddOne content area changes size
- **THEN** the driver SHALL resize the PTY and publish a surface matching the new dimensions

#### Scenario: Interactive native dialog
- **WHEN** a native agent renders a dialog and reads keyboard input
- **THEN** the user's unclaimed keystrokes SHALL reach the PTY in order

### Requirement: Generic terminal output is semantically opaque
AddOne SHALL not infer tool execution, model state, settled state, conversation state, or successful work from terminal text or screen position unless a specialized driver supplies that information through an explicit supported channel.

#### Scenario: Terminal prints success-like text
- **WHEN** a generic PTY displays text containing words such as "done" or "success"
- **THEN** AddOne SHALL not convert that text into a semantic successful-agent status

#### Scenario: Specialized driver reports status
- **WHEN** a specialized PTY driver supplies an authenticated or documented structured status event
- **THEN** AddOne MAY present that status according to the advertised capability without screen scraping

### Requirement: Native Pi provides the full interactive compatibility path
A Native Pi PTY profile SHALL run Pi's normal interactive interface so extensions and built-in flows requiring Pi's native TUI can operate under the selected native runtime's own compatibility rules.

#### Scenario: Pi extension uses a custom TUI component
- **WHEN** the user needs a Pi extension that is classified as native-only
- **THEN** the user SHALL be able to launch or use a Native Pi PTY profile where Pi owns the inner interface

### Requirement: PTY failures are contained
The terminal driver SHALL report spawn errors, exits, signals, and terminal transport failures without terminating the AddOne shell or unrelated agents.

#### Scenario: Executable is missing
- **WHEN** a configured executable cannot be found or started
- **THEN** the logical agent SHALL enter an actionable error state and sibling agents SHALL remain available

#### Scenario: Child exits with failure
- **WHEN** the PTY child exits with a non-zero status
- **THEN** AddOne SHALL retain the final terminal surface and display the exit status

### Requirement: Resume guarantees are driver-specific
Each terminal profile SHALL declare whether it supports session discovery and exact resume, best-effort resume, or no resume, and AddOne SHALL present recovery behavior consistent with that declaration.

#### Scenario: Specialized exact resume
- **WHEN** a Native Pi profile records a valid exact session and advertises exact resume
- **THEN** its recovery path SHALL validate and resume that session according to the profile contract

#### Scenario: Generic PTY process is lost
- **WHEN** an opaque generic PTY process exits and has no resume capability
- **THEN** AddOne SHALL report the session as non-recoverable rather than silently launching a fresh process as the same continuous conversation

### Requirement: Terminal views can reconnect to resident surfaces
When a UI client reconnects while a supervised PTY remains resident, the supervisor SHALL provide its current bounded terminal surface before newer terminal updates.

#### Scenario: Restart AddOne UI with live PTY
- **WHEN** the UI restarts while a PTY agent remains alive under the supervisor
- **THEN** the restored terminal tab SHALL display the resident surface and continue accepting input
