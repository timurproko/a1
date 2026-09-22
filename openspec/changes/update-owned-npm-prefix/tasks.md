## 1. Establish ownership and compatibility baselines

- [ ] 1.1 Map active-root lookup, canonical package containment, protected replacement, recovery-capsule validation, and launcher restoration across Windows and Unix layouts; verify the map separates the active npm acquisition root from the invoked installation root.
- [ ] 1.2 Add failing deterministic fixtures for an exact npm package under a confirmed non-default prefix, an unconfirmed lookalike root, a local checkout, and a linked canonical target; verify every rejected case stops before transaction or installation work.

## 2. Resolve the invoked npm installation

- [ ] 2.1 Implement platform-aware prefix derivation and exact canonical package-path comparison for `@timurproko/a1`; verify active-default installations retain the fast path and broad containment is not accepted.
- [ ] 2.2 Confirm a candidate non-default global root through active npm using fixed arguments and canonical equality; verify query failures, malformed output, path mismatch, and case/path edge cases fail closed.
- [ ] 2.3 Carry separate active npm acquisition and selected installation authorities through self-update; verify a confirmed mismatch selects the invoked package root and launcher set without creating an active-prefix installation.

## 3. Pin protected replacement and recovery

- [ ] 3.1 Invoke package replacement with the explicit prefix derived from the selected global root and the exact resolved target; verify foreground seams and production protected replacement use identical destination arguments.
- [ ] 3.2 Update recovery-capsule creation and both parent/worker validators to bind the derived prefix while resolving npm from the active acquisition root; verify arbitrary prefix, root, package, launcher, npm executable, and argument tampering is rejected.
- [ ] 3.3 Preserve read compatibility for the one exact existing unprefixed capsule form and emit only explicit-prefix capsules; verify interrupted, concurrent, canceled, failed, and updater-loss flows restore or retain launchers only in the selected prefix.

## 4. Validate update behavior

- [ ] 4.1 Extend self-update unit and transition tests for active-prefix success, confirmed non-default-prefix success, actionable unmanaged refusal, npm lookup failure, and exact fixed npm arguments.
- [ ] 4.2 Extend packaged replacement fixtures to exercise non-default-prefix installation and cancellation-safe recovery on supported Windows and Unix layouts; verify target activation and launcher postconditions remain unchanged.
- [ ] 4.3 Run focused typecheck/update/recovery/package validation selected by repository policy and record exact-head CI evidence; verify no command, progress, channel, activation, session-continuity, or user-data behavior regresses.
- [ ] 4.4 Hand off the exact candidate for an update from a legacy npm prefix while a different FNM prefix is active; verify the invoked installation reaches the selected development version without manual reinstall, duplicate installation, or unmanaged-root warning.
