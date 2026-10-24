## 1. Settings contract

- [ ] 1.1 Declare History scope (`unique` default, `shared` alternative) in the History section with restart application, persistence, validation, and guidance about switching without migration; cover default, stored and invalid choices in focused settings tests.
- [ ] 1.2 Update owned-settings metadata/spec parity fixtures and user-facing history-setting wording as needed without exposing the choice in `a1 pi`.

## 2. History storage selection

- [ ] 2.1 Preserve the existing shared profile path and schema; derive distinct filesystem-safe unique database, worker identity, and image-sidecar paths from stable profile and session identity with explicit input validation.
- [ ] 2.2 Wire the selected scope and stable agent session identity through composition, history service and worker, matching the selected sidecar path and applying the history limit to only the selected store.
- [ ] 2.3 Retain the disabled-persistence, session-local recall, seeded conversation fallback, and Pi comparison boundaries without cross-scope data import, deletion or migration.

## 3. Focused regressions

- [ ] 3.1 Cover isolated concurrent `a1 solo` processes and resident tabs, session resume/restart, fresh sessions/forks, Shared interoperability with the legacy path, and switching both directions without data transfer.
- [ ] 3.2 Cover per-scope image sidecars, profile/data-root isolation, failure handling, history count/byte limits, persistence-off behavior, and unchanged comparison mode.
- [ ] 3.3 Record any implementation gaps and their disposition before delivery; run only typecheck, touched focused tests, and strict OpenSpec validation before pushing implementation.
