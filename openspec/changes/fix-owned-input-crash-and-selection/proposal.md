## Why

A reported bare-A1 image submission in release `0.1.8-dev.279` terminates Node with `TypeError: owned-UI prompt image data is invalid`, leaving mouse reporting active so pointer coordinates appear at the Git Bash prompt. Separately, dragging an empty A1 transcript falls through to Pi's white fullscreen selection and automatic `Copied!` feedback instead of remaining under A1's pointer ownership.

## What Changes

- Contain prompt preparation, validation, and execution failures at the owned submission boundary, including callback-driven submission, steering, and queued submission. Keep the session usable and the rejected draft and attachment references available for correction without duplicate dispatch.
- Make existing attachment limits explicit and consistent between clipboard admission and command validation; accept supported canonical images and report malformed, oversized, or excessive attachments with bounded actionable feedback rather than an uncaught exception. Preserve existing finite limits rather than silently removing them or changing image bytes.
- Prevent blank or otherwise non-selectable regions of the bare-A1 default screen from starting Pi fullscreen selection, changing the clipboard, or showing Pi's copy notification. Preserve A1's transcript/editor selection, navigation, and modal input ownership.
- Restore owned terminal modes on normal and exceptional shutdown, with a bounded fatal-exit path and a surviving-launcher fallback when the UI cannot clean itself up. Preserve a nonzero fatal outcome and bounded, privacy-conscious crash diagnostics.
- Add regression coverage for the reported image submission failure, empty-screen drag fallthrough, continued input after rejection, and terminal restoration after failure. Preserve the pinned comparison profile's selection behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Recoverable submission/attachment validation errors and crash-safe terminal restoration with bounded diagnostics.
- `custom-session-viewport`: Exclusive pointer-selection ownership on the default bare-A1 surface, including empty and non-selectable content.

## Impact

- Expected implementation areas: `src/contracts/owned-ui/validation.ts`, clipboard image and prompt-chip admission, `src/integrations/pi/engine/adapter.ts`, session submission and viewport controllers, the owned terminal runtime, `bin/ui.js`, and the owned launch/bootstrap cleanup boundary.
- Tests span contract validation, clipboard/prompt preparation, editor-to-session dispatch, real fullscreen-runtime selection routing, and isolated subprocess/terminal lifecycle behavior.
- No provider SDK upgrade, installed Pi mutation, profile migration, image recompression, arbitrary-command terminal workaround, or selection change to `a1 pi` is planned.
- This delivery contains OpenSpec artifacts only; implementation follows acceptance of this specification in a separate change stream.
