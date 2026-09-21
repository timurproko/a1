## ADDED Requirements

### Requirement: Source-side Pi settings metadata is an exact repository-owned disposable
The repository SHALL treat `src/integrations/pi/engine/pi-settings-metadata.json` as a generated test artifact owned by the Pi settings metadata Vitest setup. The central completed-delivery cleanup policy SHALL recognize that exact ignored regular-file path as disposable. Persisted cleanup registrations and bounded purge behavior SHALL support the exact approved regular file without extending authority to the containing `src/` directory, near-match names, arbitrary settings metadata, or any other ignored content. All existing ignored-path, boundary, type, traversal, identity, acceptance, retry, and non-force removal safeguards SHALL continue to apply.

#### Scenario: Test runs share generated metadata
- **WHEN** one or more Vitest processes use the source-side generated JSON in the same active worktree
- **THEN** the artifact SHALL remain available for those test processes rather than being deleted by an individual process teardown
- **AND** its ignored generated status SHALL NOT by itself authorize cleanup before verified worktree completion

#### Scenario: Completed worktree contains generated metadata
- **WHEN** an otherwise eligible released worktree contains the ignored regular file `src/integrations/pi/engine/pi-settings-metadata.json`
- **THEN** the repository-owned completed-delivery cleanup command SHALL treat that exact file as disposable
- **AND** SHALL remove it only through the existing bounded disposable-content and non-force worktree-removal procedure

#### Scenario: Similar ignored content remains protected
- **WHEN** a worktree contains a near-match metadata name, another file under `src/`, or any arbitrary ignored content outside the central policy
- **THEN** cleanup SHALL retain the worktree with a `worktree-content` blocker naming the unapproved path

#### Scenario: Approved path is not a regular file or directory
- **WHEN** an approved disposable path resolves to a symbolic link or special file
- **THEN** cleanup SHALL retain the worktree and report the existing content-boundary blocker
