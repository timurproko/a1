## MODIFIED Requirements

### Requirement: A launch instance owns its complete runtime process tree
A launch instance SHALL own its selected root runtime and every agent, extension, tool, daemon, helper, and descendant process created within its declared containment boundary. Default interactive instances SHALL be non-detachable; a process that must survive instance closure requires a separately specified explicit resident capability. The resident agent host and its agent workers are that explicit capability: they SHALL be started only through the native resident-spawn path outside the instance containment, SHALL be owned and cleaned up by the resident host rather than by any launch instance, and SHALL NOT be used by other components to escape instance ownership.

#### Scenario: Runtime starts descendants
- **WHEN** an owned UI or Pi runtime starts extension daemons, agent workers, tools, or further descendants
- **THEN** those processes SHALL remain members of the originating launch instance and SHALL NOT become unowned background runtime processes

#### Scenario: A component requests implicit detachment
- **WHEN** an instance-owned component attempts to survive the closure of its originating instance without an explicit resident capability
- **THEN** A1 SHALL retain it within terminate-on-close ownership rather than silently detaching it

#### Scenario: Resident agents outlive a bare-A1 instance
- **WHEN** a bare-A1 launch instance with resident agents enabled closes normally or through terminal loss
- **THEN** A1 SHALL terminate that instance's foreground UI process tree and SHALL leave the resident host and its verified workers running

#### Scenario: Extension processes inside a worker
- **WHEN** an agent worker's runtime starts tools or extension subprocesses
- **THEN** those processes SHALL belong to that worker's resident ownership and SHALL be terminated when the worker is stopped

### Requirement: Explicit session selection belongs to the originating launch instance
A supported session launch SHALL carry its validated target and effective session-directory selection intact through release selection, bootstrap, containment, and owned runtime startup. A supported retry or handoff SHALL preserve that same selection. Launch metadata SHALL remain per invocation, SHALL NOT become a supervisor-wide default or leak through inherited stale session metadata, and SHALL NOT require terminal parsing or shell command evaluation. Session launch failures SHALL retain the existing instance cleanup guarantees. When resident agents are enabled, a bare-A1 session launch SHALL deliver its selection to the resident host, which SHALL open it as a tab or focus the tab already holding it.

#### Scenario: Launch an explicit session through an immutable release
- **WHEN** the installed command selects a persisted session and launches an approved immutable release
- **THEN** the contained owned runtime SHALL receive the same target and directory selection rather than start a fresh session

#### Scenario: Retry the launch path
- **WHEN** a supported launch retry or release handoff occurs after session selection
- **THEN** the replacement launch attempt SHALL preserve the original selection

#### Scenario: Resume two distinct sessions concurrently
- **WHEN** separate invocations select different saved sessions using the same profile and supervisor
- **THEN** each owned runtime SHALL receive only its invocation's selection and closing one SHALL leave the other active

#### Scenario: Start bare A1 after a resume invocation
- **WHEN** a bare launch follows an explicit resume launch or inherits unrelated session metadata from its parent environment
- **THEN** it SHALL NOT reuse the previous selection implicitly
- **AND** with resident agents disabled it SHALL start a fresh session, while with resident agents enabled it SHALL reattach to the existing resident agents or create one fresh agent when none exist

#### Scenario: Resume fails after containment starts
- **WHEN** target resolution or runtime initialization fails within an owned launch instance
- **THEN** the failure SHALL propagate to the invoking command and the instance's processes SHALL be cleaned up without affecting other instances

#### Scenario: Select a session held by a resident agent
- **WHEN** `a1 --session <id>` names a session already owned by a live resident agent
- **THEN** A1 SHALL focus that agent's tab and SHALL NOT open the session in a second agent
