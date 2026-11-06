## Why

The transparent resident tab bar still paints opaque neutral blocks behind inactive tabs and `+`, so it looks detached from the terminal canvas. The empty landing and split right-side hover treatment also add visual noise instead of presenting one cohesive configurable strip.

## What Changes

- Make inactive tabs, overflow, and `+` inherit the transparent strip canvas at rest, with a subtle additive accent treatment on hover; keep the active tab treatment unchanged.
- Treat the complete rendered Version/Time group, including its internal spacing, as one configurable hover and context-menu target with consistent feedback.
- Remove the package version from the left-side empty landing body while retaining the logo and working-directory placement; the optional right-side Version item remains unchanged.
- Preserve dark/accent tab-bar readability, palette fallback, narrow geometry, top/bottom placement, and existing tab actions while covering the revised visual states with focused native tests.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `multi-agent-tabs`: Refine transparent strip blending, grouped right-side interaction feedback, and version-free empty landing presentation.

## Impact

- Native terminal-host strip and landing renderers, pointer hit geometry, and attach interaction state.
- Resident tab-bar and landing rendering tests, including truecolor and palette behavior.
- No settings schema, protocol, package, or dependency changes.
