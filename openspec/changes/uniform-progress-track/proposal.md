## Why

The install/update progress track uses a thinner line than the completed segment. The maintainer selected option A from inline colored comparisons: keep the current centered completed stroke and give the gray track the same weight, without using dashed or bottom-aligned block glyphs.

## What Changes

- Render both completed and remaining progress cells with the continuous centered `━` glyph in self-update and the dependency-free installer.
- Preserve selected-accent fill, muted gray track, neutral percentage, 38-cell width, percentage spacing and calculation, animation, and cleanup.
- Update focused presentation and installer-parity assertions, including empty, partial, and full frames.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: require the shared install/update meter to use a uniform centered stroke for completed and remaining cells.

## Impact

Two progress renderers and their existing focused tests. No installation, update, activation, palette, dependency, or terminal-layout behavior changes.
