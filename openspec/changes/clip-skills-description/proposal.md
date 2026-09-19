## Why

The Skills dialog cuts the selected skill's description to one row with the pinned `TruncatedText` component, which appends a `...` marker after the muted styling resets, so the dialog shows a white ellipsis at the end of a muted line. The maintainer asked for the description to be cut at the viewport width with no ending at all.

## What Changes

- Render the selected skill's description as a single line clipped at the render width with no ellipsis, padded to width so the row height stays constant.
- Keep the dialog's composition, the `skill:<name>` rows, the scroll counter, the empty states, and the filtering behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `owned-pi-ui-foundation` requirement for the Skills dialog describes a one-line description; it does not prescribe a truncation marker.

## Impact

- Affects `src/integrations/pi/components/skills-dialog.ts`, its component test, and the startup-graph byte baseline.
