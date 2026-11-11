## ADDED Requirements

### Requirement: Agent entry points route to owned delivery procedures

Agent entry points, the delivery skill, and OpenSpec context SHALL use concise checklists and links to the owning lifecycle, worktree, and cleanup procedures instead of duplicating their detailed rules. Consolidation SHALL preserve existing planning, readiness, validation, integration, ownership, and cleanup safeguards. Procedure links SHALL resolve locally and detailed recovery checks SHALL remain in their owning runbooks and tooling.

#### Scenario: Follow concise delivery guidance

- **WHEN** an agent starts or resumes delivery from the entry point, skill, or OpenSpec context
- **THEN** it SHALL be directed to the applicable existing lifecycle, worktree, and cleanup procedure owners
- **AND** shorter entry-point text SHALL NOT waive any executable safety or delivery gate

#### Scenario: Keep detailed checks out of repeated entry points

- **WHEN** entry-point guidance is consolidated
- **THEN** unique required instructions SHALL remain in an owning procedure before their duplicate text is removed
- **AND** focused guidance checks SHALL cover stable routing and local references rather than exact explanatory prose

### Requirement: One explicit instruction can approve a presented plan and request implementation

When the maintainer explicitly approves an already presented concrete plan and requests implementation in one instruction, the agent SHALL treat both authorization requirements as satisfied without another confirmation. Planning-only or ambiguous requests SHALL NOT authorize implementation, and implementation approval SHALL NOT grant integration authority. Approved refinements SHALL still be reconciled in the same PR before corresponding implementation edits.

#### Scenario: Approve and implement in one message

- **WHEN** a concrete plan has been presented and the maintainer explicitly asks to proceed with it
- **THEN** the agent SHALL continue approved implementation in the same delivery without requiring two messages or a special approval phrase

#### Scenario: Clarify only the missing decision

- **WHEN** a request leaves scope or implementation intent genuinely ambiguous
- **THEN** the agent SHALL ask only for that missing decision instead of repeating already supplied approvals
- **AND** a planning-only request SHALL remain planning-only

#### Scenario: Implementation approval is not merge authorization

- **WHEN** the maintainer approves and requests implementation
- **THEN** the existing separate exact-candidate integration authorization and protected merge gates SHALL remain unchanged
