## ADDED Requirements

### Requirement: Bare A1 preserves implicit session exports outside worktrees

Bare A1 SHALL store implicit HTML and format-only JSONL session exports under `~/.a1/exports/`, independently of checkout and temporary development roots. It SHALL reserve unique timestamp/session-based filenames without overwriting. Explicit output destinations and comparison behavior SHALL remain unchanged. Exports SHALL remain user data, not cleanup disposables.

#### Scenario: Export without a destination

- **WHEN** bare A1 exports HTML without an output path or exports JSONL using only its format selection
- **THEN** the absolute output path SHALL be inside the user's persistent export directory
- **AND** no default export SHALL be created in the working checkout

#### Scenario: Repeat an export

- **WHEN** the same session is exported repeatedly or a candidate filename already exists
- **THEN** every successful default export SHALL have its own reserved file without replacing prior user content

#### Scenario: Choose an explicit destination

- **WHEN** the user supplies an output filename or path
- **THEN** that destination SHALL retain its existing meaning instead of being silently redirected

#### Scenario: Preserve comparison behavior

- **WHEN** the pinned comparison profile exports a session
- **THEN** its default and explicit output behavior SHALL remain unchanged

#### Scenario: Fail while writing a reserved default

- **WHEN** writing a default export fails
- **THEN** the failure SHALL remain visible and cleanup SHALL remove only the reservation this invocation created
- **AND** existing exports SHALL remain intact
