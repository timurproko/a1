# Implementation evidence

## Result

- A selection whose fixed gesture anchor begins on transcript content is clipped to the current transcript rectangle for paint, selected text, copyability, and immutable visible-frame copy capture.
- Upward or downward edge scrolling and direct pointer motion into the editor/footer cannot expand that transcript-originated selection beyond the content boundary, including at the document limit.
- A gesture begun on a dock row retains its prior complete-frame behavior, so editor-originated interaction remains available independently.
- Dock height changes recompute the clipping boundary in the same frame and do not retain stale dock selection paint.
- A pinned sticky prompt is excluded as chrome: a press on it creates no selection anchor, and a crossing range neither paints nor copies it. The row keeps the anchor of the source row hidden beneath it, so that source clips exactly like an off-screen row. The same prompt remains selectable at its ordinary document row.
- Retained endpoints keep projecting from their source rows, so a selection shrinks and then disappears as those rows scroll above or below the content frame, and never transfers to the sticky prompt or dock rows.
- The scroll-to-bottom control is repainted above a selected row, and its label cells are blanked from visible-frame copy. Transcript cells beside it stay selected.
- Edge auto-scroll moves the declared one, two, or three rows per 30-millisecond tick. Previously it reused the wheel distance of three, six, or nine rows. Downward auto-scroll starts only below the final content row, so that row can be selected without the view moving.
- Only a transcript-originated selection starts edge auto-scroll. A selection or click beginning on the editor or footer leaves the transcript position unchanged.
- The startup graph baseline is repinned from 1512675 to 1513661 source bytes for the reviewed control, pacing, and trigger code.
- Existing scrollbar-edge selection, wide/combining grapheme handling, source styling, selection cadence, modal ownership, and the pinned `a1 pi` route remain unchanged.

## Reference analysis

`D:/Git/claude-code-source` keeps fullscreen selection in screen-buffer coordinates while `ScrollBox` exposes a separate viewport top and height. Its drag-scroll path captures outgoing rows and shifts the content anchor only within those bounds. A1 retains semantic row anchors instead, so the implemented equivalent derives region ownership from the fixed gesture anchor and applies a bounded visible projection rather than adopting Claude Code's screen-row accumulator.

## Local validation

- `npm run build` — passed.
- `npx vitest run test/ui/components/transcript-viewport.test.ts` — 52 tests passed, including the pinned-sticky alias exclusion, the above/below scroll-out cases, and the control floating above selection. Against the prior implementation, the alias and scroll-above cases fail.
- `npx vitest run test/app/session-shell/session-viewport-controller.test.ts` — 66 tests passed, including final-row selection without auto-scroll, one-row edge ticks, and a still transcript during dock-originated selection. Without the fix, that dock case scrolls three rows.
- `npx vitest run test/ui/components/scrollbar.test.ts` — 20 tests passed.
- `npx vitest run test/app/session-shell/session-shell-selection.test.ts` — 70 tests passed, including decoded final terminal-cell containment.
- `npx vitest run test/ui/components/text-selection.test.ts test/ui/components/selection-scrollbar-edge.test.ts` — 2 files and 28 tests passed.
- `npm run typecheck` — passed.
- `npm run check:architecture` — passed, including the startup source-byte budget after the recorded repin.
- `npm run check:code-documentation:changed` — passed.
- `npx openspec validate constrain-selection-to-content --strict` — passed.
- `git diff --check` — passed.

## Manual handoff

Build with `npm run build`, launch with `./scripts/dev`, and use a session long enough to scroll. Start a selection in transcript content, drag downward through the prompt and footer, and confirm the blue selection stops at the content boundary even when the pointer is held there or the document reaches its end. Scroll until a submitted prompt pins at the top. Confirm that clicking the pinned row starts no selection, and that a selection dragged upward across it stops at the first content row. Then scroll the selected rows out of the frame and confirm the highlight shrinks and disappears instead of moving onto the pinned prompt or the editor. While detached, drag a selection across the `Jump to bottom` row and confirm the control stays drawn above the highlight and its label is absent from the copy. Rest the pointer on the last content row and confirm the view holds still. Move it into the editor and confirm the view scrolls smoothly one row at a time at `normal` speed. Select text in the footer and confirm the transcript does not move. Start a separate selection in the editor/footer and confirm dock-originated interaction remains available.

## Known gaps

None. Physical Windows Terminal confirmation of the content/dock boundary and selection color is the prepared maintainer handoff; deterministic viewport, controller, shell, copy, gesture-origin, dock-resize, and terminal-cell behavior is covered locally.
