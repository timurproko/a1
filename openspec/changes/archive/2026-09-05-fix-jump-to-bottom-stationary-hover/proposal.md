## Why

The “Jump to bottom” control currently updates hover only on mouse motion. When scrolling hides the control at the transcript end and reveals it again beneath a stationary cursor, it appears unhovered until the mouse moves, even though the cursor is already inside its hit region.

## What Changes

- Derive the control's pointed-at presentation from the latest known terminal pointer coordinates and its current rendered hit region, not just motion events.
- Apply the correct hover styling in the first frame that reveals or relocates the control, including repeated scroll-to-end and scroll-away cycles.
- Retain pointer location while the control is hidden, update it from coordinate-bearing mouse reports including wheel events, and clear it on the existing pointer/session reset lifecycle.
- Add focused regression coverage for stationary-pointer reappearance, current geometry, outside/unknown pointer positions, and unchanged activation behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Specify that the scroll-to-bottom control's normal and pointed-at states follow current geometry and the latest reported pointer position without requiring mouse movement.

## Impact

- Expected implementation areas: `src/integrations/pi/session-ui/session-viewport-controller.ts` for pointer ownership and `src/ui/components/transcript-viewport.ts` for current-frame control geometry and styling.
- Focused component and owned-session shell tests will exercise hover presentation and input routing.
- No new dependencies, settings, theme colors, terminal reporting modes, or public commands. The pinned `a1 pi` comparison presentation remains unchanged.
- This change contains planning artifacts only; implementation follows in a separate change delivery after this specification merges.
