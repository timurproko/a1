# Implementation evidence

## Incident evidence

- Resident tabs chaos (macOS arm64) failed on pull request #777, Development validation run 38874197809 on head `43973884`, seed 3122702356. `host-stop` returned `accepted: false` with `tab-946d324385d6504e` remaining and three tabs stopped, and the replacement `terminal-host --resident-role-child server` (pid 20359) stayed running as an orphan. Linux and Windows chaos lanes passed on the same head. The pull request's own change does not touch host stop.

## Local focused evidence

On Windows with Node 24. The terminal host's Zig build is not run locally because endpoint protection quarantines it. `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1` type-checks and runs the library's unit tests without the vendored terminal library.

- `cargo check --all-targets --features fault-injection,resident-fixtures`: clean, including the new role-integration test.
- `cargo test --lib --features fault-injection`: 114 passed, 1 ignored. These include the new `stop_releases_only_tabs_whose_processes_are_verified_gone` and `a_missing_or_exited_identity_is_not_live`.
- `cargo fmt --check`: clean.
- `npm run preflight` passed every gate on head `30060258` (base `ab2d6f58`, 8 changed paths), including 29 selected test files with 182 tests.

## CI evidence

Diagnostic Development validation run 38908210859 on head `30060258` passed every selected lane.

- Native terminal host on Linux x64, Windows x64, and macOS arm64: unit tests passed (115 to 116 by platform, 1 ignored) and all 23 role-integration tests passed, including the new `host_stop_releases_a_tab_whose_holder_died_awaiting_readmission`.
- Resident tabs chaos on Linux x64, Windows x64, and macOS arm64: passed with no host-stop or orphaned-process violation.

## Gaps

- A connection entry that outlives its holder (design path 1) has no deterministic fixture. It goes through the same `stop_disposition` release as the readmission path, which the unit tests cover, and the new `remainingReasons` make any further chaos refusal name its cause.
