## MODIFIED Requirements

### Requirement: Product commands own worktree entry and attachment

A1 SHALL retain enter/attach/detach/list and explicitly support selected existing PR/head branches. Verify repository/ref/head and fetch before adopting remote-only or unoccupied local branches without rewriting tips. Owned dirty checkouts SHALL preserve edits. Divergence/collisions/ownership conflict SHALL fail non-destructively. Success is authoritative; setup and cleanup are separate. Aliases remain compatible.

#### Scenario: Create and resume a task

- **WHEN** an active session enters a new valid task branch
- **THEN** A1 SHALL create its isolated worktree from the selected current base and attach it
- **AND** repeating entry SHALL preserve matching existing uncommitted work

#### Scenario: A selected checkout cannot be acquired

- **WHEN** the selected path is foreign, primary, locked, mismatched, or owned by another live runtime
- **THEN** the operation SHALL retain existing files and the previous attachment and return a bounded actionable failure
- **AND** SHALL NOT force creation, overwrite a branch, or remove a worktree

#### Scenario: Remote-only proposal branch
- **WHEN** implementation is requested for a verified planning PR
- **THEN** its checkout SHALL start at that existing head, preserving history

#### Scenario: Unoccupied local branch
- **WHEN** identity and state permit explicit reuse
- **THEN** entry SHALL retain its tip without reset
- **AND** divergence SHALL be reported

### Requirement: Implementation handoff preserves task attachment

Shared repository guidance SHALL keep the active task worktree attached after implementation completion and review handoff so follow-up tools and PR discovery continue using the same task context. Agents SHALL detach on an explicit request, cross-machine transfer or task switch, and SHALL use guarded completion after a verified merge, not merely because an implementation response or handoff is complete. Guidance SHALL forbid running repository cleanup directly against the attached checkout. Runtime shutdown SHALL continue releasing its editing claims automatically. Attachment, cleanup ownership, publication and merge SHALL remain independent. Explicit local-only removal before merge SHALL use its guarded operation; ordinary review handoff MAY retain attachment.

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

## ADDED Requirements

### Requirement: Local-only removal settles outside its checkout

A1 SHALL support an explicit local-only adapter separate from merged completion. Owned-context and preservation preflight SHALL precede detach; a trusted exact repository operation SHALL run after shell exit and revalidate publication/content/claims. Runtime code SHALL not delete files or remote refs. Missing support/races SHALL preserve resources and report the actual outcome without a broad sweep.

#### Scenario: Published open-PR removal
- **WHEN** the user requests local-only removal and preflight succeeds
- **THEN** the session SHALL leave before the exact operation runs
- **AND** remote branch/PR SHALL remain unchanged

#### Scenario: Owner appears after detach
- **WHEN** another owner acquires the checkout
- **THEN** cleanup SHALL retain it and the session SHALL remain usable outside it

#### Scenario: Operation unavailable
- **WHEN** no trusted local-only declaration exists
- **THEN** the runtime SHALL report unavailable support without substituting complete/discard
