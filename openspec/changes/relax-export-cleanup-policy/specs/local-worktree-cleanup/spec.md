## ADDED Requirements

### Requirement: Explicit named-export deletion does not require preservation

Agent delivery guidance SHALL allow deletion of an identified regular untracked worktree session export when the maintainer explicitly requests it, without mandatory preservation or another preservation prompt. Authority SHALL remain limited to that named file. Named-export preservation SHALL remain optional with unchanged safeguards, and subsequent worktree cleanup SHALL retain every ordinary integrated-tooling gate.

#### Scenario: Delete the identified export without a preservation prompt

- **WHEN** the maintainer explicitly requests deletion of one unambiguously identified regular untracked worktree export and its candidate, ownership, and file identity are verified
- **THEN** agent guidance SHALL permit removal of only that named file without requiring a copy into the persistent export directory or another preservation confirmation
- **AND** subsequent worktree and branch removal SHALL remain subject to ordinary integrated cleanup safeguards

#### Scenario: Preserve an export when requested

- **WHEN** the maintainer instead chooses to preserve an identified export
- **THEN** the existing confirmed named-export preservation operation SHALL remain available with its unchanged candidate, content, copy-verification, and journaling checks

#### Scenario: Generic cleanup does not authorize user-file deletion

- **WHEN** only generic worktree cleanup is requested or an export is ambiguous, tracked, linked, outside the identified candidate, or under conflicting ownership
- **THEN** agent guidance SHALL NOT infer authority to delete it or bypass an existing blocker

#### Scenario: Automatic cleanup remains unchanged

- **WHEN** sweep, preview, or ordinary completed cleanup encounters an unknown export without separate named-file deletion authority
- **THEN** it SHALL retain the existing content blocker rather than automatically preserve or delete the file
