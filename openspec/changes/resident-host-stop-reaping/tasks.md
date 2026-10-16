# Tasks

Let `host.stop` finish when a tab's holder and child are already gone (see `design.md`).

## 1. Host stop releases gone tabs

- [x] 1.1 Add `stop_disposition` and its unit tests per Decision 1.
- [x] 1.2 Release remaining tabs whose holder and child are verified gone in `stop_tabs`: clear `holders`, `holders_starting`, `holders_terminating`, and the recovery slot, and count them as stopped.

## 2. Stop diagnostics

- [x] 2.1 Add `released` and `remainingReasons` to the `host.stop` result and log `maintenance-stop-released`.
- [x] 2.2 Keep `remainingReasons` in the chaos harness's host-stop violation text.

## 3. Evidence

- [x] 3.1 Add the role-integration test for a holder that dies while a replacement server awaits its readmission, followed by `host-stop`, per Decision 3.
- [ ] 3.2 Record focused local checks, a green `npm run preflight`, and the terminal-host and resident-chaos CI lanes in `implementation-evidence.md`.
