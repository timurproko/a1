## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Installed-entry evidence proves the resume path
**Reason**: It specified which regression evidence a change must produce rather than what the product does. The behavior it exercised is stated by the other requirements of this capability.
**Migration**: None. The resume tests remain in `test/`; delivery evidence is owned by the shared delivery workflow.

### Requirement: Session contract evidence spans public execution and programmatic boundaries
**Reason**: It specified conformance evidence for a delivery phase and named entry points that were pending, not product behavior.
**Migration**: None. Session selection behavior stays in "Normal A1 accepts one explicit session selection grammar".
