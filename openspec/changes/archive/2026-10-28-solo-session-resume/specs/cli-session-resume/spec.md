## MODIFIED Requirements

### Requirement: Normal A1 accepts explicit session selection
Stable and prerelease builds SHALL support `a1 --session <path|id>` and `a1 solo --session <path|id>`, each with an optional `--session-dir <dir>` before or after `--session`. Each option SHALL occur at most once and require a nonempty value. `--session-dir` alone, missing values, duplicate options, unknown trailing options, and extra positional arguments in either recognized grammar SHALL fail with a focused diagnostic and nonzero exit status before supervisor or interactive startup. Help SHALL list the supported forms, including argument-free `a1 solo` as the explicit direct single-agent launch. Bare `a1` SHALL reattach to the profile's resident tabs, creating one fresh tab only when none exist, and a tabbed session launch SHALL open the selected session as a new tab in the launching client or focus the tab already holding it. Argument-free `a1 solo` SHALL start a fresh direct session; solo session selection SHALL resume the selected session directly, without initializing resident infrastructure. Unsupported solo arguments SHALL fail rather than selecting another route. A session launch on a supported platform SHALL honor the shared canonical session-writer lease in both modes. When a direct launch selects a session held by another writer, A1 SHALL retain its existing safe conflict behavior and SHALL NOT silently attach, overwrite, or start a second writer. Direct lease checks SHALL NOT initialize a resident host.

#### Scenario: Select an existing session by ID
- **WHEN** the user supplies `a1 --session <id>` for a saved A1 session
- **THEN** A1 SHALL execute an interactive session launch rather than return a silent successful no-op

#### Scenario: Supply a custom directory in either order
- **WHEN** the user supplies one valid `--session` and one valid `--session-dir` in either order, in tabbed or solo mode
- **THEN** both option orders SHALL select the same target and effective session directory in the requested mode

#### Scenario: Malformed session launch
- **WHEN** a recognized tabbed or solo session launch has a missing or empty value, duplicate option, unrecognized additional option, extra argument, or no `--session` target
- **THEN** A1 SHALL report one concise error, exit nonzero, and start no supervisor or interactive runtime

#### Scenario: Inspect help without launching
- **WHEN** the user runs `a1 --help` or `a1 -h`
- **THEN** help SHALL include both supported session-selection forms without launching an interactive runtime

#### Scenario: Explicit solo launch
- **WHEN** the user runs argument-free `a1 solo`
- **THEN** A1 SHALL start a fresh direct single-agent runtime without resident discovery

#### Scenario: Solo launch rejects extra arguments
- **WHEN** the user supplies arguments after `a1 solo` that are not one valid session-selection form
- **THEN** A1 SHALL report a concise syntax error and start no runtime

#### Scenario: Resume an idle session directly in solo mode
- **WHEN** the user runs `a1 solo --session <id>` for a saved A1 session that no writer holds
- **THEN** A1 SHALL restore that same session and context in the strip-free direct owned UI without discovering or starting a resident host

#### Scenario: Bare launch with resident tabs running
- **WHEN** two resident tabs are running and the user runs bare `a1`
- **THEN** A1 SHALL show both tabs and SHALL NOT create a third tab

#### Scenario: Session launch with resident tabs running
- **WHEN** `a1 --session <id>` selects a session no participating writer holds
- **THEN** A1 SHALL acquire its lease, add a tab resuming it, and view it in the launching client

#### Scenario: Session launch names a held session
- **WHEN** the selected session is held by a live resident tab and the user runs `a1 --session <id>`
- **THEN** A1 SHALL view that tab in the launching client and SHALL NOT start a second writer

#### Scenario: Direct launch selects a held session
- **WHEN** a direct fallback or `a1 solo --session <id>` selects a session held by a live resident tab or another solo process
- **THEN** A1 SHALL preserve the existing safe conflict behavior without starting a second writer, changing the resident owner, or automatically transferring its mode

### Requirement: Installed-entry evidence proves the resume path
Automated regression evidence SHALL exercise normal and solo A1's public installed entry and production launch transport against fresh disposable sessions persisted through that build's pinned public Pi APIs, not only an internal UI entry or a formatted string. Evidence SHALL cover a create/persist → exit → resume lifecycle for uncompacted and supported compacted history, record the Pi version, and compare context with direct same-pin reopening plus independent expected conversation markers/order. Unsupported synthetic retained-tail behavior SHALL NOT be a prerequisite for this CLI parity evidence or be reported as certified by it. Evidence SHALL cover default and custom directories, argument quoting, restored session identity/context, negative target resolution, and independent invocations. Tests SHALL isolate home/profile/release/control state and SHALL NOT depend on personal session files, credentials, network model calls, or an already-running user supervisor.

#### Scenario: Execute the emitted hint through the installed entry
- **WHEN** a newly created isolated session is persisted using the pin, exits normal or solo A1, and its emitted command is executed through the packaged A1 entry
- **THEN** the resulting UI SHALL restore that session's identity and conversation context through the real launch chain in the same tabbed or solo mode

#### Scenario: Windows custom-directory round trip
- **WHEN** the emitted command selects a custom directory containing spaces and an apostrophe in Windows Git Bash
- **THEN** A1 SHALL receive the original directory as one argument and restore the intended session without shell evaluation inside its launch chain

## ADDED Requirements

### Requirement: An exited solo session advertises solo resume
A1 SHALL emit a resume hint only for a persisted session. An exited direct `a1 solo` session SHALL print `a1 solo --session <id>` with its existing optional quoted `--session-dir <dir>` selection, including in a recoverable unclean-exit notice. Any existing tabbed resume hint SHALL keep the `a1 --session <id>` form; detaching from a still-running resident agent SHALL keep the `run a1 to return` message, not a new session-resume hint. A later fresh launch SHALL NOT inherit a previous selection.

#### Scenario: Direct solo session exits with resumable history
- **WHEN** a solo session persists its ID and exits
- **THEN** its command SHALL reopen that ID in direct solo mode with the same profile and effective storage directory

#### Scenario: Resident client leaves an agent running
- **WHEN** a client detaches from a resident host while an agent is still running
- **THEN** the client SHALL direct the user to run bare `a1` to return without suggesting a solo resume command

#### Scenario: Existing tabbed resume hint
- **WHEN** a tabbed session already emits a resume hint for persisted history
- **THEN** that hint SHALL retain the normal tabbed session-selection form
