# Implementation Evidence

## Delivered behavior

- On Windows, the cohort state lock retries `EPERM` and `EACCES` from its exclusive open within the existing 5-second deadline instead of aborting the update.
- On other platforms both codes stay fatal. `EEXIST` handling, abandoned-lock reclamation, and the deadline are unchanged.

## Validation

- `npx vitest run test/foundation/release/cohort-state-lock.test.ts test/foundation/release/cohort-state.test.ts test/foundation/release/release-gc.test.ts` — passed: 33 tests across 3 files.
- With the `acquireLock` change reverted, `test/foundation/release/cohort-state-lock.test.ts` fails both Windows cases (2 of 3 tests).
- `npm run typecheck` — passed.
- `npx openspec validate fix-cohort-lock-windows-contention --strict --no-interactive` — passed.
- `git diff --check` — passed.

## Known gaps

The real sharing violation needs an outside handle, such as real-time scanning, on the deleted lock file. A local NTFS volume deletes immediately, so the race is covered by injected failures rather than reproduced. The next stable candidate validation run exercises it on the Windows runner.
