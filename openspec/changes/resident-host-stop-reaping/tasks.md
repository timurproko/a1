# Tasks

Let `host.stop` finish when a tab's holder and child are already gone (see `design.md`).

## 1. Host stop releases gone tabs

- [ ] 1.1 Add `stop_disposition` and its unit tests per Decision 1.
- [ ] 1.2 Release remaining tabs whose holder and child are verified gone in `stop_tabs`: clear `holders`, `holders_starting`, `holders_terminating`, and the recovery slot, and count them as stopped.

## 2. Stop diagnostics

- [ ] 2.1 Add `released` and `remainingReasons` to the `host.stop` result and log `maintenance-stop-released`.
- [ ] 2.2 Keep `remainingReasons` in the chaos harness's host-stop violation text.

## 3. Evidence

- [ ] 3.1 Add role-integration tests for a holder that dies while awaiting readmission after a server replacement, and while unconnected, each followed by `host-stop`.
- [ ] 3.2 Record focused local checks, a green `npm run preflight`, and the terminal-host and resident-chaos CI lanes in `implementation-evidence.md`.
