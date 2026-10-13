# Implementation evidence

## Coverage

- The normal A1 profile resolves one shared `<effective-home>/.a1/agent/settings.json`; Pi settings remain at the root and product values are direct properties of the identity-derived `a1` object.
- Namespace updates use the lock protocol used by pinned Pi, reread while locked, replace atomically, preserve unrelated root and product properties, remove declared defaults, and refuse malformed or colliding shapes.
- `OwnedSettingsManager` and resident-tabs preflight read the same flat object. The former versioned standalone document is a read-only fallback while the object is absent and is imported on the next accepted product change.
- Metadata-free compatibility transforms are idempotent and shape-selected. Ambiguous legacy/current combinations fail closed without changing bytes.
- File-backed tests cover pinned Pi setters and package-list persistence, product changes, simultaneous independent-process writers, fresh-manager restart, simulated release replacement, default removal, malformed data, collision refusal, and lazy legacy import.

## Local validation

All commands ran on Windows x64 in `E:/Git/a1/.worktrees/persistent-user-settings`.

- `npm run build` — passed.
- `npm run typecheck` — passed.
- Focused settings, resident-tabs, and collision suite — 8 files / 120 tests passed.
- `npx vitest run test/foundation/release/update-launch.test.ts` — 1 file / 19 tests passed.
- `npm run test:pi-engine-conformance` — 3 files / 24 tests passed.
- Focused package contracts and integration — 4 files / 40 tests passed.
- `npm run check:architecture` — passed all architecture, identity, pinned-Pi provenance, and terminal-host checks.
- `npm run check:deprecated` — passed lockfile and registry dependency policy.

## Manual restart handoff

1. Build with `npm run build` and launch with `./scripts/dev`.
2. Change one Pi-backed setting and at least two A1-owned settings, then exit normally.
3. Confirm `.a1/agent/settings.json` under the effective profile home contains the Pi choice at the root and non-default A1 choices directly under `a1`, with no `version` or `values` wrapper.
4. Relaunch, verify the choices, restore one A1 choice to its default, exit, and confirm that property is absent while all remaining choices persist.

## Known-gap disposition

No known implementation or automated-coverage gaps remain. The interactive terminal restart check above is intentionally left as maintainer acceptance evidence; automated restart, update/reinstall, package persistence, and concurrent-writer contracts passed locally.
