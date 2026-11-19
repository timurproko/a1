## MODIFIED Requirements

### Requirement: Agents use the standardized completed-worktree cleanup procedure
When the owning agent hands a validated candidate to the maintainer for review and authorized manual merge, it SHALL invoke the repository's standard hand-off command from the primary checkout with the exact worktree, change, and pull-request identity, and SHALL invoke it again after any repair push. Every delivery session SHALL begin, before creating a worktree, by invoking the repository's standard sweep from the primary checkout and relaying its per-candidate outcomes in one line; a session that verifies or is told of a merge SHALL invoke the sweep, or the exact-candidate completed-delivery command, at that point. Pending or blocked sweep results SHALL NOT delay the new delivery. The agent SHALL NOT manually choose disposable paths, recursively delete generated content, directly remove a worktree, or delete a local topic branch as an improvised substitute. The command's result SHALL be the authority for reporting local cleanup success or the reason a worktree or branch remains retained.

#### Scenario: Validated candidate is handed off
- **WHEN** the stable protected aggregate succeeds and the agent hands the unchanged candidate to the maintainer
- **THEN** the agent SHALL run the standard hand-off command once for that exact worktree and report the released registration
- **AND** SHALL NOT wait for the merge, start a watcher, or remove anything

#### Scenario: New session sweeps earlier deliveries
- **WHEN** a delivery session starts in the primary checkout
- **THEN** the agent SHALL run the standard sweep before creating its worktree and relay each candidate's outcome
- **AND** SHALL proceed with the new delivery regardless of `pending`, `awaiting-discard`, `deferred`, or blocked results

#### Scenario: Verified delivery is ready for local cleanup
- **WHEN** the agent has verified authorized merge, integrated archive/specs, required exact-head validation, and remote topic-ref absence within its own session
- **THEN** the agent SHALL run the standard sweep or candidate-scoped cleanup command once
- **AND** SHALL report removal only when the command verifies the worktree and local ref are removed or already absent

#### Scenario: Standard cleanup reports a blocker
- **WHEN** the command reports unknown content, active ownership, identity drift, unavailable evidence, a nested repository/submodule, or another safety blocker
- **THEN** the agent SHALL retain the worktree and report that blocker
- **AND** SHALL NOT bypass the command with force removal or ad hoc file deletion
