# Implementation Validation Evidence

Recorded: 2026-09-17T10:50:43Z

## Regression baseline

At the planning base the declaration, section, settings-screen, and session-shell tests asserted the previous shape: the id list began with `scrollbarAppearance`, `quitEffect` offered `off`, the sections opened on `Scroll`, the settings screen's first row was `Scrollbar mode`, and the outro was skipped for an `off` effect. Each of those assertions was replaced by the toggle-based assertions below.

## Passing evidence

- Owned settings scopes (72 tests): `quitAnimation` is the first declaration, labeled `Exit animation` in the `Generic` section with a `true` default and boolean choices; `quitEffect` offers exactly `fall`, `dissolve`, `starburst`, `waves`; the migration chain is contiguous and ends at 6; the version-6 migration maps `{ quitEffect: "off" }` to `{ quitAnimation: false }` with the stored effect removed, passes a non-`off` document through unchanged, and a version-5 document with `quitEffect: "off"` resolves to `quitAnimation: false` (stored) and `quitEffect: "fall"` (default) with no notices; sections build as `generic`, `scroll`, `history`, `quit`, `agent` with `Exit animation` in `generic`; the settings session round-trips a version-6 document.
- Settings screen (32 tests): the `Generic` heading precedes `Scroll`, the `Exit animation` row shows `yes`, the initial pointer rests on `Exit animation`, three section jumps reach `Effect`, and Home during search restores the `Generic` heading and `Exit animation` row.
- Session-shell quit outro scope (7 tests): a disabled toggle skips capture and playback with a single alternate-screen leave; an enabled toggle with the default `fall` effect paints the outro before the only leave for the full 800 ms; the existing deterministic-ordering, non-interactive, pinned regular-mode, and failing-paint fixtures pass with `enabled: true` snapshots.
- Physical review found that switching the animation off in-session and quitting flashed the prompt and footer, while a fresh session with the switch off quit cleanly: a throttled frame still queued by the renderer landed during the stop-time input drain because the presentation freeze ran only when an effect played. A new shell test queues a throttled frame, lets a 40 ms drain elapse, and asserts no frame bytes or editor text reach the terminal before the single leave; it failed before the freeze moved ahead of the outro in disposal and passes after. The tui-runtime (25 files, 225 tests) and graceful-quit process (2 tests) scopes pass against the rebuilt candidate.
- Combined ui, owned-ui feature, session-ui, composition, contracts, and startup-graph policy run: 1300 of 1301 tests passed; the one failure was `clipboard-packaged` exceeding its 5 s budget under parallel load, and it passed alone (timing, unrelated).
- TypeScript project typecheck, architecture, naming, code-documentation, and docs governance: passed. The startup graph byte baseline rose from 2633056 to 2634686 for the declaration, migration, contract field, composition snapshot, and quit-time freeze additions; the quit outro modules remain optional.

## Physical acceptance

First round: the user ran the built candidate through `./scripts/dev` and reported that switching the animation off in-session and quitting flashed the status bar and prompt, while relaunching with the switch off quit immediately; fixed as described above. Second round: the user ran the rebuilt candidate (with the quit-time freeze) through `./scripts/dev` on Windows (Git Bash) and confirmed the `Generic` section opens the settings screen, switching `Exit animation` off in-session quits immediately without a flash, and switching it back on restores the effect, reporting "tested 461 works good".

## Gap disposition

No known implementation or validation gaps remain. Full regression and native host gates remain CI-owned under repository policy.
