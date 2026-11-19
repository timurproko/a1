## Why

Transcript selection omits the character under the moving endpoint and collapses to an empty range when a drag returns to its starting cell. The user's block-selection screenshot and single-character Claude Code comparisons show the desired behavior: include the boundary characters and keep the starting character selected while extending naturally to either side.

## What Changes

- Make an accepted ordinary pointer drag include the complete graphemes under both its starting and moving cells, regardless of direction or row order.
- Keep the starting grapheme selected when an active drag returns to its starting cell; extending left or right then adds the adjacent grapheme without an empty intermediate range.
- Preserve an ordinary press/release without distinct motion as a non-selecting click. A one-grapheme range is obtainable by dragging away and returning to the starting cell before release.
- Preserve half-open normalized display-column ranges, shared paint/copy bounds, grapheme safety, semantic word/line selection, source-content filtering, and existing presentation responsiveness.
- Replace the previous adjacent-cell-means-only-the-pressed-grapheme contract with explicit inclusive-cell gesture scenarios and regression coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Normalize accepted point drags from inclusive grapheme endpoints and retain a nonempty anchor range across reversal.
- `custom-session-viewport`: Apply inclusive pointer-cell selection to transcript highlighting and copying, including multiline boundaries and return-to-anchor gestures.

## Impact

- Primary implementation target: `src/ui/components/text-selection.ts`; review its transcript viewport and owned fullscreen fallback consumers for consistent paint/copy behavior.
- Regression coverage: shared selection tests, transcript viewport tests, owned shell/controller selection tests, and terminal-paint evidence.
- This intentionally changes mouse gesture results: a first movement into an adjacent distinct grapheme selects both graphemes, not just the pressed one. It does not change a public API or file format.
- No changes to prompt-editor keyboard selection, terminal-owned regular-mode selection, `a1 pi`, upstream/installed Pi packages, dependencies, or selection presentation scheduling.
- This pull request contains planning artifacts only; implementation and physical-terminal acceptance follow separately.
