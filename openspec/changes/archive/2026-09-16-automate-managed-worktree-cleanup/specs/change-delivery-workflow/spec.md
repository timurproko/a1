## ADDED Requirements

### Requirement: Agents use the standardized completed-worktree cleanup procedure
After a delivery reaches its verified completed state and its remote topic ref is absent, the owning agent SHALL invoke the repository's standard completed-delivery cleanup command from the primary checkout with the exact worktree, change, and pull-request identity. The agent SHALL NOT manually choose disposable paths, recursively delete generated content, directly remove the worktree, or delete its local topic branch as an improvised substitute. The command's result SHALL be the authority for reporting local cleanup success or the reason the worktree remains retained.

#### Scenario: Verified delivery is ready for local cleanup
- **WHEN** the agent has verified authorized merge, integrated archive/specs, required exact-head validation, and remote topic-ref absence
- **THEN** the agent SHALL run the standard candidate-scoped cleanup command once
- **AND** SHALL report removal only when the command verifies the worktree and local ref are removed or already absent

#### Scenario: Standard cleanup reports a blocker
- **WHEN** the command reports unknown content, active ownership, identity drift, unavailable evidence, a nested repository/submodule, or another safety blocker
- **THEN** the agent SHALL retain the worktree and report that blocker
- **AND** SHALL NOT bypass the command with force removal or ad hoc file deletion
