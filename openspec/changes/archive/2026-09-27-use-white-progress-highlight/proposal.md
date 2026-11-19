## Why

Bare A1's animated progress-label band is cyan because it reuses the spinner's accent role. The requested presentation keeps the spinner cyan but makes the moving text highlight white, improving contrast and separating the label animation from the spinner.

## What Changes

- Render the moving highlight across bare-A1 progress text with the theme's neutral white text role instead of the cyan accent role.
- Keep the surrounding label and ellipsis muted, and keep the spinner in its existing accent colour.
- Preserve the current highlight width, movement, pause, cadence, grapheme safety, geometry, lifecycle, and status coverage.
- Leave the pinned `a1 pi` comparison profile and non-spinner text unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Define the animated progress-label highlight as neutral white rather than spinner-accent coloured.
- `owned-pi-ui-foundation`: Apply the white text highlight to every bare-A1 spinner-backed status while preserving the accent spinner and pinned Pi behavior.

## Impact

The implementation will affect the shared progress-frame style contract, the bare-A1 status style injection, and focused component/shell presentation tests. It will not change semantic messages, terminal geometry, timers, theme schemas, dependencies, extension APIs, or source-synchronized pinned Pi components.
