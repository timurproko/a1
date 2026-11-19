## Why

When settings search is open and the result list is scrolled to its end, a section-boundary spacer can leave an unnecessary empty row between the final setting and the search input. The final result should sit directly against the input's top rule while the scrollbar continues to represent the real list position.

## What Changes

- Correct bottom clamping for grouped settings results when a skipped section spacer lands at the viewport boundary.
- Keep the final visible setting directly above the ruled search input without changing the search footer, sticky section heading, or scrollbar behavior.
- Add focused grouped-list and settings-screen regressions for wheel and end-jump navigation at the bottom of an open search.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Make the existing no-trailing-gap contract explicit for bottom-scrolled search results while preserving truthful scrollbar geometry.

## Impact

The change is expected to affect shared grouped-list bottom-layout geometry, the owned settings screen's focused tests, and the `owned-ui-settings` specification. It does not change settings inventory, values, persistence, search matching, input chrome, keybindings, or the `a1 pi` comparison surface.
