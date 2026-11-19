# Implementation evidence

## Incident evidence

- Release `0.2.7-dev.772-757384af212d1bb83b1d` on Windows 11 in WezTerm, 2026-10-15. Keyboard and mouse input stopped for every tab while output kept rendering. The attach process (started 19:10) was still running with its main loop alive: it used CPU on its 8 ms poll and its 15-second watchdog never fired.
- The profile's diagnostics directory recorded a holder `child-exit` crash and restart every few seconds between 19:09 and 19:27, so crash recovery held start slots during the session.
- No debugger was available, and host status did not expose start-slot use, so the stuck `acquire_start_permit` wait could not be observed directly. The diagnosis rests on the code path in `design.md`: an unbounded slot wait on the connection's only read thread. This change adds the missing observation: `starts` and `lifecycle` in host status, and the `attach-lifecycle-slow` event.

## Local focused evidence

On Windows with Node 24 and Rust 1.98.1. The terminal host's Zig build is not run locally because endpoint protection quarantines it. `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1` type-checks and runs the library's unit tests without the vendored terminal library.

- `cargo check --all-targets --features fault-injection,resident-fixtures`: clean, including the new role-integration tests.
- `cargo test --lib --features fault-injection`: 96 passed, 1 ignored. These include the new `recovery_yields_free_start_slots_to_a_waiting_user_start`, `lifecycle_failures_answer_with_their_request_reply_and_hide_paths`, `a_full_lifecycle_refusal_reaches_the_client_without_waiting`, `lifecycle_status_totals_pending_work_and_reports_the_oldest_running_request`, `failure_input_rules_apply_only_to_the_viewed_failed_tab`, `the_open_prompt_names_itself_in_capture_order`, and `new_tab_failures_name_their_reason`.
- `cargo clippy --all-targets --features fault-injection,resident-fixtures`: no finding in changed code. The nine findings it reports (in `controller.rs`, `endpoint.rs`, `ghostty.rs`, `launch.rs`, `protocol.rs`, and `server.rs` lines 360 and 438) predate this change and come from the newer local toolchain.
- `cargo fmt --check`: clean.
- `npx vitest run test/cli/tabs.test.ts`: 7 tests passed, including the new host status test.
- `npm run preflight` passed every gate on head `7870312e` (base `1cd3afe8`, 13 changed paths, 11 steps), including 60 selected test files with 572 tests. The first run failed `code-documentation-changed` (DOC005) on six untagged comments, which were tagged.

## CI evidence

Diagnostic Development validation runs on this branch:

| Run | Head | Native terminal host lanes | Other lanes |
| --- | --- | --- | --- |
| 38782058847 | `7870312e` | Linux, Windows, macOS: unit tests passed; 20 of 21 role-integration tests passed, including both new tests; `server_holder_and_attach_survive_client_loss_and_retain_output` failed (no detach hint) | all passed, including resident tabs chaos on all three platforms |
| 38790090549 | `81510b95` | same failure, now with a host-status dump: server healthy (no lifecycle backlog, no held start slots, tab running, client detached with exit 0), while the attach client held no tabs | all passed |
| 38864183082 | `cc367e32` | Linux and Windows passed every test; macOS failed the same test | First-attempt startup budget failed with `exact-package supervisor did not become idle`; it passed in the two runs before, and nothing it exercises changed |

The failing test exposed a regression in the first design. With `attach.start` on the lifecycle worker, the server answered the client's first `tab.list` before its first tab existed. The attach client then applied no later `tab.list` reply, so its strip stayed empty and the detach hint counted zero tabs. Selecting the started tab fixed Linux and Windows but not macOS. Head `09e7877a` keeps `attach.start` on the read loop ahead of that first list (design Decision 1), restoring the previous order. Run 38868373131 on that head was still running when the final Implementation item was checked; the ready pull request's exact-head validation covers it.

Both new tests passed on all three platforms in all three runs: `input_reaches_the_viewed_tab_while_its_terminal_waits_for_a_start_slot` (the echo arrived within 4 s while a tab start held the only slot for 8 s, and all three tabs reached running) and `a_start_slot_that_never_frees_fails_the_new_tab_and_keeps_the_client` (`tab-start-busy` within 4 s, the server still answering).

## Gaps

- The attach client applied no `tab.list` reply after its first in these fixture runs, including its 500 ms polls; replies that followed `tab.selected` on Linux and Windows were applied. This predates the change and is not root-caused here. If it also happens outside the fixture, the strip does not refresh on its own, for example after an automatic tab rename. Left for a follow-up change, because this change no longer depends on polling.
- `wire::EnvelopeKind` decodes `request_id` without the envelope's camelCase name, so `kind.request_id` is always `None`. Attach clients send no request ids and nothing reads them, so this predates the change and is left alone; the new unit test asserts request ids through `wire::body`.
