# Implementation Validation Evidence

Recorded: 2026-10-09T11:21:14Z

## Passing evidence

- Focused background implementation run: 16 files and 290 tests passed across owned settings, the settings screen, theme parity, damage-aware terminal painting, quit outro, session-shell lifecycle, composition, and theme-boundary governance.
- Settings coverage verifies schema version 13, the preserving migration, transparent default, invalid-value fallback, unknown-key preservation, persistence and restart, live notifications, Appearance ordering, undo, and absence of Pi-settings writes.
- Theme coverage verifies transparent resolution, fixed neutral dark, arbitrary-color accent derivation, all six palette accents, truecolor output, 256-color output, and unchanged comparison projection.
- Terminal coverage verifies byte-identical transparent frames, complete and differential row painting, blank row erases, terminal-default and full SGR resets, preservation of explicit backgrounds, unsupported-frame fallback, out-of-band control isolation, cache invalidation, and terminal-default restoration after each painted frame.
- Shell and outro coverage verifies initialization before the first bare-A1 frame, live dark/accent/transparent replacement, forced repaint, subscription disposal, active-canvas outro seeding and cell clearing, final reset, and normal alternate-screen restoration.
- `npm run build`: passed.
- `npm run typecheck`: passed for source and bin projects after the build generated the expected `dist` modules.
- `npm run check:architecture`: passed, including product identity, the refreshed pinned-source provenance ledger, and terminal-host provenance. The reviewed startup graph baseline advanced from 1,573,425 to 1,579,819 source bytes for the setting, theme derivation, terminal transformation, shell wiring, and lifecycle handling.
- `npm run check:code-documentation:changed`: passed.
- `npx openspec validate customize-ui-background --strict`: passed.
- `npm run test:fast`: 371 files and 4,337 tests passed, with 14 platform/integration skips. Its sole failure was the unrelated generated-palette provenance test exceeding the shared 5-second timeout under parallel load; rerunning `test/foundation/release/installer-bootstrap.test.ts` alone passed all 21 enabled tests in 1.7 seconds.

## Full-regression observation

A direct all-suite `npx vitest run` completed 403 files and 4,728 tests successfully. Failures were Windows resource-contention and timing failures in unrelated temporary Git/filesystem, release-performance, governance subprocess, and paste scopes while the exhaustive suite ran concurrently. The one background-scope assertion exposed by that run was corrected to match the adapter's geometry-preserving blank-row invalidation, and the complete 44-test damage-aware terminal scope then passed. Repository policy leaves exhaustive and native-host gates to exact-head CI.

## Physical acceptance

The maintainer ran the rebuilt candidate from the implementation worktree in an interactive terminal and reported "tested working good" on 2026-10-09 after reviewing the implemented background behavior.

## Known gaps

No known implementation or validation gaps remain. Full regression and native-host gates remain CI-owned under repository policy.
