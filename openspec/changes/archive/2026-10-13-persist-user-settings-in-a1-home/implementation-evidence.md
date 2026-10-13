# Implementation evidence

## Coverage

- The normal A1 profile resolves one shared `<effective-home>/.a1/agent/settings.json`; Pi settings remain at the root and product values are direct properties of the identity-derived `a1` object.
- Namespace updates use the lock protocol used by pinned Pi, reread while locked, replace atomically, preserve unrelated root and product properties, remove declared defaults, and refuse malformed or colliding shapes.
- `OwnedSettingsManager` and resident-tabs preflight read the same flat object. The former versioned standalone document is a read-only fallback while the object is absent and is imported on the next accepted product change.
- Metadata-free compatibility transforms are idempotent and shape-selected. Ambiguous legacy/current combinations fail closed without changing bytes.
- File-backed tests cover pinned Pi setters and package-list persistence, product changes, simultaneous independent-process writers, fresh-manager restart, simulated release replacement, default removal, malformed data, collision refusal, and lazy legacy import.
- Before Pi starts, bounded stray leading bytes around one complete root object are removed through the shared lock and atomic replacement path. Body, trailing, non-object, ambiguous, and oversized corruption remains byte-identical.
- The Settings footer always renders shortcut hints. Failed scalar and structured changes still roll back, and failed undo remains retryable, without replacing the footer with transient text.

## Local validation

All commands ran on Windows x64 in `E:/Git/a1/.worktrees/persistent-user-settings`.

- `npm run test:fast` — passed candidate build, typecheck, changed-code documentation, 412 test files, and 4,826 tests (14 platform skips).
- Focused repair, manager, resident-preflight, and Settings footer suite — 4 files / 104 tests passed.
- `npm run test:pi-engine-conformance` — 3 files / 24 tests passed.
- Focused package contracts and integration — 4 files / 40 tests passed.
- `npm run check:architecture` — passed all architecture, identity, pinned-Pi provenance, and terminal-host checks after refreshing the startup graph baseline.
- `npm run check:names` — passed the full 1,214-file naming audit with zero violations.
- `npm run check:deprecated` — passed lockfile and registry dependency policy.
- Strict validation passed for both the archived change in an isolated active copy and the changed `owned-ui-settings` specification.
- `cargo fmt --manifest-path native/terminal-host/Cargo.toml -- --check` — passed after aligning the Windows crash-recovery assertion's 20-second deadline with the runtime's 40-second start-gate bound. The exact native integration remains CI-only on Windows by repository policy; two prior exact-head attempts failed at that shorter assertion while all other selected lanes passed.

## Manual restart handoff

1. Build with `npm run build` and launch with `./scripts/dev`.
2. Change one Pi-backed setting and at least two A1-owned settings, then exit normally.
3. Confirm `.a1/agent/settings.json` under the effective profile home contains the Pi choice at the root and non-default A1 choices directly under `a1`, with no `version` or `values` wrapper.
4. Relaunch, verify the choices, restore one A1 choice to its default, exit, and confirm that property is absent while all remaining choices persist.

## Known-gap disposition

No known implementation or automated-coverage gaps remain. Repository-wide strict OpenSpec validation still reports the pre-existing placeholder Purpose in `resident-tab-reliability`; the changed `owned-ui-settings` specification passes strict validation. The interactive terminal restart check above is intentionally left as maintainer acceptance evidence; automated restart, repair, update/reinstall, package persistence, and concurrent-writer contracts passed locally.
