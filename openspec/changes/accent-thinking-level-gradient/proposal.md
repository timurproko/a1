## Why

The active thinking level in bare A1's status bar still uses Pi's unrelated per-level rainbow colors, so it does not follow the UI accent chosen through the separate accent customization. The level should instead communicate increasing intensity through one coherent grey-to-accent scale.

## What Changes

- Render the status-bar thinking-level name on a fixed gradient from semantic dim grey at `off` to the active semantic accent at `xhigh`.
- Give `minimal`, `low`, `medium`, and `high` evenly ordered intermediate colors, without rescaling the colors for models that expose only a subset of levels.
- Keep only the level name colored; preserve model/provider text, separators, usage, layout, truncation, editor-border colors, and extension statuses.
- Preserve pinned `a1 pi` footer behavior and consume the active semantic accent without adding another color setting or palette.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Replace the bare-A1 footer level's inherited thinking-color mapping with a semantic grey-to-active-accent intensity gradient.

## Impact

The change affects the owned session-footer presentation, its theme-aware color derivation, and focused footer/theme tests. It is a separate delivery from `customize-ui-accent`; after that change reaches `develop`, this change will consume its active semantic accent and verify all selectable accents without modifying the accent setting itself.
