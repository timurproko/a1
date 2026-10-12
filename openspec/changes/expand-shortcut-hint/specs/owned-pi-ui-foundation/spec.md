## ADDED Requirements

### Requirement: Collapsed fallback tool output uses concise shortcut styling

When bare A1 collapses generic fallback tool output with omitted lines, its suffix SHALL retain the omitted-line count and end with `Ctrl+O expand)` using the shared quiet-key and muted-action roles. The key label SHALL reflect the effective tool-expansion binding. Expansion behavior, surrounding output, structured renderers, and the pinned comparison profile SHALL remain unchanged.

#### Scenario: Show omitted fallback output
- **WHEN** a generic fallback tool result contains more lines than its collapsed preview
- **THEN** the suffix SHALL show the omitted-line count followed by `Ctrl+O expand)` with the key and action in their shared semantic roles
- **AND** it SHALL NOT show lowercase `ctrl+o` or the connective wording `to expand`

#### Scenario: Resolve a customized expansion binding
- **WHEN** the effective tool-expansion binding differs from the default
- **THEN** the suffix SHALL display that effective key with shared display capitalization and the action `expand`
- **AND** invoking that key SHALL retain the existing expansion behavior

#### Scenario: Preserve unaffected tool presentation
- **WHEN** tool output is expanded, fits within the fallback preview, or uses a structured renderer
- **THEN** the concise collapsed-fallback suffix SHALL not be added
- **AND** the existing output content, styling, geometry, and lifecycle SHALL remain unchanged

#### Scenario: Use the pinned comparison profile
- **WHEN** equivalent fallback tool output is presented through `a1 pi`
- **THEN** its pinned shortcut wording and styling SHALL remain unchanged
