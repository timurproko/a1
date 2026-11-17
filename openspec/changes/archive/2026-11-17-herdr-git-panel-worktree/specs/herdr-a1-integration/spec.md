## ADDED Requirements

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

### Requirement: Herdr directory selection follows a fresh A1 project report

The private Herdr customization SHALL resolve project directories through an agent-agnostic capability registry with separately registered provider adapters. Shared directory and Git repository UI code SHALL NOT identify specific agents or parse their labels. A1 and Claude Code providers SHALL normalize their supported fresh project reports, preferring that validated directory for the exact selected terminal over its foreground process or shell launch directory. Unsupported, failing or ambiguous providers SHALL preserve generic fallbacks, and passive directory reporting SHALL remain independent of optional feature switches. Git repository and branch lookup SHALL use that directory on the terminal's machine. Unsupported, incomplete, malformed, expired or implausibly future reports SHALL use the existing safe directory fallbacks. Runtime paths and identities SHALL NOT become portable preferences or control authority.

#### Scenario: Foreground Node remains in home
- **WHEN** the selected terminal reports a fresh active A1 worktree while its foreground Node process remains in home
- **THEN** the Git panel resolves the repository and branch in that worktree rather than showing a nonrepository home error

#### Scenario: The selected agent or worktree changes
- **WHEN** another terminal is selected or the active terminal reports a different project directory
- **THEN** Git follows the selected terminal's current directory and discards outdated responses from the prior context

#### Scenario: Missing or stale report
- **WHEN** A1 directory metadata is missing, invalid or outside the existing freshness window
- **THEN** directory selection preserves existing foreground, shell and terminal fallbacks without inventing a repository

#### Scenario: Older producer refreshes leftover directory labels
- **WHEN** an identity-only producer changes the native session, runtime or heartbeat while directory labels remain from a prior publication
- **THEN** the mismatching directory token prevents the stale path from overriding ordinary directory fallbacks

#### Scenario: Remote agent directory
- **WHEN** the selected A1 terminal belongs to a remote machine
- **THEN** its reported path is resolved on that machine and never against the local filesystem

#### Scenario: Claude Code reports its session root
- **WHEN** a live Claude Code terminal has a fresh session-bound project-root report while its process or shell remains elsewhere
- **THEN** the Claude provider supplies that root through the same generic capability used by A1

#### Scenario: Another provider is registered
- **WHEN** a new agent provider implements the project-directory capability
- **THEN** its valid report works without adding agent conditions to shared directory or Git repository UI code

#### Scenario: Provider unavailable or ambiguous
- **WHEN** a provider throws, has no valid report, or multiple providers claim the terminal
- **THEN** the shared resolver preserves generic foreground, shell and terminal fallbacks

#### Scenario: Other programs remain unchanged
- **WHEN** the selected terminal has no eligible project-directory provider report
- **THEN** ordinary shell and other-agent directory resolution retain their established priority and behavior
