## Why

The bare-A1 keyboard-shortcut screen renders its table section labels like ordinary bold Markdown, leaves a blank row before each table, and loses section context while scrolling. The first implementation corrected color and spacing by recognizing a hardcoded label list after Markdown rendering, but that is not reusable for the next grouped reference view and does not provide Settings-style pinned sections.

## What Changes

- Represent `/hotkeys` as structured sections instead of rediscovering known labels from rendered text.
- Reuse the shared grouped-row component that Settings uses so section headers receive the same theme accent, sit directly against their content, and pin while their rows scroll.
- Keep section data and rendering generic so another reference view can supply sections without adding label-specific styling or pinning code.
- Preserve shortcut table content, wrapping, section order, screen chrome, and the pinned `a1 pi` in-feed document.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Let read-only grouped documents reuse themed headers and sticky group layout without Settings-specific assumptions.
- `owned-pi-ui-foundation`: Present bare-A1 hotkeys through structured, Settings-consistent pinned sections.

## Impact

Implementation will affect shared grouped-list layout, the hotkeys presenter boundary, reference-screen composition, and focused component/reference tests. It will remove the label-matching postprocessor that exceeded the startup-graph byte budget. Shortcut declarations, binding resolution, command routing, changelog content, and the pinned comparison profile remain unchanged.
