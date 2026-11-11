## Why

The current small dot spinner is difficult to see. The maintainer selected a short list of stationary-looking alternatives and requested a setting rather than replacing the current spinner for everyone.

## What Changes

- Add a live Appearance setting, Spinner style, with exactly None, Current, Circle (A), Diamond (C), and Rotating square (G), in that order.
- Show native, active-accent spinner previews in the dropdown using the existing accent-color preview column; animate the focused option in place and keep labels aligned, including None.
- Preserve Current as the default and fallback for missing or invalid stored choices.
- Use the selected style across bare-A1 working, retry, compaction, extension-provided working text, and A1-owned operation progress loaders through one shared presentation policy.
- Keep animated styles in one fixed terminal-cell slot with stable adjacent text. None removes the glyph and its separator without hiding status text.
- Persist the setting using the existing profile-local settings manager and preserve existing save, cancel, rollback, and live-change behavior.
- Leave measured install/update bars, progress calculations, status wording and colors, cancellation, and the pinned `a1 pi` profile unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: declare and persist the live spinner-style choice in Appearance.
- `owned-pi-ui-foundation`: apply a shared fixed-slot spinner policy to owned indeterminate progress surfaces.

## Impact

Owned settings declarations, typed settings/live bindings, shared spinner-frame presentation, shell status and owned operation-loader adapters, and focused settings/rendering/lifecycle tests. No new dependency, upstream package modification, installation/update behavior change, or custom extension-renderer rewrite.
