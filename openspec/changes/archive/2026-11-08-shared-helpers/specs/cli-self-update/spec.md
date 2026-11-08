## ADDED Requirements

### Requirement: Release storage operations stay inside their managed root
Release cleanup, dependency-layer management, restart certification, and update recovery SHALL act on a path only when it is a direct child of its managed root. A direct child is one non-empty path segment below the root. It is never the root itself, a path on another root or drive, or a path that traverses to a parent. On Windows the comparison SHALL ignore case. An operation given any other path SHALL fail without touching it.

#### Scenario: A path escapes its managed root
- **WHEN** a release storage operation receives the root itself, a nested descendant, a sibling reached through `..`, or a path on another drive
- **THEN** the operation SHALL fail with its own diagnostic
- **AND** it SHALL NOT read, move, or delete that path

#### Scenario: A direct child differs only in case on Windows
- **WHEN** on Windows a release storage operation receives a direct child whose root differs only in letter case from the managed root
- **THEN** the operation SHALL accept the path
