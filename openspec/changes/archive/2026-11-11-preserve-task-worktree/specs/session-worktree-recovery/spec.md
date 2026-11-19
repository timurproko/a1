## ADDED Requirements

### Requirement: Implementation handoff preserves task attachment

Shared repository guidance SHALL keep the active task worktree attached after implementation completion and review handoff so follow-up tools and PR discovery continue using the same task context. Agents SHALL detach only on an explicit request or when switching tasks, not merely because an implementation response or handoff is complete. Runtime shutdown SHALL continue releasing its editing claims automatically. Runtime attachment, repository cleanup ownership, and merge authority SHALL remain independent.

#### Scenario: Continue after an implementation handoff

- **WHEN** implementation is complete and the agent hands the candidate to the maintainer for review
- **THEN** repository guidance SHALL preserve the task attachment rather than instructing detach
- **AND** subsequent built-in tools and PR discovery SHALL continue using the attached task worktree

#### Scenario: Explicitly leave the task

- **WHEN** the maintainer requests detach or the agent switches tasks
- **THEN** explicit detach SHALL remain available and preserve files and branches
- **AND** runtime shutdown SHALL release claims without requiring an implementation-handoff detach
