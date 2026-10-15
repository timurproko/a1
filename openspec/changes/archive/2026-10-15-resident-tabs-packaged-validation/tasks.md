# Tasks

Repair of the `0.2.7-dev.750` publication failure and the validation gap that hid it (see `design.md`).

## 1. Interactive-terminal routing

- [x] 1.1 Add the `no interactive terminal` fallback reason and the `interactive` routing input per Decision 1; bootstrap passes both standard streams' terminal state with an `interactiveTerminal` seam.
- [x] 1.2 Extend `test/foundation/resident-tabs/resident-tabs.test.ts`: a non-interactive bare launch falls back with that reason and never calls `ensureHost`.

## 2. Release host in validation candidates

- [x] 2.1 Move scope expansion to dependency-free `scripts/release/validation-scopes.mjs`, used by `createTierPlan` and by `resolve-validation-job.mjs`, which emits `packs_candidate`; cover it in `test/repository-governance/validation-scopes.test.ts`.
- [x] 2.2 Build the release terminal host before the build receipt in `ci.yml` packing lanes and both Full regression packing jobs per Decision 2; `test/repository-governance/validation-receipt-workflows.test.ts` pins step order, conditions, and cache key.
- [x] 2.3 Fail validation packing on CI without this platform's verified native artifacts per Decision 3.

## 3. Evidence

- [x] 3.1 Record focused local tests and a green `npm run preflight` in `implementation-evidence.md`.
- [x] 3.2 Record a diagnostic Development validation run on this branch with resident-routing scope selected, showing the packed candidate carries the terminal host and the session-resume suite passes on Windows, Linux, and macOS.
