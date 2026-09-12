## 1. History root selection

- [x] 1.1 Select `<effective-home>/.a1/data` for default history using A1's existing effective-home policy; verify focused path tests cover Windows, Linux, macOS, `A1_PROFILE_HOME`, and `XDG_DATA_HOME` not redirecting default history.
- [x] 1.2 Preserve explicit `A1_DATA_DIR` precedence and normalization; verify tests cover custom roots, existing relative-override behavior, and no access to the home default when an override is selected.
- [x] 1.3 Wire the selected root into the existing history service without changing global product paths, the profile digest, or schema; verify composition/path tests show unchanged control/runtime/release/cache roots, stable same-profile filenames, and isolation of different profiles.

## 2. Focused regression coverage

- [x] 2.1 Verify a fresh default store remains empty despite a populated old-location fixture, with no old-store probes, reads, writes, import, or deletion; add a root-failure case proving no fallback and preserved local recall.
- [x] 2.2 Verify disabled persistence and the Pi comparison do not initialize or access either A1 default history store, while enabled history commits and reloads from the new root across service restarts.
- [x] 2.3 Verify supported owner protections at the new root and ensure lifecycle cleanup leaves history and sidecars untouched; use existing retention, concurrency, and worker tests as regression coverage rather than changing their behavior.

## 3. Documentation and acceptance

- [x] 3.1 Update the history storage documentation, relevant architecture path/ownership descriptions, and README; verify they agree on the new default, retained override, unchanged other data locations, no migration or automatic deletion, and persistence across ordinary upgrades and npm reinstall.
- [ ] 3.2 Verify the implementation contains only the planned path/wiring change, focused coverage, and documentation, with no migration or cleanup machinery; record strict OpenSpec validation and the required CI result.
- [ ] 3.3 Provide a focused manual acceptance handoff and record the maintainer's result: new prompts create the home-based profile database and remain recallable after restart, while the old location is untouched. Use the approved build-first development launcher for interactive checkout testing.

The maintainer's one-time removal of the old local profile database and matching sidecars is a separate post-switch cleanup after all users of that store have stopped. It is not an implementation task or an application feature.

## Implementation evidence

- Focused path/composition tests cover all platform defaults, effective-home/data overrides, stable identities, old-store preservation, failed persistence with retained local recall, and disabled/comparison guards.
- Existing history store/service/concurrency tests and the focused release-cleanup preservation case pass locally; TypeScript typechecking, build, architecture boundaries, code-documentation governance, and strict OpenSpec validation pass.
- The first CI run stopped before tests because the toolchain documentation insertion shifted line-bound legacy identity approvals. Moving the new history subsection below those unchanged occurrences fixes the failure without changing approvals; the complete `npm run check:architecture` command passes locally.
- The next CI run reached the fast tests: 1,983 passed and two governance tests failed. The history boundary assertion now requires the history-specific resolver while retaining the configuration-root and feature-isolation checks; the semantic identifier inventory matches the scanner's four new test references and three shifted line numbers, preserving the historical cleanup baseline. Both reproduced failures plus the path/composition cases pass locally (24 tests) with CI-style data-root overrides; full architecture checks and typechecking also pass.
- Required CI on the corrected revision and the maintainer's manual acceptance remain pending. No real user history has been deleted.
