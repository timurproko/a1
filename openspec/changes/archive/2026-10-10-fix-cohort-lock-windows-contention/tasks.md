# Tasks

## 1. Reproduce

- [x] 1.1 Identify the stable candidate failure as `EPERM` from the cohort state lock open while two cleanup coordinators overlap on Windows.
- [x] 1.2 Confirm that `acquireLock` retries only `EEXIST`, unlike the dependency certification lease.

## 2. Fix

- [x] 2.1 Retry Windows `EPERM` and `EACCES` from the lock open within the existing deadline, skipping abandoned-lock reclamation for those codes.
- [x] 2.2 Add injected-failure coverage for both Windows codes and for `EPERM` staying fatal outside Windows.

## 3. Validate

- [x] 3.1 Run the focused release tests, typechecking, strict OpenSpec validation, and whitespace checks; record results in implementation evidence.
