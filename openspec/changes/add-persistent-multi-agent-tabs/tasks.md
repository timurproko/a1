## 1. Planning reconciliation

- [ ] 1.1 Before any code edit, confirm that proposal, design, deltas, and tasks reflect the recorded user decisions (terminal-session tabs, icon-only attention, `Ctrl+C` twice to leave, auto-naming on, idle suspension at 60 minutes, one tab set per profile, release-gating reliability)
- [ ] 1.2 Before finalization, confirm that the superseded-scope note in `evolve-bare-a1-into-multi-agent-workspace` still matches this change's final scope, and verify `openspec validate --strict` passes for both changes

## 2. Native terminal-host roles

- [ ] 2.1 Restructure `native/terminal-host` into one binary with `server`, `holder`, and `attach` roles over shared modules (model, encoder, composer, protocol), and remove the fixed 2×2 proof presentation from the shipping path; verify the existing retained-model, input, mouse, selection, and cleanup probes still pass per role
- [ ] 2.2 Implement the holder: one PTY/ConPTY, child tree, libghostty-vt model with 10 MiB scrollback, continuous parsing, mode-aware input encoding, query answering, surface snapshot and patch generation, heartbeat, panic hook, and verified tree termination; verify with fixture children, including malformed and high-rate output
- [ ] 2.3 Implement the server: endpoint derivation per user × profile with hermetic overrides, handshake-probed socket-as-lock, ownership marker, owner-only DACL/0600, token files, holder spawn and admission with start-identity verification, topology revisions, and client fan-out with bounded control lanes and single-slot render lanes; verify start races, stale reclaim, owned-only endpoint removal, pid-reuse refusal, and stalled-client isolation
- [ ] 2.4 Implement the attach client: raw mode, alternate screen, outer mode negotiation (bracketed paste, focus, SGR mouse, kitty keyboard, synchronized output), strip-row composition with the damage-aware composer, mouse offset, OSC 52/OSC 8/cursor forwarding with bells never forwarded, shortcut interception before encoding, exact mode restoration on detach, and fatal-path restoration; verify with the input and rendering harnesses and an owner-kill restoration test
- [ ] 2.5 Implement the generation-stable bounded binary protocol with frozen shape fixtures and digests, typed incompatibility outcomes, and prior-generation holder acceptance; verify with additive-compatibility and mismatch fixtures
- [ ] 2.6 Implement the durable registry (temp file, fsync, rename, dir fsync, history generations, quarantine and last-good load, no secrets); verify kill-after-ack durability and corruption recovery

## 3. Detachment and containment

- [ ] 3.1 Implement the Windows detach routine (`DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW`, explicit breakaway, WMI `Win32_Process.Create` fallback for foreign kill-on-close jobs, recorded mode); verify with self-relaunching tests inside kill-on-close jobs with and without breakaway permission
- [ ] 3.2 Implement POSIX detachment (`setsid` with null stdio; macOS per-user bootstrap adoption; Linux logind kill-user-processes detection with the linger hint); verify survival of parent process-group termination and the degraded-mode report
- [ ] 3.3 Add `JOB_OBJECT_LIMIT_BREAKAWAY_OK` to `process-guardian` jobs while ordinary descendants stay contained; verify the containment integration tests still prove terminate-on-close for non-breakaway children

## 4. Recovery

- [ ] 4.1 Implement tab restart on unrequested child or holder exit with 1/5/30 s backoff, a budget of three in ten minutes, the failed state with retry, fresh, and close actions, interrupted-prompt detection, and rotated per-tab stderr capture; verify with kill -9 and hang fixtures
- [ ] 4.2 Implement server self-healing: reconnecting indication, client- or holder-initiated replacement through the detach routine, registry reload, verified holder re-admission, and the stopped state after three starts in 60 s; verify by killing the server mid-stream with and without attached clients
- [ ] 4.3 Implement boot-scoped restore under a single restore gate with bounded concurrency, unavailable-cwd and unavailable-session failure states, and restore-environment notices; verify simulated reboot restores every tab exactly once
- [ ] 4.4 Implement idle suspension (default 60 minutes) with transparent resume on view or prompt; verify that pending requests, queued input, and viewers each prevent suspension

## 5. A1 tab mode

- [ ] 5.1 Add the `ui.js --tab` entry: tab bridge connection with per-tab credentials (stripped from descendants), sequenced status from engine events, session file and name reports, interrupted-prompt metadata, and suppressed intro and outro; verify bridge status for working, needs-input, done, error, and compaction against real fixture sessions
- [ ] 5.2 Route `/quit` and empty-editor `Ctrl+D` in tab mode to detach requests for the requesting client, with a bridge-unavailable notice that `Ctrl+C` twice leaves; verify the tab process keeps running
- [ ] 5.3 Implement `bridge.visibility` throttling of animations and progress frames while hidden, and `bridge.rename` to Pi session-name sync; verify CPU reduction for hidden tabs and name round-trips
- [ ] 5.4 Implement `/new-tab`, `/close`, `/tabs`, `/quit-all`, and `/name` integration through the bridge, plus in-child auto-naming with bounded budget and deterministic fallback; verify that a user name always wins

## 6. Bare-A1 launch and tab UX

- [ ] 6.1 Add `ensureTerminalHost()` to the pre-guardian bootstrap and run the attach client as the bare-A1 UI root when `tabs.resident` is on, with direct single-agent fallback and one notice when the server cannot start; verify first paint and first input stay within the interactive budgets for cold start and reattach with 10 tabs
- [ ] 6.2 Implement the strip: theme-role colors passed from Node, 20-column grapheme-clipped chips, glyphs from bridge status, the overflow menu, `+`, prewarmed standby creation, and the empty-strip state; verify rendering at narrow, wide, and overflow widths with CJK and emoji names
- [ ] 6.3 Implement the keyboard shortcuts (`Alt+A`, `Alt+W`, `F2`, `Alt+1`…`Alt+0`, `Alt+.`/`Alt+,`, `Alt+>`/`Alt+<`) plus the `Ctrl+C` double-press detach (forward the first press, consume the second within the clear/exit interval) with a configurable keybindings file, launch-time conflict checks against A1's registry, and a `/hotkeys` Tabs section; verify that no default collides with A1 bindings or the CSI introducer, and that a tab receives exactly one `Ctrl+C` from the chord
- [ ] 6.4 Implement strip mouse interactions (click, right-click menu, drag reorder with drop marker) and inline rename (validation, Enter/Esc/click-away); verify with the SGR mouse harness, including split reports
- [ ] 6.5 Implement busy-close confirmation, graceful close with a bounded kill, session-lease focus for `a1 --session` and `/resume`, per-client viewed tab, and the input-driven PTY size owner; verify with two concurrent clients
- [ ] 6.6 Implement the detach hints (`N tabs still running · run a1 to return`), and verify that status changes and program bells never produce a bell, sound, or notification, and that the parent terminal is clean after detach

## 7. Updates, retention, CLI, and settings

- [ ] 7.1 Implement server endpoint handoff to a successor while holders reconnect, and idle, unviewed tab recycling onto the active release (`tabs.autoRecycle`); verify `a1 update` mid-turn never interrupts a tab
- [ ] 7.2 Extend release retention to live verified server, holder, and tab-process releases, and run resident binaries only from immutable release directories; verify garbage collection keeps in-use releases
- [ ] 7.3 Add `a1 tabs`, `a1 tabs stop <id>|--all`, and `a1 tabs host status|stop` to the CLI grammar and help; verify that no server starts only to report absence, and that invalid arguments fail concisely
- [ ] 7.4 Add the `tabs.resident`, `tabs.max`, `tabs.maxConcurrentStarts`, `tabs.suspendIdleAfterMinutes`, `tabs.autoName`, `tabs.prewarm`, `tabs.autoRecycle`, `tabs.unresponsiveRestartSeconds`, and `tabs.stallNoticeSeconds` settings to the owned settings screen and generated metadata; verify defaults and hard caps

## 8. Packaging, governance, and evidence

- [ ] 8.1 Build `a1-terminal-host` for win32-x64, darwin-arm64, darwin-x64, linux-x64, and linux-arm64 in CI and release, with the artifact manifest, hash verification, pinned-source provenance, licenses, and notices; extend `check-terminal-host-provenance.mjs` and the artifact checks
- [ ] 8.2 Update `check-architecture.mjs` so PTY, VT, and input authority are allowed only in the native terminal-host roles, Node keeps no PTY or terminal-byte relay, and resident breakaway exists only in the terminal-host binary; add a `terminal-host` integration-test owner
- [ ] 8.3 Add hermetic end-to-end suites on Windows, macOS, and Linux CI: owner-tree kill as a stand-in for terminal close, reattach with output produced while detached, two concurrent clients, server kill, holder kill, tab-process kill, simulated reboot, and update mid-turn
- [ ] 8.4 Record exact-package manual or isolated-worker physical acceptance per platform (terminal close, SSH drop, logout, reboot, keyboard, mouse, and paste fidelity, rendering smoothness) under `evidence/`, with no automation on an active workstation
- [ ] 8.5 Flip `tabs.resident` to `true` on each certified platform after the acceptance list and the section 9 release gates pass, and verify the `false` rollback restores direct single-agent bare A1 with registry records preserved

## 9. Reliability implementation and release gates

- [ ] 9.1 Implement each Rust role as a sans-IO state machine on a single event loop, with blocking work (spawn, PTY creation, kill, identity inspection, file writes, fsync) on deadline-bound workers that report typed failures; verify that no blocking call is reachable from the loop (lint plus tests)
- [ ] 9.2 Add per-role watchdog threads that record diagnostics and terminate only the stalled process, incarnation identities on every holder and tab-process event with stale-event discard, level-triggered reconciliation of lifecycle, holder presence, and size, and durable epoch fencing; verify that late exit events, lost resizes, and a resumed stale server are all harmless
- [ ] 9.3 Implement holder I/O flow control: a continuous reader, and a dedicated writer with a bounded queue that rejects visibly and never drops or reorders silently; plus an ordered bounded queue for keystrokes sent before ready; verify with a non-reading child and paste storms
- [ ] 9.4 Implement the durability classes: the fsynced prompt journal before dispatch (covering Pi's first-turn no-file window), a debounced draft snapshot, session identity committed before input is enabled, session-file fsync at turn settle and graceful stop, the last-screen read-only snapshot with an owner-only recovery file (seven-day retention), and the OS-exclusive session lease file; verify each guarantee with kill-every-process tests
- [ ] 9.5 Implement registry write hardening: write-access flush, directory sync, transient rename retry with backoff, memory-authoritative degraded health on persistent failure, and OS boot-session identity instead of rounded uptime; verify with antivirus-style rename denial and clock-change fixtures
- [ ] 9.6 Implement liveness and progress supervision: bridge heartbeats from the A1 event loop, the unresponsive state with restart after `tabs.unresponsiveRestartSeconds`, and the stalled state after `tabs.stallNoticeSeconds` with interrupt and restart actions and no auto-kill; verify with wedged-loop and stalled-provider fixtures
- [ ] 9.7 Implement start spacing and graceful-before-forced stops for profile lock safety; verify that a ten-tab concurrent restore has models available in every tab
- [ ] 9.8 Implement diagnostics: size-rotated logs never truncated at startup, a distinct crash record per incident with a backtrace, bounded total retention, reliability counters in host status, and the redacted `a1 tabs doctor` bundle; verify that consecutive crashes keep distinct records
- [ ] 9.9 Add deterministic simulation and property tests of the server core, over arbitrary interleavings of death, loss, reordering, delay, and client churn, asserting no lost committed mutation, never two live incarnations per tab or session, and convergence; minimized counterexamples must be reported
- [ ] 9.10 Add failure-injection points at every persistence and IPC step, with kill-at-each-point crash tests, and `cargo-fuzz` targets for the protocol decoder and surface patch encoder, running in CI
- [ ] 9.11 Add the 24-hour chaos soak on Windows, macOS, and Linux: ten high-rate fake-agent tabs plus one real Pi tab on a stub provider, with random termination of every role, resize and attach churn, and Windows ConPTY-hang, blocked-write, and rename-denial injection. It must assert zero lost prompts or entries, zero orphans, zero duplicates, bounded memory and handle growth, reattach p95 under 300 ms, tab restart under 3 s, and server recovery under 2 s. Wire it as a release gate for resident changes
