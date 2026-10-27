# Design: local workspaces around the existing resident runtime

## Context and intent

One existing native resident server owns the profile/release registry; separate holders own Agent PTYs and full A1 processes. Clients already have local viewed tabs and controller generations, but default selection, topology lists, reorder, utility lookup, prewarm, and hidden-holder geometry contain global assumptions. A sidebar-only filter cannot provide correct workspace boundaries.

The design adds an organizational and routing dimension, not another process hierarchy. Retain the exact host namespace, release admission, leases, credentials, containment, session files, recovery artifacts, frame/queue bounds, and native-only terminal data path. Workspaces are not a sandbox: two workspaces for the same folder can edit the same files.

## UX reference and deliberate departures

Read-only reference: `D:/Backups/pi/v2/sidebar/view.ts`, `sidebar/index.ts`, `agent/multiagent/host/flows.ts`, `agent/multiagent/core.ts`, and their tests.

Retain the small `›`/`‹` control, neutral chip colors, selected-row treatment, stable order, scrolling, and same-folder empty Add. Do not port its TypeScript daemon/PTY/render composition or historical ownership rules. Unlike the prototype's optimistic immediate close, an Agent-bearing workspace is confirmed and stays visible until shutdown succeeds. Do not copy prototype-only drag/rename, Agent sorting/list duplication, or a sidebar style setting.

## Decided product behavior

| Operation | Result |
| --- | --- |
| First bare launch in folder A | Create workspace A and its first Agent |
| Launch again in A | Select A's most recently selected workspace, even when another terminal views it |
| Launch in distinct folder B | Select or create B without changing A's clients or agents |
| Sidebar Add while B is selected | Create/select an empty workspace rooted in B; no Agent or folder prompt |
| Add with no workspace selected | Use the last selected folder in this client, otherwise its launch folder |
| Select an empty workspace | Show its landing and existing global utilities; do not invent an Agent |
| Add Agent after switching to B | Start in B's root, not the original shell launch directory |
| Remove workspace with no Agent tabs | Remove silently after authoritative empty-state recheck |
| Remove workspace with any Agent tabs | Ask once, then stop that workspace's Agent trees and remove after success |
| Close final Agent | Keep the empty workspace until explicit Remove |
| Remove final workspace | Show landing with no selection; do not quit or create a replacement |
| Close terminal or switch workspace | Preserve background Agent execution and existing detach behavior |

### Folder and identity rules

Use a generated stable workspace ID. Canonicalize the actual existing launch folder with native platform path semantics, including case/alias handling on Windows. Do not use the Git common directory, branch, remote URL, or inferred repository root as identity. `/repo` and `/repo/src` are distinct roots; separate Git worktrees stay distinct. Folder canonicalization must not create missing user directories or execute project resources.

Allow multiple workspace IDs for the same canonical root. Default labels use the folder basename and the smallest free numeric suffix needed for unambiguous display; different folders with the same basename also show distinguishing parent-path context. The selected workspace's full home-relative path remains inspectable in the sidebar/path presentation without overwriting child footer content. Add performs no rename prompt. Sidebar order is persisted creation order, never automatically sorted on selection or activity.

Record the most recent explicit selection per folder for future bare launches, with a deterministic creation-order tie-break. This future-launch preference is not a global active workspace: it never switches already attached clients or changes their selected Agent. Multiple clients simultaneously launching a previously unknown folder converge on one automatic initial workspace and one initial Agent; explicit Add remains a distinct creation intent.

### Sidebar presentation and input

Implement sidebar state/events in the existing native attach sans-IO interaction core and presentation owner. Closed by default, only the three-cell ` › ` toggle occupies the left edge of the configured top or bottom strip; no full-height rail is reserved. Open uses ` ‹ `, a 24-column left overlay when space permits, Workspaces heading, selectable rows, status, Add, and a selected-row Remove action through an owned context menu. Agent tabs remain the only Agent list.

The overlay does not resize children or change their PTY geometry. Narrow terminals reduce the panel width and clip/scroll text while retaining selection/Add/Remove access; do not copy v2's below-65-column dead toggle. At geometries too small for a usable action row, retain state and show a bounded insufficient-space presentation rather than deliver chrome input to an Agent. No push mode or layout setting in this delivery.

Use the existing shortcut declaration/conflict/help machinery. Propose `Alt+B` for toggle, resolved only when conflict-free. While sidebar navigation owns focus, Up/Down select, Enter activates, Escape closes the nearest sidebar menu/panel, and a menu exposes Add/Remove without a mouse; keys must not leak to the Agent. Existing effective child keys retain priority outside sidebar scope. Popup/modal precedence joins the existing one-interaction-mode state machine; confirmations dim a current complete frame and never paint prompt text into a child.

An outside primary press dismisses the overlay and is consumed; it must not both dismiss and activate a child control. Selecting a workspace keeps the panel open and commits its selected row, Agent strip, folder/landing, and body as one current frame. Sidebar visibility/focus is local to the client. Status uses existing structured Agent semantics: needs-input first, then working, then error/settled states as appropriate, without sound or notifications; sidebar-owned refresh must not delay child presentation. Freeze neither background engines nor their rendering while the sidebar or removal modal is open.

### Terminal-local workspace views

Each client keeps selected workspace, selected Agent per workspace, pending selection generation, and a last-selected folder fallback. Keep tab IDs globally unique inside the existing host so holder/bridge authentication need not be reinvented; every Agent record also names its owning workspace. A workspace ID is never an OS security credential.

All Agent lists, initial snapshots, close-neighbor selection, naming defaults, rename/reorder operations, and tab targets pass through central workspace membership helpers. Resolve launch workspace before the first tab-bearing admission/surface: never briefly show another repository and repair it later.

Capture workspace ID, target ID, expected revision, and originating view/controller generation at action admission, before lifecycle queuing. After a switch, an earlier action either completes for its admitted workspace if still valid or is rejected; it is never relabelled to the new selection. Late surfaces/status/create replies from an old view cannot replace the current body. Reuse the existing controller barrier for the same Agent viewed by two clients; selecting a workspace never evicts another client.

Geometry remains tab-controller-owned. Background fitting applies only to hidden, unclaimed Agents in the resizing client's selected workspace, excluding any Agent viewed/controlled elsewhere. Opening/closing the overlay causes no PTY resize. Holder output and retained terminal updates continue across every workspace; only viewed bodies are delivered externally.

### Workspace-owned Agents and global utilities

Settings and Changelog remain release-local global singleton utilities, not workspace-owned Agents. Their explicit-close/toggle/prewarm rules and profile-global settings documents stay intact. Keep their visibility and return target client-local. Workspace switching preserves each client's remembered Agent under a global utility; closing the utility returns to that client's current workspace or landing. Utilities never inflate Agent counts, cause an empty-workspace confirmation, or get killed by workspace removal. With zero workspaces the existing utility launcher remains usable.

Do not multiply the existing internal standby pool by the number of empty workspaces. Retain the current global prewarm/concurrent-start bounds. Promotion must match workspace ID, effective root, environment, release, and Node runtime; otherwise use ordinary bounded creation. First Agent creation and workspace-close fencing must also cover starts, restart timers, and standby promotion in flight.

### Launch and explicit sessions

Apply folder-based automatic selection only to ordinary interactive resident launch. Preserve session option grammar, path/ID discovery, trust decisions, explicit cross-project fork semantics, and resolution of relative paths against original invocation cwd.

For a selected session already held by this release's Agent, select that Agent's owning workspace and tab in the launching client only. For an unheld resolved session, select/create a workspace matching the effective resumed cwd before adding its Agent; do not change the conversation's persisted identity or silently fork it. A different release's writer remains a normal conflict, never permission to adopt its workspace or start another writer. Session resolution may not use the workspace catalog as a substitute for its existing validation/trust path.

New Agent launch uses the selected workspace's root and freshly resolved cwd-bound project resources. Never call process-wide chdir or repoint an existing Agent when workspace selection changes. Missing roots remain listed but cannot start new Agents; show a focused error, without silently substituting the launch folder or a root-edit/folder-picker UI.

### Safe removal

Count all user Agent tabs, including idle, busy, queued, crashed, starting, and failed tabs. Hidden internal standbys and global utility tabs are excluded. Empty means no user Agent records or user-Agent start reservations; a racing first Agent must change silent removal into confirmation, not be silently stopped.

Use a host-authoritative close preparation with workspace/member revision and count. The modal names the workspace and count and says: `This will stop all N agents and their running tools, and remove the workspace from every terminal. Saved conversations and project files will remain.` Actions are `Cancel` and `Stop agents and remove`, with Cancel initially selected. Escape, click-away, or rejection leaves agents and drafts unchanged. A changed member set requires refreshed confirmation rather than extending stale consent to newly created Agents.

After confirmed admission, fence that workspace as closing, reject new creates/promotions/restarts, and show `Closing…` without claiming success. Request existing graceful shutdown, flush supported session/draft/journal state, then apply existing bounded identity-verified termination to the exact holder/child/tool trees. A stop failure or unverifiable live owner keeps the workspace and affected records with concise retry feedback; do not delete its recovery authority or release running artifact holds.

Once no user Agent trees/starts remain and durable workspace removal succeeds, publish the removed membership and fallback selections. Removing a background workspace never changes an unrelated client's view. Every client selecting the removed workspace falls back to its adjacent surviving row; with none, show landing using its last selected folder. A persistence failure cannot be acknowledged as removal. Removal never deletes a project directory, session transcript, or user file, and never signals another workspace/release. Internal private-artifact expiry remains under its existing independent policy.

### Persistence, recovery, maintenance, and compatibility

Keep one catalog and membership authority in the existing release-scoped registry, under its writer lease, epoch, commit path, and owner-only access. No second global writer/service is introduced. Persist IDs/roots/labels/order/launch preference and Agent membership, not prompts, environments, terminal bytes, credentials, or per-client drafts. Client-local view state must not become a shared selected-workspace field. Existing bounds remain in force; paged/bounded catalog and topology messages must handle growing lists without increasing frame or queue caps or dropping stored workspaces.

Server replacement restores workspace membership and close intent from committed metadata, readmits the same verified holders, and never restarts an intentionally closing Agent. A changed boot/login archives the old Agent set as today while preserving workspace metadata as empty entries; bare launch of an existing empty workspace does not auto-restore an Agent. Add and switching empty rows alone must not prewarm one process per row or keep an otherwise idle host alive.

When a pre-workspace registry for this same release is supported, preserve its complete tab collection in one legacy workspace instead of guessing Agent redistribution from different cwd values. Existing running releases keep their original host/state; new code never edits another release's registry, adopts its holders, or copies personal sessions. No automatic live migration is part of rollout.

Preserve `a1 tabs` and existing host status/stop/doctor scope as the invoking release, including explicit stop-all/host-stop across its workspaces; do not silently narrow a destructive command by shell cwd. Add workspace identity and folder context to redacted list/status output so scope is clear. Interactive Remove is workspace-local, not a new host-stop shortcut. Doctor must remain content-free and release GC must retain all still-live/unverifiable Agents across workspace close failures.

## Implementation boundaries and ordering

1. Extend registry/native contracts and routing helpers with workspace ownership and terminal-local views; cover legacy single-collection behavior and stale-action fencing.
2. Deliver the native overlay sidebar, Add/select/empty-state handling, utility integration, and safe removal as the first user-facing slice.
3. Enable folder-based initial launch and explicit-session targeting on that same model; do not build separate-host infrastructure first.

All slices remain in this implementation-bound draft until the approved outcomes are implemented. No draft promotion, product code, canonical-spec edits, or runtime tests are part of this planning request.

Expected owners: native roles `registry`, `wire`, server attach/lifecycle/holder/standby/controller, attach core/presentation/strip; TypeScript release bootstrap and resident launch/maintenance/doctor interfaces; shortcut declarations/projection; targeted native/unit/role/package fixtures; resident architecture and user documentation. Current `src`/`native` files, not v2 extensions, remain the source of truth.

The separate SSH-machine sidebar draft #815 touches the same UI territory but has no delivered baseline here. It is out of scope and no dependency on its branch is inferred. Re-read authoritative develop before implementation; if machine navigation lands first, refine these chrome ownership decisions explicitly instead of adding another overlapping sidebar.

## Regression and delivery plan

- Pure state-machine and registry cases: ownership, deterministic folder selection, multiple same-root workspaces, aliases, concurrent first launch, empty persistence, stale generations, keyboard/menu scope, close-member revision races, and bounded long lists.
- Native role cases: two differently sized clients/workspaces, independent input/resize/rename/reorder/close, held-session focus, closing versus pending starts/restart/prewarm, utility singleton return targets, real graceful/forced stop, partial stop failure, server replacement during close, and workspace metadata without cross-boot Agent restoration.
- Exact shipping-path cases: chevron/overlay at top and bottom, narrow geometry, no child resize on toggle, pointer offsets, cursor/selection/clipboard/hyperlinks, modal input consumption, live partial rendering in background workspaces, release coexistence, direct solo/fallback, and package launch folder/session semantics. Keep the Windows/Linux/macOS evidence separate.
- Before implementation pushes use only typecheck, touched tests, strict change validation, and bounded native cases relevant to the changes. CI after automatic readiness is the test authority. No broad preflight/full local run or active-workstation desktop automation is added.
- Resolve substantive tasks and known gaps, reconcile current develop, and add final plain PR Acceptance before the final outcome marker. Manual review is optional and never blocks completion markers or authorizes integration.

## Known gaps and exclusions

This is a plan: implementation and runtime evidence do not yet exist. Prototype inspection was source/test inspection only, not a live UI certification. Folder picker/root editing, relocation/relink, workspace rename/reorder, duplicated Agent list, machine navigation, push layout, Agent moves, filesystem conflict prevention, and reboot Agent restoration are explicitly excluded rather than incomplete promises. Existing platform physical-certification and all-Node simultaneous-kill limitations are not expanded or declared solved by workspace navigation. No additional undispositioned product behavior is intentionally left for implementation to invent.
