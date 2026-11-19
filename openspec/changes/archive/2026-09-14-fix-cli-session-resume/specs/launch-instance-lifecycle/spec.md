## ADDED Requirements

### Requirement: Explicit session selection belongs to the originating launch instance
A supported session launch SHALL carry its validated target and effective session-directory selection intact through release selection, bootstrap, containment, and owned runtime startup. A supported retry or handoff SHALL preserve that same selection. Launch metadata SHALL remain per invocation, SHALL NOT become a supervisor-wide default or leak through inherited stale session metadata, and SHALL NOT require terminal parsing or shell command evaluation. Session launch failures SHALL retain the existing instance cleanup guarantees.

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
- **THEN** it SHALL start a fresh session and SHALL NOT reuse the previous selection implicitly

#### Scenario: Resume fails after containment starts
- **WHEN** target resolution or runtime initialization fails within an owned launch instance
- **THEN** the failure SHALL propagate to the invoking command and the instance's processes SHALL be cleaned up without affecting other instances
