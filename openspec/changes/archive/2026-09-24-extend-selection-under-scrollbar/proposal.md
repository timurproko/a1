## Why

Selections that reach the transcript's right edge currently stop one cell before the terminal edge, leaving the dedicated scrollbar gutter in the row's ordinary background. That unselected stripe makes a continuous multiline selection look clipped; the selection background should continue beneath the scrollbar while the gutter remains non-copyable presentation chrome.

## What Changes

- Extend selection paint into the reserved final-column scrollbar gutter whenever the adjacent transcript selection reaches the content boundary.
- Render visible track and thumb glyphs over the selection background, and leave the selected background visible when an automatic rail is hidden.
- Keep source text, hyperlinks, copied text, selection endpoints, and scrollbar gesture ownership bounded to their existing semantic regions.
- Preserve the row's ordinary continued background when selection does not reach the content boundary.
- Add decoded terminal-cell coverage for multiline, endpoint, rail-state, source-style, and cached-frame cases.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Continue right-edge selection paint through the dedicated scrollbar gutter while retaining its non-source, non-copyable semantics and rail ownership.

## Impact

Expected implementation is limited to transcript viewport selection/gutter composition and focused terminal-cell tests. No settings, persistence, dependencies, public APIs, scrollbar geometry, content wrapping, dock selection, or `a1 pi` comparison behavior changes.
