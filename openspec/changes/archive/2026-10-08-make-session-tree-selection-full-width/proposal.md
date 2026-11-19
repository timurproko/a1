## Why

Session Tree currently paints its selected background only behind the arrow and rendered entry text, leaving unused cells to the right unselected. Resume Session already presents selection as a stable full-width row, and Session Tree should use the same geometry so focus remains visually consistent as entries of different lengths are selected.

## What Changes

- Extend the Session Tree selected background through the complete available row width, matching Resume Session selection geometry.
- Preserve the existing accent arrow, per-entry semantic foregrounds, hierarchy, horizontal viewport, and clipped-edge markers.
- Keep unselected rows item-sized and preserve search, filtering, folding, navigation, labeling, copying, and selection behavior.
- Add focused ANSI-cell regressions for full-width coverage across short, long, clipped, moved, and narrow selected rows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define Session Tree as a full-row selection surface alongside Resume Session while retaining its tree-specific styling and viewport behavior.

## Impact

The change affects the bare-A1 Session Tree row renderer, its focused component tests, copied-source provenance notes, and the `owned-pi-ui-foundation` presentation contract. It changes no theme tokens, keybindings, session data, tree operations, dependencies, public APIs, or explicit `a1 pi` comparison behavior.
