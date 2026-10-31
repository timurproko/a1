# Resident workspace sidebar

## Why

Bare A1 currently selects a profile/release-global Agent collection regardless of the folder from which it launches. Separate terminals opened in different repositories can therefore show the same agents instead of independent working contexts. The user wants several durable workplaces, reachable from a simple collapsible sidebar, without replacing the working resident runtime or introducing separate hosts per terminal.

The approved UX uses the v2 backup as a reference: a chevron opens a sidebar, Add creates a workspace, selecting a workspace exposes its agents, and removing a workspace stops its agents only after confirmation when Agent tabs exist. There is no folder chooser; running A1 from another folder introduces that folder. This request authorizes this planning-only draft, not implementation.

## What Changes

- Add durable workspaces inside the existing user/profile/immutable-release host, with stable IDs, canonical folder roots, deterministic labels, Agent membership, and persisted sidebar order.
- Deliver the workspace boundary and native overlay sidebar together before enabling automatic folder-based launch selection; both are scoped outcomes in this same draft, not separate-host infrastructure.
- Use one collapsed-by-default chevron on the configured tab-strip row, a v2-style overlay workspace list, keyboard navigation, Add, and Remove. Keep Agent navigation in the existing tab strip; do not duplicate the prototype's Agents section.
- Permit multiple workspaces in the same exact canonical folder. Add creates and selects an empty workspace in the selected workspace's folder; with no selection, use the last selected folder or the launch folder. No path entry, folder picker, root-changing command, or Git-root inference is introduced.
- Bare launch selects the most recently selected workspace for its exact canonical launch folder, or creates that folder's first workspace and Agent. Another terminal viewing a workspace does not make it ineligible or cause an implicit duplicate.
- Keep workspace and Agent selection, remembered tab per workspace, sidebar visibility, and navigation focus local to each attached terminal. Scope every Agent action and deferred input to its originating workspace and view generation.
- Remove genuinely empty workspaces silently. Any workspace with Agent tabs, including idle or failed tabs, requires a cancel-default modal describing the Agent count, cross-terminal impact, and preservation of saved conversations and project files.
- Keep a closing workspace visible, block new starts in it, and remove it only after bounded graceful/verified forced shutdown and durable removal succeed. A failed stop retains an actionable workspace instead of hiding live processes.
- Preserve the existing holder-per-Agent model, terminal byte path, session writer locks, release isolation, utility singleton behavior, shared settings, direct launch/fallback routes, and no automatic Agent restoration after reboot.

## Capabilities

### New Capabilities

- `resident-workspaces`: durable folder-based workspaces, the collapsible sidebar, local view selection, workspace-aware launch, safe removal, and compatibility boundaries.

### Modified Capabilities

- `multi-agent-tabs`: Agent lists and tab actions follow the selected workspace; terminal-local controller/view semantics span workspace changes.
- `resident-terminal-host`: the lease-protected registry records workspace ownership, and background geometry fitting cannot cross workspace boundaries.
- `cli-session-resume`: bare launch selects by folder, while explicit session selection still focuses an existing writer in its owning workspace or opens an eligible resumed tab without duplicating a writer.

## Impact

Expected implementation owners are the native registry/wire/server/attach state machines and presentation, TypeScript bootstrap/resident maintenance, effective shortcuts, and focused unit/native-role/package fixtures. Extend the existing authority and protocol additively; no dependency upgrade, additional service, or replacement terminal/engine stack is proposed. The canonical resident architecture and affected user documentation are reconciled during implementation, not in this planning-only commit.

## Scope boundaries

No host per terminal/folder, engine rewrite, Node PTY relay, copied v2 daemon, SSH/machine navigation, file deletion, filesystem sandbox, automatic worktree allocation, Agent moves between workspaces, workspace rename/reorder controls, sidebar push/overlay setting, duplicated Agent sidebar list, or cross-release adoption. Existing individual Agent rename/reorder controls remain unchanged inside each workspace. Folder relocation/relink UI and automatic restoration of Agents after reboot remain deferred.

The separate planning draft #815 (`ssh-machine-sidebar`) also proposes left-edge chevron chrome. It is neither modified nor adopted here. Whichever change implements second must reconcile with the then-current chrome owner through approved planning refinement rather than add a competing sidebar or silently include machine management.

## Delivery

Create only this active change's proposal, design, tasks, and specification deltas in a draft PR. Keep all Implementation outcomes unchecked. Implementation requires a subsequent explicit request and continues in this same worktree, branch, history, and PR. The backup at `D:/Backups/pi/v2` is read-only UX evidence, never a runtime dependency or source-tree replacement.
