## 1. Exact-session name API

- [x] 1.1 Add additive name/revision snapshots, strict session.rename requests, capability discovery and acknowledged response validation.
- [x] 1.2 Bind manual compare-and-apply naming through the neutral port and owning engine persistence, preserving exact-runtime fences and automatic-name ownership rules.
- [x] 1.3 Add focused protocol/runtime/naming/reporting fixtures and public API documentation for conflicts, supported values and unknown outcomes.

## 2. Generic A1 plugin feature settings

- [ ] 2.1 Present the external canonical Herdr plugin as A1 with a master switch and independent Match space color / Sidebar rename toggles, retaining stable IDs and legacy preference behavior.
- [ ] 2.2 Gate startup/live color work and sidebar renaming independently without gating native A1 → Herdr name updates, including stale callbacks, and extend preference snapshot validation without exporting runtime state.
- [ ] 2.3 Add external plugin/preference fixtures and record canonical source ownership and actual diff separately from this repository.

## 3. Sidebar renaming with preserved native name updates

- [ ] 3.1 Add a generic plugin-owned agent-menu contribution and native Rename input UI for eligible A1 agents, preserving existing Pin/Close behavior.
- [ ] 3.2 Extend the shared client and bounded worker for authoritative name reads and guarded local/remote renames, with captured identity, revision, expiry and error handling.
- [ ] 3.3 Route API renames through existing manual-name notifications without adding a second name-sync/display path; add native-update regression checks with plugin/features disabled and stale/conflict/cancel/routing fixtures.
- [ ] 3.4 Document coordinated rollout and actual source/build/deployment state, including explicit remaining compatibility or UI-inspection gaps.
