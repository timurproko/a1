# Tasks

All tasks are proposed and unchecked. Planning approval and an explicit implementation request are required before any code, tests, scripts or release workflow changes. Tests run in CI after readiness; manual acceptance is optional and is not an Implementation checkbox.

## 1. Machine identity and remote transport

- [ ] 1.1 Add an owner-private, bounded saved-machine catalog with stable IDs, SSH targets, labels, selected remote cwd, enabled state, validation and atomic updates. Preserve Local as a separate, immediately available endpoint; never persist SSH keys, passwords or remote resident credentials.
- [ ] 1.2 Implement a fixed-command SSH bridge to the compatible remote A1 resident host, with an exact capability handshake, read-only setup probe, host-key/authentication failure classification, no open network listener, and no implicit install/restart/upgrade.
- [ ] 1.3 Add per-machine, generation-fenced input/controller and screen/status interest. Only a confirmed selected remote frame receives input or resize; a failed potentially mutating request is never blindly retried.
- [ ] 1.4 Add focused tests for catalog integrity, invalid targets/paths, remote executable mismatch, protocol generations, unauthorized endpoints, local versus remote routing and fenced switching.

## 2. One client-local machine manager

- [ ] 2.1 Register `/workbox` in the resident A1 agent menu as a fixed client-local management route. It always opens the manager, whether or not a Workbox machine exists; invocation from a remote viewed tab may never edit the remote host's machine catalog.
- [ ] 2.2 Reuse existing selection, input and stepped-dialog layouts for a single Add/Edit flow: SSH-config candidates and manual target, read-only connection/compatibility check, editable suggested name and remote-home directory, remote folder validation, atomic Save and no-change Cancel.
- [ ] 2.3 Route sidebar header Add and machine-row Edit into the same manager states; keep reconnect/disable/enable/forget scoped to the machine context menu. Render setup and authentication remedies inside the manager/context surface only, without notices or banners in agent tabs.
- [ ] 2.4 Test no-profiles/repeated-command/edit/add/cancel, remote-child command origin, keyboard and mouse menu navigation, invalid folder, failed authentication, name collisions and concurrent setup updates.

## 3. V2-style machine sidebar and tabs

- [ ] 3.1 Add a collapsed `›` on the tab-strip row only when a machine is saved; expand to a `‹` push sidebar with Local, machine rows and nested agent rows. Keep the current per-machine strip/`+`/Settings/tab interactions and A1's no-machine behavior unchanged.
- [ ] 3.2 Render live machine and agent status from authoritative remote bridge metadata; on SSH loss dim cached rows/screen, prevent remote actions and preserve selection. Ensure Local and other machines continue immediately. Hide terminal-screen streams for unviewed machines while keeping their status current.
- [ ] 3.3 Create a new tab in the selected remote's configured cwd (default remote home), or use existing local launch cwd for Local. Keep tab IDs, cwd, session ownership and settings machine-scoped.
- [ ] 3.4 Test narrow layouts, wide glyphs, hover/context hit regions, mouse-coordinate and resize translation, terminal/clipboard fidelity, stale badges, offline interactions, tab-switching and multiple viewers without an extra in-tab status row.

## 4. Reconnection, recovery and delivery evidence

- [ ] 4.1 Add per-machine health probing and bounded reconnect after SSH or local client loss, with fresh status/surface reconciliation before input resumes and no remote automatic installation or process stop.
- [ ] 4.2 Add hermetic race and failure fixtures for disconnect while working, local client restart, stale generation, server replacement, incompatible builds, command-origin/controller transfer and failure of one remote without affecting other machines.
- [ ] 4.3 Extend packaging/capability checks and hermetic remote-lifecycle tests for the selected Windows, Linux and macOS targets. Document which platform survival claims remain uncertified; optional later physical validation does not gate task completion.
- [ ] 4.4 Reconcile all spec deltas and detailed tasks, record implementation evidence and known-gap disposition before finalization. Do not describe an untested physical-survival path as certified.

## Outcome map

| Pull-request Implementation outcome | Task groups |
| --- | --- |
| Save and connect remote machines without changing the remote A1 installation | 1 |
| Open one client-local `/workbox` manager for Add/Edit from agent menu and sidebar | 2 |
| Show v2-style chevron sidebar and selected-machine resident agents | 3 |
| Recover truthful remote status and input after disconnect without disrupting other machines | 4 |
