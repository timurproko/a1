# Tasks

## 1. Default and active-theme alignment

- [x] 1.1 Put blue first and make it the declared Accent color default without losing explicit stored choices or the legacy `default` to purple compatibility rule.
- [x] 1.2 Align the initial bare-A1 theme projection with the blue default and keep `a1 pi` untouched.
- [x] 1.3 Add focused Settings, migration, live-repaint, and profile-restart regressions for blue defaults and all explicit choices.

## 2. Safe pre-load profile accent

- [x] 2.1 Add bounded read-only resolution of the effective global profile's saved accent for early surfaces, including alternate profile home, legacy shape, invalid input, and missing-file fallback.
- [x] 2.2 Color the startup trust dialog heading, cursor, and border from the resolved semantic family without reading project resources; keep comparison and trust input/restore behavior unchanged.
- [x] 2.3 Add trust and preflight tests for early profile isolation, theme modes, invalid settings, and untrusted project attempts to override the color.

## 3. Installation and update meters

- [x] 3.1 Replace pinned-purple generated meter constants with release-owned named A1 palette data, blue fallback, and a checkable palette synchronization path.
- [x] 3.2 Resolve and apply the global profile accent to self-update progress without running the agent or changing meter/cancellation behavior.
- [x] 3.3 Resolve and apply the same profile accent in the dependency-free standalone installer, including fresh and delegated update paths.
- [x] 3.4 Add focused meter, packaging, profile fallback, cross-package palette, TTY/non-TTY, and terminal cleanup regressions.

## 4. Focused completion evidence

- [x] 4.1 Run typecheck, affected tests, and strict OpenSpec validation; record outcomes and dispose of any known gaps.
- [x] 4.2 Review the final diff for project-resource reads, installer runtime dependencies, global color leaks, hard-coded purple, comparison changes, and altered terminal transcript/geometry.

## Evidence

- `npm run typecheck` passed; the source startup graph and architecture boundary check passed after repinning only the two-module first-prompt color cost.
- Focused Settings, theme, trust, installer, updater, launch color, shared-setting watch, and governance tests: 303 passed, 2 pre-existing platform skips across 14 files.
- `node --import tsx scripts/pi/sync-progress-palette.ts --check` and `npx --no-install openspec validate consistent-startup-accent --strict` passed.
- Profile fixtures cover explicit named colors, legacy `default` to purple, invalid/unreadable/oversized input, isolation from untrusted project settings, and byte-equivalent named palettes in trust, update, and installer.
- Known-gap disposition: a previously omitted purple default has no stored provenance; as approved, it becomes blue on upgrade. Explicit purple (including legacy `default`) remains purple. No other known gap.
- Diff review: no project resource read before trust, installer remains Node-builtins-only, no comparison palette changes, and progress transcript geometry/neutral roles remain unchanged.
