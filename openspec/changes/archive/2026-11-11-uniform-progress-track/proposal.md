## Why

The install/update progress track uses a thinner line than the completed segment. The maintainer selected option A from inline colored comparisons: keep the current centered completed stroke and give the gray track the same weight, without using dashed or bottom-aligned block glyphs.

## What Changes

- Render both completed and remaining progress cells with the continuous centered `━` glyph in self-update and the dependency-free installer.
- Preserve selected-accent fill, muted gray track, neutral percentage, 38-cell width, percentage spacing and calculation, animation, and cleanup.
- Update focused presentation and installer-parity assertions, including empty, partial, and full frames.
- Split bare-A1 Session Info identity into Folder, File, and ID rows, preserving the full path and a trailing platform-appropriate folder separator.
- Align Cached and Uncached labels with Input, Output, and Total while retaining the shared left-aligned value column and all token details.
- Reserve one blank row between Session Info content and its scroll/close footer, including while scrolled.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: require the shared install/update meter to use a uniform centered stroke for completed and remaining cells.
- `owned-pi-ui-foundation`: refine Session Info identity, token-label alignment, and footer spacing without changing comparison presentation.

## Impact

Two progress renderers, the owned Session Info document renderer, the shared reference dialog frame, and their focused tests. No installation, update, activation, palette, dependency, report-calculation, or comparison-profile behavior changes.
