## Why

The owned settings screen lacks the framed visual hierarchy used by the `What's New` presentation, making its title and section boundaries less distinct than the requested A1 style. The screen should use the active theme's established blue border, cyan accent, and yellow heading roles without changing settings behavior.

## What Changes

- Frame the settings screen with full-width blue theme-border rules above the content and above the footer guidance.
- Add a fixed, bold cyan `Settings` title below the top rule, matching the heading treatment of `What's New`.
- Render settings section headings in the theme's yellow heading role while preserving row colors, selection, values, menus, dialogs, search, notices, and scrollbar behavior.
- Account for the new frame rows in scrolling, sticky-section, pointer, rail, narrow-terminal, and exact-height layout geometry.
- Add focused semantic-style and terminal-cell regression coverage for ordinary, searched, scrolled, dialog, and constrained settings frames.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Define the settings screen's framed title, border rules, yellow section headings, and unchanged interaction/layout behavior within the reduced content rectangle.

## Impact

The change affects the owned settings app, the owned UI theme/component styling seam needed for yellow headings, and focused settings/component tests. It does not change setting declarations, persistence, routing, keybindings, Pi settings storage, the `a1 pi` comparison surface, or external dependencies.
