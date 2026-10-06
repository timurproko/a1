## Why

Windows Terminal needs a visual fallback because Pi reports no native image protocol there. Physical review also found that Windows WezTerm's retained Kitty placements disappear when their anchor scrolls offscreen and can remain painted above fullscreen dialogs. Submitted-image previews therefore need ordinary composable terminal rows on both supported Windows hosts.

## What Changes

- Preserve Pi's existing `Image` component path unchanged for non-Windows terminals, tool images, extensions, and `a1 pi`.
- Detect bare A1 running in Windows Terminal or Windows WezTerm and render retained submitted-user images as bounded truecolor quadrant-cell rows.
- Query the selected terminal's cell pixel dimensions and decode/resize previews in the existing image worker with strict dimensions, output, deadline, and lifecycle bounds.
- Preserve original attachment bytes, MIME type, provider payload, prompt text, history, and image visibility/width settings.

No Sixel registry, terminal protocol injection, viewport/damage transformation, overlay lifecycle customization, package replacement, or new user setting is authorized.

## Capabilities

### Modified Capabilities

- `custom-session-viewport`: Add a narrowly scoped Windows-host submitted-image preview while preserving every established image path elsewhere.

## Impact

- The submitted-image presenter gains an optional preview callback only when the bare A1 session host is Windows Terminal or Windows WezTerm.
- The existing worker gains one bounded cell-preview request using the already pinned Photon decoder.
- Focused evidence covers host routing, lifecycle cancellation, bounded rows, payload retention, WezTerm scrolling/dialog composition, and unchanged native behavior elsewhere.
