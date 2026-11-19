## Why

When the detached transcript shows the `Jump to bottom` control, one empty cell at the far-right scrollbar gutter can inherit the control's background color. The gutter background resolver currently inspects the already-overlaid row, mistakes the centered control's inline background for the row surface, and paints that color into the otherwise unrelated scrollbar cell.

## What Changes

- Keep the scroll-to-bottom control's normal and hover backgrounds bounded to its visible label and hit region.
- Compose the control as floating viewport chrome without allowing its inline ANSI background to redefine the transcript row's scrollbar-gutter surface.
- Preserve the underlying transcript or selection background in the gutter, including when a track or thumb is visible there.
- Add focused terminal-cell regressions for normal, hovered, selected, and visible/idle scrollbar states while retaining control placement, activation, and copy behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Require floating scroll-to-bottom control styling to remain bounded and independent from the reserved scrollbar gutter's row surface.

## Impact

Expected implementation is limited to transcript viewport composition and focused viewport/session-shell rendering coverage. It changes no settings, persistence, dependencies, public APIs, scrollbar geometry, control text, hit regions, or `a1 pi` comparison behavior.
