## Why

The current `blue` accent is a muted sky blue close to `cyan`, so the two choices are hard to distinguish in the Settings preview and throughout the interface. A1 already has a recognizable saturated royal-blue brand color (`#2638d2`) that gives the blue choice a clearer identity.

## What Changes

- Shift the named `blue` accent to the hue of A1's brand blue while retaining appearance-specific lightness needed for terminal contrast.
- Increase blue's saturation so its primary accent, previews, and derived semantic family remain visibly distinct from `cyan` in dark and light themes.
- Add focused palette assertions for the brand-hue alignment and blue/cyan separation without changing the other five accent choices.
- Preserve live repainting, derived borders/headings/backgrounds, 256-color approximation, and exact `a1 pi` comparison behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Require the explicit blue palette entry to use A1's brand-blue hue and remain perceptually distinct from cyan.

## Impact

Implementation is limited to the owned accent palette in `src/integrations/pi/components/upstream/theme/theme.ts` and focused theme projection tests. It does not rename settings values, alter persistence, change the shared derivation transform, modify built-in Pi theme resources, or affect the comparison profile.
