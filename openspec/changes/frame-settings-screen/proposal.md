## Why

The owned settings screen lacks the framed visual hierarchy used by the `What's New` presentation, making its title and section boundaries less distinct than the requested A1 style. The screen should use the active theme's established blue border, cyan accent, and yellow heading roles without changing settings behavior.

## What Changes

- Frame the settings screen with a full-width blue theme-border rule above the content and an ordinary full-width divider above footer guidance.
- Add a bold cyan `Settings` title below the top rule, matching the heading treatment of `What's New`, and let both opening rows scroll away with the content.
- Render settings section headings in the theme's yellow heading role and align headings, list content, and footer guidance to the title's one-column left inset.
- Preserve the shared ruled search-input component while using its top rule in place of the ordinary bottom divider.
- Pin only the active section heading during scrolling, and account for the changing list origin in pointer, rail, menu, narrow-terminal, and exact-height geometry.
- Add focused semantic-style and terminal-cell regression coverage for ordinary, searched, scrolled, dialog, and constrained settings frames.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Define the settings screen's scrollable framed title, fixed conditional footer divider, aligned yellow section headings/content/guidance, and unchanged interaction behavior.

## Impact

The change affects the owned settings app, the owned UI theme/component styling seam needed for yellow headings, and focused settings/component tests. It does not change setting declarations, persistence, routing, keybindings, Pi settings storage, the `a1 pi` comparison surface, or external dependencies.
