# Implementation evidence

## Result

- A selection whose fixed gesture anchor begins on transcript content is clipped to the current transcript rectangle for paint, selected text, copyability, and immutable visible-frame copy capture.
- Upward or downward edge scrolling and direct pointer motion into the editor/footer cannot expand that transcript-originated selection beyond the content boundary, including at the document limit.
- A gesture begun on a dock row retains its prior complete-frame behavior, so editor-originated interaction remains available independently.
- Dock height changes recompute the clipping boundary in the same frame and do not retain stale dock selection paint.
- Existing scrollbar-edge selection, wide/combining grapheme handling, source styling, selection cadence, modal ownership, and the pinned `a1 pi` route remain unchanged.

## Reference analysis

`D:/Git/claude-code-source` keeps fullscreen selection in screen-buffer coordinates while `ScrollBox` exposes a separate viewport top and height. Its drag-scroll path captures outgoing rows and shifts the content anchor only within those bounds. A1 retains semantic row anchors instead, so the implemented equivalent derives region ownership from the fixed gesture anchor and applies a bounded visible projection rather than adopting Claude Code's screen-row accumulator.

## Local validation

- `npm run build` — passed.
- `npx vitest run test/ui/components/transcript-viewport.test.ts` — 49 tests passed.
- `npx vitest run test/app/session-shell/session-viewport-controller.test.ts` — 65 tests passed.
- `npx vitest run test/app/session-shell/session-shell-selection.test.ts` — 70 tests passed, including decoded final terminal-cell containment.
- `npx vitest run test/ui/components/text-selection.test.ts test/ui/components/selection-scrollbar-edge.test.ts` — 2 files and 28 tests passed.
- `npm run typecheck` — passed.
- `npm run check:architecture` — passed, including the startup source-byte budget.
- `npm run check:code-documentation:changed` — passed.
- `npx openspec validate constrain-selection-to-content --strict` — passed.
- `git diff --check` — passed.

## Manual handoff

Build with `npm run build`, launch with `./scripts/dev`, and use a session long enough to scroll. Start a selection in transcript content, drag downward through the prompt and footer, and confirm the blue selection stops at the content boundary even when the pointer is held there or the document reaches its end. Start a separate selection in the editor/footer and confirm dock-originated interaction remains available.

## Known gaps

None. Physical Windows Terminal confirmation of the content/dock boundary and selection color is the prepared maintainer handoff; deterministic viewport, controller, shell, copy, gesture-origin, dock-resize, and terminal-cell behavior is covered locally.
