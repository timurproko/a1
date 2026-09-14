## Why

A reported bare-A1 image submission in release `0.1.8-dev.279` terminates Node with `TypeError: owned-UI prompt image data is invalid`, leaving mouse reporting active; empty-screen dragging separately activates Pi selection and `Copied!`. PR #287 contains those failures, but user acceptance failed because ordinary large screenshots are rejected before preparation: restore the v2 prototype's automatic resizing with immediate paste feedback and genuinely background processing.

## What Changes

- Contain prompt preparation, validation, and execution failures at the owned submission boundary, including callback-driven submission, steering, and queued submission. Keep the session usable and the rejected draft and attachment references available for correction without duplicate dispatch.
- Separate bounded source-image intake from final attachment validation. Keep the eight-image and 8 MiB canonical-base64 command limits, but automatically resize/recompress supported oversized sources before enforcing output limits; do not make users manually shrink ordinary screenshots. Preserve already-small image bytes and MIME type.
- Acknowledge paste immediately with a preparing chip, then acquire and prepare the image asynchronously without blocking typing, selection, or streaming. Prefer lossless screenshot output, preserve aspect ratio and legibility, and fit both the local limit and known downstream image limits using the prototype's conservative size target.
- Bound source size, decoded pixels, background concurrency, memory retention, and preparation time. Handle pending submission, cancellation, chip deletion, repeated pastes, preparation failures, and session replacement without partial/duplicate dispatch or stale completion overwriting newer input.
- Prevent blank or otherwise non-selectable regions of the bare-A1 default screen from starting Pi fullscreen selection, changing the clipboard, or showing Pi's copy notification. Preserve A1's transcript/editor selection, navigation, and modal input ownership.
- Restore owned terminal modes on normal and exceptional shutdown, with a bounded fatal-exit path and a surviving-launcher fallback when the UI cannot clean itself up. Preserve a nonzero fatal outcome and bounded, privacy-conscious crash diagnostics.
- Add regression coverage for the reported image submission failure, large-image preparation, first-paste and repeated-paste responsiveness, submission/cancellation races, empty-screen drag fallthrough, continued input after rejection, and terminal restoration after failure. Preserve the pinned comparison profile's selection behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Responsive background image preparation within finite input/output limits, recoverable submission/attachment errors, and crash-safe terminal restoration with bounded diagnostics.
- `custom-session-viewport`: Exclusive pointer-selection ownership on the default bare-A1 surface, including empty and non-selectable content.

## Impact

- Expected implementation areas: shared owned image contracts, clipboard/editor paste and prompt-chip admission, session submission/lifecycle ownership, and a packaged background image-preparation worker with its declared codec dependency. The initial implementation also touches viewport selection, the owned terminal runtime, `bin/ui.js`, and launch/bootstrap cleanup; those protections remain in scope for regression validation, not redesign.
- Tests span real encoded-image fixtures, quality and size checks, deterministic responsiveness/concurrency tests, editor-to-session dispatch, fullscreen selection routing, and isolated worker/terminal lifecycle behavior. Worker and codec assets must work in development and packaged Windows/macOS/Linux launches without increasing synchronous startup work.
- No provider SDK upgrade, installed Pi mutation, profile migration, arbitrary-command terminal workaround, or selection change to `a1 pi` is planned.
- This amendment contains OpenSpec artifacts only. PR #287 is merged with required CI passing, but the user explicitly withheld acceptance; background resizing is not implemented or accepted. Merge the revised specification before a separately authorized implementation stream, then repeat acceptance before archive.
