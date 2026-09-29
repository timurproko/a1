## Why

Bare A1 retains a submitted screenshot and reserves its transcript rows, but Windows WezTerm can paint those rows blank because the fullscreen Kitty placement is erased or filtered, while Windows Terminal falls back to an image metadata label instead of a visual preview. A submitted screenshot should remain visibly recognizable in both terminals without changing the attachment sent to the model.

## What Changes

- Add a bounded visual fallback for submitted user-image transcript attachments when bare A1 runs on Windows, where native inline-image transport is unavailable or unreliable.
- Render the fallback from the retained attachment off the interactive thread, preserve aspect ratio, and cap its rows, columns, payload, concurrency, and lifetime.
- Keep native inline images on established reliable paths and preserve the existing hidden-image and unavailable-image text states.
- Keep original attachment bytes, prompt text/chips, model delivery, history, tool-result rendering, and the explicit `a1 pi` comparison route unchanged.
- Add deterministic component/terminal evidence and require physical review in Windows WezTerm and Windows Terminal.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Require bare A1 to show a bounded visual preview for submitted user images on Windows instead of a blank reservation or metadata-only fallback.

## Impact

Implementation will affect the bare-A1 transcript image presenter, an off-thread preview conversion boundary, presentation lifetime/caching, and focused rendering evidence. It will not install `pi-imgcat`, require its optional PowerShell Sixel module, change provider payloads, alter source-image preparation, modify installed Pi packages, or change `a1 pi`.

This change contains planning artifacts only, not implementation.
