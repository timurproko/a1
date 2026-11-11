## ADDED Requirements

### Requirement: A definitively invalid attachment is released without blocking tools

A1 SHALL distinguish a definitively invalid attachment from an uncertain one. An attachment is definitively invalid when the session's startup checkout still verifies and the recorded checkout is missing, is not a Git worktree root, or resolves to a different Git directory or repository than recorded. On that result A1 SHALL remove only the session's own association and editing claim, SHALL fail the triggering built-in tool call once with an explanation naming the released path and the startup root, and SHALL resolve subsequent built-in tools and repository discovery from the startup checkout. Uncertain failures SHALL NOT release the attachment or redirect work. Recovery SHALL NOT delete files, branches, or another owner's claim, and plain detach SHALL succeed without validating the attached checkout.

#### Scenario: The attached checkout was removed

- **GIVEN** a session attached to a task checkout whose directory or Git pointer no longer exists
- **WHEN** a built-in tool runs
- **THEN** that call SHALL fail with an invalid-attachment explanation rather than executing in another directory
- **AND** the next built-in tool call SHALL run from the startup checkout

#### Scenario: A session resumes with an invalid attachment

- **WHEN** a session whose recorded checkout is definitively invalid activates
- **THEN** it SHALL start detached on its startup checkout without a manual recovery step

#### Scenario: Validation is uncertain

- **WHEN** validation times out, is cancelled, or cannot verify the startup checkout
- **THEN** the association and claim SHALL be retained
- **AND** the tool call SHALL fail without redirecting to the startup checkout

#### Scenario: Detach from an invalid checkout

- **WHEN** a session requests detach while its attached checkout is missing
- **THEN** the association SHALL be cleared and no file or branch SHALL be removed

### Requirement: Completion returns the session to primary before cleanup

A1 SHALL expose `worktree complete` with optional change and pull-request selectors. It SHALL require a valid attachment owned by the calling session, SHALL remain attached and report the blocker when the checkout is locked in Git or holds tracked, staged, or untracked content, and SHALL otherwise release the attachment before any cleanup starts. Cleanup SHALL run from the startup checkout in the A1 runtime after the issuing shell has exited, through a command configured in the primary repository's local Git configuration and executed without a shell. A1 SHALL NOT delete worktrees or branches itself and SHALL NOT take a cleanup command from task-checkout files. When no command is configured, or it needs a selector that was not supplied, completion SHALL detach and report cleanup unavailable. A blocked or failed cleanup SHALL leave the session operational on the startup checkout and SHALL NOT be reported as removal. Cleanup SHALL be skipped when another live session has claimed the checkout or the pending request has expired.

#### Scenario: Complete a merged task

- **WHEN** an attached session runs completion and the configured cleanup succeeds
- **THEN** the session's tools and repository discovery SHALL use the startup checkout before the cleanup command starts
- **AND** the result SHALL report completion with the checkout and branch

#### Scenario: The checkout holds unpublished content

- **WHEN** completion runs while the attached checkout has uncommitted or untracked content
- **THEN** the session SHALL stay attached and nothing SHALL be removed

#### Scenario: Cleanup is blocked

- **WHEN** the configured cleanup reports a blocker after detach
- **THEN** the result SHALL name the blocker
- **AND** subsequent built-in tools SHALL succeed from the startup checkout

#### Scenario: No cleanup command is configured

- **WHEN** completion runs in a repository without a configured cleanup command
- **THEN** the session SHALL be detached, the checkout SHALL be retained, and cleanup SHALL be reported unavailable

## MODIFIED Requirements

### Requirement: Implementation handoff preserves task attachment

Shared repository guidance SHALL keep the active task worktree attached after implementation completion and review handoff so follow-up tools and PR discovery continue using the same task context. Agents SHALL detach only on an explicit request or when switching tasks, and SHALL use guarded completion after a verified merge, not merely because an implementation response or handoff is complete. Guidance SHALL forbid running repository cleanup directly against the attached checkout. Runtime shutdown SHALL continue releasing its editing claims automatically. Runtime attachment, repository cleanup ownership, and merge authority SHALL remain independent.

#### Scenario: Continue after an implementation handoff

- **WHEN** implementation is complete and the agent hands the candidate to the maintainer for review
- **THEN** repository guidance SHALL preserve the task attachment rather than instructing detach
- **AND** subsequent built-in tools and PR discovery SHALL continue using the attached task worktree

#### Scenario: Explicitly leave the task

- **WHEN** the maintainer requests detach or the agent switches tasks
- **THEN** explicit detach SHALL remain available and preserve files and branches
- **AND** runtime shutdown SHALL release claims without requiring an implementation-handoff detach

#### Scenario: Finish after a verified merge

- **WHEN** the task's pull request is verified merged
- **THEN** repository guidance SHALL direct the agent to guarded completion rather than direct cleanup of the attached checkout
