# cli-session-resume Specification

## Purpose

Defines reliable selection and restoration of persisted A1 sessions through the public CLI and the resume command printed when the normal A1 UI exits. Acceptance targets future sessions created with the shipped Pi version and its actual restoration behavior, not recovery of the user's current conversation or support for formats beyond that pin.

## Requirements

### Requirement: Session resolution preserves pinned Pi selection semantics and profile isolation
A1 SHALL distinguish explicit paths from IDs using pinned Pi's path syntax: a value containing a slash or backslash, or ending in `.jsonl`, is a path. Relative paths SHALL resolve against the invoking cwd. ID lookup SHALL search current-project sessions first, preferring an exact ID over a prefix match within that scope, then search other projects in the selected session store only when no local match exists. Within each scope, multiple prefix matches SHALL use pinned Pi's listing-order selection. Default discovery SHALL use the A1 profile and SHALL NOT fall back to the ordinary Pi profile. An explicit `--session-dir` SHALL take precedence over the supported session-directory environment override, which SHALL take precedence over the default directory. Explicit paths and directories SHALL count as user-selected storage, not implicit profile merging.

#### Scenario: Exact ID and shorter prefix both match
- **WHEN** the current project contains an exact ID match and another ID beginning with the same selector
- **THEN** A1 SHALL select the exact local match

#### Scenario: Current-project prefix and cross-project exact ID both match
- **WHEN** the current project contains a matching prefix and another project contains an exact match
- **THEN** A1 SHALL select the local prefix match as pinned Pi does

#### Scenario: Several prefixes match in one scope
- **WHEN** there is no exact match and multiple sessions in the searched scope share the prefix
- **THEN** A1 SHALL use the same first-match listing order as the pinned Pi CLI

#### Scenario: A session exists only in the Pi profile
- **WHEN** default A1 ID lookup finds no match but the ordinary Pi profile contains that ID
- **THEN** A1 SHALL report no matching session rather than read or copy the Pi session

#### Scenario: Explicit custom directory overrides the environment
- **WHEN** `--session-dir` differs from the supported session-directory environment override
- **THEN** ID lookup and subsequent session storage SHALL use the explicit directory with pinned Pi's project filtering semantics

#### Scenario: Resume an explicit relative file
- **WHEN** a relative `.jsonl` path names an existing saved session
- **THEN** A1 SHALL resolve it from the invoking cwd regardless of any later effective session cwd change

### Requirement: Cross-project ID selection requires an explicit fork decision
When only a cross-project ID match is found, A1 SHALL identify the source project and ask whether to fork into the invoking directory, matching pinned Pi's CLI behavior. Acceptance SHALL create a distinct session identity containing the source history in the invoking project without modifying the source session. Decline or cancellation SHALL exit without launching the conversation or creating a fork. An explicit session file path SHALL instead open that file directly and use its persisted cwd; it SHALL NOT implicitly fork merely because that cwd differs from the invoking directory.

#### Scenario: Accept a cross-project match
- **WHEN** the user confirms the cross-project fork prompt
- **THEN** A1 SHALL start the fork with restored history and a new ID in the invoking project, leaving the source unchanged

#### Scenario: Decline or cancel a cross-project match
- **WHEN** the user declines or cancels the cross-project fork prompt
- **THEN** A1 SHALL report cancellation and exit successfully without opening a conversation or writing a fork

#### Scenario: Open another project's file explicitly
- **WHEN** the user selects an existing session by explicit file path and its stored cwd exists
- **THEN** A1 SHALL resume that file and ID using its stored cwd rather than silently binding its tools to the invoking directory

### Requirement: Resume restores persisted agent context without accidental session creation
For an existing local-ID or explicit-file target supported by the pinned Pi, A1 SHALL restore the persisted session identity, active conversation branch, compaction context, and saved model/thinking state under that pin's actual restoration behavior and normal model fallback rules. Sessions newly written by the same pin, including its supported compaction format, SHALL be covered. A1 SHALL introduce no additional context loss relative to direct reopening with the same pin. This change SHALL NOT require a dependency upgrade, recovery of the user's current conversation, or certification/reconstruction of an unsupported retained-tail format. The UI SHALL present restored conversation content before accepting a new prompt. Project trust and cwd-bound resources SHALL be resolved for the effective resumed cwd before project resources execute. A missing effective cwd SHALL fail with a focused diagnostic rather than silently substitute another directory. Missing IDs, missing or empty files, unreadable files, and files rejected as invalid sessions SHALL produce a focused nonzero failure without opening a fresh conversation, overwriting the target, or creating a file named after the supplied ID. A1 SHALL NOT submit an automatic model prompt merely to resume.

#### Scenario: Resume a compacted session
- **WHEN** a newly persisted session created through the pinned public APIs contains messages, a compaction checkpoint in that pin's supported format, and later messages
- **THEN** the restored UI and agent context SHALL reflect the same active branch and checkpoint context as direct Pi reopening, retaining the session ID and saved model/thinking state subject to normal fallback

#### Scenario: Resume a newly created uncompacted session
- **WHEN** a fresh A1 session has persisted conversation messages, exits, and is selected again through its emitted command
- **THEN** A1 SHALL restore that conversation and identity before accepting another prompt, without requiring recovery of any earlier personal session

#### Scenario: Resume into an untrusted project
- **WHEN** an explicit session file resolves to a cwd whose project trust has not been established
- **THEN** A1 SHALL resolve trust for that cwd before executing its project-local resources

#### Scenario: Stored cwd is missing
- **WHEN** a selected existing session's effective cwd no longer exists
- **THEN** A1 SHALL report the unavailable cwd and exit nonzero without rebinding the conversation to the invoking cwd

#### Scenario: Target cannot be resumed
- **WHEN** the ID is unknown, the selected file is missing, empty, unreadable, or rejected as invalid
- **THEN** A1 SHALL report the failure, exit nonzero, preserve existing session data, and create neither a replacement session nor an ID-named file

### Requirement: Installed-entry evidence proves the resume path
Automated regression evidence SHALL exercise normal A1's public installed entry and production launch transport against fresh disposable sessions persisted through that build's pinned public Pi APIs, not only an internal UI entry or a formatted string. Evidence SHALL cover a create/persist → exit → resume lifecycle for uncompacted and supported compacted history, record the Pi version, and compare context with direct same-pin reopening plus independent expected conversation markers/order. Unsupported synthetic retained-tail behavior SHALL NOT be a prerequisite for this CLI parity evidence or be reported as certified by it. Evidence SHALL cover default and custom directories, argument quoting, restored session identity/context, negative target resolution, and independent invocations. Tests SHALL isolate home/profile/release state and SHALL NOT depend on personal session files, credentials, network model calls, or an already-running user A1 process.

#### Scenario: Execute the emitted hint through the installed entry
- **WHEN** a newly created isolated session is persisted using the pin, exits normal A1, and its emitted command is executed through the packaged A1 entry
- **THEN** the resulting UI SHALL restore that session's identity and conversation context through the real launch chain

#### Scenario: Windows custom-directory round trip
- **WHEN** the emitted command selects a custom directory containing spaces and an apostrophe in Windows Git Bash
- **THEN** A1 SHALL receive the original directory as one argument and restore the intended session without shell evaluation inside its launch chain

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

### Requirement: Session writer lifetime is fenced
A1 SHALL retain exclusive writer ownership while its owning process is live or unverifiable, regardless of heartbeat age. A stale claim SHALL be reclaimed only after the owner is proven absent; malformed legacy claims SHALL remain protected when absence cannot be established. Lost ownership SHALL fence further writing. Runtime construction failure and disposal SHALL release held writers exactly once through the integration owner.

#### Scenario: Writer stalls
- **WHEN** a live writer stops refreshing its heartbeat beyond the stale interval
- **THEN** a second process SHALL remain unable to acquire its session
- **AND** the original writer SHALL not continue unfenced after any loss of ownership

#### Scenario: Runtime initialization fails or disposal completes
- **WHEN** a writer has been acquired and initialization fails or the adapter disposes its runtime
- **THEN** ownership SHALL be released without depending on process exit

#### Scenario: Dead writer is recovered
- **WHEN** the recorded writer process is proven absent
- **THEN** a later open MAY reclaim the session without deleting or rewriting its conversation

### Requirement: Large supported histories resume without delivery overflow
A1 SHALL restore an existing supported same-pin session whose authoritative UI transcript exceeds 8 MiB without treating accumulated history as pending-event saturation. The public installed entry SHALL reach input readiness with the persisted identity and active context, preserve source bytes absent new user work, and introduce no context loss relative to direct same-pin reopening. Regression fixtures SHALL be isolated synthetic sessions persisted with the pinned public APIs, not personal conversation copies.

#### Scenario: Resume a large uncompacted session
- **WHEN** the ordinary exit hint selects a supported uncompacted session with a projected transcript larger than 8 MiB
- **THEN** the public entry SHALL restore its identity and conversation before accepting another prompt without an engine-delivery failure
- **AND** independent early and late markers and direct same-pin context SHALL agree without truncating or rewriting the session

#### Scenario: Resume a large compacted session
- **WHEN** a supported compacted same-pin session still projects more than 8 MiB of active transcript
- **THEN** its emitted resume command SHALL restore the same active checkpoint context and later messages as direct reopening
- **AND** no automatic model request or forced compaction SHALL be required to reach input readiness
