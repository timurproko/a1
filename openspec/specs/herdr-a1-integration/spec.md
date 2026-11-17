# herdr-a1-integration Specification

## Purpose
TBD - created by archiving change herdr-agent-session-names. Update Purpose after archive.

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

### Requirement: A1 plugin retains color controls without sidebar naming

The private Herdr customization SHALL retain one A1 plugin with its stable identifiers, master enable switch and Match space color setting. It SHALL NOT expose the retired Sidebar rename setting. These switches SHALL NOT gate vanilla A1-to-Herdr name reporting or display updates. Existing explicit legacy color choices SHALL remain compatible, and an explicitly disabled legacy plugin SHALL stay disabled. Old preferences containing the retired renameSession field SHALL remain readable without restoring sidebar renaming or changing unrelated preferences. Disabling the plugin or a feature SHALL NOT remove saved names or colors. Runtime/session identity SHALL NOT be exported as a portable preference.

#### Scenario: Color matching remains independent of naming
- **WHEN** the A1 plugin and color matching are enabled
- **THEN** startup and live color matching remain available without any sidebar Rename setting or action
- **AND** native A1-to-Herdr name updates continue unchanged

#### Scenario: Preserve an existing disabled choice
- **WHEN** an installation has only the previous explicit disabled color-plugin preference
- **THEN** the generic plugin initially stays disabled without changing stored names or colors

#### Scenario: Read old sidebar preferences safely
- **WHEN** an old preference export contains renameSession set to true
- **THEN** it remains readable but cannot expose a sidebar Rename action
- **AND** unrelated preferences and color choices remain intact

#### Scenario: Master switch still gates color effects
- **WHEN** the plugin is disabled after asynchronous color work starts
- **THEN** stale continuations cannot submit a new color update
- **AND** completed changes and native name reporting are not undone

### Requirement: Agents sidebar does not offer session renaming

The private Herdr customization SHALL NOT offer an Agents-sidebar Rename action, mount an agent inline name editor or submit session.rename from that sidebar, regardless of A1 plugin enablement, old rename preferences, agent identity or machine. Existing Pin, Close, navigation and tab/space renaming SHALL remain unchanged. The public A1 session.rename API SHALL remain available to external applications; removing the sidebar affordance SHALL NOT remove backend naming authority or add terminal-input, local-alias or title-override fallbacks.

#### Scenario: Eligible A1 agent no longer offers Rename
- **WHEN** a person opens the Agents context menu on a local or remote A1 agent
- **THEN** no Rename item is offered and no inline name editor can be opened
- **AND** existing Pin and Close actions remain available

#### Scenario: Retired preference cannot restore the action
- **WHEN** the A1 plugin is enabled and old preferences enable sidebar renaming
- **THEN** agent rendering and menus still cannot initiate a rename

#### Scenario: Other naming surfaces remain available
- **WHEN** a person renames a tab or space, or an external client invokes session.rename
- **THEN** the existing supported naming path remains available without the removed Agents-sidebar feature

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
