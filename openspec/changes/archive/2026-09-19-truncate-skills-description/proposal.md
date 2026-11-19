## Why

The Skills dialog renders the selected skill's description with a wrapping `Text` component, so a long description spills onto two or more rows and pushes the hint footer down. The maintainer asked for the description to stay on one line and be cut off when it is longer than the viewport.

## What Changes

- Render the selected skill's description with the pinned `TruncatedText` component so it occupies exactly one row and is truncated to the viewport width with an ellipsis.
- Keep the dialog's composition, the `skill:<name>` rows, the scroll counter, the empty states, and the filtering behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `owned-pi-ui-foundation` requirement for the Skills dialog describes its composition and selection behavior, not the wrapping of the description row.

## Impact

- Affects `src/integrations/pi/components/skills-dialog.ts`, its component test, and the startup-graph byte baseline.
