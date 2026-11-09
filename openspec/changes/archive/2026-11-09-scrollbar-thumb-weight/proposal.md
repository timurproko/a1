## Why

The maintainer approved a wider scrollbar preview: today's thick style becomes thin, and thick uses a wider half-block. Keep a dim track and accent thumb so their roles remain distinct without changing content layout.

## What Changes

- Use `┃` for the thin track and thumb, and `▐` for the thick track and thumb, matching the approved colored terminal preview.
- Keep the selected glyph on hover and drag; visibility and existing theme roles distinguish interaction and thumb position.
- Retain one-column gutters, existing appearance modes, geometry, hit targets, wheel speed, selection, and profile boundaries.

## Capabilities

### Modified Capabilities
- `ui-components`: shared scrollbar glyphs and theme-role rendering.
- `owned-ui-settings`: settings rail follows the selected glyph during hover and drag.

## Impact

Shared scrollbar presentation and its fallback renderer, focused component/surface tests, and the corresponding specification deltas. No new setting, layout width, literal product color, or comparison-profile customization.
