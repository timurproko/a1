# Implementation evidence

## Result

- Copied-character acknowledgement is composed as paint-only frame feedback immediately above the input. Its appearance, replacement, and expiry leave transcript/dock allocation, visible document range, editor/footer geometry, and pointer regions unchanged.
- Complete-frame selection now retains document, pinned-dock, or fixed-frame row provenance for each endpoint. Followed agent output carries document selection with its source while footer/status selection remains pinned and mixed ranges project each endpoint independently.
- Creating selection no longer detaches an otherwise followed viewport. Explicit wheel and keyboard navigation, edge auto-scroll cadence, grapheme boundaries, copy capture, modal ownership, and reset behavior remain intact.
- Document-source replacement clears an ambiguous retained selection instead of transferring its highlight to unrelated cells. Off-screen document anchors clip to the visible frame without scanning transcript history.
- Bare-A1 frame composition owns the behavior; the pinned `a1 pi` and regular terminal-selection paths remain unchanged.

## Local validation

- `npm run build` — passed.
- `npm run typecheck` — passed.
- `npm run check:architecture` — passed, including the intentionally re-pinned startup graph at 157 files / 1,507,402 source bytes.
- `npm run check:code-documentation` — passed.
- `npm run check:docs-governance` — passed.
- `npx vitest run test/ui/components/transcript-viewport.test.ts test/ui/components/selection-copy.test.ts test/app/session-shell/session-viewport-controller.test.ts test/app/session-shell/session-shell-selection.test.ts --maxWorkers=1` — 4 files and 189 tests passed.
- `npx vitest run test/app/session-shell/session-shell-paste.test.ts -t "leaves Pi fullscreen selection and copying available in the comparison profile"` — the focused `a1 pi` comparison test passed.
- `openspec validate stabilize-copy-feedback-and-selection --strict` — passed.
- `git diff --check` — passed.

## Known gaps

- No implementation gap is known. Interactive Windows Terminal review of the exact candidate remains for maintainer acceptance; local terminal replay does not claim that visual decision.
