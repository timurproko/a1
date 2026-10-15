# Resident tabs acceptance: Linux x64

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

- Pull-request `terminal-host` lane on `ubuntu-24.04`: native unit and role-integration suites, every named crash point recovering to a clean start, the 10,000-schedule simulation corpus, `a1 tabs` maintenance end to end, and the release build of the terminal host with its manifest, session lock, and notices.
- Pull-request `resident-chaos` lane on `ubuntu-24.04`: bounded randomized kills of servers, holders, and agents against the release-built host, with no duplicate tabs or holders and no orphaned processes.
- Publication `terminal_hosts` job on `ubuntu-24.04`: the release artifact is rebuilt, its `--version` identity checked, and packing refuses a missing or altered artifact.
- Bounded fuzzing of every decoder and parser runs on this lane; it proves parser robustness, not platform behavior.

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
| 11 | Logout (Linux) | pending |  |
