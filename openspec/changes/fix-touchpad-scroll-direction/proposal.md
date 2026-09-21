## Why

Touchpad scrolling can unexpectedly move the transcript in the opposite direction because A1 currently interprets horizontal SGR wheel reports as vertical wheel input. Diagonal or noisy touchpad gestures therefore make vertical scrolling feel unstable.

## What Changes

- Decode only the SGR vertical wheel codes as `wheel-up` and `wheel-down` events.
- Consume horizontal wheel reports without turning them into vertical scrolling or leaking their escape sequences into focused input.
- Add focused parser and viewport-routing regression coverage for mixed vertical and horizontal touchpad-style reports.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Distinguish vertical wheel reports from horizontal wheel reports while preserving keyboard input and safe handling of unsupported pointer reports.
- `custom-session-viewport`: Keep transcript movement aligned with vertical wheel direction when touchpad gestures also produce horizontal wheel reports.

## Impact

The change is limited to owned SGR mouse decoding/routing and its component and session-viewport tests. It does not change scrollbar speed settings, keyboard scrolling, drag behavior, terminal dependencies, or the pinned `a1 pi` runtime.
