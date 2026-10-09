## Why

Bare A1 currently leaves its fullscreen canvas transparent, so the terminal profile decides the background behind every unpainted cell. Readers need an Appearance preference that can preserve that behavior or provide a consistent dark canvas, including a subtle dark tint derived from the selected accent.

## What Changes

- Add a profile-local live `backgroundStyle` setting labeled `Background` in the existing `Appearance` section, between `Accent color` and `Quit animation`.
- Offer `transparent`, `accent`, and `dark` in that order, with `transparent` as the default so existing profiles and terminal-controlled backgrounds remain unchanged.
- Make `accent` a dark, low-saturation, greyish canvas derived from the active accent hue, and make `dark` a fixed neutral dark canvas independent of the accent.
- Paint the complete bare-A1 fullscreen canvas for colored modes while preserving intentional component surfaces such as selected rows, prompts, panels, and dialogs.
- Apply background and accent changes live with a complete repaint, preserve 256-color and truecolor behavior, restore the terminal default background on exit, and leave `a1 pi` unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Declare, persist, order, validate, and apply the live background preference.
- `owned-pi-ui-foundation`: Derive and paint the selected canvas background without disturbing intentional semantic surfaces or comparison-mode parity.

## Impact

Implementation affects owned settings declarations and migration, Appearance-section ordering, the central accent projection, bare-A1 fullscreen frame painting and invalidation, quit/restoration handling, and focused settings/theme/terminal-frame tests. It does not add arbitrary color input, change Pi settings storage, modify terminal profile configuration, alter the base foreground theme, or apply A1 background policy to `a1 pi`.
