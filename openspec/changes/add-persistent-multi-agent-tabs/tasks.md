## 1. Planning reconciliation

- [x] 1.1 Reconcile proposal, design, deltas, and tasks around the bounded Windows x64 opt-in slice, including durable holder authentication, exclusive registry-writer fencing, client-attributed bridge requests, text-terminal extension fidelity, and deferred default/cross-platform work
- [x] 1.2 Reduce `evolve-bare-a1-into-multi-agent-workspace` to held split-layout/multiplexer scope, remove superseded structured/single-pane deltas, and verify strict OpenSpec validation passes for both changes before code resumes
- [ ] 1.3 Reconcile current `origin/develop`, retaining #588's terminal-query answers and Windows terminal-host CI ownership, before implementation edits are continued

## 2. Native roles and bounded protocol

- [ ] 2.1 Restructure `native/terminal-host` into shared sans-IO core modules and Windows x64 `server`, `holder`, and `attach` roles; remove the fixed 2×2 proof presentation from the shipping path while preserving its retained-model, terminal-query, input, mouse, selection, resize, and cleanup coverage
- [ ] 2.2 Implement one holder per tab with one ConPTY and verified child tree, a continuously parsed libghostty-vt model with 10 MiB scrollback, mode-aware input and terminal-query responses, bounded writer and pre-ready queues, retained-surface snapshots and patches, heartbeat, panic record, and graceful/forced tree termination
- [ ] 2.3 Implement the generation-stable bounded binary protocol with frozen fixtures, additive compatibility rules, typed incompatibility, bounded control lanes, single-slot render lanes, topology revisions, and holder-ordered input-controller ownership markers
- [ ] 2.4 Implement the attach client with raw/alternate-screen ownership, bracketed paste, focus, SGR mouse, supported keyboard negotiation, synchronized output, strip/surface composition, mouse offset, clipboard/hyperlink/cursor forwarding, bell suppression, shortcut interception, and exact normal/fatal terminal restoration

## 3. Server authority, credentials, and durable state

- [ ] 3.1 Implement the per-user × canonical-profile endpoint and owner-only client secret, plus one persisted owner-only profile secret that derives per-tab/per-incarnation holder and bridge credentials without recording those credentials in the registry
- [ ] 3.2 Implement the OS-exclusive registry-writer lease: a replacement must verify and terminate an unresponsive recorded owner before lease acquisition, every mutation must verify the held lease and current epoch, and an unverifiable owner must block replacement rather than permit split brain
- [ ] 3.3 Implement the durable single-writer registry with temp write, write-capable flush, atomic rename, directory sync, transient rename retry, bounded history, corrupt-file quarantine/last-good recovery, memory-authoritative degraded mode, and OS boot identity
- [ ] 3.4 Implement verified holder admission and re-admission from derived credentials, native pid/start identity, tab and holder incarnation, and current epoch; stale servers/events and unverifiable processes must be rejected without signalling or termination
- [ ] 3.5 Implement the fsynced prompt journal, one-second draft snapshot, pre-input session identity commit, session-file sync at settle/graceful stop, seven-day owner-only last-screen recovery file, and OS-exclusive session lease; verify each durability class with crash points

## 4. Windows detachment, supervision, and recovery

- [ ] 4.1 Implement Windows detached start with `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW`, explicit verified job breakaway, and the WMI fallback for foreign kill-on-close jobs; record the mode and report degraded/fallback behavior when survival cannot be established
- [ ] 4.2 Allow only the terminal-host binary's explicit resident spawn to request process-guardian breakaway while every ordinary launch-instance descendant remains terminate-on-close
- [ ] 4.3 Implement non-blocking per-role control loops, deadline-bound blocking workers, per-role watchdogs, holder and bridge heartbeats, unique process incarnations, level-triggered lifecycle/size reconciliation, and bounded concurrent graceful-before-forced stops
- [ ] 4.4 Implement child/holder restart with 1/5/30 second backoff and three-in-ten-minutes budget, interrupted-prompt recovery without resend, unresponsive restart, stalled-progress actions without automatic kill, and distinct rotated crash/stderr records
- [ ] 4.5 Implement server recovery through the writer-lease path, verified surviving-holder re-admission, a three-starts-in-sixty-seconds stop budget, boot-scoped restore with one start in flight per tab, missing cwd/session failures, bounded start spacing, and idle suspension after 60 minutes

## 5. A1 tab mode and client attribution

- [ ] 5.1 Add `ui.js --tab` with per-tab bridge authentication stripped from descendants, sequenced status and heartbeat events, session/name/interrupted-prompt reports, hidden-animation throttling, rename sync, and suppressed intro/outro
- [ ] 5.2 Implement one input-controller lease per tab; before accepting a new controller's terminal input, the holder must deliver and receive acknowledgement for a sideband owner marker so client-scoped bridge requests carry the exact controller generation without carrying terminal content
- [ ] 5.3 Route `/quit` and empty-editor `Ctrl+D` to detach only the attributed controller client; when attribution or bridge availability is missing, leave the tab running and direct the user to attach-local `Ctrl+C` twice
- [ ] 5.4 Implement `/new-tab`, `/close`, `/tabs`, `/quit-all`, and `/name` through the bridge with controller attribution where behavior is client-scoped, plus bounded in-child auto-naming whose deterministic fallback never overrides a user name
- [ ] 5.5 Integrate prompt journaling before dispatch, settled-turn sync, session identity reporting before input admission, and extension/trust/permission needs-input status against real fixture sessions

## 6. Windows opt-in launch and tab UX

- [ ] 6.1 Add the pre-guardian `ensureTerminalHost()` path and run `attach` as the bare-A1 root only on Windows x64 when `tabs.resident` is enabled; retain direct single-agent fallback with one notice for missing, unverified, degraded, or start-budget failures
- [ ] 6.2 Implement the single-row strip with theme roles, grapheme-width 20-column chips, bridge status glyphs, overflow picker, `+`, empty state, per-client viewed tab, and prewarmed creation
- [ ] 6.3 Implement configurable conflict-checked shortcuts (`Alt+A`, `Alt+W`, `F2`, `Alt+1`…`Alt+0`, `Alt+.`/`Alt+,`, `Alt+>`/`Alt+<`) and attach-local double-`Ctrl+C` detach that forwards exactly the first press
- [ ] 6.4 Implement strip mouse selection/menu/reorder, inline rename, busy-close confirmation, graceful close, session-lease focus for `a1 --session` and `/resume`, and input-controller-driven PTY sizing with two concurrent clients
- [ ] 6.5 Implement detach hints and text-terminal fidelity for Unicode, keyboard, mouse, paste, selection, clipboard, hyperlinks, cursor shape, alternate screen, and extension custom components; verify image-protocol requests use the declared text fallback and never claim image parity

## 7. Maintenance, retention, settings, and diagnostics

- [ ] 7.1 Add `a1 tabs`, `a1 tabs stop <id>|--all`, `a1 tabs host status|stop`, and `a1 tabs doctor`; listing/status must not start an absent server and the doctor bundle must redact credentials, prompts, transcript, and terminal content
- [ ] 7.2 Retain every immutable release used by a live verified server, holder, or tab child; keep a compatible resident cohort running through package activation until its tabs stop, without automatic server handoff or idle release recycling in this slice
- [ ] 7.3 Add settings for the opt-in preview, limits, start concurrency, idle suspension, auto-naming, prewarm, unresponsive restart, and stall notice; `tabs.resident` must remain `false` by default on every platform
- [ ] 7.4 Bound tab count, starts, queues, scrollback, logs, crash records, recovery snapshots, memory, handles, and server idle exit, and expose restart/stall/resync/degraded counters in host status

## 8. Packaging, governance, and evidence

- [ ] 8.1 Build and package `a1-terminal-host` for win32-x64 through the existing impact-selected Windows CI owner, with artifact hash verification, pinned-source provenance, licenses, notices, immutable-release placement, and package-content checks
- [ ] 8.2 Update architecture governance so PTY, VT, terminal bytes, input encoding, and resident breakaway remain native-terminal-host authority, while Node carries only bounded semantic bridge/control messages and `a1 pi` cannot initialize the host
- [ ] 8.3 Add deterministic simulation/property tests for death, delay, loss, reordering, client churn, stale epochs, controller transfer, and mutations; add crash points for every persistence/IPC step and fuzz the protocol decoder and surface patch encoder
- [ ] 8.4 Add bounded Windows CI chaos and end-to-end suites covering close-equivalent owner-tree kill, detached output and reattach, two clients, controller transfer, server/holder/child kill, blocked writes, ConPTY creation hang, rename denial, simulated reboot, update retention, and outer-terminal restoration
- [ ] 8.5 Record exact-package Windows manual or isolated-worker acceptance for terminal close, SSH/session loss, keyboard, mouse, paste, extension text UI, rendering smoothness, reattach, failure recovery, and direct-mode rollback; do not automate an active workstation
- [ ] 8.6 Document deferred gates: a separately authorized isolated-worker 24-hour Windows soak before any default-on change, equivalent implementation/certification before each macOS/Linux enablement, automatic resident cohort handoff/recycling, arbitrary CLI tabs, and split layouts
