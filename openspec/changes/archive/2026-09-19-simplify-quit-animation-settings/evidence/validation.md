# Implementation Validation Evidence

Recorded: 2026-09-19T13:20:00Z

## Regression baseline

At the planning base the declaration, section, settings-screen, and session-shell tests asserted the previous shape: the id list contained `quitEffect` and `quitEffectDurationMs`, the sections included `Quit` between `History` and `Agent`, the `Generic` row was labeled `Exit animation`, three section jumps reached `Effect`, and the shell quit fixtures passed an effect and duration in their snapshots. Each of those assertions was replaced by the fixed-outro assertions below.

## Passing evidence

- Owned settings scopes and settings screen (`test/ui/settings`, `test/features/owned-ui/settings-app.test.ts`): the id list is `quitAnimation`, `scrollbarAppearance`, `scrollbarStyle`, `scrollbarSpeed`, `promptHistoryEnabled`, `promptHistoryMaxItems`, `promptSuggestions`; `quitAnimation` is labeled `Quit animation` in `Generic` with a description naming the fall effect; no declaration carries a `quit` section and `quitEffect`/`quitEffectDurationMs` resolve to no declaration; the migration chain is contiguous and ends at 7; the version-7 migration removes stored `quitEffect` and `quitEffectDurationMs` and passes other documents through; a version-6 document storing `dissolve` at 1200 ms resolves to version 7 with nothing preserved and `quitAnimation` at its default; a version-5 document storing `off` still resolves to `quitAnimation: false` with no effect setting; sections build as `generic`, `scroll`, `history`, `agent`; the screen shows the `Quit animation` row with `yes`, no `Quit` heading and no `Effect` or `Duration` row, the initial pointer rests on `Quit animation`, two section jumps reach `Persistent history` and a third reaches `Warnings`, and Ctrl+Home during search restores the `Generic` heading and `Quit animation` row.
- Session-shell quit outro scope (`test/app/session-shell/session-shell-lifecycle.test.ts`, `quit-outro.test.ts`): every quit fixture passes `{ enabled }` snapshots; the enabled fixture paints the fixed fall plan before the only alternate-screen leave for at least 800 ms and under 1400 ms, drops a frame forced mid-outro, and leaves the parent terminal clean; the disabled, non-interactive, pinned regular-mode, and failing-paint fixtures still show a single leave with no outro paint; the player's deterministic-plan tests are unchanged.
- Focused run of the settings, settings-screen, session-shell lifecycle, quit outro, and composition scopes: 176 of 176 tests passed.
- TypeScript project typecheck, architecture boundaries, product identity, pinned Pi ledger, terminal host provenance, naming, and code-documentation checks: passed. No new module enters the startup graph; the shell adds two constants and a type-only import.
- Build of the candidate (`npm run build`): passed.

## Physical acceptance

The user ran the built candidate `2f98049d` through `./scripts/dev` on Windows (Git Bash), reviewed the settings screen, and approved: the `Generic` section shows `Quit animation`, no `Quit` section is listed, and quitting plays the fall effect.

## Gap disposition

No known implementation or validation gaps remain. Full regression and native host gates remain CI-owned under repository policy.
