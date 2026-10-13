## Why

Bare A1's prompt rules remain fixed neutral grey while modal rules follow the selected accent family, so the active input surface looks disconnected from the rest of the UI. Aligning the prompt frame with modal bars also establishes the visual language needed for a future multipane workspace to distinguish an active pane from neutral inactive panes.

## What Changes

- Render the bare-A1 agent prompt's top and bottom rules with the active theme's semantic `border` role, matching modal bars and updating live when the accent changes.
- Apply the same semantic rule styling to shared ruled inputs such as Settings search so the shared input component remains visually coherent.
- Preserve prompt arrows, text, caret, annotations, geometry, editing behavior, thinking-level status color, and the pinned `a1 pi` editor presentation.
- Keep inactive-pane styling and multipane focus state out of scope; this change defines the colored active-input treatment that those panes can consume later.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Shared input rules use the semantic modal-border role rather than a fixed neutral RGB foreground.
- `owned-pi-ui-foundation`: Bare A1 declares accent-responsive prompt bars while preserving comparison-profile and editor behavior.

## Impact

Affected areas include the shared prompt-input presentation, bare-A1 editor and search composition, semantic color assertions, live accent repaint coverage, and paired bare-A1/`a1 pi` regressions. No setting, persistence, engine protocol, dependency, geometry, or multipane behavior changes.
