## ADDED Requirements

### Requirement: Bare A1 projects one selected semantic accent across the active UI

Bare A1 SHALL derive its active presentation from the complete unmodified base Pi theme and SHALL replace only the semantic `accent` role when `accentColor` names an A1 palette color. Every owned, retained, shared-component, select-list, and extension-facing surface that requests semantic accent SHALL observe the same selected color for foreground painting, composed styles, ANSI lookup, and concrete color introspection. Every non-accent role SHALL retain the base theme's behavior and bytes.

The active projection SHALL be reconstructed from the stored base theme after named-theme load, watched-file reload, terminal-appearance selection, or in-memory theme replacement. It SHALL NOT modify built-in or custom theme resources, write generated theme files, inspect the name `violet`, compare current purple/RGB values, infer related roles from equal colors, or derive repeatedly from an earlier projection. Roles such as Markdown code, syntax types, custom-message labels, selection backgrounds, and thinking-level colors SHALL remain independent unless they explicitly request semantic `accent`.

A live accent change SHALL invalidate theme-sensitive content and repaint the active frame in the same session. The default projection SHALL remain byte-identical to the base Pi theme and `a1 pi` SHALL retain exact Pi theme behavior. If a future Pi release changes the semantic theme-token contract incompatibly, controlled upgrade validation SHALL fail by naming the drift rather than silently retaining a stale accent implementation.

#### Scenario: Apply a named accent
- **WHEN** bare A1 has a named `accentColor` preference
- **THEN** titles, cursors, selected markers, working indicators, accent scrollbars, dialogs, settings controls, and extension theme access that request `accent` SHALL use that choice
- **AND** non-accent foregrounds, backgrounds, emphasis, spacing, and geometry SHALL remain unchanged

#### Scenario: Change the preference while content is visible
- **WHEN** the reader changes `accentColor` from one allowed value to another
- **THEN** the settings surface and existing shell content SHALL repaint in the same session
- **AND** no cached row or later-created accent consumer SHALL retain the previous value

#### Scenario: Follow a changed upstream accent
- **WHEN** the base Pi theme's semantic accent differs from the value used by an earlier Pi release and the preference is `default`
- **THEN** bare A1 SHALL render the new base accent exactly without an A1 palette substitution

#### Scenario: Retain a named choice across base-theme replacement
- **WHEN** a named preference is active and the base theme reloads or is replaced
- **THEN** the named accent SHALL be projected once over the new base theme
- **AND** every non-accent role SHALL come from that new base theme

#### Scenario: Preserve comparison parity
- **WHEN** the same base theme is used by `a1 pi`
- **THEN** no A1 accent projection SHALL be installed
- **AND** pinned Pi theme parity SHALL remain exact
