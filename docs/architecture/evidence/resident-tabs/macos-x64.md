# Resident tabs acceptance: macOS x64

State: CI-verified

Physical acceptance against a published candidate package is pending; the operator runs [the checklist](../../../manual-resident-tabs-acceptance.md) and fills in this record. Until every item passes, resident tabs on this platform are CI-verified, not certified.

| Field | Value |
|---|---|
| Package version | pending (first published candidate carrying the terminal host) |
| terminal-host SHA-256 | pending (from that package's `terminal-host.manifest.json`) |
| OS build | pending |
| Terminal | pending |
| Operator or worker | pending |
| Date | pending |

## Automated evidence

- Publication `terminal_hosts` and `guardians` jobs on `macos-15-intel`: the release terminal host and process guardian are built for Intel macOS, the host's `--version` identity is checked, and packing refuses a missing or altered artifact.
- Known gap: the pull-request `terminal-host` and `resident-chaos` suites run on macOS arm64 only, because modular validation outcomes are keyed by platform without architecture. Intel macOS has build and identity evidence but no automated behavior suite of its own.

## Physical verdicts

| # | Item | Verdict | Notes |
|---|---|---|---|
| 1 | Terminal close mid-turn | pending |  |
| 2 | SSH or remote-session loss | pending |  |
| 3 | Forced attach-client kill | pending |  |
| 4 | Reattach fidelity | pending |  |
| 5 | Input and render smoothness | pending |  |
| 6 | Extension text UI | pending |  |
| 7 | Two clients and controller transfer | pending |  |
| 8 | Server, holder, and child failure | pending |  |
| 9 | Sensitive-data separation | pending |  |
| 10 | Conflict-safe direct rollback | pending |  |
| 11 | Logout (Linux) | not applicable | Linux-only item. |
