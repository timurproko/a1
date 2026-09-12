## 1. History root selection

- [ ] 1.1 Select `<effective-home>/.a1/data` for default history using A1's existing effective-home policy; verify focused path tests cover Windows, Linux, macOS, `A1_PROFILE_HOME`, and `XDG_DATA_HOME` not redirecting default history.
- [ ] 1.2 Preserve explicit `A1_DATA_DIR` precedence and normalization; verify tests cover custom roots, existing relative-override behavior, and no access to the home default when an override is selected.
- [ ] 1.3 Wire the selected root into the existing history service without changing global product paths, the profile digest, or schema; verify composition/path tests show unchanged control/runtime/release/cache roots, stable same-profile filenames, and isolation of different profiles.

## 2. Focused regression coverage

- [ ] 2.1 Verify a fresh default store remains empty despite a populated old-location fixture, with no old-store probes, reads, writes, import, or deletion; add a root-failure case proving no fallback and preserved local recall.
- [ ] 2.2 Verify disabled persistence and the Pi comparison do not initialize or access either A1 default history store, while enabled history commits and reloads from the new root across service restarts.
- [ ] 2.3 Verify supported owner protections at the new root and ensure lifecycle cleanup leaves history and sidecars untouched; use existing retention, concurrency, and worker tests as regression coverage rather than changing their behavior.

## 3. Documentation and acceptance

- [ ] 3.1 Update the history storage documentation, relevant architecture path/ownership descriptions, and README; verify they agree on the new default, retained override, unchanged other data locations, no migration or automatic deletion, and persistence across ordinary upgrades and npm reinstall.
- [ ] 3.2 Verify the implementation contains only the planned path/wiring change, focused coverage, and documentation, with no migration or cleanup machinery; record strict OpenSpec validation and the required CI result.
- [ ] 3.3 Provide a focused manual acceptance handoff and record the maintainer's result: new prompts create the home-based profile database and remain recallable after restart, while the old location is untouched. Use the approved build-first development launcher for interactive checkout testing.

The maintainer's one-time removal of the old local profile database and matching sidecars is a separate post-switch cleanup after all users of that store have stopped. It is not an implementation task or an application feature.
