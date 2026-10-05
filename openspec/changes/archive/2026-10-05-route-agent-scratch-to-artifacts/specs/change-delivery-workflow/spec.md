## ADDED Requirements

### Requirement: Agents keep repository-delivery scratch files inside the owning worktree

When a delivery agent directly chooses and materializes a transient file for repository work, it SHALL place that file beneath the exact `.artifacts/` root of the repository worktree that owns the operation. Covered files SHALL include pull-request or comment body files, command-interchange payloads, captured command/query output, temporary patches or diffs, and ad hoc delivery logs. A delivery with a linked task worktree SHALL use that worktree's `.artifacts/` root and SHALL NOT select the primary checkout, another worktree, the operating-system temporary directory, the user's home or desktop, or a sibling path for its scratch file.

Agent-created scratch content under `.artifacts/` SHALL remain ignored, unstaged, uncommitted, disposable, and non-authoritative. Durable source or implementation evidence SHALL be promoted to its declared tracked location rather than cited from disposable scratch. Availability of `.artifacts/` SHALL NOT authorize an agent to materialize credentials, tokens, or other content prohibited by the repository's data policy. Cleanup SHALL continue to apply the existing exact-root containment, link, special-file, nested-repository, and bounded-inspection safeguards; this requirement SHALL NOT broaden deletion authority.

This requirement SHALL govern paths directly selected by an agent. It SHALL NOT relocate temporary storage internally selected by Git, GitHub CLI, OpenSpec, language/package tooling, test frameworks, product runtime code, or other invoked tools, and SHALL NOT prohibit hermetic test fixtures whose temporary-path behavior is part of the test contract.

#### Scenario: Agent prepares a pull-request body file

- **GIVEN** a delivery agent needs a file for `gh pr create --body-file` or `gh pr edit --body-file`
- **WHEN** the agent chooses the file's path
- **THEN** it SHALL create a purpose-specific descendant beneath the owning worktree's exact `.artifacts/` root
- **AND** it SHALL NOT write that body file beneath `$TMPDIR`, `%TEMP%`, `/tmp`, the user's home or desktop, or another checkout

#### Scenario: Linked task worktree owns the scratch file

- **GIVEN** the session is linked to an exact task worktree while the primary checkout and other worktrees also exist
- **WHEN** the agent materializes a transient command payload, captured output, patch, diff, or log for that delivery
- **THEN** the selected path SHALL resolve beneath the linked task worktree's `.artifacts/` root
- **AND** repository operations SHALL consume that worktree-owned path explicitly rather than relying on tool cwd

#### Scenario: Scratch content remains disposable

- **WHEN** an agent-created file beneath `.artifacts/` is no longer needed or the delivery is handed off
- **THEN** the file SHALL remain ignored, unstaged, uncommitted, and eligible for the existing guarded generated-content cleanup
- **AND** it SHALL NOT serve as the only copy of required durable evidence or source content

#### Scenario: Content is unsafe to persist

- **WHEN** a command can be completed without materializing a credential, token, or other prohibited sensitive value
- **THEN** the agent SHALL not write that value to `.artifacts/` merely because the directory is ignored
- **AND** the ordinary repository data-handling restrictions SHALL remain authoritative

#### Scenario: Invoked tooling owns an internal temporary path

- **WHEN** an invoked repository command, third-party tool, product runtime, or hermetic test internally allocates temporary storage without the agent selecting that path
- **THEN** this delivery-scratch requirement SHALL NOT require that internal path to move beneath `.artifacts/`
- **AND** the applicable runtime, tooling, isolation, and cleanup contract SHALL continue to govern it
