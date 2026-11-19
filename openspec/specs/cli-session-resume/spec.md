# cli-session-resume Specification

## Purpose
Defines selection and restoration of persisted A1 sessions through the public CLI, recovery when a session's folder is gone, writer ownership, and the resume command printed when a session exits.


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
For an existing local-ID or explicit-file target supported by the pinned Pi, A1 SHALL restore the persisted session identity, active conversation branch, compaction context, and saved model/thinking state under that pin's actual restoration behavior and normal model fallback rules. Sessions written by the same pin, including its supported compaction format, SHALL be covered. A1 SHALL introduce no additional context loss relative to direct reopening with the same pin. The UI SHALL present restored conversation content before accepting a new prompt. Project trust and cwd-bound resources SHALL be resolved for the effective resumed cwd before project resources execute. A1 SHALL NOT submit an automatic model prompt merely to resume.

When the stored cwd of the selected session no longer exists, A1 SHALL NOT silently substitute another directory and SHALL NOT fail outright. It SHALL print `Session cwd does not exist: <stored cwd>` and offer three choices for the invoking directory: Continue, which opens the same session there for this run only and asks again on the next resume; Fork, which creates a new session ID there and leaves the original unchanged; and Cancel. Cancel, an unrecognized answer, end of input, and an interrupt SHALL print `Session resume cancelled.` and exit 0 without opening a conversation. The invoking directory SHALL itself exist, otherwise the resume SHALL fail nonzero.

Missing IDs, missing or empty files, unreadable files, and files rejected as invalid sessions SHALL produce a focused nonzero failure without opening a fresh conversation, overwriting the target, or creating a file named after the supplied ID.

#### Scenario: Resume a compacted session
- **WHEN** a persisted session created through the pinned public APIs contains messages, a compaction checkpoint in that pin's supported format, and later messages
- **THEN** the restored UI and agent context SHALL reflect the same active branch and checkpoint context as direct Pi reopening, retaining the session ID and saved model/thinking state subject to normal fallback

#### Scenario: Resume a newly created uncompacted session
- **WHEN** a fresh A1 session has persisted conversation messages, exits, and is selected again through its emitted command
- **THEN** A1 SHALL restore that conversation and identity before accepting another prompt

#### Scenario: Resume into an untrusted project
- **WHEN** an explicit session file resolves to a cwd whose project trust has not been established
- **THEN** A1 SHALL resolve trust for that cwd before executing its project-local resources

#### Scenario: Stored cwd is missing
- **WHEN** a selected existing session's stored cwd no longer exists
- **THEN** A1 SHALL name the missing cwd and offer Continue, Fork, and Cancel for the invoking directory
- **AND** Continue SHALL open the same session ID in the invoking directory, Fork SHALL open a new session ID there and keep the original, and Cancel SHALL exit 0 without opening a conversation

#### Scenario: Target cannot be resumed
- **WHEN** the ID is unknown, the selected file is missing, empty, unreadable, or rejected as invalid
- **THEN** A1 SHALL report the failure, exit nonzero, preserve existing session data, and create neither a replacement session nor an ID-named file

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

Ordinary and pi-named normal-product entries SHALL share one session selection grammar through the same session services: new default, `--continue`, `--resume`, `--session <path|id>`, `--session-id <id>`, `--fork <path|id>`, `--session-dir <dir>`, `--name <name>`, and `--no-session`. Ordinary prompts SHALL be positional, with `--` ending option parsing; these options SHALL NOT introduce a bare resume subcommand or a comparison fallback. Each value option SHALL require a separate non-empty value and SHALL occur at most once. `--session` SHALL NOT combine with `--fork` or `--session-id`. `--session-dir` without `--session` SHALL select storage for a new session. Valid session options MAY combine with the other launch options.

Persistent selections SHALL preserve profile isolation, actual history and active context, and pinned effective-cwd semantics. `--no-session` SHALL create a real in-memory session with no session file, no writer lock, and no resume hint. `--continue` SHALL open the most recent session of the invoking directory, or a new session when there is none. `--resume` SHALL require an interactive terminal for its picker. `--session-id` SHALL open the invoking directory's session with that ID or create it, serialized against a concurrent selection of the same ID. Every selection that resumes an existing session file SHALL acquire that file's writer before the session is opened.

#### Scenario: Select an existing session by ID

- **WHEN** either entry selects a saved A1 session by ID
- **THEN** the shared service SHALL restore it under the canonical writer guard rather than no-op or create an ID-named new file

#### Scenario: Supply a custom directory in either order

- **WHEN** `--session-dir` and `--session` are supplied in either order
- **THEN** both entries SHALL resolve the same target and effective storage

#### Scenario: Malformed session launch

- **WHEN** a required value is missing, an option is repeated, or selectors are combined outside the grammar
- **THEN** a focused nonzero failure SHALL precede runtime admission without overwriting or silently creating history

#### Scenario: Inspect help without launching

- **WHEN** standalone help is requested
- **THEN** the session options SHALL be described without factories or session startup

#### Scenario: Resume an idle session

- **WHEN** an existing selected session has no writer
- **THEN** A1 SHALL restore that session and context through the same services

#### Scenario: Launch selects a held session

- **WHEN** a launch selects a file held by a live or unverifiable participating writer
- **THEN** A1 SHALL NOT open a second writer on that file or take its ownership
- **AND** it SHALL offer to fork into the invoking directory, and SHALL fail nonzero with `session is open in another A1 process` when the fork is declined

#### Scenario: Continue and explicit fork

- **WHEN** `--continue` or `--fork` is selected
- **THEN** the current-directory continuation or independent new-ID fork SHALL preserve the source history and leave the source session unchanged

#### Scenario: Custom ID and name

- **WHEN** a custom session ID and name are supplied
- **THEN** A1 SHALL open the current-directory session with that ID or create it, and `--fork` with an ID that already exists in the project SHALL fail

#### Scenario: No-persistence execution

- **WHEN** `--no-session` is selected
- **THEN** a real session ID and runtime lifecycle SHALL be available without writing a session JSONL file or suggesting resumability

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
