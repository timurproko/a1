## Why

Image-file paste chips use bare U+1F5BC (framed picture), a text-default Unicode character, so terminals can render a small text-style glyph. The extra space in the current icon does not request emoji presentation. File, folder, screenshot, URL, and Houdini chip icons already default to emoji presentation.

## What Changes

- Generate image-file chips with U+1F5BC followed by U+FE0F and one ordinary label separator, replacing the bare icon and compensating extra space.
- Recognize both new emoji-presentation labels and existing bare-icon labels without rewriting historical text or user content.
- Preserve atomic editing, wrapping, selection geometry, hyperlinks, copy, history, and submission behavior with focused regression cases.

## Capabilities

### New Capabilities

### Modified Capabilities

- `owned-pi-ui-foundation`: generated prompt-chip icons request emoji presentation, including compatibility with legacy image-file labels.

## Impact

The path-chip producer, canonical chip recognition contract, and focused shell/component tests. No terminal font settings, generic user-text normalization, dependency updates, clipboard payload changes, or new image-attachment behavior. The filename-preservation work in PR #930 remains separate; implementation must reconcile any matching shared-contract changes without changing its attachment semantics.
