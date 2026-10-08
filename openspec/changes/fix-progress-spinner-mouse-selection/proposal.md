## Why

The fullscreen `Working…` progress-spinner row interrupts mouse text selection: a drag cannot begin there, and a drag begun on surrounding content stops when it reaches the row. The spinner is visible base-session text and should participate in the same complete-frame selection as adjacent transcript content rather than becoming a pointer dead zone.

## What Changes

- Keep primary-button press, drag/motion, and release events on ordinary progress-spinner cells unhandled by the status component so frame selection can own the gesture.
- Allow selection to begin on the `Working…` row and continue across it in either direction without restarting or truncating the range.
- Preserve explicit controls, overlays, wheel behavior, status animation, and pinned comparison-profile behavior while separating complete-frame paint from semantic transcript clipboard output.
- Add focused component-dispatch and fullscreen shell regressions that exercise the real terminal input route rather than only calling the viewport controller directly.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Make the progress-spinner row explicitly transparent to primary drag ownership, allow starts from input/status rows below it, and keep frame chrome visual-only for clipboard output.

## Impact

Implementation will remove the fullscreen viewport's anchor-origin-dependent range clipping, keep the progress status passive, filter frame-copy payloads to meaningful transcript text, and improve copied-acknowledgement contrast over selection. It adds no dependency, setting, persisted state, or installed Pi modification and leaves regular-mode terminal selection and `a1 pi` behavior unchanged.
