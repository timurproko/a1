## 1. Shared update ownership

- [ ] 1.1 Add a cross-process update execution lease that binds canonical installation, owner identity, channel, target, and execution mode, and safely reclaims only verified dead ownership.
- [ ] 1.2 Make explicit and automatic self-update entry points acquire the same lease before package mutation, with clear live-owner and conflicting-target outcomes.
- [ ] 1.3 Cover concurrent automatic workers, automatic/manual overlap, stale-owner recovery, malformed lease state, and conflicting targets.

## 2. Automatic update coordinator

- [ ] 2.1 Add bounded atomic automatic-update state under the A1 data directory with running, installed, failed, cooldown, and observer semantics.
- [ ] 2.2 Add an immutable detached worker entry that validates the selected release's recorded npm package root and exact discovered target before invoking the shared updater with ignored terminal I/O.
- [ ] 2.3 Add exact-target automatic mode to the shared updater without changing public command parsing or named-preview behavior.
- [ ] 2.4 Refuse automatic mutation when the live cohort is not running from a verified immutable release, while preserving explicit update behavior.
- [ ] 2.5 Reuse existing recovery, rollback, activation, warmup, and cleanup guarantees, and verify installed state against the approved active cohort before recording success.
- [ ] 2.6 Cover detached continuation, interrupted transaction resumption, cooldown behavior, newer-target override, permission/replacement failure silence, and non-disruptive legacy refusal.

## 3. Startup integration and restart readiness

- [ ] 3.1 Route startup discovery by `Update check` mode: post-first-frame silent installation for `Automatic`, the existing availability popup for `Yes`, and no cache or network work for `No`.
- [ ] 3.2 Let concurrent and already-running sessions observe shared update completion and announce readiness only when the active approved release is newer than their executing version.
- [ ] 3.3 Add a semantic installed-update state and compact `Update installed · Restart to update` status for automatic paths while retaining current release-update diagnostics and banners for `Yes` mode.
- [ ] 3.4 Preserve working-status visibility, editor geometry, transcript stability, narrow-terminal behavior, and session disposal while update state changes asynchronously.
- [ ] 3.5 Cover stable and development channels, cached and fetched discovery, late completion, concurrent observers, explicit-update completion, no-update/failure cases, and restart removal.

## 4. Settings and documentation

- [ ] 4.1 Expand `Update check` to `Automatic`, `Yes`, and `No`, default new or unspecified profiles to `Automatic`, and migrate stored booleans to matching `Yes` or `No` behavior.
- [ ] 4.2 Update README guidance to describe all three modes, silent installation, restart readiness, opt-outs, and retained manual/version-specific commands.
- [ ] 4.3 Update settings, migration, command, and documentation coverage for the new default and preserved yes/no behavior.
