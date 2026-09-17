# Implementation Validation Evidence

Recorded: 2026-09-17T08:16:12Z

## Regression baseline

At the planning base the existing session-shell exit tests asserted the old behavior: `exit answer` and the pinned runtime's `\r\x1b[2K` document rows followed the alternate-screen leave for bare A1. After the change those assertions failed as expected and were replaced by the clean-parent assertions below; the same bytes are what the user's screenshot showed.

## Passing evidence

- Session-shell exit scope (13 tests): bare A1 leaves exactly one `\x1b[?1049h`/`\x1b[?1049l` pair, the parent slice after the leave contains no transcript text, no `\x1b[2K` row clears, and no printable text other than the dim resume hint; the comparison profile in fullscreen `transcript` mode still prints the styled transcript before the hint without a frame dump; `/quit`, the second `Ctrl+C`, and disposal failures still restore the terminal.
- Quit outro ordering: with a deterministic clock and seed, the outro's synchronized paints begin after the last pinned frame and end with a blank-screen block before the only leave; a render forced from inside the outro's sleep seam never reaches the terminal; `off`, a non-interactive terminal, the pinned regular-mode profile, and a throwing outro write all skip the effect while restoring normally.
- Outro unit scope (15 tests): all four effects plan deterministically for a fixed seed, stay inside the captured row and column bounds, keep sparkle and clear schedules sorted, clear every visible cell and every sparkle, clamp 300–2000 ms, stop at the tick ceiling when the clock does not advance, and propagate write failures.
- Runtime adapter scope (26 tests): frozen presentation drops renderer frames while control writes and the stop sequence pass; `preserveScreen` leaves the alternate screen without the last document, and the default stop still dumps it for callers that want it.
- Damage-aware terminal scope (41 tests): `presentedRows()` returns rows as written with styling intact, empties rows the adapter has not seen at the current geometry, and forgets rows after a full clear.
- Owned settings scopes (98 tests) and settings screen (32 tests): `quitEffect` and `quitEffectDurationMs` declare the `Quit` section with `fall` and 800 defaults, the settings version advanced to 5 with a no-op migration, section jumps and rows include `Effect` and `Duration`, and the `fullscreenExitOutput` row is absent from bare A1.
- Graceful-quit process scope: `/quit` and double `Ctrl+C` exit zero with a retained extension handle and restore alternate-screen and mouse modes.
- Combined session-ui, owned-ui, ui, tui-runtime, and composition run: 985 tests passed. Engine, component, and contract suites: 913 passed; one editor paste test failed once under parallel load and passed alone (timing, unrelated).
- TypeScript project typecheck, architecture, naming, code-documentation, and docs governance: passed. The startup graph byte baseline rose from 2624606 to 2631862 for the shell, runtime, adapter, contract, and settings additions plus the editor bytes that reached `develop` in #451 without a baseline update; the outro modules are registered as optional and load only at quit.

## Physical acceptance

The user ran the rebuilt candidate through `./scripts/dev` on Windows (Git Bash) and confirmed the quit effect plays over the last frame and the parent terminal is left clean, reporting "tested working good".

## Gap disposition

No known implementation or validation gaps remain. Full regression and native host gates remain CI-owned under repository policy.
