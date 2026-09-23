## ADDED Requirements

### Requirement: Agents bind the owning session to the active delivery worktree

An interactive A1 delivery agent SHALL treat its one owned task worktree as the active repository context for the delivery. Immediately after creating a new worktree, or after selecting and acquiring an existing worktree for a resumed delivery, the agent SHALL run `a1 session link-worktree <absolute-worktree>` from the owning session and SHALL require the command to confirm that exact canonical worktree before changing planning, implementation, test, or delivery-documentation files. The association SHALL remain bound to the same worktree, branch, history, and pull request through plan review and approved implementation.

The agent SHALL keep the primary checkout on `develop` and SHALL explicitly scope repository reads, edits, Git operations, builds, and tests to the active worktree. Session association SHALL select footer repository metadata and pull-request discovery only; it SHALL NOT be treated as a process/tool cwd change, worktree cleanup registration, ownership transfer, acceptance, or merge authority.

If association fails, identifies another path, or is unavailable in the owning interactive session, the agent SHALL report the blocker and SHALL NOT silently continue feature edits while the footer remains associated with the primary checkout. The agent SHALL NOT infer a replacement context by scanning worktrees, choosing a recent branch or pull request, or adopting another session's checkout. When the owning session deliberately switches delivery streams, it SHALL link the new exact owned worktree before work begins there so stale branch and pull-request metadata are not retained.

A draft pull request need not exist when the worktree is first linked. After that pull request exists, the established bounded repository refresh SHALL discover its open branch association and make its `#<number>` visible in the linked bare-A1 footer without requiring tool-cwd mutation or another delivery identity.

#### Scenario: Start a feature from the primary checkout

- **GIVEN** an interactive A1 delivery session started in the primary checkout on `develop`
- **WHEN** the agent creates its fresh feature worktree from the selected target
- **THEN** it SHALL successfully link that absolute worktree to the owning session before writing planning or implementation files
- **AND** all repository operations SHALL be explicitly scoped to that worktree
- **AND** the primary checkout SHALL remain on `develop`

#### Scenario: The linked feature gains a draft pull request

- **GIVEN** the owning session is linked to its feature worktree and branch
- **AND** the feature's draft pull request did not exist when the link was established
- **WHEN** the draft pull request is created and bounded repository refresh observes it
- **THEN** the bare-A1 footer SHALL show that worktree path and branch with the pull request's `#<number>`
- **AND** it SHALL NOT continue presenting the primary checkout's `develop` context

#### Scenario: Resume approved implementation

- **GIVEN** planning exists in an owned worktree, branch, and draft pull request
- **WHEN** a later interactive session acquires that delivery for approved implementation
- **THEN** it SHALL link the exact existing worktree before editing
- **AND** implementation SHALL continue in the same worktree, branch, history, and pull request rather than create a second delivery context

#### Scenario: Switch to another delivery stream

- **GIVEN** the session is associated with one delivery worktree
- **WHEN** it deliberately begins or resumes another owned delivery
- **THEN** it SHALL link the new exact worktree before reading or changing that stream as active work
- **AND** footer discovery SHALL stop using the prior stream's branch and pull request after the association refreshes

#### Scenario: Worktree association fails

- **WHEN** `a1 session link-worktree` fails, is unavailable, or confirms a path other than the intended owned worktree
- **THEN** the agent SHALL report the exact blocker and stop before feature edits
- **AND** SHALL NOT continue from the primary checkout, guess among local worktrees, or claim that the session switched successfully

#### Scenario: Linking does not transfer other authority

- **WHEN** an owned worktree is linked to the session
- **THEN** commands SHALL still address that worktree explicitly because tool cwd is unchanged
- **AND** cleanup ownership, acceptance, finalization, merge, and deletion SHALL continue to require their independent established evidence and commands
