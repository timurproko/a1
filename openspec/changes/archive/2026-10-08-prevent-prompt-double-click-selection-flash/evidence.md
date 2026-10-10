# Implementation evidence

## Result

- Ordinary prompt presses remain pending editor gestures until release or distinct motion, so complete-frame selection cannot paint an intermediate word or full-row range while a click is still held.
- No-drag single-, double-, and triple-click sequences replay once through the editor and retain its caret, word, and logical-line text boundaries.
- Distinct motion promotes from the original prompt cell into the existing complete-frame drag path without inheriting a frame multi-click count; cross-row selection, auto-scroll, and copy-on-select remain available.
- Transcript multi-click selection, modal and control ownership, right-click paste, regular mode, and the `a1 pi` comparison profile are unchanged.

## Validation

- `npm run build` — passed for the implementation candidate.
- `npm run typecheck` — passed for source and bin projects.
- `npm run check:architecture` — passed after re-pinning the merged reviewed eager graph at 160 files / 1,580,871 source bytes; the Pi public artifact remains 2,088 files / 9,957,089 evaluated bytes.
- `npx vitest run test/app/session-shell/session-viewport-controller.test.ts test/app/session-shell/session-shell-selection.test.ts test/ui/components/transcript-viewport.test.ts` — 3 files and 190 tests passed, including intermediate held-click paint, editor replay, prompt drag promotion, transcript selection, and viewport selection geometry.
- Strict OpenSpec validation and `git diff --check` — passed.

## Known gaps

None.
