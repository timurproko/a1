## ADDED Requirements

### Requirement: Normal A1 exit hints round-trip through the public command
A resume hint emitted by the normal A1 profile SHALL be accepted by that build's installed public CLI and restore the exact persisted session using that build's pinned Pi behavior when run from the original project with its session store available. Acceptance SHALL exercise a newly created and persisted disposable conversation, including supported compaction, rather than require recovery of the user's current session or an unsupported forward format. Default-directory hints SHALL retain compact session IDs without raw default file paths. Custom-directory hints SHALL retain correctly quoted `--session-dir` before `--session`. Both fullscreen exit-output modes SHALL share this executable behavior, preserve existing terminal-restoration ordering and styling, and SHALL NOT claim resumability for an unpersisted session. Formatting-only assertions SHALL NOT constitute end-to-end resume evidence.

#### Scenario: Execute a default-directory hint
- **WHEN** a newly created normal A1 session persists conversation messages in default storage, exits, and the user copies its hint into the original project shell
- **THEN** the public command SHALL restore the same session identity and persisted conversation rather than silently exit or launch an empty session

#### Scenario: Execute a custom-directory hint
- **WHEN** a normal A1 session exits with custom storage whose path needs shell quoting and the user executes the hint
- **THEN** the public command SHALL preserve the directory argument and restore the exact session ID

#### Scenario: Compare exit modes
- **WHEN** the same persisted normal A1 session exits using `transcript` or `resume-hint`
- **THEN** either emitted command SHALL select the same session without changing the declared output style or terminal cleanup behavior

#### Scenario: Session was never persisted
- **WHEN** the normal A1 UI exits without a persisted resumable session
- **THEN** it SHALL NOT emit a command claiming that session can be resumed
