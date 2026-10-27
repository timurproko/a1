## ADDED Requirements

### Requirement: Workspaces organize resident Agents inside the existing host
A1 SHALL keep workspaces inside the existing operating-system-user, canonical-profile, immutable-release resident host. Each workspace SHALL have a stable generated ID, canonical existing-folder root, deterministic display label, persisted creation order, and explicit Agent membership. Multiple workspaces MAY share a root. Canonical path aliases SHALL match under native platform semantics, but distinct subfolders and Git worktrees SHALL remain distinct; A1 SHALL NOT infer a Git repository/common-directory root. Workspace IDs SHALL NOT replace existing tab IDs, credentials, session file identity, or process identity. Workspace creation SHALL NOT create missing project directories or constitute project-resource execution permission.

#### Scenario: Several workspaces share one host
- **WHEN** users create two workspaces for one folder and another for a different folder in the same release/profile
- **THEN** all three SHALL have distinct stable IDs inside the existing host and each Agent SHALL belong to exactly one workspace
- **AND** the host SHALL retain its existing writer lease, epoch, release admission, and per-Agent holder boundaries

#### Scenario: Folder aliases and subfolders
- **WHEN** launches use aliases of the same canonical folder and a distinct subfolder of it
- **THEN** the aliases SHALL share folder matching while the subfolder SHALL have its own matching scope
- **AND** branch names or a shared Git common directory SHALL NOT merge the scopes

#### Scenario: Folder cannot be used
- **WHEN** a new workspace or Agent would use a missing or inaccessible root
- **THEN** A1 SHALL report the unavailable folder without creating it or silently substituting another root
- **AND** existing workspace metadata and unrelated Agents SHALL remain intact

### Requirement: Workspace navigation is a terminal-local view
Each attach client SHALL own its selected workspace, remembered Agent tab per workspace, last-selected folder, sidebar visibility/focus, and pending view generation. Selecting a workspace SHALL NOT select it in another client, change a running Agent's cwd, move an Agent, or stop background work. The selected row, workspace-local Agent strip, folder/landing context, complete body, overlays, and cursor SHALL commit coherently without a wrong-workspace intermediate frame. Existing globally unique tab IDs and per-tab controller barriers SHALL remain authoritative when two clients view the same Agent.

#### Scenario: Two terminals use different workspaces
- **WHEN** one client selects workspace A while another uses workspace B
- **THEN** each SHALL retain its own view, input target, and remembered Agent without changing the other client's selection
- **AND** Agents in both workspaces SHALL keep making engine, child-render, and holder progress

#### Scenario: Return to a workspace
- **WHEN** a client selects A, selects B, and returns to A
- **THEN** A SHALL present that client's remembered surviving Agent or a deterministic fallback with its current retained surface
- **AND** an empty A SHALL present its landing without creating an Agent

#### Scenario: A delayed operation crosses selection
- **WHEN** a queued close, rename, reorder, create, paste, input, or resize was admitted in A before that client selects B
- **THEN** it SHALL retain its original workspace/target/revision/generation and either complete for that valid original target or be rejected
- **AND** it SHALL NOT be relabelled to B or allow an old surface/result to replace B's current presentation

### Requirement: A chevron exposes one native overlay workspace sidebar
Resident A1 SHALL show a three-cell ` › ` control at the left edge of its configured top or bottom tab strip. The sidebar SHALL start collapsed, reserve no body-width rail while collapsed, and open as a v2-style left overlay with ` ‹ `, a Workspaces heading, selected-row/hover treatment, folder-disambiguated labels/path context, structured activity indicators, scrolling, Add, and Remove. Its normal width SHALL be 24 columns, adapting to narrow terminals without silently disabling workspace actions; unusably small geometry SHALL produce bounded insufficient-space presentation while preserving state. Overlay toggle SHALL NOT change child PTY dimensions. The existing Agent strip SHALL remain the Agent navigation surface; this delivery SHALL NOT add push mode, a sidebar style setting, or a duplicate Agent list.

#### Scenario: Open the sidebar while an Agent streams
- **WHEN** the user activates the chevron with either strip placement
- **THEN** the overlay SHALL appear over a current complete presentation without clearing the body or resizing the Agent
- **AND** sidebar/chrome input SHALL NOT reach child content hidden underneath it

#### Scenario: Navigate without a mouse
- **WHEN** a conflict-free effective sidebar shortcut, proposed by default as Alt+B, opens navigation focus
- **THEN** keyboard navigation, activation, Add, Remove, cancellation, and effective shortcut help SHALL be available through the owned declarations and interaction state machine
- **AND** handled keys SHALL NOT also execute in the child editor

#### Scenario: Dismiss an overlay
- **WHEN** Escape closes the nearest sidebar interaction or a primary outside press dismisses the panel
- **THEN** the current complete underlying surface SHALL be restored without residue or PTY resize
- **AND** the dismissal press SHALL be consumed rather than also activate a child control

#### Scenario: Labels or lists exceed available space
- **WHEN** multiple roots share a basename, labels are long, or workspaces exceed the visible rows
- **THEN** the selected folder SHALL remain inspectable, labels SHALL be distinguished, and clipping/scrolling SHALL preserve correct workspace hit targets
- **AND** frame, collection, and queue bounds SHALL remain unchanged

### Requirement: Add creates an empty workspace in the current folder
Sidebar Add SHALL create and select a new empty workspace rooted in the client's selected workspace folder, or its last-selected folder when no workspace is selected, or its original launch folder when neither exists. Add SHALL NOT request a path, open a folder picker, infer another repository, start an Agent, or change another client's view. Default labels SHALL distinguish duplicates using deterministic suffix/path context without a rename prompt. Empty workspaces SHALL remain in persisted creation order until explicit removal; selection/activity SHALL NOT reorder them.

#### Scenario: Add while viewing another launch folder
- **WHEN** a terminal launched in A has selected workspace B and invokes Add
- **THEN** the new workspace SHALL use B's folder and show its empty landing
- **AND** existing A/B Agents SHALL remain running without selection or cwd changes

#### Scenario: The final Agent closes
- **WHEN** the user closes the final Agent tab of a workspace
- **THEN** that workspace SHALL remain selectable and empty without an automatic replacement Agent

### Requirement: Bare launch selects a workspace for its exact folder
An ordinary interactive resident launch SHALL select the most recently explicitly selected non-closing workspace matching its exact canonical launch folder, with deterministic persisted-order tie-breaking, regardless of other attached viewers. If none exists for that folder, it SHALL create that folder's initial workspace and first Agent. Concurrent automatic first launches SHALL converge on one initial workspace/Agent; explicit Add SHALL remain a separate creation intent. Existing empty workspaces SHALL open their landing rather than implicitly gain an Agent. Future-launch preference SHALL NOT be a shared active-workspace field or change an existing client's view.

#### Scenario: Introduce a different folder without a picker
- **WHEN** workspace A exists and the user starts A1 from distinct folder B
- **THEN** the launching client SHALL select or create B's workspace without showing A's Agent collection first
- **AND** either terminal SHALL subsequently be able to select A or B through the shared release-local sidebar

#### Scenario: Relaunch a folder with several workspaces
- **WHEN** a folder has two workspaces and its most recently selected one is already viewed elsewhere
- **THEN** a bare launch SHALL select that existing workspace without evicting its viewer or creating an implicit duplicate

#### Scenario: Automatic creation races
- **WHEN** two clients launch the same previously unregistered canonical folder concurrently
- **THEN** exactly one automatic initial workspace and Agent SHALL be created and both clients SHALL select that workspace under existing controller rules

### Requirement: Workspace removal is empty-safe or explicitly confirmed
A1 SHALL silently remove a workspace only after an authoritative check finds no user Agent tabs or user-Agent start reservations. Any user Agent tab, including idle, working, needs-input, queued, crashed, starting, or failed, SHALL require an owned cancel-default confirmation naming workspace and Agent count, explaining termination of Agent tools and impact on every attached terminal, and stating that saved conversations and project files remain. Hidden internal standbys and Settings/Changelog utilities SHALL NOT count as Agents. Cancellation SHALL stop nothing. A membership change SHALL invalidate empty removal or stale consent instead of silently extending authority to newly created Agents.

#### Scenario: Remove an empty workspace
- **WHEN** a workspace has no Agent or Agent start reservation and the user invokes Remove
- **THEN** A1 SHALL remove it without a modal after the authoritative empty check
- **AND** no project directory, session transcript, or unrelated process SHALL be deleted or stopped

#### Scenario: Remove an idle Agent workspace
- **WHEN** a workspace contains idle Agent tabs with drafts but no active model turn
- **THEN** A1 SHALL still show confirmation with Cancel and Stop agents and remove actions
- **AND** Cancel, Escape, or dismissal SHALL leave its Agents and drafts unchanged

#### Scenario: Another terminal adds an Agent before confirmation completes
- **WHEN** the Agent membership changes after close preparation or a supposedly empty workspace gains a pending first Agent
- **THEN** A1 SHALL refresh the confirmation requirement and SHALL NOT terminate the new Agent under stale consent

### Requirement: Removing a workspace waits for exact shutdown and persistence
After confirmed removal is admitted, the server SHALL fence that workspace as closing, reject new Agent starts/promotions/restarts, retain its visible Closing state, and stop its exact Agent holder/child/tool trees using the existing bounded graceful-then-verified-forced termination path. It SHALL acknowledge and publish removal only after shutdown and durable removal succeed. Unverifiable live processes or stop/persistence failures SHALL retain authoritative workspace/recovery records and actionable retry state rather than hide them. Removal SHALL preserve other workspaces/releases, global utilities, saved sessions, project files, and live release holds. Clients viewing the removed workspace SHALL select an adjacent survivor or landing; unrelated client views SHALL remain unchanged.

#### Scenario: Stop a busy workspace
- **WHEN** a user confirms removal while its Agents stream or run tools
- **THEN** A1 SHALL show Closing, block new starts, and complete exact bounded shutdown before removing the row
- **AND** no confirmed close SHALL be treated as an unexpected crash eligible for automatic restart

#### Scenario: One Agent cannot be stopped or removal cannot be persisted
- **WHEN** shutdown identity cannot be verified, a process survives its bound, or the durable mutation fails
- **THEN** the workspace SHALL remain represented with truthful retry feedback and recovery authority
- **AND** A1 SHALL NOT report successful removal or release an artifact still used by a live/unverifiable Agent

#### Scenario: Remove the final workspace
- **WHEN** the final workspace is successfully removed
- **THEN** affected clients SHALL show the existing landing with no selected workspace, preserving their last-folder fallback and utility access
- **AND** A1 SHALL neither quit nor immediately create a replacement workspace

### Requirement: Workspaces preserve resident compatibility and explicit scope
Workspace metadata and Agent membership SHALL use the existing lease-protected release registry and recovery path. Compatible pre-workspace state SHALL remain one legacy collection rather than be redistributed by guessed cwd. Running old releases SHALL remain untouched and SHALL NOT be cross-attached or adopted. Reboot/login changes SHALL preserve workspace metadata as empty while keeping the existing no-Agent-auto-restore and resumable-session contracts. Global utilities/preferences, direct solo/comparison/fallback modes, session-writer exclusion, protocol/resource bounds, native terminal ownership, and invoking-release maintenance/retention scope SHALL remain intact. Workspaces SHALL NOT be advertised as file-edit isolation.

#### Scenario: Upgrade beside a working older release
- **WHEN** workspace-aware A1 starts while an older release's Agents run
- **THEN** its workspace feature SHALL use only its selected release namespace without migrating, terminating, or adopting older roles or session writers

#### Scenario: Server replacement or a new boot
- **WHEN** a server is replaced in the same OS session or starts after reboot/login change
- **THEN** same-session recovery SHALL preserve workspace membership and verified surviving Agent identities
- **AND** a new boot/login SHALL retain empty workspace metadata without restarting its old Agents or replaying prompts

#### Scenario: Workspace removal occurs beside Settings
- **WHEN** a workspace is removed while global Settings or Changelog is open
- **THEN** those singleton utilities and shared preference documents SHALL remain independent of workspace Agent counts/shutdown
- **AND** their client-local return target SHALL resolve to that client's surviving workspace or landing

#### Scenario: Existing maintenance is invoked
- **WHEN** a user lists/stops tabs or invokes host stop/doctor through the existing CLI
- **THEN** its scope SHALL remain the invoking release rather than silently depend on shell cwd
- **AND** redacted reporting SHALL identify workspace membership while preserving current secret/content exclusions
