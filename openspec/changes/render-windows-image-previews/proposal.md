## Why

Fresh development already renders submitted images correctly in Windows WezTerm, but Windows Terminal falls back to metadata because Pi reports no native image protocol there. The previous cross-terminal raster implementation changed shared rendering and destabilized the working WezTerm path, so this replacement is intentionally Windows-Terminal-only.

## What Changes

- Preserve Pi's existing `Image` component path unchanged for Windows WezTerm, non-Windows terminals, tool images, extensions, and `a1 pi`.
- Detect bare A1 running in Windows Terminal and render retained submitted-user images as bounded truecolor quadrant-cell rows.
- Decode and resize previews in the existing image worker with strict dimensions, output, deadline, and lifecycle bounds.
- Preserve original attachment bytes, MIME type, provider payload, prompt text, history, and image visibility/width settings.

No Sixel registry, terminal protocol injection, viewport/damage transformation, overlay lifecycle customization, package replacement, or new user setting is authorized.

## Capabilities

### Modified Capabilities

- `custom-session-viewport`: Add a narrowly scoped Windows Terminal submitted-image preview while preserving every established image path elsewhere.

## Impact

- The submitted-image presenter gains an optional preview callback only when the session host is Windows Terminal.
- The existing worker gains one bounded cell-preview request using the already pinned Photon decoder.
- Focused evidence covers host routing, lifecycle cancellation, bounded rows, payload retention, and unchanged WezTerm/native behavior.
