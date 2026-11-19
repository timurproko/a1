# herdr-a1-integration Specification

## Purpose
Defines what an interactive A1 session publishes to a local Herdr terminal: its native session and runtime identity and its committed active project directory.

## Requirements

### Requirement: A1 reports its active project directory with native identity

Interactive A1 under a valid local Herdr terminal identity SHALL publish its committed active project directory as `a1.cwd` alongside the existing endpoint-ready session/runtime identity and heartbeat. The directory SHALL derive from the active project context rather than the process launch directory or a pending transition. The `a1.cwd.binding` token SHALL bind the directory to the exact native runtime/session/timestamp publication. Existing reporting ownership and replacement fences SHALL apply to directory publication and cleanup. Native reporting SHALL remain independent of optional plugin switches.

#### Scenario: Attach from home to a repository worktree
- **WHEN** an A1 session launched from home successfully attaches to a repository worktree and publishes its current endpoint binding
- **THEN** its native report identifies that worktree directory without changing the process-global cwd

#### Scenario: Switch or leave a worktree
- **WHEN** a successful worktree switch, detach or completion changes the active project context
- **THEN** the report follows the newly active project directory instead of retaining the previous worktree

#### Scenario: A transition is queued or fails
- **WHEN** a target transition has not committed or fails while preserving the prior context
- **THEN** the report does not advertise the uncommitted target directory

#### Scenario: An old reporter finishes after replacement
- **WHEN** a publication or cleanup callback belongs to a replaced binding or runtime
- **THEN** it cannot overwrite or clear the newer runtime's directory or native identity

### Requirement: Native session name reporting remains independent of sidebar controls

Existing vanilla A1-to-Herdr name reporting and display behavior SHALL remain unchanged for manual and automatic naming, regardless of plugin settings. External API renames SHALL persist through the ordinary manual A1 naming authority and its existing notifications, allowing native reporting to update Herdr. The plugin SHALL NOT add name polling, display projections, terminal-title overrides, a second name database or echo rename commands.

#### Scenario: Rename inside A1
- **WHEN** a live A1 session changes its name through its own naming authority
- **THEN** vanilla Herdr continues displaying the authoritative name without a plugin sync path or echo rename

#### Scenario: Plugin disabled leaves native updates intact
- **WHEN** the plugin master switch or color setting is off and A1 changes its session name
- **THEN** the existing vanilla A1-to-Herdr name update still occurs unchanged

#### Scenario: External API rename remains authoritative
- **WHEN** an external application's session.rename request is applied by A1
- **THEN** A1 and Herdr display the same persisted name
- **AND** later automatic naming preserves that manual choice
