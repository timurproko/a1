# Tasks

Milestone 4 of 6 for resident tabs (see `docs/architecture/resident-tabs.md`); requires milestones 1–3 merged. Implementation starts only after the user approves this plan and milestone 3 has merged.

Unless a task says otherwise, every test runs on Windows x64, macOS, and Linux through the platform matrix in `scripts/release/validation-matrix.mjs`, and evidence from one platform is never used for another. Node tests live under `test/features/resident-tabs/` (new directory, or the tab-mode test directory milestone 2 created). Native tests live in `native/terminal-host`.

## 1. Baseline

- [ ] 1.1 Reconcile the branch with current `develop` after milestone 3 merges. Record in `design.md` the actual module paths milestones 2 and 3 used for the server, holder, tab bridge, registry, and tab-mode child, and the id form used for `residentTabs`, and adjust the paths below to match before writing code.
- [ ] 1.2 Add named failure-injection points (design Decision 13) to the native crate and the Node tab-mode modules, enabled only by a hermetic `A1_*` test override and refused otherwise. Prove refusal outside hermetic runs with a unit test in each language.

## 2. Protocol additions

- [ ] 2.1 Add the additive generation-1 messages and values from design Decision 12 to the protocol module in `native/terminal-host/src/protocol/` and the Node bridge codec, with a frozen fixture per new shape and the updated fixture digest. Prove that peers without them fall back to process-level status, with a mixed-feature handshake test.

## 3. Restart policy

- [ ] 3.1 In the sans-IO core (`native/terminal-host/src/core/`), add the per-tab restart state machine: start gate, backoff 1 s, 5 s, 30 s, three-in-ten-minutes budget, `crashed`, `restarting`, and `failed`, and the retry, fresh, and close transitions. Prove it with deterministic simulation that injects child exits, holder exits, server replacement, and late events from superseded incarnations, and asserts no duplicate start, the budget, and convergence to running or failed.
- [ ] 3.2 Persist `restarts`, `restartWindowStart`, and `lastExit` in the registry before each restart is issued. Prove with a crash test that kills the server between the budget commit and `holder.respawn`, and asserts the replacement neither loses nor double-counts the restart.
- [ ] 3.3 Implement `holder.respawn` in the holder: verify the previous child and tree have exited, acquire the session-writer lock, then spawn `node bin/ui.js --tab --session <file>` with the held environment. Prove with process tests that an external kill restarts the tab with its transcript, and that a surviving orphan writer keeps the tab `crashed` with no second writer.
- [ ] 3.4 Enforce `tabsMaxConcurrentStarts` and start spacing for restarts, and graceful-then-forced termination. Add the ten-tab test: kill all ten children, including forcibly, and assert that every restarted child reports its configured models as available, using the hermetic fake provider.

## 4. Liveness and progress

- [ ] 4.1 In the tab-mode bridge module, send `bridge.heartbeat` every 5 s from the event loop. Prove the cadence with a fake-timer unit test, and prove that a blocked loop stops heartbeats with a process test.
- [ ] 4.2 In the core, measure heartbeat silence only over continuously healthy supervision (design Decision 3). Show `unresponsive` at 30 s, and restart at `tabsUnresponsiveRestartSeconds` through the restart policy. Prove in simulation that server replacement, bridge reconnect, a holder heartbeat gap, or a server loop stall each reset the clock and never cause a restart.
- [ ] 4.3 Add a process test where a child wedges its event loop (a test extension that spins) while supervision is healthy. Assert `unresponsive` within 30 s and a restart after the configured interval, with journal, draft, and last screen preserved.
- [ ] 4.4 In the tab-mode child, track model and tool progress events from `src/integrations/pi/engine/session-events.ts`. Report `stalled` after `tabsStallNoticeSeconds`, show the notice above the editor, and add `/restart-tab`, which sends the `restart` request. Prove with a fake-provider stream that stalls for the interval that the notice appears, that nothing is killed, and that `/restart-tab` restarts without consuming crash budget.
- [ ] 4.5 Declare `tabsUnresponsiveRestartSeconds` (default 120; allowed 60, 120, 300, 600) and `tabsStallNoticeSeconds` (default 300; allowed 120, 300, 600, 1800) in `src/ui/settings/declarations.ts`, with descriptions, using the id form from task 1.1. Prove with the existing settings declaration tests.

## 5. Prompt journal

- [ ] 5.1 Add the journal writer and reader (new file `src/features/resident-tabs/prompt-journal.ts`): an owner-only append-only `journal.jsonl` at `<dataDir>/tabs/<profile-token>/<tabId>/`, the `submitted`, `correlated`, `settled`, and `retired` records, synchronization on a write handle, and compaction by durable atomic replacement. Prove the record codec, owner-only modes or ACLs, and bounded size with unit tests.
- [ ] 5.2 Insert durable admission into `SessionShell.#submit` in `src/app/session-shell/session-shell.ts` in tab mode only, between `#rememberInput` and `#execute`, with a stable submission id and a 2 s timeout. Prove that a failed or slow journal keeps the prompt in the editor with a visible failure and dispatches nothing, and that direct mode and `a1 pi` are unchanged.
- [ ] 5.3 Record `correlated` after Pi appends the user entry and `settled` after the settled-turn sync. Implement recovery that reconciles journal and session by id, entry id, and text match, retires idempotently, and offers unfinished prompts without resending. Prove with unit tests over synthetic journal and session pairs, including duplicate retirement and a lost correlation record.
- [ ] 5.4 Implement first-turn recovery: `fileExisted: false` plus a missing session file starts the session at the reserved identity and offers the prompt. A missing file that previously existed makes the tab `failed` with the path and overwrites nothing. Prove both cases with process tests.
- [ ] 5.5 Offer recovered prompts in the editor with a notice. When a draft is also recovered, place it in editor history, and put additional pending prompts in history with a count. Prove with session-shell tests.

## 6. Drafts and session synchronization

- [ ] 6.1 Add the draft checkpointer (new file `src/features/resident-tabs/draft-checkpoint.ts`): mark dirty on every editor change, write at most every 500 ms by temporary file and rename, and show `draft recovery degraded` and the bridge degraded flag when a write fails or the oldest unsaved change is older than one second. Restore the draft at restart. Prove with fake-timer and fault-injecting file-system unit tests.
- [ ] 6.2 Add the continuous-typing test: drive thirty seconds of uninterrupted typing through the PTY, kill the child at a random instant, and assert that the recovered draft lacks at most the last second of input. Add a blocked-storage variant that asserts degraded state and no claim of the bound.
- [ ] 6.3 Synchronize the session file with a write-capable `fs.fsync` after each settled `agent_end` and during graceful stop, off the input path, before the journal `settled` record (new file `src/features/resident-tabs/session-sync.ts`). Prove the call order and write access with unit tests, and that a sync failure leaves the journal entry unretired.

## 7. Registry failures

- [ ] 7.1 In the server's registry module, quarantine an unreadable or invalid `registry.json` as `registry.corrupt-<ts>.json`, load the newest valid `registry-history/` generation with a notice naming both, and fail closed with files preserved when none validates. Prove with fixtures for truncated, invalid, and all-invalid states.
- [ ] 7.2 Retry transient rename failures (50 ms doubling to 2 s, up to 10 s). Reject the mutation on persistent failure or disk-full, keeping memory authoritative and reporting degraded health. Prove with an injected sharing violation (Windows), `EBUSY` and `ENOSPC` (macOS and Linux), and a full small volume or quota where the runner allows it, asserting that running tabs are unaffected and no older file is reloaded.

## 8. Last screen and recovery files

- [ ] 8.1 On child exit, have the holder freeze its retained model as a read-only snapshot, and have the attach client draw it under the crash or failed banner without forwarding input. Write `recovery/last-screen-<incarnation>.txt` (visible screen plus up to 5,000 scrollback rows, 2 MiB cap, owner-only, three generations, seven-day expiry). Prove with a process test that kills a child mid-stream and asserts the streamed text is on screen and in the file.
- [ ] 8.2 Add the private stderr sink `recovery/stderr-<incarnation>.log` (three 5 MiB generations, seven days, owner-only), exercised by a fixture producer only, and confirm no separate stderr is captured from real children. Prove bounds, expiry, and modes.

## 9. Diagnostics

- [ ] 9.1 Add the diagnostic allowlist and rotation to the native crate: `terminal-host-server.log` and `terminal-host-holder-<tab>.log` rotate at 5 MiB with three kept and are never truncated at startup. Add distinct `crash-<role>-<incarnation>-<ts>.json` records for crash, watchdog, and unrequested exit with a native backtrace, capped at 64 KiB, 50 records, and 30 days, under `<dataDir>/tabs/<profile-token>/diagnostics/`. Prove with two crashes in a row that both records are preserved and distinguishable, and that restart does not truncate logs.
- [ ] 9.2 In tab mode, pass `bin/ui.js`'s `installFatalExit` directory to the tab's diagnostic directory, and reference the child record from the holder's unrequested-exit record by file name. Prove with the existing fatal-exit fixture (`test/fixtures/owned-ui-fatal.ts`) run as a tab.
- [ ] 9.3 Add the sensitive-stderr test: a test extension writes a prompt, a credential-like token, and control sequences to stderr and then crashes. Assert that no file under the diagnostic directory contains them, that every diagnostic file validates against the allowlist, and that recovery artifacts exist only under the owner-only tab directories.

## 10. Reboot and logout

- [ ] 10.1 Add the OS-session identity function to `native/terminal-host/src/platform/` (Windows logon session id and time, macOS audit session id, Linux logind session of the user manager, or `unavailable`). Prove that it is stable within one session and reports `unavailable` instead of guessing.
- [ ] 10.2 At server start, move the previous tab set to `registry-history/tabset-<bootId>-<ts>.json` in one durable mutation when boot or OS-session identity differs, or when all holders are gone with an unavailable session identity, and let bare `a1` create one new tab. Prove with simulated boot and session changes and a kill test at every step of the move.
- [ ] 10.3 When a tab opens a session, pass matching unretired journals younger than seven days through the startup contract. The child adopts their entries by submission id, retires them in the source journal, and offers them idle. Prove idempotent adoption, seven-day expiry, and first-turn adoption with tests that simulate a reboot.

## 11. Failure presentation

- [ ] 11.1 In the attach client, show the crashed, restarting, failed, unresponsive, stalled, and degraded states in the minimal strip from milestones 2 and 3, and the banner `✗ <reason> — [r] retry · [f] start fresh · [alt+w] close` on a viewed failed tab. Handle `r`, `f`, and `Alt+W` only while the viewed tab is failed. Prove with attach-client rendering tests and a two-tab process test in which one tab fails while the other keeps streaming and accepting input.

## 12. Documentation and validation

- [ ] 12.1 Update `docs/architecture/resident-tabs.md` with any decision that changed during implementation, and remove the requirements this change delivers from `docs/architecture/resident-tabs-requirements.md`: "Crashed and hung tabs restart within a bounded budget", "Reboot and logout end tabs without losing sessions", "Liveness and progress are supervised separately", "Durable data is guaranteed per class", "Diagnostics survive the failures they describe" (keeping a note that the `a1 tabs doctor` export remains for milestone 6), and "Tab failure is presented and recoverable per tab".
- [ ] 12.2 Run the full crash-point suite, the continuous-typing, ten-tab, and sensitive-stderr tests, the simulation suites, the native and Node test suites, strict OpenSpec validation, and documentation governance on Windows x64, macOS, and Linux. Record per-platform results, journal admission latency, and any skipped case with its reason in `implementation-evidence.md`.
