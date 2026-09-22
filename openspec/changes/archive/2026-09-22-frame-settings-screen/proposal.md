## Why

The owned settings screen lacks the framed visual hierarchy used by the `What's New` presentation, making its title and section boundaries less distinct than the requested A1 style. The screen should use the active theme's established blue border, cyan accent, and yellow heading roles without changing settings behavior.

## What Changes

- Frame the settings screen with a full-width blue theme-border rule above the content and an ordinary full-width divider above footer guidance.
- Keep the blue top rule fixed, add a bold cyan `Settings` title below it, and let only the title scroll away with the content.
- Render settings section headings in the theme's yellow heading role; align headings, list content, and footer guidance to the title's one-column left inset; and preserve one opening spacer between the title and first section.
- Preserve the shared ruled search-input component while using its top rule in place of the ordinary bottom divider, let wheel input anywhere over the search footer scroll through all results without a section-boundary spacer hiding the final setting, remove the trailing empty result row, and restore the prior scroll position when an untouched search closes.
- Pin only the active section heading below the fixed top rule, start the scrollbar alongside the title one row above the initial list body, and account for the changing title offset in pointer, rail, menu, narrow-terminal, and exact-height geometry.
- Render dropdown effective-value checkmarks in the semantic accent color used by modal marks.
- Place bare A1's `thinking` slash command immediately after `models` while leaving the pinned comparison catalog unchanged.
- Add focused semantic-style, terminal-cell, and command-order regression coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Define the settings screen's fixed top rule, scrollable framed title, opening spacer, title-level scrollbar, fixed conditional footer divider, aligned yellow section headings/content/guidance, and unchanged interaction behavior.
- `owned-pi-ui-foundation`: Define the adjacent `models`, `thinking` order in bare A1's slash-command catalog without changing the comparison profile.

## Impact

The change affects the owned settings app, the owned UI theme/component styling seam needed for yellow headings, the bare-A1 command catalog order, and focused settings/component tests. It does not change setting declarations, persistence, routing, keybindings, Pi settings storage, the `a1 pi` comparison surface, or external dependencies.
