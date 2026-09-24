## 1. Planning reconciliation

- [ ] 1.1 Record the maintainer's answers to the design's open questions (structured workers vs PTY frames, idle-suspension default, LLM auto-naming default, extension custom-component gap, grouping scope) in `design.md`, and reconcile proposal, deltas, and tasks before any code edit
- [ ] 1.2 Before finalization, confirm that the superseded-scope note in `evolve-bare-a1-into-multi-agent-workspace` still matches this change's final scope, and verify `openspec validate --strict` passes for both changes

## 2. Transport-neutral engine contract

- [ ] 2.1 Extract the shell-facing surface of `PiEngineAdapter` into an A1-owned transport-neutral contract (commands, typed events, authoritative snapshot, view models, extension-UI request/response) with no Pi types; verify the architecture policy rejects Pi imports outside the adapter boundary
- [ ] 2.2 Re-implement the in-process adapter on that contract with no behavior change; verify the full owned-UI, session-shell, rendering, and input-responsiveness suites pass unchanged
- [ ] 2.3 Define the snapshot builder (committed transcript through `SessionManager`, in-flight assistant/tool state, queue, model, thinking, compaction, pending UI requests, status, draft) and a snapshot-plus-events reducer; verify snapshot→events equals live-event replay for recorded fixture sessions, including compaction and tool streaming
- [ ] 2.4 Map extension UI (confirm, select, input, editor, notify, status, text widgets) onto the typed request/response vocabulary aligned with Pi's public `RpcExtensionUIRequest`; verify first-answer-wins and bounded explicit notices for unsupported custom components

## 3. Native resident spawn

- [ ] 3.1 Add `process-guardian --spawn-resident` for Windows: `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW`, kill-on-close job detection, breakaway when permitted, WMI `Win32_Process.Create` fallback with explicit environment block and cwd, and reported mode; verify with self-relaunching integration tests inside a kill-on-close job that the child survives job closure and has no console
- [ ] 3.2 Add the POSIX modes: `setsid` with null stdio on Linux plus logind `KillUserProcesses`/linger detection, and `setsid` plus per-user bootstrap-port adoption on macOS; verify with integration tests that the child survives parent process-group termination
- [ ] 3.3 Extend the native artifact manifest, hash verification, and protocol version for the new mode; verify packaging and artifact tests reject mismatched binaries

## 4. Resident agent host

- [ ] 4.1 Implement endpoint derivation per user × profile root with hermetic overrides, socket-as-lock single instance, stale-endpoint reclaim after a failed handshake, ownership marker, owner-only DACL/0600, and client token file; verify concurrent start races, stale reclaim, owned-only removal, and cross-profile isolation
- [ ] 4.2 Implement the generation-stable handshake, bounded NDJSON framing, correlated commands with single terminal outcomes, and expected-revision registry mutations; verify additive-compatibility fixtures, generation mismatch, oversized frames, and cancel/complete races
- [ ] 4.3 Implement the per-profile `agent-host.sqlite3` registry (WAL, `synchronous=FULL`, single writer, conditional transitions, bounded draft, no secrets) with corruption quarantine; verify kill-after-ack durability, corrupt-file quarantine, and schema-versioned reads
- [ ] 4.4 Implement client fan-out with bounded control lanes, replaceable streaming deltas, `resync-required` plus snapshot recovery, and per-agent replay windows; verify a stalled client never slows agents or other clients
- [ ] 4.5 Implement `ensureAgentHost()` in the pre-guardian bootstrap beside `ensureSupervisor()`, using `--spawn-resident`, bounded readiness, and join-the-winner; verify startup stays within the interactive startup and first-input budgets
- [ ] 4.6 Implement idle exit (no running agents and no clients for ten minutes), rotated host logs without prompt content, and host status reporting; verify with fake clocks

## 5. Agent workers and supervision

- [ ] 5.1 Implement `bin/agent-worker.js`, hosting one Pi runtime through the in-process adapter headlessly (no `ProcessTerminal`), per-agent token authentication, heartbeat, bounded unacknowledged-event buffer, and stderr tee to a rotated worker log; verify with a real fixture Pi session
- [ ] 5.2 Implement worker spawn, registration with native start-identity verification, graceful-then-forced stop of the verified tree, and the session-file lease; verify pid-reuse refusal, lease focus-instead-of-duplicate, and tree cleanup
- [ ] 5.3 Implement crash detection, heartbeat hang detection, restart with 1/5/30 s backoff, a budget of three restarts in ten minutes, the failed state with retry/fresh/close, and interrupted-prompt detection without resend; verify with kill -9 and hang fixtures
- [ ] 5.4 Implement host-loss behavior in workers (continue the turn, buffer, reconnect, start a replacement host through the single-instance path) and host re-admission of verified workers; verify by killing the host mid-turn with and without attached clients
- [ ] 5.5 Implement boot-scoped restore under a single restore gate with bounded concurrency, cwd/session-unavailable failure states, and restore-environment notices; verify simulated reboot (new boot nonce, no live workers) restores every agent exactly once
- [ ] 5.6 Implement optional idle suspension and transparent resume; verify suspension is off by default and resume preserves context

## 6. Remote engine adapter and client

- [ ] 6.1 Implement the remote engine adapter over the host protocol satisfying the task 2.1 contract; verify the owned-UI regression suites pass against it with a hermetic host
- [ ] 6.2 Implement attach with last-position replay or snapshot, gap-triggered resync, reconnecting indication, and host-stopped state with restart and single-agent fallback; verify by killing and restarting the host under an attached client
- [ ] 6.3 Route bare-A1 launch through the host when `agents.resident` is on: reattach, create-when-empty, `--session` open-or-focus, last active tab selection, and lazy hydration of other tabs; verify reattach first paint within budget with 10 agents
- [ ] 6.4 Implement quit-as-detach with the running-agents hint, `/quit-all`, and no `Ctrl+C` forwarding; verify the terminal is clean after the outro and agents keep running

## 7. Tab presentation

- [ ] 7.1 Implement the tab model and reducer (order, active tab per client, status, done-unseen via shared `seen_seq`, limits) and the one-row strip component with theme tokens, 20-column chips, grapheme-aware clipping, overflow menu, and `+`; verify rendering snapshots at narrow, wide, and overflow widths, including CJK and emoji names
- [ ] 7.2 Declare the tab shortcuts in `ShortcutRegistry` (`Alt+A`, `Alt+W`, `F2`, `Alt+1`…`Alt+0`, `Alt+]`/`Alt+[`, `Alt+}`/`Alt+{`) with conflict detection and a `/hotkeys` Tabs section; verify no collision with editor, viewport, or dialog bindings
- [ ] 7.3 Implement mouse click, right-click menu, and drag-to-reorder with a drop marker as a claimed pointer region; verify with the SGR mouse input harness, including split reports
- [ ] 7.4 Implement inline rename (validation, Pi session-name sync, `name_source=user`), `/name` integration, default naming, and `tabs.autoName` with bounded budget and deterministic fallback; verify that a user name always wins
- [ ] 7.5 Implement close with busy confirmation, the empty-strip state, `/new-tab`, `/close`, and the `/agents` picker; verify a closed session reopens via `/resume` intact
- [ ] 7.6 Implement structured status glyphs and optional `tabs.notify` bell/notification with one emission per transition and none for the active tab; verify that terminal-looking content never changes status
- [ ] 7.7 Implement per-tab failure presentation with retry/fresh/close and offering the interrupted prompt back into the editor; verify sibling tabs stay operable

## 8. Updates, retention, CLI, and settings

- [ ] 8.1 Implement generation-mismatch handling, host idle-boundary replacement with endpoint handover, and worker recycling at idle boundaries; verify `a1 update` mid-turn never interrupts an agent
- [ ] 8.2 Extend release retention to count live verified host and worker releases; verify garbage collection keeps in-use releases
- [ ] 8.3 Add `a1 agents`, `a1 agents stop <id>|--all`, and `a1 agents host status|stop` to the CLI grammar and help; verify no host starts only to report absence, and that invalid arguments fail concisely
- [ ] 8.4 Add the `agents.resident`, `agents.max`, `agents.maxConcurrentStarts`, `agents.suspendIdleAfterMinutes`, `agents.autoUpgradeHost`, `tabs.autoName`, and `tabs.notify` settings to the owned settings screen and generated metadata; verify defaults and hard caps

## 9. Governance and evidence

- [ ] 9.1 Add the agent-host architecture boundary to `check-architecture.mjs` (no Pi runtime in the host, no PTY or terminal-byte relay, resident spawn only through the native helper) and an `agent-host` integration-test owner; verify the governance suites pass
- [ ] 9.2 Add hermetic end-to-end suites for owner-tree kill as a stand-in for terminal close, reattach with streaming continuity, two concurrent clients, host kill, worker kill, simulated reboot, and update mid-turn on Windows, macOS, and Linux CI
- [ ] 9.3 Record exact-artifact manual or isolated-worker verification of physical terminal close, SSH disconnect, logout, and reboot on Windows, and on macOS/Linux where supported, under `evidence/`, with no automation on an active workstation
- [ ] 9.4 Flip `agents.resident` to `true` by default after the acceptance list passes, and verify that the `false` rollback restores the in-process single-agent bare A1 with registry records preserved
