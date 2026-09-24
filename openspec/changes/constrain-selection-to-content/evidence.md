# Implementation evidence

## Result

- A selection whose two semantic endpoints remain transcript-document anchors is clipped to the current transcript rectangle for paint, selected text, copyability, and immutable visible-frame copy capture.
- Upward or downward edge scrolling can project a source endpoint beyond the visible document without allowing its numeric line to overlap and select pinned editor, notice, widget, or footer rows.
- Explicit pointer motion into the dock still creates a dock anchor and preserves continuous complete-frame selection in either direction.
- Dock height changes recompute the clipping boundary in the same frame and do not retain stale dock selection paint.
- Existing scrollbar-edge selection, wide/combining grapheme handling, source styling, selection cadence, prompt-local selection, modal ownership, and the pinned `a1 pi` route remain unchanged.

## Reference analysis

`D:/Git/claude-code-source` keeps fullscreen selection in screen-buffer coordinates while `ScrollBox` exposes a separate viewport top and height. Its drag-scroll path captures outgoing rows and shifts the content anchor only within those bounds; mixed scrollbox/static selections are intentionally excluded from scroll translation. A1 retains semantic document anchors instead, so the implemented equivalent is a region-aware visible projection rather than adopting Claude Code's screen-row accumulator.

## Local validation

- `npm run build` — passed.
- `npx vitest run test/ui/components/transcript-viewport.test.ts` — 49 tests passed.
- `npx vitest run test/app/session-shell/session-viewport-controller.test.ts` — 65 tests passed.
- `npx vitest run test/app/session-shell/session-shell-selection.test.ts` — 70 tests passed, including decoded final terminal-cell containment.
- `npx vitest run test/ui/components/text-selection.test.ts test/ui/components/selection-scrollbar-edge.test.ts` — 2 files and 28 tests passed.
- `npm run typecheck` — passed.
- `npm run check:code-documentation:changed` — passed.
- `npx openspec validate constrain-selection-to-content --strict` — passed.
- `git diff --check` — passed.

## Manual handoff

Build with `npm run build`, launch with `./scripts/dev`, and use a session long enough to scroll. Start a selection near the bottom of transcript content, drag to the top content edge, and hold until history scrolls upward. Confirm the blue selection remains above the editor/dock boundary. Without ending a fresh drag, deliberately move from transcript content into visible prompt or footer text and confirm selection can still continue below the content area.

## Known gaps

None. Physical Windows Terminal confirmation of the content/dock boundary and selection color is the prepared maintainer handoff; deterministic viewport, controller, shell, copy, reverse-direction, dock-resize, and terminal-cell behavior is covered locally.
