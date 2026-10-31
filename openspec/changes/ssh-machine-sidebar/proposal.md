## Why

A1 already keeps resident agents alive when the terminal or SSH session on their machine closes, but the user must SSH into each host and run `a1` there to view or control them. There is no local A1 view of the agents and live status across machines. The maintainer wants the existing v2-style chevron sidebar and a single, reusable setup dialog, not a new dashboard, shell-command-first setup, intrusive notifications, or a second agent runtime.

## What Changes

- Add a client-local `/workbox` agent-menu command that always opens the same machine manager. With no profiles, its setup steps choose a configured SSH host or manually entered target, verify the remote A1 installation, edit the sidebar name, and choose a remote working directory with the remote user's home as the suggested default. With profiles, the manager offers Edit or Add; the command never selects a machine just because its name is Workbox.
- Reuse existing A1 selection, input, and stepped-dialog layouts and controls for the manager. The sidebar's `Machines` heading right-click Add and a machine row's right-click Edit enter those same dialog states, rather than introducing another setup path. Other machine-row context actions are Reconnect, Disable/Enable, and Forget, as applicable. Setup errors stay in the dialog; connection status stays on the machine row. There are no separate toasts, new tabs, in-tab connection banners, or below-tab messages for machine setup or loss.
- Add saved machine profiles and an SSH bridge between a local A1 client and a normally installed, same-user A1 resident host on each remote machine. The agent, its terminal holder, files, credentials, and sessions stay remote. Background connections may discover and reconnect but never install, update, replace, or stop a remote host without an explicit user action outside this scope.
- Extend the resident attach chrome with the v2-inspired `›`/`‹` sidebar: collapsed as a control on the tab-strip row; expanded as a left-hand panel beside the selected machine's existing tab strip and terminal. Show Local and saved SSH machines with their nested agents; retain independent machine selection, status, reconnect, and single-controller input. A selected disconnected machine shows only last-known, visibly stale state with input disabled; other machines remain usable.
- Create new tabs on the selected machine using its own configured remote working directory (initially its remote home if left unchanged); local paths are never assumed to exist remotely. Forgetting or disabling a machine changes only the local catalog/connection, never stops its tabs. A remote reboot is not presented as uninterrupted execution.

## Capabilities

### New Capabilities

- `ssh-machines`: SSH setup, saved targets, local management dialog and sidebar, remote attach, remote tab lifecycle, and truthful cross-machine status.

### Modified Capabilities

- `multi-agent-tabs`: extend the existing local resident attach strip with the machine-sidebar chevron and selected-machine tab presentation without changing `a1 solo` or `a1 pi`.

## Impact

- The A1 native resident attach and its authenticated, versioned server/holder protocol; the client-local machine catalog and SSH bridge; the owned agent-menu route and existing selection/dialog layouts. Reuse the presentation and key/mouse patterns of `D:/Backups/pi/v2/sidebar/view.ts` and A1's owned dialog components, not the v2 daemon or v2 extension implementation.
- Focused protocol, catalog, command/dialog, native chrome and remote-failure tests, with platform-specific physical SSH/client-loss acceptance evidence recorded separately when available. No product behavior or tests are delivered by this planning proposal.
- Out of scope: automatic remote A1 installation or upgrade, local-to-remote code synchronization, arbitrary CLI panes, LAN discovery, remote host reboot survival, multi-user sharing, remote credential storage, and changes to direct `a1 solo`/`a1 pi`.
