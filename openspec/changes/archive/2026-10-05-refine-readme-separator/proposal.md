## Why

The README section separator currently draws three independently positioned bold asterisks. Although their coordinates are symmetric, the ornament does not behave as one centered typographic `* * *` run and its heavier weight does not match the lighter animated waves footer shown on the same page.

## What Changes

- Render the separator as one centered, evenly spaced `* * *` text run in both light and dark SVG assets while keeping each asterisk independently animated.
- Reduce the asterisk font weight to match the waves footer's lighter monospace treatment.
- Preserve the existing light/dark colors, smooth twinkle cadence, reduced-motion fallback, SVG dimensions, and README placement.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `readme-section-navigation`: Refine the shared section separator's centering, spacing, and typography without changing its motion or placement contract.

## Impact

- Changes `docs/assets/readme/separator.svg` and `docs/assets/readme/separator-dark.svg` only during implementation.
- Updates the README separator specification and validates the result through the existing GitHub-rendered README preview.
- Does not change README content, command bytes, navigation, runtime code, or the animated waves footer.
