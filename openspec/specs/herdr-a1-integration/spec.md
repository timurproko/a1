# herdr-a1-integration Specification

## Purpose
TBD - created by archiving change herdr-agent-session-names. Update Purpose after archive.

## Requirements

### Requirement: Generic A1 integration has independent feature switches

The private Herdr customization SHALL present one A1 plugin with a master enable switch and independent Match space color and Sidebar rename toggle settings. These switches SHALL NOT gate existing vanilla A1 → Herdr name reporting or display updates. Existing stable plugin identifiers and explicit legacy color choices SHALL remain compatible. An explicitly disabled legacy plugin SHALL stay disabled. No saved unrelated preference or already-applied color/name SHALL be removed by disabling a feature. Runtime/session identity SHALL NOT be exported as a portable preference.

#### Scenario: Sidebar renaming enabled while colors disabled
- **WHEN** the A1 plugin and sidebar renaming are enabled but color matching is disabled
- **THEN** supported sidebar Rename remains available
- **AND** neither startup nor live matching changes A1 colors

#### Scenario: Colors enabled while sidebar renaming disabled
- **WHEN** the A1 plugin and color matching are enabled but sidebar renaming is disabled
- **THEN** existing color matching remains available and the plugin offers no Rename action
- **AND** vanilla A1 → Herdr name updates continue unchanged

#### Scenario: Preserve an existing disabled choice
- **WHEN** an installation has only the previous explicit disabled color-plugin preference
- **THEN** the generic plugin initially stays disabled without changing stored names or colors

#### Scenario: Master switch gates both features
- **WHEN** the plugin is disabled after a context menu, inline editor or async read starts
- **THEN** stale continuations cannot submit a new rename or color update
- **AND** completed changes are not undone

### Requirement: Sidebar Rename targets the clicked A1 session

The Agents context menu SHALL accept generic plugin-owned action contributions. The A1 plugin SHALL contribute Rename only for an eligible live A1 agent with fresh complete native session/runtime identity and sidebar renaming enabled. Rename SHALL edit the name in-place in the Agents row, matching Spaces and Tabs with selected existing text, compact save/cancel controls, Enter to save and Escape/blur to cancel. It SHALL NOT open a modal. The mounted Agents view SHALL consume only an ephemeral expiring edit request, expand a compact sidebar if needed, and allocate/focus native input state outside render. The editor SHALL prefill from authoritative API readback, capture the clicked terminal/machine/runtime/session and revision, and revalidate editor lifetime, expiry, enable state and identity before submitting a literal shared-client request. Local and remote requests SHALL use supported host execution routing. Unsupported agents SHALL retain existing menu behavior. No terminal input, private endpoint discovery, shipped mod edits, native patch or permanent local alias SHALL be used.

#### Scenario: Click a different agent from the focused one
- **WHEN** a person opens Rename on an eligible nonfocused A1 agent and submits a new name
- **THEN** only that clicked exact session changes, including when it runs on another machine
- **AND** focus and terminal topology remain unchanged

#### Scenario: Cancel or replace the target
- **WHEN** the person cancels, blurs the inline editor, disables sidebar renaming or the captured runtime/session is replaced
- **THEN** the pending UI cannot submit a rename against any current or replacement agent

#### Scenario: Rename uses the same in-place UX as Spaces and Tabs
- **WHEN** a person chooses Rename from an eligible agent's context menu
- **THEN** its Agents row shows a focused native name input with the existing name selected and compact save/cancel controls
- **AND** no rename modal or dialog opens

#### Scenario: Old runtime or concurrent rename refuses the write
- **WHEN** the target lacks session.rename support, becomes unavailable or changes name revision
- **THEN** the UI reports failure/conflict without inventing a local success or overwriting the authoritative name
- **AND** any retry requires an explicit fresh read and user submission

### Requirement: Preserve vanilla name updates without a second sync path

Existing vanilla A1 → Herdr name reporting and display behavior SHALL remain unchanged for manual and automatic naming, regardless of plugin master or feature settings. An acknowledged sidebar rename SHALL persist through the ordinary manual A1 naming authority and its existing notifications, allowing the native reporting path to update Herdr. The plugin SHALL NOT add name polling, display projections, terminal-title overrides, a second name database or echo rename commands.

#### Scenario: Rename inside A1
- **WHEN** a live A1 session changes its name through its own naming authority
- **THEN** vanilla Herdr continues displaying the new authoritative name without a plugin sync path or echo rename

#### Scenario: Plugin disabled leaves native updates intact
- **WHEN** the plugin master switch or Sidebar rename setting is off and A1 changes its session name
- **THEN** the existing vanilla A1 → Herdr name update still occurs unchanged

#### Scenario: Rename inside Herdr
- **WHEN** a sidebar rename is applied by A1
- **THEN** A1 and Herdr display the same persisted name
- **AND** later automatic naming preserves that manual choice

#### Scenario: Late reply belongs to a replaced session
- **WHEN** an old name read completes after the terminal's session/runtime binding changes
- **THEN** the old result cannot restore the previous session's display name or authorize a write

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
