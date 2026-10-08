## Why

Bare A1 currently fixes the interactive shell to Pi's dark theme, whose semantic `accent` role is purple, and intentionally hides Pi's full-theme selector. Readers need a small, safe choice of accent colors without copying complete Pi themes or tying the setting to today's `violet` variable or RGB value.

## What Changes

- Add a profile-local live `accentColor` setting in a new `Appearance` section with `default`, `blue`, `cyan`, `green`, `orange`, and `pink` choices; show an effective-color square for every choice and keep the current-value mark neutral.
- Move the existing `Quit animation` control from `Generic` to `Appearance` after the accent control.
- Keep `default` byte-identical to the active Pi theme. Named choices replace the semantic accent and Markdown list markers plus deliberate same-hue variations for dialog borders, selections, and visible user prompts while preserving every unrelated role.
- Keep scrolled-out sticky prompts and jump-to-bottom badges neutral grey at rest, applying the selected accent surface only on hover.
- Apply the preference through the central owned Pi-theme boundary so titles, cursors, selected markers, spinners, accent scrollbars, dialogs, settings, and extension theme access update together in the running bare-A1 session.
- Reapply the preference whenever the base theme is loaded, reloaded, or replaced, without mutating built-in resources or matching the current purple color.
- Preserve exact upstream theme behavior in `a1 pi`, preserve Pi parity for the default preference, and fail governed compatibility checks if a future Pi release changes the semantic theme contract incompatibly.
- Keep release-generated installer and self-update progress palettes unchanged; they are not session UI and may run before an A1 profile preference is available.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Declare and persist the live accent-color preference in the owned settings screen.
- `owned-pi-ui-foundation`: Project a selected color and its subtle surface variations throughout bare A1 while retaining default Pi parity and comparison isolation.
- `owned-ux-architecture`: Require accent customization to remain semantic and centrally applied rather than inferred from literal colors or theme implementation details.

## Impact

Implementation affects the owned settings declaration and grouping, shared value-menu presentation, Pi theme adapter, bare-A1 composition and theme invalidation, semantic select-list theme creation, Markdown list-marker styling, sticky/jump hover styling, and focused settings/theme/frame tests. It does not change Pi settings storage, built-in theme resources, syntax or unrelated Markdown roles that merely happen to be purple today, installed custom theme files, or the `a1 pi` comparison profile.
