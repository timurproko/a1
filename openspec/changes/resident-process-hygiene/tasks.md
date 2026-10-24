# Tasks

Each numbered section is one Implementation item. Native tests run in CI.

## 1. Holders end on definitive refusal; standbys never replace their server

- [x] 1.1 In `native/terminal-host/src/roles/server/mod.rs`, send a `refused` frame carrying the admission reason before `serve_peer` returns an admission error. Tests: a `wire` unit test that the frame round-trips its reason.
- [x] 1.2 In `native/terminal-host/src/roles/holder.rs`, read a `refused` answer in `connect_holder`, add `refusal_is_definitive`, end `reconnect_holder` on a definitive refusal, raise the transient backoff cap to fifteen seconds, and end a standby holder on disconnect or a failed first connect without requesting a replacement. Tests: unit tests for the classification and the standby decision.

## 2. The server stops the standby holder it launched

- [x] 2.1 In `native/terminal-host/src/roles/server/{mod,standby}.rs`, record the standby holder's verified identity in `StandbyTab` and terminate it by identity in `discard_standby` after the shutdown offer. Tests: the role integration suite's idle-exit and host-stop cases in CI; the termination path reuses `identity::terminate_verified`, which has its own coverage.

## 3. Role-spawned children show no console on Windows

- [x] 3.1 In `native/terminal-host/src/launch.rs`, set `CREATE_NO_WINDOW` in `command()` under `cfg(windows)` and document the flag sets of the three spawn paths together.

## 4. Development checkout stop converges and runs at launch exit

- [x] 4.1 In `scripts/development/stop-checkout-processes.mjs`, loop list-and-terminate passes to convergence with injectable `list`/`terminate`, return stopped and surviving PIDs, and make `scripts/clean.mjs` and `scripts/development/start-local.mjs` report only survivors. Tests: `test/repository-governance/stop-checkout-processes.test.ts`.
- [x] 4.2 In `scripts/development/start-local.mjs`, stop the checkout's remaining processes when the launched child closes unless `A1_DEV_KEEP_PROCESSES=1`.
