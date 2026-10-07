## Why

Opening the bare-A1 Thinking Level selector or Session Tree can briefly paint the cleared ordinary prompt before the requested selector appears. Both routes wait for a lazy component import after Enter has already cleared the editor, unlike selectors whose component code is ready when the command is submitted. The transient frame is visible as a flash and makes these two dialogs feel inconsistent with the rest of the modal system.

## What Changes

- Prepare the Thinking Level and Session Tree component modules after the first input-ready frame, outside the eager startup graph.
- Reuse the prepared module state when either route opens so the requested replacement surface is installed without an intervening ordinary-prompt presentation.
- Keep cold-loader failure explicit and recover to a usable prompt rather than leaving a pending or empty replacement state.
- Add focused presentation-order coverage for `/thinking`, `/tree`, and the tree double-Escape route while retaining selector behavior and startup-graph limits.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Require the lazy Thinking Level and Session Tree replacement surfaces to open without exposing an intermediate ordinary-prompt frame while preserving bounded post-first-frame preparation and normal recovery.

## Impact

- Affects post-first-frame preparation and selector opening in the owned session shell plus focused shell workflow coverage.
- Does not make optional selector modules part of the eager startup graph, change selector layout or interactions, alter `a1 pi`, or modify installed Pi package files.
