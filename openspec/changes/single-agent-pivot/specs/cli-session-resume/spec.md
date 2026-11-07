## ADDED Requirements

### Requirement: An exited session advertises its resume command
A1 SHALL emit a resume hint only for a persisted session. An exited bare-A1 session SHALL print `a1 --session <id>` with its existing optional quoted `--session-dir <dir>` selection, including in a recoverable unclean-exit notice printed by the launcher. A later fresh launch SHALL NOT inherit a previous selection.

#### Scenario: Session exits with resumable history
- **WHEN** a session persists its ID and exits
- **THEN** its printed command SHALL reopen that ID with the same profile and effective storage directory

#### Scenario: Session exits uncleanly
- **WHEN** the UI process ends unexpectedly after persisting a session ID
- **THEN** the launcher's notice SHALL include the same `a1 --session <id>` command

#### Scenario: Nothing was persisted
- **WHEN** a session exits before any entry was written
- **THEN** no resume hint SHALL be printed

### Requirement: Normal A1 accepts one explicit session selection grammar
Builds SHALL support `a1 --session <path|id>` with an optional `--session-dir <dir>` in either order, each option at most once with a nonempty value; malformed forms SHALL fail with a focused diagnostic and nonzero status before startup. Bare `a1` SHALL start a fresh session; a session launch SHALL resume the selected session in the same single-agent UI under the shared session-writer guard, never silently attaching, overwriting, or starting a second writer.

#### Scenario: Select an existing session by ID
- **WHEN** the user supplies `a1 --session <id>` for a saved A1 session
- **THEN** A1 SHALL execute an interactive session launch rather than return a silent successful no-op

#### Scenario: Supply a custom directory in either order
- **WHEN** the user supplies one valid `--session` and one valid `--session-dir` in either order
- **THEN** both option orders SHALL select the same target and effective session directory

#### Scenario: Malformed session launch
- **WHEN** a recognized session launch has a missing or empty value, duplicate option, unrecognized additional option, extra argument, or no `--session` target
- **THEN** A1 SHALL report one concise error, exit nonzero, and start no interactive runtime

#### Scenario: Inspect help without launching
- **WHEN** the user runs `a1 --help` or `a1 -h`
- **THEN** help SHALL include the supported session-selection form without launching an interactive runtime

#### Scenario: Resume an idle session
- **WHEN** the user runs `a1 --session <id>` for a saved A1 session that no writer holds
- **THEN** A1 SHALL restore that same session and context in the direct owned UI

#### Scenario: Launch selects a held session
- **WHEN** `a1 --session <id>` selects a session held by another live A1 process
- **THEN** A1 SHALL preserve the existing safe conflict behavior without starting a second writer

## MODIFIED Requirements

### Requirement: Installed-entry evidence proves the resume path
Automated regression evidence SHALL exercise normal A1's public installed entry and production launch transport against fresh disposable sessions persisted through that build's pinned public Pi APIs, not only an internal UI entry or a formatted string. Evidence SHALL cover a create/persist → exit → resume lifecycle for uncompacted and supported compacted history, record the Pi version, and compare context with direct same-pin reopening plus independent expected conversation markers/order. Unsupported synthetic retained-tail behavior SHALL NOT be a prerequisite for this CLI parity evidence or be reported as certified by it. Evidence SHALL cover default and custom directories, argument quoting, restored session identity/context, negative target resolution, and independent invocations. Tests SHALL isolate home/profile/release state and SHALL NOT depend on personal session files, credentials, network model calls, or an already-running user A1 process.

#### Scenario: Execute the emitted hint through the installed entry
- **WHEN** a newly created isolated session is persisted using the pin, exits normal A1, and its emitted command is executed through the packaged A1 entry
- **THEN** the resulting UI SHALL restore that session's identity and conversation context through the real launch chain

#### Scenario: Windows custom-directory round trip
- **WHEN** the emitted command selects a custom directory containing spaces and an apostrophe in Windows Git Bash
- **THEN** A1 SHALL receive the original directory as one argument and restore the intended session without shell evaluation inside its launch chain

## REMOVED Requirements

### Requirement: An exited solo session advertises solo resume
**Reason**: There is no solo mode; bare `a1` is the direct single-agent surface and its resume hint is covered by "An exited session advertises its resume command".

**Migration**: Users replace `a1 solo --session <id>` with `a1 --session <id>`.

### Requirement: Normal A1 accepts explicit session selection
**Reason**: The solo grammar and resident tab behaviors are removed.

**Migration**: Use `a1 --session <id>` for every resume.
