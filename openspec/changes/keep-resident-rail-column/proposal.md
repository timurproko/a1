## Why

In multi-agent tabs the scrollbar rail sometimes draws one column left of its gutter on a single row. This is typically the row where the jump-to-bottom control or the last streamed line sat, and the gap persists until that row is repainted. Solo mode never shows this, so the resident capture and repaint path loses the rail's column on some rows.

## What Changes

- Reproduce the shift by feeding real Windows ConPTY re-rendered output into the resident terminal model and comparing the retained rows with a complete capture.
- Repair the first divergent boundary so every resident row keeps the rail in the final gutter column, matching solo mode.
- Keep row-bounded differential repaint, styles, links and cursor placement unchanged.

## Capabilities

### Modified Capabilities

- `multi-agent-tabs`: resident replay keeps scrollbar rail cells in their fixed gutter column on every row.

## Impact

Native terminal host retained capture and presentation (`native/terminal-host`), with focused native tests. No protocol or settings changes.
