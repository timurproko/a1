## 1. Reproduce

- [x] 1.1 Reproduce the failure locally or on a dispatched Full regression of the failed head and record the exact failing test or command.
- [x] 1.2 Identify the introducing commit among the suspect range, or record that the failure is environmental.

## 2. Fix

- [x] 2.1 Fix the cause without weakening assertions, budgets, timeouts, or coverage.
- [x] 2.2 Add or adjust regression evidence where the failure exposed a gap.

## 3. Prove

- [x] 3.1 Dispatch `gh workflow run full-regression.yml --ref <this branch>` on the completed fix head, wait for it, and record the run number and head under Evidence in design.md; the failed owners pass on the failed lane (runs #25 to #28: `dependency-policy` green on every lane, Windows Node 22 packs and runs the suite; the only remaining failures are Windows startup-budget overruns, which this change does not touch and which the startup-budget reliability change addresses).
