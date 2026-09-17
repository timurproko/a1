# Implementation Validation Evidence

Recorded: 2026-09-17T10:50:43Z

## Regression baseline

At the planning base the declaration, section, settings-screen, and session-shell tests asserted the previous shape: the id list began with `scrollbarAppearance`, `quitEffect` offered `off`, the sections opened on `Scroll`, the settings screen's first row was `Scrollbar mode`, and the outro was skipped for an `off` effect. Each of those assertions was replaced by the toggle-based assertions below.

## Passing evidence

- Owned settings scopes (72 tests): `quitAnimation` is the first declaration, labeled `Exit animation` in the `Generic` section with a `true` default and boolean choices; `quitEffect` offers exactly `fall`, `dissolve`, `starburst`, `waves`; the migration chain is contiguous and ends at 6; the version-6 migration maps `{ quitEffect: "off" }` to `{ quitAnimation: false }` with the stored effect removed, passes a non-`off` document through unchanged, and a version-5 document with `quitEffect: "off"` resolves to `quitAnimation: false` (stored) and `quitEffect: "fall"` (default) with no notices; sections build as `generic`, `scroll`, `history`, `quit`, `agent` with `Exit animation` in `generic`; the settings session round-trips a version-6 document.
- Settings screen (32 tests): the `Generic` heading precedes `Scroll`, the `Exit animation` row shows `yes`, the initial pointer rests on `Exit animation`, three section jumps reach `Effect`, and Home during search restores the `Generic` heading and `Exit animation` row.
- Session-shell quit outro scope (6 tests): a disabled toggle skips capture and playback with a single alternate-screen leave; an enabled toggle with the default `fall` effect paints the outro before the only leave for the full 800 ms; the existing deterministic-ordering, non-interactive, pinned regular-mode, and failing-paint fixtures pass with `enabled: true` snapshots.
- Combined ui, owned-ui feature, session-ui, composition, contracts, and startup-graph policy run: 1300 of 1301 tests passed; the one failure was `clipboard-packaged` exceeding its 5 s budget under parallel load, and it passed alone (timing, unrelated).
- TypeScript project typecheck, architecture, naming, code-documentation, and docs governance: passed. The startup graph byte baseline rose from 2633056 to 2634243 for the declaration, migration, contract field, and composition snapshot additions; the quit outro modules remain optional.

## Physical acceptance

Pending: hand off the built candidate for a check that `Generic` opens the settings screen, turning `Exit animation` off returns to the terminal immediately on `/quit` and the second `Ctrl+C`, and turning it back on restores the effect.

## Gap disposition

No known implementation or validation gaps remain beyond the pending physical check. Full regression and native host gates remain CI-owned under repository policy.
