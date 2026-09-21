## ADDED Requirements

### Requirement: Source-side Pi settings metadata is an exact repository-owned disposable
The repository SHALL treat `src/integrations/pi/engine/pi-settings-metadata.json` as a generated test artifact owned by the Pi settings metadata Vitest setup. Ordinary Vitest completion SHALL remove the exact generated file during global teardown. The central completed-delivery cleanup policy SHALL recognize the same exact path as disposable so an interrupted test run does not permanently block cleanup. This authority SHALL NOT extend to the containing `src/` directory, near-match names, arbitrary settings metadata, or any other ignored content, and all existing ignored-path, boundary, type, traversal, identity, acceptance, and non-force removal safeguards SHALL continue to apply.

#### Scenario: Vitest completes normally
- **WHEN** the Pi settings metadata global setup writes the source-side generated JSON and the test run reaches global teardown
- **THEN** teardown SHALL remove exactly `src/integrations/pi/engine/pi-settings-metadata.json`
- **AND** a missing artifact at teardown SHALL be tolerated

#### Scenario: Interrupted test run leaves generated metadata
- **WHEN** an otherwise eligible released worktree contains the ignored regular file `src/integrations/pi/engine/pi-settings-metadata.json`
- **THEN** the repository-owned completed-delivery cleanup command SHALL treat that exact file as disposable
- **AND** SHALL remove it only through the existing bounded disposable-content and non-force worktree-removal procedure

#### Scenario: Similar ignored content remains protected
- **WHEN** a worktree contains a near-match metadata name, another file under `src/`, or any arbitrary ignored content outside the central policy
- **THEN** cleanup SHALL retain the worktree with a `worktree-content` blocker naming the unapproved path
