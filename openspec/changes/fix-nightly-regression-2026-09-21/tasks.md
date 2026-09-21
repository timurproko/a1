## 1. Reproduce

- [x] 1.1 Reproduce the failure locally or on a dispatched Full regression of the failed head and record the exact failing test or command.
  - Established from the failed run's own log rather than a new dispatch: the failure is a marginal teardown budget on a slow lane, so a fresh run of the failed head reproduces it only when the lane is slow enough, as Full regression 35576685488 passing that same head shows.
- [x] 1.2 Identify the introducing commit among the suspect range, or record that the failure is environmental.

## 2. Fix

- [x] 2.1 Fix the cause without weakening assertions, budgets, timeouts, or coverage.
- [x] 2.2 Add or adjust regression evidence where the failure exposed a gap.

## 3. Prove

- [x] 3.1 Dispatch `gh workflow run full-regression.yml --ref <this branch>` on the completed fix head, wait for it, and record the run number and head under Evidence in design.md; the failed owners pass on the failed lane.
  - Run 35651563189 on head `4f6023a7`: success on all four lanes, with `update-predecessor` passing on the failed lane windows-2025 node 22. Recorded under "Fix evidence" in design.md.
