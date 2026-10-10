## MODIFIED Requirements

### Requirement: Explicit session selection belongs to the originating launch instance
A supported session launch SHALL carry its validated target and effective session-directory selection intact through release selection, bootstrap, containment, and owned runtime startup. A supported retry or handoff SHALL preserve that same selection. Launch metadata SHALL remain per invocation, SHALL NOT become a supervisor-wide default or leak through inherited stale session metadata, and SHALL NOT require terminal parsing or shell command evaluation. Session launch failures SHALL retain the existing instance cleanup guarantees. When resident tabs are enabled, a bare-A1 session launch SHALL deliver its selection through its own attach client to the resident server, which SHALL open it as a tab or focus the tab already holding it in that client only; the selection SHALL NOT become a server-wide default for later launches.

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
- **AND** with resident tabs disabled it SHALL start a fresh session, while with resident tabs enabled it SHALL reattach to the existing tabs or create one fresh tab when none exist

#### Scenario: Resume fails after containment starts
- **WHEN** target resolution or runtime initialization fails within an owned launch instance
- **THEN** the failure SHALL propagate to the invoking command and the instance's processes SHALL be cleaned up without affecting other instances

#### Scenario: Select a session held by a resident tab
- **WHEN** resident tabs are enabled and `a1 --session <id>` names a session already owned by a live resident tab
- **THEN** A1 SHALL focus that tab in the launching client and SHALL NOT open the session in a second tab
