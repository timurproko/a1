## ADDED Requirements

### Requirement: Terminal cleanup state safely follows repository relocation

Local cleanup SHALL recognize when its state journal moved with the same repository to a different canonical primary path or Windows drive. A mutating cleanup operation MAY rebind that journal to the currently discovered repository paths only while holding the repository mutation lock, only after the prior journal validates against its own recorded identity, only when the old and current identities name the same canonical GitHub repository and named remote, and only when every persisted registration is terminal `done` history with no partial deletion step.

The migration SHALL require every terminal entry path to resolve by an exact relative suffix beneath the recorded old worktree root, rebase that suffix beneath the current canonical worktree root, preserve all non-path state and audit fields, validate the complete transformed journal against the current identity, and replace the state atomically. Migration SHALL NOT remove or inspect a worktree, alter Git metadata or refs, grant authority to an old entry, or bypass fresh registration and ordinary cleanup gates for a current candidate.

A journal containing any owned, released, deleting, malformed, out-of-root, duplicated-after-rebase, repository-mismatched, or remote-mismatched state SHALL remain blocked. Read-only access SHALL NOT silently migrate state.

#### Scenario: Terminal journal moved from another drive
- **WHEN** the primary repository and its Git common directory move from one canonical drive/path to another, the carried journal validates under its old identity, and every entry is completed terminal history beneath the old worktree root
- **THEN** the next mutation-locked cleanup operation SHALL atomically rebase the journal identity and terminal paths to the current canonical repository root
- **AND** SHALL continue only after the migrated journal passes the ordinary state validator

#### Scenario: Exact completion follows safe journal migration
- **WHEN** terminal history is migrated and the requested current worktree has no live registration
- **THEN** completion SHALL capture and register that current worktree afresh
- **AND** SHALL still require every ordinary remote, lifecycle, ancestry, ownership, content, filesystem, and non-force removal safeguard

#### Scenario: Relocated journal retains active authority
- **WHEN** any carried entry is owned, released, deleting, or records a partial destructive step
- **THEN** cleanup SHALL refuse relocation migration and preserve the journal and every local resource unchanged

#### Scenario: Relocation identity or path topology is ambiguous
- **WHEN** repository/remote identity differs, either identity is malformed, an entry is not beneath the old root, rebasing duplicates a path, or the transformed state is invalid
- **THEN** cleanup SHALL preserve the original journal and report a named relocation or state blocker

#### Scenario: Read-only inspection encounters relocated state
- **WHEN** preview or status reads a journal whose absolute repository identity no longer matches
- **THEN** it SHALL report the relocation blocker without rewriting state or evaluating deletion candidates
