## ADDED Requirements

### Requirement: A1 manages normally installed SSH machines from one client-local dialog
Bare A1 SHALL offer one `/workbox` agent-menu command that always opens the current client's machine manager, never switches to a machine and never manages the viewed remote host's catalog. Without saved machines it SHALL open Add; with saved machines it SHALL offer Edit and Add new. Add SHALL allow an SSH-config host alias or a manually entered SSH target, check SSH access and the remote A1 installation without altering it, suggest an editable sidebar label and the remote user's home as an editable default directory, and verify a chosen directory against the remote filesystem before an atomic Save. Edit SHALL use the same steps prefilled from that saved profile. Cancel or failed validation SHALL leave saved profiles unchanged. Setup SHALL use existing A1 selection, input and stepped-dialog presentation conventions and SHALL keep errors inside the open dialog, without a second setup wizard, separate toast or below-tab notice. A missing/incompatible A1 installation, unapproved SSH host key, or required authentication SHALL never trigger an unattended remote installation, update, restart, host-key bypass or credential capture.

#### Scenario: First use of the fixed command
- **WHEN** the user invokes `/workbox` with no saved SSH machines
- **THEN** A1 SHALL open Add with SSH-config candidates and manual target entry
- **AND** the suggested folder SHALL be that SSH user's remote home, not a local path

#### Scenario: Repeated command with a saved Workbox
- **WHEN** the user invokes `/workbox` after saving a machine whose label is Workbox
- **THEN** A1 SHALL offer Edit or Add new without selecting Workbox

#### Scenario: Remote agent invokes local management
- **WHEN** a viewed remote A1 child invokes `/workbox`
- **THEN** the active client's own manager SHALL open without editing the remote host's machine catalog or changing the selected machine

#### Scenario: Setup cannot authenticate
- **WHEN** SSH requires a host-key or authentication action that background setup cannot safely complete
- **THEN** the dialog SHALL show the reason and normal SSH remedy without saving a partly configured machine or rendering a notice in an agent tab

#### Scenario: Edit is cancelled
- **WHEN** the user edits a machine label or default remote folder and cancels
- **THEN** the prior saved profile and running remote agents SHALL be unchanged

### Requirement: SSH machine profiles and bridges preserve remote ownership
A1 SHALL store only a stable machine ID, label, validated OpenSSH target, selected remote default directory, and enabled state in an owner-private local catalog. Each SSH machine SHALL use a fixed-command SSH bridge to the A1 resident host running as the SSH user on that machine. The bridge SHALL negotiate explicit compatible capabilities through the remote host's owner-authenticated endpoint, without opening a listening network port, copying agent configuration, persisting SSH credentials, or exposing local resident tokens to another user. A missing or incompatible remote binary or server SHALL fail visibly without replacing or stopping any running remote agent. The remote A1 host, tab holders, sessions, repositories, extensions, tools and authentication SHALL remain on the remote machine. Disabling or forgetting a saved machine SHALL disconnect or remove only the local profile, never stop remote tabs.

#### Scenario: Add a compatible preinstalled remote A1
- **WHEN** the SSH user has a compatible A1 installation and the target's host key is trusted
- **THEN** A1 SHALL save the validated profile and attach to that user's remote resident host over SSH

#### Scenario: Remote A1 is not compatible
- **WHEN** a saved target's remote installation or running server cannot negotiate the required protocol
- **THEN** A1 SHALL show that machine as needing attention and SHALL NOT automatically install, upgrade, terminate or replace it

#### Scenario: Forget a disconnected machine
- **WHEN** the user forgets a saved machine that is offline
- **THEN** its local profile SHALL be removed without requiring a remote response or stopping that machine's tabs

### Requirement: A1 presents saved machines in a v2-style chevron sidebar
With no saved SSH machines, bare A1 SHALL preserve its existing tab-strip geometry and empty state. With at least one saved SSH machine, its strip SHALL expose a `›` chevron that expands to a `‹` left push sidebar and collapses back to the unchanged full-width content area. The expanded sidebar SHALL show Local and saved machines with nested agent/tab rows. Machine rows MAY collapse independently without switching selection. Clicking a machine or agent SHALL change the selected machine or tab; the tab strip and terminal body SHALL show only the selected machine's tabs and retained screen. The `+ Agent` action on a selected remote SHALL create an A1 tab on that remote in its configured remote default directory, and on Local SHALL keep the existing launch-cwd behavior. The sidebar SHALL preserve terminal geometry, mouse input coordinates, wide-character clipping, and the viewed A1 child UI's text-terminal fidelity. No extra status row, below-tab message, sidebar settings suite or secondary strip SHALL be introduced.

#### Scenario: No saved SSH machines
- **WHEN** the user opens bare A1 without saved machine profiles
- **THEN** its strip and empty state SHALL remain as they were before remote-machine support

#### Scenario: Open and collapse the sidebar
- **WHEN** a saved SSH machine exists and the user activates the strip's chevron twice
- **THEN** the first activation SHALL show the left panel beside the viewed tab and the second SHALL restore the tab's full width

#### Scenario: Create on a remote host
- **WHEN** Workbox is selected with a verified remote default directory and the user chooses `+ Agent`
- **THEN** Workbox SHALL start an independent tab in that remote directory without interpreting the client's cwd as a Workbox path

### Requirement: Machine context actions reuse management states
Right-clicking the Machines heading SHALL offer Add and right-clicking a saved machine row SHALL offer Edit, Reconnect when appropriate, Disable/Enable, and Forget as applicable. Add and Edit SHALL open the same manager states reached through `/workbox`; machine selection SHALL remain a left-click or keyboard selection and SHALL NOT occur as a side effect of opening a context menu. Disabled machines SHALL remain visible for re-enabling. Keyboard invocation SHALL reach the same actions, and Escape or clicking away SHALL close the menu without mutation. Machine operations SHALL NOT produce an extra toast, popup, tab-body banner, or notice beneath the agent.

#### Scenario: Edit from the sidebar
- **WHEN** the user right-clicks a saved machine and chooses Edit
- **THEN** the manager SHALL open at that machine's saved fields, with the same validation and Cancel semantics as Edit through `/workbox`

#### Scenario: Re-enable a disabled machine
- **WHEN** the user disables a machine and later opens its context menu
- **THEN** the row SHALL remain visible and Enable SHALL reconnect it without having stopped its remote agents

### Requirement: Cross-machine status and input remain truthful during loss and recovery
A1 SHALL collect authenticated agent metadata independently from each connected machine without streaming unviewed machine screens. A selected machine SHALL receive input, resize and controller-claim messages only after its current generation, selected tab, input ownership and fresh complete screen have been confirmed. SSH loss SHALL mark the affected machine and last-known agent states as stale, disable its input and mutations, and leave its last complete cached surface visibly non-live if one exists; an unavailable uncached screen SHALL not be represented as live content. Other machines and Local SHALL remain usable without waiting for the failed endpoint. Reconnection SHALL be independent, bounded and non-destructive, and SHALL reconcile fresh host/tab identities and screen before input is resumed. A remote reboot SHALL NOT be reported as continuous agent execution; prior sessions remain subject to their ordinary resume mechanisms rather than automatic prompt replay.

#### Scenario: Workbox disconnects mid-turn
- **WHEN** an SSH connection to Workbox is lost while its agent works and Local remains connected
- **THEN** the Workbox row and any cached screen SHALL be visibly stale and non-interactive
- **AND** Local SHALL continue to accept input without selecting a different machine on the user's behalf

#### Scenario: Reconnect to a different host epoch
- **WHEN** an SSH bridge reconnects after Workbox's resident host has restarted
- **THEN** A1 SHALL refuse stale tab input and shall show only freshly verified tab identities and screen state before enabling remote interaction

#### Scenario: Client computer powers off
- **WHEN** the local client closes while an agent remains alive on a separately running remote machine
- **THEN** the remote resident tab SHALL not be stopped solely because the local viewer disconnected
- **AND** reopening A1 SHALL obtain fresh status rather than assume its last-known state is still current
