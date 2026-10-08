## Why

Bare A1 currently fixes the interactive shell to Pi's dark theme, whose semantic `accent` role is purple, and intentionally hides Pi's full-theme selector. Readers need a small, safe choice of accent colors without copying complete Pi themes or tying the setting to today's `violet` variable or RGB value.

## What Changes

- Add a profile-local live `accentColor` setting in a new `Appearance` section with `purple`, `blue`, `cyan`, `green`, `orange`, and `pink` choices; show an effective-color square for every choice and keep the current-value mark neutral.
- Move the existing `Quit animation` control from `Generic` to `Appearance` after the accent control.
- Use `purple` as the initial choice and derive one complementary secondary tone shared by Markdown list markers, keyboard shortcuts, secondary headings, and active-filter values, dialog borders, half-strength selection tints, and quieter user prompts from each choice's primary accent through one reusable color transform; keep state markers text-colored and preserve every unrelated role.
- Keep scrolled-out sticky prompts and jump-to-bottom badges neutral grey at rest, applying the selected accent surface only on hover.
- Apply the preference through the central owned Pi-theme boundary and a border-only bridge for retained package dialogs so titles, secondary headings, keyboard-shortcut key spans, bars, cursors, selected markers, spinners, accent scrollbars, settings, and extension theme access update together in the running bare-A1 session.
- Reapply the preference whenever the base theme is loaded, reloaded, or replaced, without mutating built-in resources or matching the current purple color.
- Preserve exact upstream theme behavior in `a1 pi`, preserve every unrelated Pi role in bare A1, and fail governed compatibility checks if a future Pi release changes the semantic theme contract incompatibly.
- Keep release-generated installer and self-update progress palettes unchanged; they are not session UI and may run before an A1 profile preference is available.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Declare and persist the live accent-color preference in the owned settings screen.
- `owned-pi-ui-foundation`: Project a selected color and its subtle surface variations throughout bare A1 while retaining unrelated-role Pi parity and comparison isolation.
- `owned-ux-architecture`: Require accent customization to remain semantic and centrally applied rather than inferred from literal colors or theme implementation details.

## Impact

Implementation affects the owned settings declaration and grouping, shared value-menu presentation, Pi theme adapter, bare-A1 composition and theme invalidation, semantic select-list and dialog-border creation, Markdown heading/list-marker styling, sticky/jump hover styling, and focused settings/theme/frame tests. It does not change Pi settings storage, built-in theme resources, syntax or unrelated Markdown roles that merely happen to be purple today, installed custom theme files, or the `a1 pi` comparison profile.
